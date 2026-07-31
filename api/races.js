import { bodyOf, ensureSchema, json, rateLimit, requireAccount, sql } from "./_lib.js";
import { randomBytes } from "node:crypto";

const DIFFICULTIES=new Set(["beginner","normal","advanced"]);
const CODE_CHARS="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function roomCode(){
  const bytes=randomBytes(6);
  return Array.from(bytes,value=>CODE_CHARS[value%CODE_CHARS.length]).join("");
}

function cleanCode(value){
  const code=String(value||"").trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code)?code:"";
}

function cleanState(value){
  const state=value&&typeof value==="object"?value:{};
  return{
    score:Math.max(0,Math.floor(Number(state.score)||0)),
    level:Math.max(1,Math.min(12,Math.floor(Number(state.level)||1))),
    alive:state.alive!==false,
    altitude:Math.floor(Number(state.altitude)||0),
    progress:Math.floor(Number(state.progress)||0),
    x:Math.max(-100,Math.min(580,Math.floor(Number(state.x)||0))),
    state:String(state.state||"idle").slice(0,16),
    facing:state.facing==="left"?"left":"right",
    bossLevel:state.bossLevel?Math.max(2,Math.min(12,Math.floor(Number(state.bossLevel)))):null
  };
}

async function cleanup(){
  await sql`DELETE FROM hamin_race_rooms WHERE updated_at<NOW()-INTERVAL '90 seconds'`;
  await sql`DELETE FROM hamin_race_players WHERE last_seen<NOW()-INTERVAL '35 seconds'`;
}

async function leaveCurrent(key){
  await sql`DELETE FROM hamin_race_rooms WHERE host_key=${key}`;
  await sql`DELETE FROM hamin_race_players WHERE username_key=${key}`;
}

async function snapshot(code,key){
  const rooms=await sql`SELECT * FROM hamin_race_rooms WHERE code=${code} LIMIT 1`;
  const room=rooms[0];
  if(!room)return null;
  const members=await sql`SELECT username_key,username,is_host,state FROM hamin_race_players WHERE room_code=${code} ORDER BY is_host DESC,joined_at ASC`;
  if(!members.some(player=>player.username_key===key))return null;
  return{
    mode:"room",
    code:room.code,
    isHost:room.host_key===key,
    localId:key,
    difficulty:room.difficulty,
    status:room.status,
    seed:room.seed==null?null:Number(room.seed),
    startAt:room.start_at==null?null:Number(room.start_at),
    players:members.map(player=>({id:player.username_key,name:player.username,ready:true,...(player.state||{})}))
  };
}

async function listRooms(){
  const rows=await sql`
    SELECT r.code,r.host_name,r.difficulty,r.created_at,COUNT(p.username_key)::int AS player_count
    FROM hamin_race_rooms r
    LEFT JOIN hamin_race_players p ON p.room_code=r.code
    WHERE r.status='waiting' AND r.updated_at>NOW()-INTERVAL '35 seconds'
    GROUP BY r.code,r.host_name,r.difficulty,r.created_at
    HAVING COUNT(p.username_key)<4
    ORDER BY r.created_at DESC
    LIMIT 20
  `;
  return rows.map(room=>({
    code:room.code,
    hostName:room.host_name,
    difficulty:room.difficulty,
    playerCount:Number(room.player_count)||1
  }));
}

export default async function handler(request,response){
  try{
    await ensureSchema();
    const data=request.method==="POST"?bodyOf(request):{},action=String(data.action||"");
    if(!["state","snapshot"].includes(action)&&!await rateLimit(request,"races",120))return json(response,429,{error:"레이스 요청이 너무 많습니다."});
    const auth=await requireAccount(request);
    if(!auth)return json(response,401,{error:"로그인이 필요합니다."});
    const key=auth.account.username_key,name=auth.account.username;

    if(request.method==="GET"){await cleanup();return json(response,200,{rooms:await listRooms()});}
    if(request.method!=="POST")return json(response,405,{error:"허용되지 않은 요청입니다."});

    if(action==="create"){
      await cleanup();
      const difficulty=DIFFICULTIES.has(data.difficulty)?data.difficulty:"normal";
      await leaveCurrent(key);
      let code="";
      for(let attempt=0;attempt<8&&!code;attempt++){
        const candidate=roomCode();
        const rows=await sql`INSERT INTO hamin_race_rooms (code,host_key,host_name,difficulty) VALUES (${candidate},${key},${name},${difficulty}) ON CONFLICT DO NOTHING RETURNING code`;
        if(rows[0])code=candidate;
      }
      if(!code)return json(response,503,{error:"방 코드를 만들지 못했습니다. 다시 시도해 주세요."});
      await sql`INSERT INTO hamin_race_players (room_code,username_key,username,is_host) VALUES (${code},${key},${name},TRUE)`;
      return json(response,201,{room:await snapshot(code,key)});
    }

    if(action==="join"){
      await cleanup();
      const code=cleanCode(data.code);
      if(!code)return json(response,400,{error:"올바른 6자리 방 코드가 아닙니다."});
      await leaveCurrent(key);
      const rows=await sql`
        INSERT INTO hamin_race_players (room_code,username_key,username,is_host)
        SELECT r.code,${key},${name},FALSE FROM hamin_race_rooms r
        WHERE r.code=${code} AND r.status='waiting'
          AND (SELECT COUNT(*) FROM hamin_race_players p WHERE p.room_code=r.code)<4
        ON CONFLICT (room_code,username_key) DO UPDATE SET username=EXCLUDED.username,last_seen=NOW()
        RETURNING room_code
      `;
      if(!rows[0])return json(response,409,{error:"방이 없거나 이미 시작·마감되었습니다."});
      return json(response,200,{room:await snapshot(code,key)});
    }

    const code=cleanCode(data.code);
    if(!code)return json(response,400,{error:"방 정보가 올바르지 않습니다."});

    if(action==="leave"){
      const hosted=await sql`SELECT 1 FROM hamin_race_rooms WHERE code=${code} AND host_key=${key}`;
      if(hosted[0])await sql`DELETE FROM hamin_race_rooms WHERE code=${code}`;
      else await sql`DELETE FROM hamin_race_players WHERE room_code=${code} AND username_key=${key}`;
      return json(response,200,{ok:true});
    }

    const membership=await sql`UPDATE hamin_race_players SET last_seen=NOW() WHERE room_code=${code} AND username_key=${key} RETURNING is_host`;
    if(!membership[0])return json(response,404,{error:"참가 중인 방을 찾지 못했습니다."});
    const isHost=membership[0].is_host;
    if(isHost)await sql`UPDATE hamin_race_rooms SET updated_at=NOW() WHERE code=${code}`;

    if(action==="difficulty"){
      if(!isHost)return json(response,403,{error:"방장만 난이도를 바꿀 수 있습니다."});
      const difficulty=DIFFICULTIES.has(data.difficulty)?data.difficulty:"normal";
      await sql`UPDATE hamin_race_rooms SET difficulty=${difficulty},updated_at=NOW() WHERE code=${code} AND status='waiting'`;
    }else if(action==="start"){
      if(!isHost)return json(response,403,{error:"방장만 시작할 수 있습니다."});
      const counts=await sql`SELECT COUNT(*)::int AS count FROM hamin_race_players WHERE room_code=${code}`;
      if(Number(counts[0]?.count)<2)return json(response,409,{error:"두 명 이상 참가해야 시작할 수 있습니다."});
      const seed=randomBytes(4).readUInt32BE(0)||1,startAt=Date.now()+2500;
      await sql`UPDATE hamin_race_rooms SET status='playing',seed=${seed},start_at=${startAt},updated_at=NOW() WHERE code=${code} AND status='waiting'`;
    }else if(action==="state"){
      const state=cleanState(data.player);
      await sql`UPDATE hamin_race_players SET state=${JSON.stringify(state)}::jsonb,last_seen=NOW() WHERE room_code=${code} AND username_key=${key}`;
    }else if(action!=="snapshot"){
      return json(response,400,{error:"올바른 레이스 요청이 아닙니다."});
    }

    const room=await snapshot(code,key);
    if(!room)return json(response,404,{error:"레이스 방이 종료되었습니다."});
    return json(response,200,{room});
  }catch(error){
    console.error("races",error);
    return json(response,503,{error:"레이스 서버에 연결하지 못했습니다."});
  }
}

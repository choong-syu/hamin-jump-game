import { ensureSchema, json, sql } from "./_lib.js";

export default async function handler(request,response){
  if(request.method!=="GET")return json(response,405,{error:"허용되지 않은 요청입니다."});
  try{
    await ensureSchema();
    const rows=await sql`SELECT username,best_score FROM hamin_users WHERE best_score>0 ORDER BY best_score DESC,updated_at ASC LIMIT 10`;
    return json(response,200,{leaderboard:rows.map(row=>({username:row.username,score:Number(row.best_score)||0}))});
  }catch(error){console.error("leaderboard",error);return json(response,503,{error:"전체 랭킹을 불러오지 못했습니다."});}
}

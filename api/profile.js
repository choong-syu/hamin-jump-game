import { bodyOf, ITEMS, json, publicProfile, rateLimit, requireAccount, sql, UPGRADES } from "./_lib.js";

export default async function handler(request,response){
  try{
    if(!await rateLimit(request,"profile",120))return json(response,429,{error:"요청이 너무 많습니다."});
    const auth=await requireAccount(request);
    if(!auth)return json(response,401,{error:"로그인이 필요합니다."});
    if(request.method==="GET")return json(response,200,{profile:publicProfile(auth.account)});
    if(request.method!=="POST")return json(response,405,{error:"허용되지 않은 요청입니다."});
    const data=bodyOf(request),account=auth.account,key=account.username_key;
    if(data.action==="result"){
      const score=Math.max(0,Math.min(100000000,Math.floor(Number(data.score)||0))),level=Math.max(1,Math.min(12,Math.floor(Number(data.level)||1)));
      const earned=Math.round(score*(1+(Number(account.upgrades.coin)||0)*.1));
      const records=[...(account.records||[]),{score,level,date:new Date().toISOString(),coins:earned}].sort((a,b)=>b.score-a.score).slice(0,30);
      const rows=await sql`UPDATE hamin_users SET coins=coins+${earned},best_score=GREATEST(best_score,${score}),records=${JSON.stringify(records)}::jsonb,updated_at=NOW() WHERE username_key=${key} RETURNING *`;
      return json(response,200,{earned,profile:publicProfile(rows[0])});
    }
    if(data.action==="buyUpgrade"){
      const item=UPGRADES[data.id],level=Number(account.upgrades[data.id])||0,cost=item?.costs[level];
      if(!item||level>=item.max)return json(response,400,{error:"더 이상 강화할 수 없습니다."});
      const upgrades={...account.upgrades,[data.id]:level+1};
      const rows=await sql`UPDATE hamin_users SET coins=coins-${cost},upgrades=${JSON.stringify(upgrades)}::jsonb,updated_at=NOW() WHERE username_key=${key} AND coins>=${cost} RETURNING *`;
      if(!rows[0])return json(response,400,{error:"코인이 부족합니다."});return json(response,200,{profile:publicProfile(rows[0])});
    }
    if(data.action==="buyItem"){
      const cost=ITEMS[data.id];if(!cost)return json(response,400,{error:"존재하지 않는 아이템입니다."});
      const inventory={...account.inventory,[data.id]:(Number(account.inventory[data.id])||0)+1};
      const rows=await sql`UPDATE hamin_users SET coins=coins-${cost},inventory=${JSON.stringify(inventory)}::jsonb,updated_at=NOW() WHERE username_key=${key} AND coins>=${cost} RETURNING *`;
      if(!rows[0])return json(response,400,{error:"코인이 부족합니다."});return json(response,200,{profile:publicProfile(rows[0])});
    }
    if(data.action==="consume"){
      if(!ITEMS[data.id]||(Number(account.inventory[data.id])||0)<1)return json(response,400,{error:"보유한 아이템이 없습니다."});
      const inventory={...account.inventory,[data.id]:(Number(account.inventory[data.id])||0)-1};
      const rows=await sql`UPDATE hamin_users SET inventory=${JSON.stringify(inventory)}::jsonb,updated_at=NOW() WHERE username_key=${key} RETURNING *`;
      return json(response,200,{profile:publicProfile(rows[0])});
    }
    return json(response,400,{error:"올바른 요청이 아닙니다."});
  }catch(error){console.error("profile",error);return json(response,503,{error:"데이터 서버에 연결하지 못했습니다."});}
}

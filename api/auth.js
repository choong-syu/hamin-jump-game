import { bodyOf, cleanUsername, createSession, ensureSchema, hashPassword, json, publicProfile, rateLimit, requireAccount, sessionCookie, sql, tokenHash, usernameKey, verifyPassword } from "./_lib.js";

export default async function handler(request,response){
  if(request.method!=="POST")return json(response,405,{error:"허용되지 않은 요청입니다."});
  try{
    await ensureSchema();
    if(!await rateLimit(request,"auth"))return json(response,429,{error:"잠시 후 다시 시도해 주세요."});
    const {action,username:rawUsername,password}=bodyOf(request);
    if(action==="logout"){
      const auth=await requireAccount(request);if(auth)await sql`DELETE FROM hamin_sessions WHERE token_hash=${tokenHash(auth.token)}`;
      response.setHeader("Set-Cookie",sessionCookie("",request,0));return json(response,200,{ok:true});
    }
    const username=cleanUsername(rawUsername),key=usernameKey(username);
    if(username.length<2||String(password||"").length<4)return json(response,400,{error:"이름은 2자, 비밀번호는 4자 이상 입력해 주세요."});
    if(action==="signup"){
      const {salt,hash}=await hashPassword(password);
      const rows=await sql`INSERT INTO hamin_users (username_key,username,password_hash,password_salt) VALUES (${key},${username},${hash},${salt}) ON CONFLICT (username_key) DO NOTHING RETURNING *`;
      if(!rows[0])return json(response,409,{error:"이미 사용 중인 이름입니다."});
      const token=await createSession(key);response.setHeader("Set-Cookie",sessionCookie(token,request));
      return json(response,201,{profile:publicProfile(rows[0])});
    }
    if(action==="login"){
      const rows=await sql`SELECT * FROM hamin_users WHERE username_key=${key} LIMIT 1`,account=rows[0];
      if(!account||!await verifyPassword(password,account.password_salt,account.password_hash))return json(response,401,{error:"이름 또는 비밀번호가 맞지 않습니다."});
      const token=await createSession(key);response.setHeader("Set-Cookie",sessionCookie(token,request));
      return json(response,200,{profile:publicProfile(account)});
    }
    return json(response,400,{error:"올바른 로그인 요청이 아닙니다."});
  }catch(error){console.error("auth",error);return json(response,503,{error:"계정 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."});}
}

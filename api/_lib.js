import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export const sql=neon(process.env.HAMIN_DB_DATABASE_URL||process.env.HAMIN_DB_POSTGRES_URL);
const scrypt=promisify(nodeScrypt);
const SESSION_SECONDS=60*60*24*30;
let schemaPromise;

export const UPGRADES={
  jump:{max:5,costs:[600,1400,2800,4800,7500]},
  speed:{max:5,costs:[500,1200,2400,4200,6800]},
  coin:{max:5,costs:[1000,2200,4200,7000,11000]},
  shield:{max:1,costs:[5500]}
};
export const ITEMS={rocket:900,wings:700,shield:500,feather:350};

export async function ensureSchema(){
  if(!schemaPromise)schemaPromise=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS hamin_users (
      username_key TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      coins BIGINT NOT NULL DEFAULT 0,
      best_score BIGINT NOT NULL DEFAULT 0,
      records JSONB NOT NULL DEFAULT '[]'::jsonb,
      upgrades JSONB NOT NULL DEFAULT '{"jump":0,"speed":0,"coin":0,"shield":0}'::jsonb,
      inventory JSONB NOT NULL DEFAULT '{"rocket":0,"wings":0,"shield":0,"feather":0}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS hamin_sessions (
      token_hash TEXT PRIMARY KEY,
      username_key TEXT NOT NULL REFERENCES hamin_users(username_key) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS hamin_sessions_expiry_idx ON hamin_sessions(expires_at)`;
    await sql`CREATE TABLE IF NOT EXISTS hamin_rate_limits (
      rate_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS hamin_race_rooms (
      code TEXT PRIMARY KEY,
      host_key TEXT NOT NULL REFERENCES hamin_users(username_key) ON DELETE CASCADE,
      host_name TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'waiting',
      seed BIGINT,
      start_at BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS hamin_race_players (
      room_code TEXT NOT NULL REFERENCES hamin_race_rooms(code) ON DELETE CASCADE,
      username_key TEXT NOT NULL REFERENCES hamin_users(username_key) ON DELETE CASCADE,
      username TEXT NOT NULL,
      is_host BOOLEAN NOT NULL DEFAULT FALSE,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_code,username_key)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS hamin_race_rooms_status_idx ON hamin_race_rooms(status,updated_at)`;
    await sql`CREATE INDEX IF NOT EXISTS hamin_race_players_seen_idx ON hamin_race_players(room_code,last_seen)`;
  })();
  return schemaPromise;
}
export function cleanUsername(value){return String(value||"").trim().replace(/[<>]/g,"").slice(0,12);}
export function usernameKey(username){return cleanUsername(username).toLocaleLowerCase("ko-KR");}
export function publicProfile(row){
  return{username:row.username,coins:Number(row.coins)||0,bestScore:Number(row.best_score)||0,records:Array.isArray(row.records)?row.records:[],upgrades:row.upgrades||{},inventory:row.inventory||{},createdAt:row.created_at,updatedAt:row.updated_at};
}
export async function hashPassword(password,salt=randomBytes(16).toString("hex")){
  const derived=await scrypt(String(password),salt,64);
  return{salt,hash:Buffer.from(derived).toString("hex")};
}
export async function verifyPassword(password,salt,expected){
  const {hash}=await hashPassword(password,salt),left=Buffer.from(hash,"hex"),right=Buffer.from(expected,"hex");
  return left.length===right.length&&timingSafeEqual(left,right);
}
export function tokenHash(token){return createHash("sha256").update(token).digest("hex");}
export async function createSession(username_key){
  const token=randomBytes(32).toString("base64url"),hash=tokenHash(token);
  await sql`INSERT INTO hamin_sessions (token_hash,username_key,expires_at) VALUES (${hash},${username_key},NOW()+INTERVAL '30 days')`;
  return token;
}
export async function requireAccount(request){
  await ensureSchema();
  const rawCookie=String(request.headers.cookie||"");
  const token=request.cookies?.hamin_session||rawCookie.split(";").map(value=>value.trim()).find(value=>value.startsWith("hamin_session="))?.slice(14)||"";
  if(!token)return null;
  const rows=await sql`SELECT u.* FROM hamin_sessions s JOIN hamin_users u ON u.username_key=s.username_key WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>NOW() LIMIT 1`;
  return rows[0]?{account:rows[0],token}:null;
}
export async function rateLimit(request,scope,limit=30){
  await ensureSchema();
  const ip=String(request.headers["x-forwarded-for"]||request.socket?.remoteAddress||"unknown").split(",")[0],key=`${scope}:${ip}:${Math.floor(Date.now()/60000)}`;
  const rows=await sql`INSERT INTO hamin_rate_limits (rate_key,count,expires_at) VALUES (${key},1,NOW()+INTERVAL '70 seconds') ON CONFLICT (rate_key) DO UPDATE SET count=hamin_rate_limits.count+1 RETURNING count`;
  return Number(rows[0]?.count||0)<=limit;
}
export function sessionCookie(token,request,maxAge=SESSION_SECONDS){
  const secure=String(request.headers["x-forwarded-proto"]||"").includes("https")?"; Secure":"";
  return`hamin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export function json(response,status,data){response.setHeader("Cache-Control","no-store");response.status(status).json(data);}
export function bodyOf(request){return typeof request.body==="string"?JSON.parse(request.body||"{}"):(request.body||{});}

import {HttpError,isLocal} from './validation.mjs';
import {body,json} from './common.mjs';
const enc=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export const digest=async value=>hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
export async function passwordHash(password,salt,pepper){
 const hmac=await crypto.subtle.importKey('raw',enc.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const material=await crypto.subtle.sign('HMAC',hmac,enc.encode(password));
 const key=await crypto.subtle.importKey('raw',material,'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256));
}
const configured=env=>env.ADMIN_USERNAME&&/^[a-f0-9]{64}$/.test(env.ADMIN_PASSWORD_HASH||'')&&env.ADMIN_PASSWORD_SALT?.length>=32&&env.ADMIN_PASSWORD_PEPPER?.length>=64&&env.OWNER_EMAIL;
const cookieName=request=>new URL(request.url).protocol==='https:'?'__Secure-onlinesir_session':'onlinesir_session';
const tokenFrom=request=>request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(request)+'='))?.split('=')[1]||'';
const cookie=(request,value,age)=>`${cookieName(request)}=${value}; Path=/api/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
const version=env=>digest(`${env.ADMIN_USERNAME}:${env.ADMIN_PASSWORD_HASH}:${env.ADMIN_PASSWORD_PEPPER}`);
export async function passwordIdentity(request,env){
 if(!configured(env))throw new HttpError(503,'Admin password login has not been configured.');
 const token=tokenFrom(request);if(!/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,'Sign in to your admin account.');
 const session=await env.DB.prepare('SELECT * FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first();
 if(!session||session.credential_version!==await version(env))throw new HttpError(401,'Your session expired. Please sign in again.');
 return {email:env.OWNER_EMAIL,username:env.ADMIN_USERNAME,role:'owner',local:isLocal(request,env),auth:'password'};
}
export async function passwordRoutes(request,env,path){
 if(!['/api/auth/login','/api/auth/logout'].includes(path))return;
 if(env.AUTH_MODE!=='password')throw new HttpError(404,'Password login is not enabled.');
 if(request.method!=='POST')throw new HttpError(405,'Use POST.');
 if(!isLocal(request,env)&&new URL(request.url).protocol!=='https:')throw new HttpError(403,'HTTPS is required.');
 if(path.endsWith('/logout')){const token=tokenFrom(request);if(token)await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();const response=json({ok:true});response.headers.set('Set-Cookie',cookie(request,'',0));return response;}
 if(!configured(env))throw new HttpError(503,'Admin password login has not been configured.');
 const input=await body(request,4096);
 if(typeof input.username!=='string'||typeof input.password!=='string'||input.username.length>100||input.password.length>512)throw new HttpError(400,'Enter a valid username and password.');
 const now=Date.now(),windowEnd=(Math.floor(now/900000)+1)*900000;
 // Persisted, atomic counters prevent bypass by simultaneous requests or Worker restarts.
 for(const [key,limit] of [[`ip:${await digest(request.headers.get('CF-Connecting-IP')||'local')}`,10],['owner',50]]){
  const row=await env.DB.prepare('INSERT INTO admin_login_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=? RETURNING attempts').bind(key,windowEnd,now,windowEnd).first();
  if(row.attempts>limit)throw new HttpError(429,'Too many login attempts. Try again after 15 minutes.');
 }
 const actual=await passwordHash(input.password,env.ADMIN_PASSWORD_SALT,env.ADMIN_PASSWORD_PEPPER);
 let mismatch=0;for(let i=0;i<64;i++)mismatch|=actual.charCodeAt(i)^env.ADMIN_PASSWORD_HASH.charCodeAt(i);
 if(mismatch||input.username!==env.ADMIN_USERNAME)throw new HttpError(401,'Incorrect username or password.');
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB.batch([
  env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now),
  env.DB.prepare('DELETE FROM admin_login_limits WHERE expires_at<=?').bind(now),
  env.DB.prepare('INSERT INTO admin_sessions(token_hash,expires_at,credential_version) VALUES(?,?,?)').bind(await digest(token),now+28800000,await version(env)),
 ]);
 const response=json({ok:true});response.headers.set('Set-Cookie',cookie(request,token,28800));return response;
}

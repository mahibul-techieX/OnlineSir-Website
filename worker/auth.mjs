import {createRemoteJWKSet,jwtVerify} from 'jose';
import {HttpError,isLocal} from './validation.mjs';
const keysets=new Map();
export async function identity(request,env){
 if(isLocal(request,env))return {email:'local-editor@onlinesir.test',role:'owner',local:true};
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.OWNER_EMAIL)throw new HttpError(503,'Configure Cloudflare Access and the owner account before using the production admin.');
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)throw new HttpError(401,'Sign in through Cloudflare Access.');
 const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;if(!keysets.has(issuer))keysets.set(issuer,createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
 let payload;try{({payload}=await jwtVerify(token,keysets.get(issuer),{issuer,audience:env.ACCESS_AUD}));}catch{throw new HttpError(401,'Your sign-in session could not be verified.');}
 if(typeof payload.email!=='string')throw new HttpError(403,'An email identity is required.');const email=payload.email.toLowerCase();
 if(email===env.OWNER_EMAIL.toLowerCase())return {email,role:'owner',local:false};
 const member=await env.DB.prepare('SELECT role FROM admin_users WHERE email=? AND active=1').bind(email).first();if(!member)throw new HttpError(403,'This account does not have editorial access.');return {email,role:member.role,local:false};
}
export function permit(user,action){const permissions={owner:['edit','approve','manage','publish'],editor:['edit'],reviewer:['edit','approve','publish']};if(!permissions[user.role]?.includes(action))throw new HttpError(403,'Your role does not allow this action.');}
export function checkOrigin(request,env){if(['GET','HEAD'].includes(request.method))return;const allowed=isLocal(request,env)?['http://127.0.0.1:4321','http://localhost:4321']:[env.APP_ORIGIN];if(!allowed.includes(request.headers.get('Origin')))throw new HttpError(403,'Request origin is not allowed.');}
export function authorizeBuild(request,env){if(isLocal(request,env))return;if(!env.RELEASE_EXPORT_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.RELEASE_EXPORT_TOKEN}`)throw new HttpError(401,'Build authorization required.');}

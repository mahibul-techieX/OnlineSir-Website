import {HttpError,isLocal,assetPattern} from './validation.mjs';
import {permit,authorizeBuild} from './auth.mjs';
import {json,body,now,audit} from './common.mjs';
import {fileResponse} from './media.mjs';
export async function exportRoutes(request,env,url,path){
 if(!path.startsWith('/api/export'))return;authorizeBuild(request,env);if(request.method!=='GET')throw new HttpError(405,'Use GET.');
 const file=path.match(/^\/api\/export\/media\/([a-f0-9-]+)$/);if(file)return fileResponse(env,file[1]);
 const release=url.searchParams.get('release');if(!release)throw new HttpError(400,'An immutable release ID is required.');const row=await env.DB.prepare('SELECT * FROM releases WHERE id=?').bind(release).first();if(!row)throw new HttpError(404,'Release not found.');
 const offset=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0)throw new HttpError(400,'Invalid offset.');const {results}=await env.DB.prepare('SELECT payload FROM release_items WHERE release_id=? ORDER BY resource_id LIMIT 50 OFFSET ?').bind(release,offset).all();
 return json({release,settings:JSON.parse(row.settings_payload),items:results.map(x=>JSON.parse(x.payload)),nextOffset:results.length===50?offset+50:null});
}
export async function jobRoutes(request,env,url,path){
 if(!path.startsWith('/api/publisher/'))return;authorizeBuild(request,env);
 if(request.method!=='POST')throw new HttpError(405,'Use POST.');const input=await body(request);
 if(path==='/api/publisher/claim'){
  // A crashed publisher may be reclaimed after its 15-minute lease.
  await env.DB.prepare("UPDATE publish_jobs SET status='failed',message='Publisher stopped before completion. Retry this release.',worker_token=NULL WHERE status='building' AND updated_at<?").bind(new Date(Date.now()-900000).toISOString()).run();
  const token=crypto.randomUUID();const job=await env.DB.prepare("UPDATE publish_jobs SET status='building',attempts=attempts+1,worker_token=?,updated_at=? WHERE id=(SELECT id FROM publish_jobs WHERE status='queued' ORDER BY created_at LIMIT 1) AND NOT EXISTS(SELECT 1 FROM publish_jobs WHERE status='building') RETURNING *").bind(token,now()).first();return json({job:job||null});
 }
 const match=path.match(/^\/api\/publisher\/([\w-]+)\/(heartbeat|complete)$/);if(!match)return;
 const job=await env.DB.prepare("SELECT * FROM publish_jobs WHERE id=? AND status='building' AND worker_token=?").bind(match[1],String(input.token||'')).first();if(!job)throw new HttpError(409,'This publishing lease is no longer valid.');
 if(match[2]==='heartbeat'){await env.DB.prepare('UPDATE publish_jobs SET updated_at=? WHERE id=?').bind(now(),job.id).run();return json({ok:true});}
 if(!['published','failed'].includes(input.status))throw new HttpError(400,'Invalid publish outcome.');
 const statements=[env.DB.prepare('UPDATE publish_jobs SET status=?,message=?,updated_at=?,worker_token=NULL WHERE id=?').bind(input.status,String(input.message||'').slice(0,1500),now(),job.id),env.DB.prepare('UPDATE releases SET state=?,error=? WHERE id=?').bind(input.status,input.status==='failed'?String(input.message||'Build failed').slice(0,1500):null,job.release_id)];
 if(input.status==='published')statements.push(env.DB.prepare("INSERT INTO runtime_state VALUES('live-release',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(job.release_id));await env.DB.batch(statements);return json({ok:true});
}
export async function publishingRoutes(request,env,user,url,path){
 if(path==='/api/releases'&&request.method==='GET')return json({items:(await env.DB.prepare('SELECT r.*,(SELECT COUNT(*) FROM release_items i WHERE i.release_id=r.id) AS count FROM releases r ORDER BY created_at DESC LIMIT 50').all()).results,jobs:(await env.DB.prepare('SELECT id,release_id,status,message,created_at,updated_at FROM publish_jobs ORDER BY created_at DESC LIMIT 50').all()).results});
 if(path==='/api/releases'&&request.method==='POST'){
  permit(user,'publish');const rows=(await env.DB.prepare("SELECT a.resource_id AS id,a.payload FROM approved_resources a JOIN resources r ON r.id=a.resource_id WHERE r.status!='archived' ORDER BY a.resource_id").all()).results;
  if(!rows.length)throw new HttpError(400,'Approve at least one note before preparing a release.');
  const seen=new Set();for(const x of rows){const r=JSON.parse(x.payload);const key=`${r.grade}/${r.subject}/${r.slug}`;if(seen.has(key))throw new HttpError(409,`Duplicate public URL: ${key}.`);seen.add(key);}
  const settings=await env.DB.prepare("SELECT payload FROM settings WHERE id='site'").first();const id=crypto.randomUUID();
  // INSERT SELECT keeps release content within one database transaction and one statement regardless of library size.
  await env.DB.batch([env.DB.prepare('INSERT INTO releases(id,created_at,created_by,settings_payload) VALUES(?,?,?,?)').bind(id,now(),user.email,settings.payload),env.DB.prepare("INSERT INTO release_items SELECT ?,a.resource_id,a.payload FROM approved_resources a JOIN resources r ON r.id=a.resource_id WHERE r.status!='archived'").bind(id),audit(env,user,'release',id)]);
  return json({id,state:'ready',count:rows.length},201);
 }
 const publish=path.match(/^\/api\/releases\/([\w-]+)\/publish$/);if(publish&&request.method==='POST'){
  permit(user,'publish');if(!user.local&&env.PUBLISH_RUNNER_ENABLED!=='true')throw new HttpError(503,'Connect the production publishing runner first. Local publishing is ready to use.');const release=await env.DB.prepare('SELECT id FROM releases WHERE id=?').bind(publish[1]).first();if(!release)throw new HttpError(404,'Release not found.');
  const pending=await env.DB.prepare("SELECT id FROM publish_jobs WHERE release_id=? AND status IN ('queued','building')").bind(release.id).first();if(pending)return json({id:pending.id,status:'queued'});
  const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare('INSERT INTO publish_jobs(id,release_id,created_at,updated_at) VALUES(?,?,?,?)').bind(id,release.id,now(),now()),audit(env,user,'publish-request',release.id)]);return json({id,status:'queued'},202);
 }
}

import {HttpError,checkVersion} from './validation.mjs';
import {permit} from './auth.mjs';
import {json,body,now,getResource,unpack,contentData} from './common.mjs';
export async function resourceRoutes(request,env,user,url,path){
 if(path==='/api/resources'&&request.method==='GET'){
  const offset=Math.max(0,Number(url.searchParams.get('offset')||0));const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||50)));if(!Number.isInteger(offset)||!Number.isInteger(limit))throw new HttpError(400,'Invalid pagination.');
  const search=`%${(url.searchParams.get('q')||'').slice(0,100)}%`;const status=url.searchParams.get('status')||'';const grade=url.searchParams.get('grade')||'';
  const where="WHERE (json_extract(payload,'$.title') LIKE ? OR json_extract(payload,'$.subjectTitle') LIKE ?) AND (?='' OR (?='active' AND status!='archived') OR status=?) AND (?='' OR json_extract(payload,'$.grade')=CAST(? AS INTEGER))";const args=[search,search,status,status,status,grade,grade];
  const {results}=await env.DB.prepare(`SELECT * FROM resources ${where} ORDER BY updated_at DESC,id LIMIT ? OFFSET ?`).bind(...args,limit,offset).all();const count=await env.DB.prepare(`SELECT COUNT(*) AS total FROM resources ${where}`).bind(...args).first();return json({items:results.map(unpack),total:count.total,offset,limit});
 }
 if(path==='/api/resources'&&request.method==='POST'){permit(user,'edit');const data=await contentData(env,await body(request));const id=crypto.randomUUID();const date=now();await env.DB.prepare('INSERT INTO resources(id,payload,updated_at,updated_by) VALUES(?,?,?,?)').bind(id,JSON.stringify({...data,id,updatedAt:date}),date,user.email).run();return json(unpack(await getResource(env,id)),201);}
 const match=path.match(/^\/api\/resources\/([\w-]+)(?:\/(status|revisions|restore|duplicate))?$/);if(!match)return;
 const [,id,action]=match;const row=await getResource(env,id);
 if(request.method==='GET'&&!action)return json(unpack(row));
 if(request.method==='GET'&&action==='revisions'){const {results}=await env.DB.prepare('SELECT * FROM revisions WHERE resource_id=? ORDER BY version DESC LIMIT 100').bind(id).all();return json({items:results.map(x=>({...x,payload:JSON.parse(x.payload)}))});}
 if(request.method==='POST'&&action==='duplicate'){permit(user,'edit');const source=JSON.parse(row.payload);const newId=crypto.randomUUID();const date=now();source.slug=`${source.slug.slice(0,65)}-copy-${newId.slice(0,8)}`;source.title=`${source.title.slice(0,165)} (copy)`;await env.DB.prepare('INSERT INTO resources(id,payload,updated_at,updated_by) VALUES(?,?,?,?)').bind(newId,JSON.stringify({...source,id:newId,updatedAt:date}),date,user.email).run();return json(unpack(await getResource(env,newId)),201);}
 if(request.method!=='PUT'&&!(request.method==='POST'&&action==='restore'))return;
 const input=await body(request);checkVersion(input.version);if(row.version!==input.version)throw new HttpError(409,'This note changed in another window. Reload before saving.');const date=now();let result;
 if(action==='status'){
  const status=input.status;if(!['draft','review','approved','archived'].includes(status))throw new HttpError(400,'Invalid status.');permit(user,['approved','archived'].includes(status)?'approve':'edit');
  if(status==='approved')await contentData(env,JSON.parse(row.payload));
  result=await env.DB.prepare('UPDATE resources SET status=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND version=?').bind(status,date,user.email,id,input.version).run();
 }else if(!action||action==='restore'){
  permit(user,'edit');let source=input;if(action==='restore'){const revision=await env.DB.prepare('SELECT payload FROM revisions WHERE resource_id=? AND version=?').bind(id,Number(input.revision)).first();if(!revision)throw new HttpError(404,'Revision not found.');source=JSON.parse(revision.payload);}
  const data=await contentData(env,source);const payload=JSON.stringify({...data,id,updatedAt:date});
  result=await env.DB.prepare("UPDATE resources SET payload=?,version=version+1,status='draft',updated_at=?,updated_by=? WHERE id=? AND version=?").bind(payload,date,user.email,id,input.version).run();
 }else return;
 if(!result.meta.changes)throw new HttpError(409,'This note changed in another window. Reload before saving.');return json(unpack(await getResource(env,id)));
}

import {HttpError,validateResource,validateSettings} from './validation.mjs';
import {permit} from './auth.mjs';
import {json,body,now,audit} from './common.mjs';
const tables=['curriculum','resources','revisions','approved_resources','media','settings','corrections','releases','release_items','audit_events'];
export async function backupRoutes(request,env,user,url,path){
 if(!['/api/backup','/api/backup/restore'].includes(path))return;permit(user,'manage');
 if(path==='/api/backup'&&request.method==='GET'){const result={format:'onlinesir-backup-v1',createdAt:now(),tables:{},notice:'Media file bytes are separate. Download the media archive as well. Credentials and user access are intentionally excluded.'};for(const table of tables)result.tables[table]=(await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;return json(result);}
 if(path==='/api/backup/restore'&&request.method==='POST'){
  const input=await body(request,15*1024*1024);if(input.confirmation!=='RESTORE MISSING')throw new HttpError(400,'Type RESTORE MISSING to confirm.');const data=input.backup;if(data?.format!=='onlinesir-backup-v1'||!data.tables)throw new HttpError(400,'This is not an OnlineSir backup.');
  // Restore into existing databases without overwriting newer edits. Validate everything before writing.
  const source=data.tables;for(const t of tables)if(!Array.isArray(source[t])||source[t].length>10000)throw new HttpError(400,`Invalid ${t} backup table.`);
  try{
   for(const row of source.resources){validateResource(JSON.parse(row.payload));if(!/^[\w-]{1,80}$/.test(row.id)||!['draft','review','approved','archived'].includes(row.status)||!Number.isInteger(row.version)||row.version<1)throw new Error('Invalid resource.');}
   for(const table of ['revisions','approved_resources','release_items'])for(const row of source[table])validateResource(JSON.parse(row.payload));
   for(const row of source.settings)if(row.id==='site')validateSettings(JSON.parse(row.payload));
   const types={png:'image/png',jpg:'image/jpeg',webp:'image/webp',pdf:'application/pdf'};
   for(const row of source.media)if(!/^[a-f0-9-]{36}$/.test(row.id)||types[row.extension]!==row.mime||!Number.isInteger(row.size)||row.size<1||row.size>5*1024*1024||typeof row.name!=='string'||row.name.length>180||typeof row.alt!=='string')throw new Error('Invalid media manifest.');
   const nodes=new Map(source.curriculum.map(x=>[x.id,x]));for(const row of source.curriculum){if(!/^[\w-]{1,80}$/.test(row.id)||typeof row.title!=='string'||!row.title.trim()||!['class','subject','book','chapter'].includes(row.kind))throw new Error('Invalid curriculum.');if(row.kind==='class'){if(row.parent_id||!Number.isInteger(row.grade)||row.grade<5||row.grade>10)throw new Error('Invalid class.');}else if(nodes.get(row.parent_id)?.kind!=={subject:'class',book:'subject',chapter:'book'}[row.kind])throw new Error('Invalid curriculum hierarchy.');}
  }catch(error){throw new HttpError(400,`Backup validation failed: ${error.message}`);}
  const columns={curriculum:['id','parent_id','kind','title','slug','grade','edition','position','active','version'],resources:['id','version','status','payload','updated_at','updated_by'],revisions:['resource_id','version','payload','created_at','created_by'],approved_resources:['resource_id','payload','version'],media:['id','name','extension','mime','size','alt','created_at','created_by','archived'],settings:['id','payload','version'],corrections:['id','resource_id','message','status','created_at','created_by'],releases:['id','created_at','created_by','state','error','settings_payload'],release_items:['release_id','resource_id','payload'],audit_events:[]};
  // One SQL statement per table via json_each keeps the restore atomic and below D1's per-request query limit.
  const statements=[];for(const [table,keys] of Object.entries(columns)){if(!keys.length||!source[table].length)continue;const fields=keys.map(key=>`json_extract(value,'$.${key}')`).join(',');const rows=table==='curriculum'?[...source[table]].sort((a,b)=>['class','subject','book','chapter'].indexOf(a.kind)-['class','subject','book','chapter'].indexOf(b.kind)):source[table];let chunk=[],size=0;const flush=()=>{if(chunk.length)statements.push(env.DB.prepare(`INSERT OR IGNORE INTO ${table}(${keys.join(',')}) SELECT ${fields} FROM json_each(?)`).bind(JSON.stringify(chunk)));chunk=[];size=0;};for(const row of rows){const bytes=new TextEncoder().encode(JSON.stringify(row)).length;if(bytes>1500000)throw new HttpError(413,'A backup record exceeds the restore size limit.');if(size+bytes>1500000)flush();chunk.push(row);size+=bytes+1;}flush();}
  if(statements.length>45)throw new HttpError(413,'This backup exceeds the atomic restore limit. Use the database migration tool for this archive.');
  statements.push(audit(env,user,'restore-backup','merge-missing'));await env.DB.batch(statements);return json({ok:true,message:'Missing records restored. Existing records were preserved. Restore the media archive separately if moving to a new installation.'});
 }
}

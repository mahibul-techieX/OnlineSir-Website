import {spawn} from 'node:child_process';
import {mkdir,writeFile,rename,cp,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const api=process.env.ADMIN_API_URL||'http://127.0.0.1:8787';
const local=new URL(api).hostname==='127.0.0.1'||new URL(api).hostname==='localhost';
const headers={'Content-Type':'application/json',Origin:'http://127.0.0.1:4321',...(process.env.RELEASE_EXPORT_TOKEN?{Authorization:`Bearer ${process.env.RELEASE_EXPORT_TOKEN}`}:{})};
async function call(route,data){const response=await fetch(new URL(`/api/${route}`,api),{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)});if(!response.ok)throw new Error((await response.text()).slice(0,500));return response.json();}
function command(args,env){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>{log=(log+d).slice(-6000);});child.stderr.on('data',d=>{log=(log+d).slice(-6000);});child.on('error',reject);child.on('exit',code=>code?reject(new Error(log)):resolve(log));});}
async function atomic(file,value){await writeFile(`${file}.tmp`,value);await rename(`${file}.tmp`,file);}
export async function publish(job){
 const work=path.join(root,'artifacts','releases',job.id);if(!/^[a-f0-9-]{36}$/.test(job.id))throw new Error('Invalid job ID.');await mkdir(work,{recursive:true});
 const items=[];let offset=0,settings={};do{const page=await call(`export?release=${encodeURIComponent(job.release_id)}&offset=${offset}`);items.push(...page.items);settings=page.settings;offset=page.nextOffset;}while(offset!==null);
 const snapshot=path.join(work,'content.json'),settingsPath=path.join(work,'settings.json'),publicDir=path.join(work,'public'),outDir=path.join(work,'site');await writeFile(snapshot,JSON.stringify(items,null,2));await writeFile(settingsPath,JSON.stringify(settings,null,2));await cp(path.join(root,'public'),publicDir,{recursive:true});await mkdir(path.join(publicDir,'media'),{recursive:true});
 const files=new Map();for(const item of items)for(const match of item.body.matchAll(/\/media\/([a-f0-9-]{36})\.(png|jpg|webp|pdf)/g))files.set(match[1],`${match[1]}.${match[2]}`);
 for(const [id,name] of files){const response=await fetch(new URL(`/api/export/media/${id}`,api),{headers});if(!response.ok)throw new Error(`Unable to download release media ${id}.`);await writeFile(path.join(publicDir,'media',name),new Uint8Array(await response.arrayBuffer()));}
 const env={ONLINESIR_SNAPSHOT:snapshot,ONLINESIR_SETTINGS:settingsPath,ONLINESIR_OUT_DIR:outDir,ONLINESIR_PUBLIC_DIR:publicDir,ASTRO_TELEMETRY_DISABLED:'1'};
 await command(['node_modules/astro/bin/astro.mjs','build'],env);await command(['node_modules/pagefind/lib/runner/bin.cjs','--site',outDir],env);
 if(!local){if(!process.env.CLOUDFLARE_PAGES_PROJECT_NAME)throw new Error('Production Pages project is not configured.');await command(['node_modules/wrangler/bin/wrangler.js','pages','deploy',outDir,'--project-name',process.env.CLOUDFLARE_PAGES_PROJECT_NAME],env);}
 else{await mkdir(path.join(root,'public','media'),{recursive:true});for(const [,name] of files)await cp(path.join(publicDir,'media',name),path.join(root,'public','media',name));await atomic(path.join(root,'src/data/site-settings.json'),JSON.stringify(settings,null,2)+'\n');await atomic(path.join(root,'src/data/published.json'),JSON.stringify(items,null,2)+'\n');}
 return local?'Published to the local website. Production build saved in artifacts/releases.':'Cloudflare Pages deployment completed.';
}
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function loop(){console.log('OnlineSir publisher is ready.');while(!stopping){let job;try{({job}=await call('publisher/claim',{}));if(job){const heartbeat=setInterval(()=>call(`publisher/${job.id}/heartbeat`,{token:job.worker_token}).catch(()=>{}),30000);try{const message=await publish(job);await call(`publisher/${job.id}/complete`,{token:job.worker_token,status:'published',message});console.log(message);}catch(error){await call(`publisher/${job.id}/complete`,{token:job.worker_token,status:'failed',message:error.message.slice(-1400)});console.error('Publishing failed:',error.message);}finally{clearInterval(heartbeat);}}}catch(error){if(job)console.error(error.message);}if(process.env.PUBLISH_ONCE==='true')break;await new Promise(resolve=>setTimeout(resolve,2000));}}
if(process.argv[1]===fileURLToPath(import.meta.url))await loop();

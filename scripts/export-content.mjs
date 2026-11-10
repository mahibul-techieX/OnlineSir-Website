import {writeFile,rename} from 'node:fs/promises';
import {validateResource} from '../worker/validation.mjs';
const release=process.argv[2]||process.env.RELEASE_ID;
if(!release)throw new Error('Usage: npm run content:export -- <release-id>. Prepare a release in the admin first.');
const origin=process.env.ADMIN_API_URL||'http://127.0.0.1:8787';
const all=[];let offset=0;
do{const url=new URL('/api/export',origin);url.searchParams.set('release',release);url.searchParams.set('offset',offset);const response=await fetch(url,{headers:process.env.RELEASE_EXPORT_TOKEN?{Authorization:`Bearer ${process.env.RELEASE_EXPORT_TOKEN}`}:{}});if(!response.ok)throw new Error(`Export failed: ${response.status}`);const data=await response.json();for(const item of data.items){validateResource(item);all.push(item);}offset=data.nextOffset;}while(offset!==null);
const destination=new URL('../src/data/published.json',import.meta.url);const temporary=new URL('../src/data/published.json.tmp',import.meta.url);
await writeFile(temporary,JSON.stringify(all,null,2)+'\n');await rename(temporary,destination);console.log(`Exported ${all.length} resources from release ${release}. Run npm run build to generate public pages.`);

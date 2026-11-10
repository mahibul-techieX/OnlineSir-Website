import {spawn} from 'node:child_process';
import {existsSync,copyFileSync} from 'node:fs';
if(!existsSync('worker/.dev.vars'))copyFileSync('worker/.dev.vars.example','worker/.dev.vars');
const run=(args)=>spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});
const migration=run(['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','onlinesir','--local','--config','worker/wrangler.local.jsonc']);
migration.on('exit',code=>{
 if(code){process.exitCode=code;return;}
 const children=[run(['node_modules/wrangler/bin/wrangler.js','dev','--config','worker/wrangler.local.jsonc','--ip','127.0.0.1','--port','8787']),run(['node_modules/astro/bin/astro.mjs','dev','--host','127.0.0.1']),run(['scripts/publisher.mjs'])];
 let closing=false;const stop=()=>{if(closing)return;closing=true;for(const child of children)child.kill();};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);for(const child of children)child.on('exit',()=>stop());
});

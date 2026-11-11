import { defineConfig } from 'astro/config';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export default defineConfig({
  site: 'https://onlinesir.in',
  output: 'static',
  outDir: process.env.ONLINESIR_OUT_DIR || './dist',
  publicDir: process.env.ONLINESIR_PUBLIC_DIR || './public',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [{name:'local-editor-api',hooks:{'astro:server:setup':({server})=>{
    server.middlewares.use(async(request,response,next)=>{
      if(!request.url?.startsWith('/pagefind/'))return next();
      const name=request.url.split('?')[0].slice('/pagefind/'.length);
      if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.split('/').includes('..')){response.writeHead(400);return response.end();}
      try{const bytes=await readFile(path.join(process.cwd(),'dist','pagefind',name));response.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.wasm')?'application/wasm':'application/octet-stream');response.end(bytes);}catch{next();}
    });
    server.middlewares.use((request,response,next)=>{
      if(!request.url?.startsWith('/api/'))return next();
      const upstream=http.request({hostname:'127.0.0.1',port:8787,path:request.url,method:request.method,headers:{...request.headers,host:'127.0.0.1:8787'}},incoming=>{
        response.writeHead(incoming.statusCode||502,incoming.headers);incoming.pipe(response);
      });
      upstream.on('error',()=>{response.writeHead(503,{'Content-Type':'application/json'});response.end(JSON.stringify({error:'Start the local API with npm run api:dev.'}));});
      request.pipe(upstream);
    });
  }}}],
});

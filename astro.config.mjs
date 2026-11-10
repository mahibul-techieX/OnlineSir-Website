import { defineConfig } from 'astro/config';
import http from 'node:http';
export default defineConfig({
  site: 'https://onlinesir.in',
  output: 'static',
  outDir: process.env.ONLINESIR_OUT_DIR || './dist',
  publicDir: process.env.ONLINESIR_PUBLIC_DIR || './public',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [{name:'local-editor-api',hooks:{'astro:server:setup':({server})=>{
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

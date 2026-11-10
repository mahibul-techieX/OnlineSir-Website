import {HttpError} from './validation.mjs';
import {identity,checkOrigin} from './auth.mjs';
import {json} from './common.mjs';
import {resourceRoutes} from './resources.mjs';
import {managementRoutes} from './management.mjs';
import {mediaRoutes} from './media.mjs';
import {exportRoutes,jobRoutes,publishingRoutes} from './publishing.mjs';
import {backupRoutes} from './backup.mjs';
import {storageReady} from './storage.mjs';
export default {async fetch(request,env){try{
 const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'');
 const exported=await exportRoutes(request,env,url,path);if(exported)return exported;
 const job=await jobRoutes(request,env,url,path);if(job)return job;
 const user=await identity(request,env);checkOrigin(request,env);
 if(path==='/api/session'&&request.method==='GET')return json({...user,capabilities:{media:storageReady(env),publish:user.local||env.PUBLISH_RUNNER_ENABLED==='true'},logoutUrl:user.local?null:'/cdn-cgi/access/logout'});
 for(const route of [resourceRoutes,managementRoutes,mediaRoutes,publishingRoutes,backupRoutes]){const response=await route(request,env,user,url,path);if(response)return response;}
 throw new HttpError(404,'Endpoint not found.');
 }catch(error){if(error instanceof HttpError)return json({error:error.message},error.status);if(/UNIQUE constraint failed/.test(error.message))return json({error:'An item with this URL or identifier already exists. Choose a unique slug.'},409);console.error('Admin request failed',error.message);return json({error:'The server could not complete the request. Your existing data was preserved.'},500);}}};

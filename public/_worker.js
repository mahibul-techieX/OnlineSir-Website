// Pages handles student assets directly; only /api/* invokes this service proxy.
export default {fetch(request,env){
 if(new URL(request.url).pathname.startsWith('/api/'))return env.ADMIN.fetch(request);
 return env.ASSETS.fetch(request);
}};

import resources from '../src/data/published.json' with {type:'json'};
const origin='http://127.0.0.1:8787';
const session=await (await fetch(`${origin}/api/session`)).json();
if(!session.local)throw new Error('Seeding is restricted to the local development database.');
const headers={'Content-Type':'application/json',Origin:'http://127.0.0.1:4321'};
const existing=await (await fetch(`${origin}/api/resources`)).json();
for(const resource of resources){
 if(existing.items.some(x=>x.slug===resource.slug&&x.grade===resource.grade))continue;
 const response=await fetch(`${origin}/api/resources`,{method:'POST',headers,body:JSON.stringify({...resource,sample:true})});
 if(!response.ok)throw new Error(await response.text());
 const result=await response.json();
 const approved=await fetch(`${origin}/api/resources/${result.id}/status`,{method:'PUT',headers,body:JSON.stringify({version:result.version,status:'approved'})});
 if(!approved.ok)throw new Error(await approved.text());
 console.log(`Added local sample: ${resource.title}`);
}

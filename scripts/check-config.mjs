import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../worker/wrangler.jsonc',import.meta.url),'utf8'));
const checks={
 'Admin owner email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.vars.OWNER_EMAIL||''),
 ...(config.vars.AUTH_MODE==='password'?Object.fromEntries(['ADMIN_USERNAME','ADMIN_PASSWORD_HASH','ADMIN_PASSWORD_SALT','ADMIN_PASSWORD_PEPPER'].map(key=>[`Worker secret ${key}`,Boolean(process.env[key])])):{'Cloudflare Access team':Boolean(config.vars.ACCESS_TEAM_DOMAIN),'Cloudflare Access audience':Boolean(config.vars.ACCESS_AUD)}),
 'Production D1 database': /^[a-f0-9-]{36}$/.test(config.d1_databases[0].database_id)&&!/^0+-0+-0+-0+-0+$/.test(config.d1_databases[0].database_id),
 'Worker API route': Boolean(config.routes?.length),
 'Publishing enabled': config.vars.PUBLISH_RUNNER_ENABLED==='true',
};
for(const key of ['ADMIN_API_URL','RELEASE_EXPORT_TOKEN','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_PAGES_PROJECT_NAME'])checks[`Publisher ${key}`]=Boolean(process.env[key]);
for(const [name,ok] of Object.entries(checks))console.log(`${ok?'READY':'MISSING'}  ${name}`);
console.log('Values are never printed. Worker secrets, remote permissions and Access policies must also be verified in Cloudflare.');
if(Object.values(checks).some(ok=>!ok))process.exitCode=1;

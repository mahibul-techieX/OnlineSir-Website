import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const results=[];
try {
for(const width of [360,390,768,1440]){
 await page.setViewportSize({width,height:900});
 for(const route of ['/','/class-10/mathematics/real-numbers/','/admin/']){
  await page.goto('http://127.0.0.1:4321'+route,{waitUntil:'networkidle'});
  results.push({width,route,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,body:getComputedStyle(document.body).fontSize,reading:document.querySelector('.prose')?getComputedStyle(document.querySelector('.prose')).fontSize:null}))});
 }
 if([390,1440].includes(width)){await page.goto('http://127.0.0.1:4321/',{waitUntil:'networkidle'});await page.screenshot({path:`artifacts/typography-${width}.png`,fullPage:true});}
}
console.log(JSON.stringify(results));if(results.some(r=>r.overflow))process.exitCode=1;
}finally{await browser.close();}

export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const assetPattern=/\/media\/([a-f0-9-]{36})\.(png|jpg|webp|pdf)/g;
export const text=(input,key,max,optional=false)=>{const value=input?.[key];if(optional&&(value==null||value===''))return '';if(typeof value!=='string'||!value.trim()||value.length>max)throw new HttpError(400,`${key} is required (maximum ${max} characters).`);return value.trim();};
export function validateResource(input){
 const out={};for(const [key,max] of Object.entries({title:180,subjectTitle:80,subject:70,book:180,edition:30,chapter:180,slug:100,description:400,body:100000}))out[key]=text(input,key,max);
 out.grade=Number(input.grade);if(!Number.isInteger(out.grade)||out.grade<5||out.grade>10)throw new HttpError(400,'Choose a class from 5 to 10.');
 if(!slugPattern.test(out.slug)||!slugPattern.test(out.subject))throw new HttpError(400,'URL slugs use lowercase English letters, digits and single hyphens.');
 if(!['notes','solution'].includes(input.type))throw new HttpError(400,'Choose notes or solution.');
 out.type=input.type;out.sample=input.sample===true;out.chapterId=text(input,'chapterId',80,true);out.seoTitle=text(input,'seoTitle',180,true);out.seoDescription=text(input,'seoDescription',400,true);return out;
}
export function checkVersion(version){if(!Number.isInteger(version)||version<1)throw new HttpError(400,'A valid revision version is required.');}
export function isLocal(request,env){const u=new URL(request.url);return env.LOCAL_DEVELOPMENT==='true'&&u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname);}
export function validateSettings(input){const out={siteName:text(input,'siteName',80),tagline:text(input,'tagline',200),contactEmail:text(input,'contactEmail',200,true),academicSession:text(input,'academicSession',30),announcement:text(input,'announcement',500,true)};if(out.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.contactEmail))throw new HttpError(400,'Enter a valid contact email.');return out;}
export function inspectUpload(bytes,mime){const b=new Uint8Array(bytes);const has=(a,offset=0)=>a.every((x,i)=>b[offset+i]===x);let result;if(has([137,80,78,71,13,10,26,10]))result={extension:'png',mime:'image/png'};else if(has([255,216,255]))result={extension:'jpg',mime:'image/jpeg'};else if(has([82,73,70,70])&&has([87,69,66,80],8))result={extension:'webp',mime:'image/webp'};else if(has([37,80,68,70,45]))result={extension:'pdf',mime:'application/pdf'};else throw new HttpError(400,'Only genuine PNG, JPEG, WebP and PDF files are accepted.');if(mime&&mime!==result.mime)throw new HttpError(400,'File contents do not match the declared type.');if(b.length>(result.extension==='pdf'?5:2)*1024*1024)throw new HttpError(413,'Images must be at most 2 MB; PDFs at most 5 MB.');return result;}

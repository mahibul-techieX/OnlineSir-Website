import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import content from '../data/published.json' with { type: 'json' };
import settingsData from '../data/site-settings.json' with { type: 'json' };
import {readFileSync} from 'node:fs';
export const grades = [5,6,7,8,9,10];
export const numerals = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
export const asNumber = n => String(n).replace(/\d/g, x => numerals[Number(x)]);
export const resources = process.env.ONLINESIR_SNAPSHOT?JSON.parse(readFileSync(process.env.ONLINESIR_SNAPSHOT,'utf8')):content;
export const siteSettings = process.env.ONLINESIR_SETTINGS?JSON.parse(readFileSync(process.env.ONLINESIR_SETTINGS,'utf8')):settingsData;
export const pathFor = r => `/class-${r.grade}/${r.subject}/${r.slug}/`;
export const subjectsFor = grade => [...new Map(resources.filter(r=>r.grade===grade).map(r=>[r.subject,{slug:r.subject,title:r.subjectTitle}])).values()];
export function renderContent(body) {
  return sanitizeHtml(marked.parse(body || ''), {
    allowedTags: ['p','h2','h3','h4','strong','em','ul','ol','li','blockquote','code','pre','table','thead','tbody','tr','th','td','a','hr','br','img'],
    allowedAttributes: { a: ['href','title'], img:['src','alt','loading'] },
    allowedSchemes: ['https','http','mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer'}) },
    exclusiveFilter: frame=>frame.tag==='img'&&!/^\/media\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(frame.attribs.src||''),
  });
}

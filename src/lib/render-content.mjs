import {Marked} from 'marked';
import sanitizeHtml from 'sanitize-html';
import katex from 'katex';

export function renderContent(body,{preview=false}={}) {
 const equations=[],prefix=`ONLINESIRMATH${crypto.randomUUID().replaceAll('-','')}X`;
 const renderMath=token=>{
  const html=katex.renderToString(token.text,{displayMode:token.display,throwOnError:false,trust:false,maxExpand:1000,maxSize:20,output:'htmlAndMathml'});
  const marker=`${prefix}${equations.length}END`;equations.push([marker,html]);return marker;
 };
 const parser=new Marked({extensions:[{
  name:'displayMath',level:'block',start:src=>src.search(/^(?:\$\$|\\\[)/m),
  tokenizer(src){const m=/^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])(?:\n|$)/.exec(src);if(m)return {type:'displayMath',raw:m[0],text:(m[1]??m[2]).trim(),display:true};},
  renderer:token=>`<p>${renderMath(token)}</p>`,
 },{
  name:'inlineMath',level:'inline',start:src=>src.search(/\$|\\[([]/),
  tokenizer(src){const m=/^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([^\n]+?)\\\)|\$(?!\s)((?:\\.|[^$\n])+?)(?<!\s)\$(?!\d))/.exec(src);if(m)return {type:'inlineMath',raw:m[0],text:m[1]??m[2]??m[3]??m[4],display:m[1]!==undefined||m[2]!==undefined};},
  renderer:renderMath,
 }]});
 // Sanitize author HTML before inserting trusted renderer output. Unique markers
 // prevent author HTML from impersonating generated math markup.
 let html=sanitizeHtml(parser.parse(body||''),{
  allowedTags:['p','h2','h3','h4','strong','em','ul','ol','li','blockquote','code','pre','table','thead','tbody','tr','th','td','a','hr','br','img'],
  allowedAttributes:{a:['href','title','rel'],img:['src','alt','loading']},allowedSchemes:['https','http','mailto'],
  transformTags:{a:sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer'}),img:(tag,attrs)=>{
   const valid=/^\/media\/([a-f0-9-]{36})\.(png|jpg|webp)$/.exec(attrs.src||'');
   return {tagName:'img',attribs:{...attrs,src:valid?(preview?`/api/media/${valid[1]}/file/`:attrs.src):''}};
  }},exclusiveFilter:frame=>frame.tag==='img'&&!frame.attribs.src,
 });
 for(const [marker,equation] of equations)html=html.replaceAll(marker,equation);
 return html;
}

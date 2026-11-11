import {createHash} from 'node:crypto';
export const bookKey=r=>`book-${createHash('sha256').update(r.book.normalize('NFC')).digest('hex').slice(0,10)}`;
export const editionKey=r=>`edition-${encodeURIComponent(r.edition).replace(/%/g,'').toLowerCase()}`;
export const bookPath=r=>`/class-${r.grade}/${r.subject}/books/${bookKey(r)}/${editionKey(r)}/`;
export function booksFor(items){return [...new Map(items.map(r=>[bookPath(r),{...r,url:bookPath(r)}])).values()];}

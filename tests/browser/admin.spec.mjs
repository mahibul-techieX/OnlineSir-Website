import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
const origin='http://127.0.0.1:8787/api';const headers={Origin:'http://127.0.0.1:4321'};
async function api(request,path,method='GET',data){const response=await request.fetch(origin+path,{method,headers,data});expect(response.ok(),await response.text()).toBeTruthy();return response.json();}
test('curriculum, upload, autosave, revisions and backup work through the UI',async({page,request})=>{
 const suffix=Date.now();let noteId;const nodes=[];let mediaId;
 try{
 await page.goto('/admin/#curriculum');await expect(page.locator('#connection')).toContainText('Local development');
 for(const [kind,title,slug,parent] of [['subject','QA subject',`qa-subject-${suffix}`,'class-10'],['book','QA book',`qa-book-${suffix}`,null],['chapter','QA chapter',`qa-chapter-${suffix}`,null]]){
  await page.locator('#add-curriculum').click();const f=page.locator('#curriculum-form');await f.locator('[name=kind]').selectOption(kind);await f.locator('[name=parent_id]').selectOption(parent||nodes.at(-1).id);await f.locator('[name=title]').fill(title);await f.locator('[name=slug]').fill(slug);await f.getByRole('button',{name:'Save item'}).click();await expect(page.locator('#studio-dialog')).not.toBeVisible();const all=await api(request,'/curriculum');nodes.push(all.items.find(x=>x.slug===slug));
 }
 await page.locator('[data-section=media]').click();await page.locator('#upload-media').click();await page.locator('#media-form input[type=file]').setInputFiles('public/brand/favicon.png');await page.locator('#media-form [name=alt]').fill('QA teaching diagram');await page.locator('#media-form button[type=submit], #media-form button:not([type])').click();await expect(page.locator('#studio-dialog')).not.toBeVisible();const media=await api(request,'/media');mediaId=media.items.find(x=>x.alt==='QA teaching diagram').id;
 await page.locator('[data-section=notes]').click();await page.locator('[name=chapterId]').selectOption(nodes.at(-1).id);await expect(page.locator('#editor [name=subjectTitle]')).toHaveValue('QA subject');
 await page.locator('#editor [name=title]').fill('QA autosave lesson');await page.locator('#editor [name=slug]').fill(`qa-note-${suffix}`);await page.locator('#editor [name=description]').fill('A reviewed test lesson.');await page.locator('#note-body').fill('## Original answer\n\nThis version should be preserved.');
 await expect(page.locator('#editor-message')).toContainText('Autosaved',{timeout:10000});noteId=(await api(request,'/resources?q=QA%20autosave')).items[0].id;
 await page.locator('#autosave').uncheck();await page.locator('#insert-media').click();await page.locator(`[data-insert-media="${mediaId}"]`).click();await page.locator('#save-note').click();await expect(page.locator('#editor-message')).toContainText('Draft saved');
 await page.locator('#toggle-preview').click();await expect(page.locator('#note-preview img')).toBeVisible();await page.locator('#toggle-preview').click();
 await page.locator('#approve-note').click();await expect(page.locator('#editor-message')).toContainText('Approved');await page.locator('#note-body').fill('Unapproved new draft');await page.locator('#save-note').click();await expect(page.locator('#editor-message')).toContainText('Draft saved');
 await page.locator('#history-note').click();await page.locator('[data-view="1"]').click();await expect(page.locator('#revision-1')).toContainText('Original answer');await page.locator('#close-dialog').click();
 await page.locator('[data-section=backups]').click();const downloaded=page.waitForEvent('download');await page.locator('#download-backup').click();const file=await downloaded;const zip=unzipSync(new Uint8Array(await readFile(await file.path())));const backup=JSON.parse(strFromU8(zip['database.json']));expect(backup.tables.resources.some(x=>x.id===noteId)).toBeTruthy();expect(zip[`media/${mediaId}.png`]).toBeTruthy();
 }finally{
  if(noteId){const note=await api(request,`/resources/${noteId}`);await api(request,`/resources/${noteId}/status`,'PUT',{version:note.version,status:'archived'});}
  for(const node of nodes.reverse()){const all=await api(request,'/curriculum');const current=all.items.find(x=>x.id===node.id);await api(request,`/curriculum/${node.id}`,'PUT',{...current,active:false});}
 }
});
test('local publish builds and applies an immutable snapshot',async({page,request})=>{
 test.setTimeout(120000);
 const baseline=await api(request,'/releases','POST',{});
 await page.goto('/admin/#publishing');await expect(page.locator(`[data-publish="${baseline.id}"]`)).toBeVisible();
 page.once('dialog',d=>d.accept());await page.locator(`[data-publish="${baseline.id}"]`).click();
 await expect.poll(async()=>{const {jobs}=await api(request,'/releases');return jobs.find(j=>j.release_id===baseline.id)?.status;},{timeout:60000}).toBe('published');
 await page.goto('/');await expect(page.locator('.resource-card')).toHaveCount(4);
 const snapshot=await api(request,`/export?release=${baseline.id}`);expect(snapshot.items).toHaveLength(4);
});
test('settings, corrections and team controls persist changes',async({page,request})=>{
 const old=await api(request,'/settings');const email=`qa-${Date.now()}@example.test`;
 await page.goto('/admin/#settings');await page.locator('#settings-form [name=announcement]').fill('QA announcement');await page.locator('#settings-form button').click();await expect(page.locator('#settings-message')).toContainText('Settings saved');
 await page.locator('[data-section=corrections]').click();await page.locator('#add-correction').click();await page.locator('#correction-form textarea').fill('QA: check the wording.');await page.locator('#correction-form button').click();await expect(page.locator('#studio-dialog')).not.toBeVisible();await page.locator('#correction-list').getByRole('button',{name:'Mark resolved'}).first().click();
 await page.locator('[data-section=team]').click();await page.locator('#add-user').click();await page.locator('#user-form [name=email]').fill(email);await page.locator('#user-form button').click();await expect(page.locator('#team-list')).toContainText(email);
 const current=await api(request,'/settings');await api(request,'/settings','PUT',{...old,version:current.version});await api(request,'/users','PUT',{email,role:'editor',active:false});
});

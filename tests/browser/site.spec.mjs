import {test,expect} from '@playwright/test';
test('browse, search, read and bookmark on desktop',async({page})=>{
 await page.goto('/');await expect(page.locator('h1')).toContainText('শিকাৰ আনন্দ');
 await page.locator('.class-card').last().click();await expect(page).toHaveURL(/class-10/);
 await page.locator('.resource-card[href*=real-numbers]').click();await expect(page.locator('.prose')).toContainText('পৰিমেয়');
 await page.locator('#save-resource').click();await expect(page.locator('#save-resource')).toHaveAttribute('aria-pressed','true');
 await page.goto('/saved/');await expect(page.locator('.saved-item')).toHaveCount(1);
 await page.goto('/search/?q=fractions');await expect(page.locator('[data-search]:visible')).toHaveCount(1);
 await page.locator('#query').fill('চাৰিটা');await expect(page.locator('.resource-card[href*=fractions]')).toBeVisible();
 await page.locator('#grade-filter').selectOption('10');await expect(page.locator('#no-results')).toBeVisible();
 await page.locator('#grade-filter').selectOption('6');await expect(page.locator('.resource-card[href*=fractions]')).toBeVisible();
 await page.locator('#query').fill('no-such-lesson');await expect(page.locator('#no-results')).toBeVisible();
});
test('textbooks link to edition chapters and contact uses the official email',async({page})=>{
 await page.goto('/class-10/mathematics/');await page.locator('.subject-card').first().click();await expect(page).toHaveURL(/\/books\//);await expect(page.locator('.resource-card[href*=real-numbers]')).toBeVisible();
 await page.goto('/contact/');await expect(page.locator('a[href^="mailto:"]')).toHaveAttribute('href',/support\.onlinesir@gmail\.com/);
});
test('mobile layout fits the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'artifacts/home-mobile.png',fullPage:true});
 await page.goto('/class-10/mathematics/real-numbers/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('editor saves text and keeps drafts out of public output',async({page,request})=>{
 await page.goto('/admin/');await expect(page.locator('#connection')).toContainText('Local development');
 const slug=`test-${Date.now()}`;
 for(const [name,value] of Object.entries({title:'Integration test note',subjectTitle:'গণিত',subject:'mathematics',book:'Test collection',edition:'2026-27',chapter:'Test chapter',slug,description:'Test description',body:'## অসমীয়া টোকা\n\nThis is a persistent test draft.'}))await page.locator(`#editor [name="${name}"]`).fill(value);
 await page.locator('#save-note').click();await expect(page.locator('#editor-message')).toContainText('Draft saved');
 await page.reload();await page.getByRole('button',{name:/Integration test note/}).first().click();await expect(page.locator('[name="body"]')).toHaveValue(/persistent test draft/);
 await page.locator('#approve-note').click();await expect(page.locator('#editor-message')).toContainText('Approved');
 const list=await (await request.get('http://127.0.0.1:8787/api/resources')).json();const note=list.items.find(x=>x.slug===slug);
 const stale=await request.put(`http://127.0.0.1:8787/api/resources/${note.id}/status`,{headers:{Origin:'http://127.0.0.1:4321'},data:{status:'review',version:1}});expect(stale.status()).toBe(409);
 const crossOrigin=await request.put(`http://127.0.0.1:8787/api/resources/${note.id}/status`,{headers:{Origin:'https://evil.example'},data:{status:'review',version:note.version}});expect(crossOrigin.status()).toBe(403);
 const releaseResponse=await request.post('http://127.0.0.1:8787/api/releases',{headers:{Origin:'http://127.0.0.1:4321'},data:{}});expect(releaseResponse.status()).toBe(201);const release=await releaseResponse.json();
 const exported=await (await request.get(`http://127.0.0.1:8787/api/export?release=${release.id}`)).json();expect(exported.items.find(x=>x.id===note.id).body).toContain('persistent test draft');
 // Archive the test resource so it cannot enter an actual release.
 const archived=await request.put(`http://127.0.0.1:8787/api/resources/${note.id}/status`,{headers:{Origin:'http://127.0.0.1:4321'},data:{status:'archived',version:note.version}});expect(archived.ok()).toBeTruthy();
 const frozen=await (await request.get(`http://127.0.0.1:8787/api/export?release=${release.id}`)).json();expect(frozen.items.find(x=>x.id===note.id)).toEqual(exported.items.find(x=>x.id===note.id));
 await page.goto('/search/?q=Integration%20test%20note');await expect(page.locator('#no-results')).toBeVisible();
});

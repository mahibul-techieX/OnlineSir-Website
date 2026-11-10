import test from 'node:test';
import assert from 'node:assert/strict';
import {renderContent,pathFor,resources} from '../src/lib/content.mjs';
import {validateResource,isLocal} from '../worker/validation.mjs';
test('reader strips active content and dangerous URLs',()=>{const html=renderContent('<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n<img src=x onerror=alert(1)>');assert.ok(!html.includes('<script'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('onerror'));});
test('Assamese content and markdown survive rendering',()=>{const html=renderContent('## গণিত\n\n**ৰ ৱ**');assert.ok(html.includes('<h2>গণিত</h2>'));assert.ok(html.includes('<strong>ৰ ৱ</strong>'));});
test('resource validation rejects unsafe URLs and invalid classes',()=>{const sample=resources[0];assert.equal(validateResource(sample).grade,sample.grade);assert.throws(()=>validateResource({...sample,slug:'../../admin'}));assert.throws(()=>validateResource({...sample,grade:11}));assert.throws(()=>validateResource({...sample,body:' '}));});
test('development bypass is restricted to explicit HTTP loopback configuration',()=>{assert.equal(isLocal(new Request('http://127.0.0.1:8787/api/session'),{LOCAL_DEVELOPMENT:'true'}),true);assert.equal(isLocal(new Request('https://onlinesir.in/api/session'),{LOCAL_DEVELOPMENT:'true'}),false);assert.equal(isLocal(new Request('http://127.0.0.1:8787/api/session'),{}),false);});
test('public routes are unique and valid',()=>{const paths=resources.map(pathFor);assert.equal(new Set(paths).size,paths.length);for(const p of paths)assert.match(p,/^\/class-\d+\/[a-z0-9-]+\/[a-z0-9-]+\/$/);});

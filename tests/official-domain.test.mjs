import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {isOfficialCandidate,candidateGroupsMarkup} from '../dist/source-policy.mjs';
import {verifyCandidate} from '../verify-source.mjs';
import {aiResult,queryKey} from '../dist/ai.mjs';
const name='Midjourney';
const rows=['https://docs.midjourney.com/terms','https://docs.midjourney.com/plans','https://terms.law/midjourney','https://licenseorg.com/midjourney'].map((url,i)=>({query:name,title:'result '+i,url}));
test('only two official Midjourney results are actionable; commentary is folded',()=>{
 const html=candidateGroupsMarkup(rows,name,(r,i)=>`<button data-web-candidate="${i}">${r.title}</button>`,String),split=html.indexOf('<details');
 assert.equal((html.slice(0,split).match(/data-web-candidate/g)||[]).length,2);assert.ok(html.slice(split).includes('terms.law'));assert.ok(html.slice(split).includes('licenseorg.com'));assert.ok(!html.slice(split).includes('data-web-candidate'));assert.match(html,/비공식 해설 · 근거로 사용 불가/);
 for(const url of ['https://docs.midjourney.com.evil.com/','https://evil.com/?docs.midjourney.com','http://docs.midjourney.com/'])assert.equal(isOfficialCandidate(name,url),false);
});
test('forged unofficial candidate action is blocked before opening or storing evidence',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),els={catalogWebResults:{},catalogSearch:{value:name}};let opened=false,message='';
 const box={$:id=>els[id],catalogRemote:{name,candidates:[rows[2]]},isOfficialCandidate,openAsset:()=>opened=true,message:s=>message=s};vm.createContext(box);const start=app.indexOf("$('catalogWebResults').onclick=");vm.runInContext(app.slice(start,app.indexOf('\nrenderCatalog();',start)),box);els.catalogWebResults.onclick({target:{closest:()=>({dataset:{webCandidate:'0'}})}});assert.equal(opened,false);assert.match(message,/근거로 등록할 수 없습니다/);
});
test('server and evaluator reject third-party commentary even if an old record says matched',async()=>{
 let fetched=false;const v=await verifyCandidate({name,url:rows[2].url},{fetchPage:async()=>{fetched=true;throw Error('must not fetch');}});assert.equal(v.status,'candidate');assert.equal(fetched,false);assert.match(v.reason,/근거로 사용 불가/);
 const a={name,kind:'ai',provider:'other',scope:'output'};a.terms={status:'conditions',checkedAt:new Date().toISOString(),queryKey:queryKey(a),sourceUrl:rows[2].url,summary:'Permission',excerpts:['Allowed']};assert.equal(aiResult(a).status,'review');assert.match(aiResult(a).notes.join(),/비공식/);
});

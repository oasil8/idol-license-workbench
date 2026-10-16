import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {resultItems} from '../dist/result-sections.mjs';
const code=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
function render(purpose='review'){
 const box={resultItems,permissionMarkup:()=>'<h3>허용 근거</h3>',project:()=>({context:{}}),evaluate:()=>({status:purpose,tasks:['first','second','third'],notes:['purpose reason']}),commercialVerdict:()=>({status:'review',tasks:['second'],notes:['main reason','extra reason']}),reviewSourceConditions:()=>({missing:['scope check']}),useSummary:()=>'',sourceReviewPanel:()=>'<p>source evidence</p>',termsPanel:()=>'<p>terms evidence</p>',sourceLinksPanel:()=>'<a href="https://example.com">Source</a>',badge:r=>`<b>${r.status}</b>`,esc:v=>String(v).replaceAll('<','&lt;')};
 vm.createContext(box);vm.runInContext(code.slice(code.indexOf('function assessment('),code.indexOf('\nfunction render(){')),box);
 return box.assessment({},false);
}
test('compact assessment keeps every condition and evidence while avoiding duplicate conclusions',()=>{
 const html=render();
 assert.doesNotMatch(html,/현재 사용 목적|<b>review<\/b>/);
 assert.match(html,/purpose reason/);
 assert.doesNotMatch(html,/추가 확인 2개|scope check/);
 for(const text of ['first','second','third','source evidence','terms evidence'])assert.ok(html.includes(text));
 assert.match(html,/<details class="assessment-evidence"><summary>/);
 assert.match(html,/<a href="https:\/\/example.com">/);
});
test('different purpose verdict remains visible in compact assessment',()=>{
 const html=render('conditions');assert.match(html,/상업 이용으로 바꾸면/);assert.match(html,/<b>review<\/b>/);assert.match(html,/purpose reason/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {aiResult,queryKey} from '../dist/ai.mjs';
import {evaluate} from '../dist/core.mjs';
import {analyzeTerms} from '../dist/terms-analysis.mjs';
const a={kind:'ai',provider:'meshy',scope:'output',planType:'unknown',name:'Meshy',rights:'unknown'};
const now=Date.parse('2026-10-16T12:00:00+09:00');
test('reviewed Meshy output grants both plans without treating third-party checks as denial',()=>{
 for(const planType of ['unknown','free','paid']){const r=aiResult({...a,planType},now);assert.equal(r.status,'conditions',planType);assert.ok(r.humanChecks.length);assert.equal(r.evidenceMethod,'public-review');}
 assert.ok(aiResult(a,now).tasks.some(x=>x.includes('CC BY')));
 assert.equal(aiResult({...a,planType:'business'},now).status,'review');
 for(const scope of ['weights','service','training'])assert.equal(aiResult({...a,scope},now).status,'review');
 assert.equal(aiResult({...a,useDescription:'커뮤니티 자료'},now).status,'review');
 assert.equal(aiResult(a,now+8*86400000).status,'review');
});
test('explicit records are not overridden by public guidance',()=>{
 const terms={status:'conflict',summary:'별도 계약상 금지',checkedAt:new Date(now).toISOString(),queryKey:queryKey(a)};
 assert.equal(aiResult({...a,terms},now).status,'conflict');
 assert.equal(aiResult({...a,terms:{error:'403'}},now).status,'review');
 assert.equal(aiResult({...a,provider:'huggingface'},now).status,'review');
});
test('unknown plan needs both actual grants and preserves restrictions',()=>{
 const text='if you are a paid customer, you own the assets created through our platform. If you are on a free plan, we grant you a CC BY 4.0 license instead.';
 assert.equal(analyzeTerms(a,text).status,'conditions');
 assert.equal(analyzeTerms(a,text.split('. ')[0]).status,'review');
 assert.equal(analyzeTerms(a,text+' Commercial use is prohibited.').status,'review');
});
test('core does not reintroduce plan or third-party blockers for confirmed Meshy output',()=>{
 for(const commercial of [false,true]){const r=evaluate(a,{commercial,distribute:true,platform:'general'});assert.equal(r.status,'conditions');assert.equal(r.blockers.length,0);}
});

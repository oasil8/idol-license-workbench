import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {aiResult,queryKey} from '../dist/ai.mjs';
import {supplementCodeLicense} from '../dist/official-sources.mjs';
import {categoryRecommendation} from '../dist/catalog.mjs';
import {sourceRefreshJobs} from '../dist/auto-review.mjs';
import {reviewReason} from '../dist/result-sections.mjs';
const now=Date.parse('2026-10-16T12:00:00+09:00');
const context={platform:'research',commercial:false,distribute:false};
test('existing MinerU keeps originals and distinguishes current license, old releases and commercial thresholds',()=>{
 const old={name:'MinerU',kind:'code',selection:'used',license:'',notes:'original',evidence:'saved source',rights:'unknown'};
 const a=supplementCodeLicense(old);
 assert.equal(old.license,'');assert.equal(a.notes,old.notes);assert.ok(a.evidence.includes(old.evidence));
 assert.equal(a.license,'LicenseRef-MinerU');assert.deepEqual(supplementCodeLicense(a),a);
 assert.equal(evaluate(a,context).status,'review');assert.match(reviewReason(evaluate(a,context)),/배포 버전/);
 assert.equal(evaluate({...a,version:'master'},context).status,'conditions');
 for(const [organizationScale,status] of [['unknown','review'],['below','conditions'],['above','conflict']])assert.equal(evaluate({...a,version:'master',organizationScale},{...context,commercial:true}).status,status);
 assert.equal(supplementCodeLicense({...old,license:'AGPL-3.0-only'}).license,'AGPL-3.0-only');
});
test('Copilot uses selected contract route and leaves only unsupported route unresolved',()=>{
 const a={name:'GitHub Copilot',kind:'ai',provider:'other',scope:'output',selection:'used'};
 assert.equal(aiResult(a,now).status,'review');assert.match(reviewReason(aiResult(a,now)),/계약 경로/);
 for(const contractRoute of ['personal','github-business']){const r=aiResult({...a,contractRoute},now);assert.equal(r.status,'conditions');assert.ok(r.reviewedEvidence.excerpts.length);}
 assert.equal(aiResult({...a,contractRoute:'microsoft'},now).status,'review');
 assert.notEqual(queryKey(a),queryKey({...a,contractRoute:'personal'}));
});
test('classification suggests an exact known name without modifying saved material',()=>{
 const a={name:'지피티',kind:'code',license:'',notes:'original'};const before=structuredClone(a);
 assert.equal(categoryRecommendation(a).kind,'ai');assert.deepEqual(a,before);
 assert.equal(categoryRecommendation({...a,license:'MIT'}),undefined);
 assert.equal(categoryRecommendation({...a,name:'Unknown custom library'}),undefined);
});
test('common missing-evidence jobs preserve originals, exclude inactive materials and bound automatic requests',()=>{
 const a={id:'a',name:'Unknown Example Service',kind:'ai',provider:'other',scope:'output',selection:'used'};
 const jobs=assets=>sourceRefreshJobs([{id:'p',context,assets}],now);
 assert.equal(jobs([a]).length,1);
 for(const asset of [{...a,selection:'excluded'},{...a,terms:{method:'manual'}},{...a,sourceCandidates:[{verification:{text:'original'}}]},{...a,name:'지피티',kind:'code',provider:''}])assert.equal(jobs([asset]).length,0);
 assert.equal(jobs(Array.from({length:25},(_,i)=>({...a,id:String(i)}))).length,20);
 assert.equal(jobs([a])[0].signature,JSON.stringify(a));
});


test('existing stored review is recalculated from saved verified original without overwriting it',async()=>{
 const fs=await import('node:fs');const text=fs.readFileSync(new URL('./fixtures/real-terms/runway.txt',import.meta.url),'utf8');
 const url='https://runway.com/terms-ofuse';
 const a={name:'Runway',serviceName:'Runway',kind:'ai',provider:'other',scope:'output',selection:'used'};
 a.terms={status:'review',summary:'old analysis',queryKey:queryKey(a)};
 a.sourceCandidates=[{url,verification:{url,finalUrl:url,query:'Runway',status:'matched',checkedAt:new Date(now).toISOString(),text}}];
 const before=structuredClone(a);assert.equal(aiResult(a,now).status,'conditions');assert.deepEqual(a,before);
});

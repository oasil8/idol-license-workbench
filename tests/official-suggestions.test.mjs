import test from 'node:test';
import assert from 'node:assert/strict';
import {assetSources,officialSuggestions,sourceGroup,sourceSearchUrl} from '../dist/evidence-sources.mjs';
import {commercialVerdict} from '../dist/core.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const context={platform:'research',commercial:false};
test('known services receive reference links without changing license clearance',()=>{
 for(const name of ['Gemini','Suno','Hugging Face 모델']){
  const a={name,kind:'ai',provider:'other',selection:'used'},before=commercialVerdict(a,context);
  const s=assetSources(a,context).find(s=>s.type==='suggested');
  assert.ok(s,name);assert.equal(sourceGroup(s),'참고 링크 · 적용 미확인');
  assert.equal(s.date,'2026-10-15');assert.deepEqual(commercialVerdict(a,context),before);
  assert.equal(before.status,'review');assert.ok(before.humanChecks.some(x=>x.includes('원문·적용 플랜')));
  const report=buildProjectReport({contextConfirmed:true,name:'Test',context,assets:[a]});
  assert.ok(report.includes(s.url));assert.match(report,/참고 링크 · 적용 미확인/);assert.match(report,/주소 확인일:/);
 }
});
test('ambiguous and unrelated names do not inherit a service URL',()=>{
 for(const name of ['Copilot','example-dependency','SunoClone','Gemini library'])assert.deepEqual(officialSuggestions({name}),[]);
 assert.deepEqual(officialSuggestions({kind:'ai',name:'Suno',serviceName:'Different Service'}),[]);
 assert.equal(officialSuggestions({kind:'ai',name:'generated asset',provider:'huggingface'}).length,1);
 assert.equal(new URL(sourceSearchUrl({name:'a&b #test'})).searchParams.get('q'),'a&b #test official website license terms');
});
test('fetched text, historic review and unverified sources stay distinguishable',()=>{
 assert.equal(sourceGroup({type:'queried',clause:'saved excerpt'}),'확인한 원문 기록');
 assert.equal(sourceGroup({type:'reference',clause:'section name'}),'확인한 원문 기록');
 for(const type of ['manual','saved','failed','user','queried'])assert.equal(sourceGroup({type}),'미검증·재확인 기록');
 const a={name:'Suno',terms:{sourceUrl:'https://suno.com/terms',method:'manual'}};
 const rows=assetSources(a,context);assert.equal(rows.length,1);assert.equal(rows[0].type,'manual');
});

test('code projects expose exact official licenses without duplicate homepage links or permission claims',()=>{
 const refs=officialSuggestions({name:'OpenSees'});
 assert.ok(refs.some(r=>r.url==='https://opensees.github.io/OpenSeesDocumentation/developer/license.html'));
 assert.equal(new Set(refs.map(r=>r.url)).size,refs.length);
 assert.ok(refs.every(r=>r.type==='suggested'));
});

test('catalog reuses known official sources when a separate suggestion is missing',async()=>{
 const {catalog}=await import('../dist/catalog.mjs');const {officialSource}=await import('../dist/official-sources.mjs');
 for(const item of catalog.filter(a=>officialSource(a))){const before=commercialVerdict(item,context),refs=officialSuggestions(item);assert.ok(refs.length,item.name);assert.ok(refs.every(r=>r.type==='suggested'));assert.deepEqual(commercialVerdict(item,context),before);}
 for(const id of ['tripo','openai','anthropic']){const item=catalog.find(a=>a.id===id),ref=officialSuggestions(item)[0];assert.equal(ref.url,officialSource(item).url);assert.equal(sourceGroup(ref),'참고 링크 · 적용 미확인');assert.equal(ref.date,undefined);assert.ok(!ref.clause&&!ref.verification);}
 assert.deepEqual(officialSuggestions({name:'Unknown Service',provider:'other'}),[]);
});

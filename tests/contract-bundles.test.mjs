import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contractBody,contractProfiles} from '../dist/contract-profiles.mjs';
import {reviewedHashes} from '../dist/contract-reviewed-hashes.mjs';
import {evaluateContractBundle,contractQuestions,contractBundleNeeded} from '../dist/contract-review.mjs';
import {evaluate,validateProject} from '../dist/core.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {cleanCandidates,documentDate} from '../dist/source-search.mjs';
import {sourceRefreshJobs} from '../dist/auto-review.mjs';
import {pdfReportData} from '../report-pdf.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const context={platform:'general',commercial:true,distribute:false,network:false};
const fixtures=id=>JSON.parse(readFileSync(new URL(`./fixtures/${id}/bundle.json`,import.meta.url),'utf8')).map(d=>({...d,checkedAt:new Date().toISOString()}));
const make=(changes={},choices={})=>({id:'fixture',name:'ElevenLabs',kind:'ai',provider:'other',serviceName:'ElevenLabs',scope:'output',planType:'paid',selection:'used',contractChoices:{edition:'stable',product:'speech',contract:'public',...choices},sourceCandidates:[{url:'https://elevenlabs.io/terms-of-use',query:'ElevenLabs',searchedAt:new Date().toISOString(),title:'general',verification:{url:'https://elevenlabs.io/terms-of-use',query:'ElevenLabs',status:'matched',text:'Preserved original',checkedAt:new Date().toISOString(),documents:fixtures('elevenlabs')}}],...changes});
const result=(a,c=context)=>evaluate(a,c);

test('actual official bundles match reviewed fingerprints, not a synthetic permission snippet',()=>{
 for(const id of ['elevenlabs','runway'])for(const d of fixtures(id))assert.equal(createHash('sha256').update(contractBody(d.text)).digest('hex'),reviewedHashes[d.url],d.url);
});
test('ElevenLabs actual free/paid output clauses distinguish purpose',()=>{
 for(const planType of ['free','paid','unknown'])for(const commercial of [true,false]){
  const expected=commercial?(planType==='paid'?'conditions':planType==='free'?'conflict':'review'):'conditions';
  assert.equal(result(make({planType}),{...context,commercial}).status,expected,`${planType}/${commercial}`);
 }
 assert.ok(result(make()).humanChecks.length);assert.equal(result(make()).blockers.length,0);
});
test('API internal use, missing access, OEM small tier, eligible organization and custom contract differ',()=>{
 assert.equal(result(make({scope:'service',apiAccessConfirmed:true},{audience:'internal'})).status,'conditions');
 assert.match(result(make({scope:'service'},{audience:'internal'})).blockers.join(),/접근 권한/);
 for(const [oem,status] of [['small','conflict'],['eligible','conditions'],['custom','review']])assert.equal(result(make({scope:'service',apiAccessConfirmed:true},{audience:'endusers',oem})).status,status);
 const custom=result(make({planType:'free'},{contract:'custom'}));assert.equal(custom.status,'review');assert.match(custom.blockers.join(),/별도로/);
});
test('additional restrictions take precedence over paid general permission',()=>{
 assert.equal(result(make({}, {product:'sfx',soundUse:'combined'})).status,'conditions');
 assert.equal(result(make({}, {product:'sfx',soundUse:'standalone'})).status,'conflict');
 assert.equal(result(make({}, {product:'dubbing',dubbingUse:'ugc'})).status,'conditions');
 assert.equal(result(make({}, {product:'dubbing',dubbingUse:'production'})).status,'conflict');
 assert.equal(result(make({}, {edition:'beta',betaUse:'testing'})).status,'conflict');
 assert.equal(result(make({}, {edition:'beta',betaUse:'testing'}),{...context,commercial:false}).status,'conditions');
 assert.equal(result(make({}, {product:'stt'})).status,'conditions');
});
test('music-specific table overrides the general free rule without granting downloads or API',()=>{
 const a=make({planType:'free'},{product:'music',musicTier:'free',musicUse:'general',musicEntity:'person'});
 assert.equal(result(a).status,'conditions');
 assert.equal(result(a,{...context,distribute:true}).status,'conflict');
 assert.equal(result({...a,scope:'service',apiAccessConfirmed:true,contractChoices:{...a.contractChoices,audience:'internal'}}).status,'conflict');
 for(const [musicTier,musicUse,musicEntity,status] of [['starter','streaming','person','conflict'],['creator','streaming','person','conditions'],['creator','broadcast','person','conflict'],['enterprise','broadcast','large','conditions'],['scale','general','under50','conflict'],['business','general','under50','conditions'],['enterprise','library','person','conflict']])assert.equal(result(make({planType:'unknown'},{product:'music',musicTier,musicUse,musicEntity})).status,status);
});
test('only relevant user facts appear, stale hidden choices do not affect decisions',()=>{
 const a=make({}, {product:'speech',soundUse:'standalone',musicTier:'free',musicUse:'streaming'});
 assert.equal(result(a).status,'conditions');assert.equal(contractQuestions(a).some(q=>q.key==='soundUse'),false);
 const agent=make({scope:'service'}, {product:'agents',audience:'endusers'});
 assert.equal(contractQuestions(agent).some(q=>q.key==='oem'),false);
 assert.match(result(agent).blockers.join(),/외부 모델/);
 assert.equal(result(make({}, {product:''})).status,'review');
});
test('missing, changed, expired, imported or truncated required documents cannot permit use',()=>{
 for(const change of [{text:''},{contractHash:'changed'},{imported:true},{truncated:true},{checkedAt:'2000-01-01'},{checkedAt:'2099-01-01'}]){
  const a=make();Object.assign(a.sourceCandidates[0].verification.documents[0],change);assert.equal(result(a).status,'review');
 }
 const a=make();a.sourceCandidates[0].verification.documents=a.sourceCandidates[0].verification.documents.filter(d=>!d.url.endsWith('/creative-terms'));assert.equal(result(a).status,'review');
});
test('existing records schedule supplementation without changing originals or selecting plans',()=>{
 const a=make({planType:'unknown'});delete a.sourceCandidates[0].verification.documents;
 const before=JSON.stringify(a),jobs=sourceRefreshJobs([{id:'p',assets:[a],context}]);assert.equal(jobs[0].url,'https://elevenlabs.io/terms-of-use');assert.equal(JSON.stringify(a),before);
 assert.equal(contractBundleNeeded(make()),false);
 const imported=make();imported.sourceCandidates=cleanCandidates(imported.sourceCandidates,{imported:true});assert.equal(contractBundleNeeded(imported),true);assert.equal(result(imported).status,'review');
 const manual=make({terms:{method:'manual',originalText:'user contract'}});assert.equal(evaluateContractBundle(manual,context),undefined);assert.equal(contractBundleNeeded(manual),false);
});
test('Runway uses the same multi-document engine for output and purchased API',()=>{
 const a={...make(),name:'Runway',serviceName:'Runway',contractChoices:{contract:'public',material:'own'},sourceCandidates:[{query:'Runway',url:'https://runway.com/terms-ofuse',verification:{documents:fixtures('runway')}}]};
 assert.equal(result(a).status,'conditions');
 assert.equal(result({...a,scope:'service'}).status,'review');
 const api=result({...a,scope:'service',apiAccessConfirmed:true});assert.equal(api.status,'conditions');assert.ok(api.tasks.some(t=>t.includes('Powered by Runway')));
 assert.equal(result({...a,contractChoices:{contract:'public',material:'stock'}}).status,'review');
});
test('saved facts, per-document originals and evidence survive validation and report generation',()=>{
 const a=make(),p={id:'p',name:'contract test',context,assets:[a]},saved=validateProject(p,{local:true});
 assert.deepEqual(saved.assets[0].contractChoices,a.contractChoices);
 const rows=assetSources(a,context),general=rows.find(s=>s.url==='https://elevenlabs.io/terms-of-use');assert.ok(general.verification.text.length>10000);assert.ok(rows.some(s=>s.url.endsWith('/creative-terms')&&s.clause));
 const report=buildProjectReport(p);assert.ok(JSON.stringify(report).includes('creative-terms'));assert.ok(JSON.stringify(report).includes('최소 5년'));
 const pdf=pdfReportData(p);assert.equal(pdf.originals.length,0);assert.ok(pdf.items[0].sources.some(s=>s.url.endsWith('/creative-terms')&&s.quote));assert.deepEqual(pdf.items[0].conditions,result(a).tasks);assert.ok(pdf.items[0].sources.find(s=>s.url.endsWith('/creative-terms')).quote.includes('consents'));assert.equal(result(make({scope:'service',apiAccessConfirmed:true},{audience:'endusers',oem:'small'})).sources[0][1],'https://elevenlabs.io/oem-terms');
 assert.equal(a.sourceCandidates[0].verification.text,'Preserved original');
});

test('actual day-first and month-first contract dates are metadata, not user purchase dates',()=>{for(const text of ['Last Updated: 09 October 2026','Last updated: October 09, 2026','Updated 13 November 2024'])assert.equal(documentDate(text+' Terms apply'),text);const a=make();const saved=validateProject({name:'dates',context,assets:[a]},{local:true}).assets[0];assert.equal(saved.date,'');assert.match(saved.sourceCandidates[0].verification.documents[0].contractDate,/09 October 2026/);});

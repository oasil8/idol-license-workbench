import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {queryKey} from '../dist/ai.mjs';
import {analyzeTerms} from '../dist/terms-analysis.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const url='https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially';
const text='Paid Users have full rights to use, modify, distribute, and commercially exploit all 3D models. Free Users: Tripo retains all rights. If you need commercial use rights, upgrade to a paid plan.';
const a={name:'Tripo',kind:'ai',provider:'tripo',scope:'output',planType:'paid',rights:'unknown',selection:'used'};
const c={platform:'research',commercial:true,distribute:false};
const candidate=(extra={})=>({url,query:'Tripo',searchedAt:new Date().toISOString(),verification:{url,finalUrl:url,query:'Tripo',status:'matched',checkedAt:new Date().toISOString(),text,...extra}});
test('verified official permission yields conditional contract result with separate human checks',()=>{
 const asset={...a,sourceCandidates:[candidate()]},r=evaluate(asset,c);
 assert.equal(r.status,'conditions');assert.equal(r.contractConfirmed,true);assert.ok(r.humanChecks.length);assert.deepEqual(r.blockers,[]);
 assert.match(buildProjectReport({name:'Test',context:c,assets:[asset]}),/확인 필요/);
});
test('candidate, expired, truncated, imported, renamed and scope or plan uncertainty cannot clear AI rights',()=>{
 for(const extra of [{status:'candidate'},{checkedAt:'2020-01-01'},{truncated:true},{imported:true},{query:'Other'},{text:'No permission verified.'},{finalUrl:'https://example.com/terms'}])assert.equal(evaluate({...a,sourceCandidates:[candidate(extra)]},c).status,'review');
 for(const extra of [{planType:'unknown'},{planType:'business'},{scope:'weights'}])assert.equal(evaluate({...a,...extra,sourceCandidates:[candidate()]},c).status,'review');
 assert.equal(evaluate({...a,planType:'free',sourceCandidates:[candidate()]},c).status,'conflict');
});
test('fresh queried official evidence separates third-party checks but manual evidence does not claim official verification',()=>{
 const terms={...analyzeTerms(a,text),checkedAt:new Date().toISOString(),sourceUrl:url,queryKey:queryKey(a)};
 assert.equal(evaluate({...a,terms},c).status,'conditions');
 assert.equal(evaluate({...a,terms:{...terms,method:'manual',attested:true}},c).status,'review');
 assert.equal(evaluate({...a,terms:{...terms,error:'HTTP 403'}},c).status,'review');
});
test('current Meshy clause variants and personal-contract unknown price tier are recognized without inventing enterprise rights',()=>{
 assert.equal(analyzeTerms({...a,provider:'meshy'},'such customers on a paid Meshy plan own their Customer Output.').status,'conditions');
 const input={...a,provider:'openai',planType:'unknown'},grant='you (a) retain your ownership rights in Input and (b) own the Output';
 assert.equal(analyzeTerms(input,grant).status,'conditions');assert.equal(analyzeTerms({...input,planType:'business'},grant).status,'review');
});

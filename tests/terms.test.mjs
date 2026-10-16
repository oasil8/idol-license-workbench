import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTerms,htmlText,validRequest,fetchOfficial} from '../terms.mjs';
import {deduplicate,projectFingerprint} from '../dist/projects.mjs';
import {aiResult,queryKey,cleanTerms} from '../dist/ai.mjs';
const input={provider:'meshy',planType:'paid',scope:'output',repository:''};
const meshy='If you are a paid customer, you own the assets created through our platform. If you are on a free plan, we grant you a CC BY 4.0 license instead.';
test('live terms distinguish free attribution and paid ownership',()=>{
 assert.equal(analyzeTerms(input,meshy).status,'conditions');
 assert.match(analyzeTerms({...input,planType:'free'},meshy).conditions.join(' '),/출처/);
});
test('common plan grants permit outputs while changed language and weights need review',()=>{
 assert.equal(analyzeTerms({...input,planType:'unknown'},meshy).status,'conditions');
 assert.equal(analyzeTerms(input,'Commercial rights are no longer granted.').status,'review');
 assert.equal(analyzeTerms({...input,scope:'weights'},meshy).status,'review');
 assert.equal(analyzeTerms(input,meshy+' Commercial use is prohibited.').status,'review');
});
test('tripo free commercial rights are not granted',()=>{
 const text='Paid Users have full rights to use, modify, distribute, and commercially exploit all 3D models. Free Users: Tripo retains all rights. If you need commercial use rights, upgrade to a paid plan.';
 assert.equal(analyzeTerms({...input,provider:'tripo',planType:'free'},text).status,'conflict');
});
test('fetch rejects unapproved origins and HTTP before accessing network',async()=>{
 await assert.rejects(()=>fetchOfficial('http://127.0.0.1/private'));
 await assert.rejects(()=>fetchOfficial('https://example.org/'));
});
test('request validation blocks arbitrary URLs and repository traversal',()=>{
 assert.throws(()=>validRequest({...input,provider:'http://localhost'}));
 assert.throws(()=>validRequest({...input,provider:'huggingface',repository:'../../secret'}));
 assert.equal(validRequest({...input,provider:'huggingface',repository:'owner/model'}).repository,'owner/model');
});
test('extraction discards scripts and decodes visible text',()=>{
 assert.equal(htmlText('<script>you own outputs</script><p>Terms &amp; conditions</p>').trim(),'Terms & conditions');
});
test('identical project copies deduplicate, modified records survive',()=>{
 const p={id:'1',name:'샘플',context:{commercial:true},scan:'ok',assets:[{id:'a',name:'x',notes:'same'}]};
 const copy=JSON.parse(JSON.stringify(p));copy.id='2';copy.assets[0].id='b';
 assert.equal(projectFingerprint(p),projectFingerprint(copy));
 assert.equal(deduplicate([p,copy]).projects.length,1);
 copy.assets[0].notes='changed';assert.equal(deduplicate([p,copy]).projects.length,2);
});
test('Korean Claude clause returned by regional official page is supported',()=>{
 const text='당사는 귀하에게 산출물에 대한 당사의 모든 권리, 소유권 및 이권(존재하는 경우)을 양도합니다.';
 assert.equal(analyzeTerms({...input,provider:'anthropic'},text).status,'conditions');
});
test('stale, failed, imported or mismatched evidence never clears usage',()=>{
 const a={...input,rights:'cleared'},t={status:'conditions',checkedAt:new Date().toISOString(),summary:'ok',queryKey:queryKey(a)};
 assert.equal(aiResult({...a,terms:t}).status,'conditions');
 for(const extra of [{error:'HTTP 403'},{checkedAt:'2020-01-01'},{imported:true},{queryKey:'different'}])assert.equal(aiResult({...a,terms:{...t,...extra}}).status,'review');
 assert.equal(aiResult({...a,rights:'unknown',terms:t}).status,'review');
 assert.equal(cleanTerms(t,{imported:true}).imported,true);
});

test('saved terms retain permission reasons and separate human checks without changing trust',()=>{
 const terms={status:'conditions',summary:'Grant',conditions:['Keep notice'],permissions:['Permission clause'],checks:['Personal data requires separate review'],checkedAt:new Date().toISOString()};
 const cleaned=cleanTerms(terms);
 assert.deepEqual(cleaned.permissions,terms.permissions);assert.deepEqual(cleaned.checks,terms.checks);
 const restored=cleanTerms(cleaned,{imported:true});assert.equal(restored.imported,true);assert.deepEqual(restored.checks,terms.checks);
 const bounded=cleanTerms({permissions:[5,...Array(20).fill('x'.repeat(2000))],checks:[null,'valid']});
 assert.equal(bounded.permissions.length,12);assert.equal(bounded.permissions[0].length,1000);assert.deepEqual(bounded.checks,['valid']);
});

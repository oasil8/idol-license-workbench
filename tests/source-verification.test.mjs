import {assetSources} from '../dist/evidence-sources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCandidate,currentWebsites,documentEvidence} from '../verify-source.mjs';
import {publicIPv4,fetchPublic} from '../public-fetch.mjs';
import {cleanCandidates,verificationLabel} from '../dist/source-search.mjs';
import {validateProject,commercialVerdict} from '../dist/core.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const text='<html><title>Terms of Service</title><script>fake grant</script><p>'+('Copyright belongs to the authors. Redistribution requires permission. Commercial use requires a separate license. ').repeat(4)+'</p></html>';
const page=url=>({text,url,contentType:'text/html'}),now=()=>Date.parse('2026-10-15T10:00:00Z');
test('known official exact address preserves actual text and extracts literal evidence without granting rights',async()=>{
 const v=await verifyCandidate({name:'Suno',url:'https://suno.com/terms'},{now,fetchPage:async url=>page(url)});
 assert.equal(v.status,'matched');assert.ok(v.text);assert.ok(!v.text.includes('fake grant'));assert.equal(v.hash.length,64);
 for(const e of v.excerpts)assert.equal(v.text.slice(e.start,e.start+e.text.length),e.text);
 const a={name:'Suno',kind:'ai',provider:'other',selection:'used',sourceCandidates:[{url:v.url,query:'Suno',title:'Suno terms',searchedAt:v.attemptedAt,verification:v}]};
 const input={name:'Test',context:{platform:'research'},assets:[a]},local=validateProject(input,{local:true}),imported=validateProject(local);
 assert.equal(verificationLabel(local.assets[0].sourceCandidates[0],'Suno',now()),'공식 주소 대조 · 원문 확보');
 assert.match(verificationLabel(imported.assets[0].sourceCandidates[0],'Suno',now()),/재확인/);
 assert.equal(commercialVerdict(local.assets[0],local.context).status,'review');assert.equal(assetSources(local.assets[0],local.context,now()).find(s=>s.url===v.url).type,'verified');
 assert.match(buildProjectReport(local),/원문에서 찾은 문구/);assert.match(buildProjectReport(local),/확보한 원문 텍스트/);
});
test('public registry match plus homepage link obtains text but remains a candidate',async()=>{
 const fetchPage=async url=>{
  if(url.includes('w/api.php'))return {text:JSON.stringify({search:[{id:'Q123',label:'NewTool'}]})};
  if(url.includes('EntityData'))return {text:JSON.stringify({entities:{Q123:{claims:{P856:[{mainsnak:{datavalue:{value:'https://vendor.example.com/'}}}]}}}})};
  if(url==='https://vendor.example.com/')return {url,text:'<a href="/terms">Terms</a>',contentType:'text/html'};
  return page(url);
 };
 const v=await verifyCandidate({name:'NewTool',url:'https://vendor.example.com/terms'},{fetchPage,now});
 assert.equal(v.status,'candidate');assert.ok(v.text);assert.equal(v.basisUrl,'https://www.wikidata.org/wiki/Q123');
 const missing=await verifyCandidate({name:'NewTool',url:'https://vendor.example.com/unlinked'},{fetchPage,now});assert.ok(missing.text);assert.equal(missing.status,'candidate');assert.match(missing.reason,/연결되는 링크/);
 const fake=await verifyCandidate({name:'NewTool',url:'https://vendor-copy.example.com/terms'},{fetchPage,now});assert.ok(fake.text);assert.equal(fake.status,'candidate');assert.match(fake.reason,/도메인/);
});
test('hexadecimal HTML entities are readable in preserved text',()=>{assert.ok(documentEvidence({text:text.replace('authors','authors&#x27;'),contentType:'text/html'}).text.includes("authors'"));});
test('ambiguous identities, expired claims, challenges and failures stay candidates',async()=>{
 const v=await verifyCandidate({name:'Unknown',url:'https://vendor.example.com/terms'},{fetchPage:async()=>({text:JSON.stringify({search:[{id:'Q1',label:'Unknown'},{id:'Q2',label:'Unknown'}]})})});assert.ok(!v.text);
 assert.deepEqual(currentWebsites({claims:{P856:[{rank:'deprecated',mainsnak:{datavalue:{value:'https://vendor.example.com'}}},{qualifiers:{P582:[]},mainsnak:{datavalue:{value:'https://vendor.example.com'}}}]}}),[]);
 for(const content of ['<html>verify you are human</html>','short'])assert.throws(()=>documentEvidence({text:content,contentType:'text/html'}));
 const failed=await verifyCandidate({name:'Suno',url:'https://suno.com/terms'},{fetchPage:async()=>{throw Error('HTTP 403');}});assert.equal(failed.status,'candidate');assert.ok(!failed.text);
});
test('verification cannot reach private networks or accept fabricated excerpts',async()=>{
 for(const ip of ['127.0.0.1','10.2.3.4','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','224.0.0.1','::1'])assert.equal(publicIPv4(ip),false);
 assert.equal(publicIPv4('8.8.8.8'),true);
 await assert.rejects(()=>fetchPublic('https://127.0.0.1/'));
 const [c]=cleanCandidates([{query:'Test',url:'https://vendor.example.com/',searchedAt:'2026-10-15',verification:{query:'Test',url:'https://vendor.example.com/',text:'actual',excerpts:[{start:0,text:'invented'}]}}]);assert.deepEqual(c.verification.excerpts,[]);
});

 test('package registry identifies exact repository and extracts a LICENSE file reference without assigning installed version',async()=>{
 const {supplementCodeLicense}=await import('../dist/official-sources.mjs');
 const {evaluate}=await import('../dist/core.mjs');
 const raw='MIT License\nCopyright Example\n'+'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files. '.repeat(3);
 const fetchPage=async url=>{
  if(url.includes('pypi.org'))return {text:JSON.stringify({info:{name:'New-Package',version:'9.1',project_urls:{Source:'https://github.com/owner/project'}}})};
  if(url.includes('api.github.com/repos/owner/project/license')){assert.ok(url.endsWith('?ref=v9.1'));return {text:JSON.stringify({encoding:'base64',content:Buffer.from(raw).toString('base64'),license:{spdx_id:'MIT'}})};}throw Error('unmatched');
 };
 const url='https://github.com/owner/project/blob/v9.1/LICENSE';
 const v=await verifyCandidate({name:'new_package',url},{fetchPage});
 assert.equal(v.status,'matched');assert.equal(v.publishedVersion,'9.1');assert.equal(v.sourceRef,'v9.1');
 const [candidate]=cleanCandidates([{url,query:'new_package',searchedAt:v.attemptedAt,verification:v}]);
 const a=supplementCodeLicense({name:'new_package',kind:'code',selection:'used',sourceCandidates:[candidate]});
 assert.equal(a.version,undefined);assert.equal(a.license,'MIT');assert.equal(evaluate(a,{commercial:true}).status,'conditions');
 assert.equal(evaluate({...a,version:'v8.0'},{commercial:true}).status,'review');
 const fake=await verifyCandidate({name:'new_package',url:'https://github.com/copy/project/blob/main/LICENSE'},{fetchPage});assert.equal(fake.status,'candidate');
 });
 test('contract document date is observed rather than used as purchase date',()=>{
 const v=documentEvidence({contentType:'text/plain',text:'Last Updated: October 9, 2026. '+ 'These terms apply to the Services. '.repeat(10)});
 assert.equal(v.contractDate,'Last Updated: October 9, 2026');
 });

 test('verified plan clauses reveal the plan selector without inventing the users subscription',async()=>{
 const {planImpact}=await import('../dist/ai.mjs');
 const text='if you access or use our Services free of charge (a Free User), you may only use the Services for non-commercial purposes; if you access or use our Services through a paid subscription plan (a Paid User), you may use the Services for commercial purposes.';
 const v={status:'matched',text,query:'Example Service',url:'https://vendor.example.com/terms',checkedAt:new Date().toISOString()};
 const a={name:'Example Service',kind:'ai',sourceCandidates:[{verification:v}]};
 assert.equal(planImpact(a).status,'affected');assert.equal(a.planType,undefined);
 assert.notEqual(planImpact({...a,sourceCandidates:[{verification:{...v,status:'candidate'}}]}).status,'affected');
 });

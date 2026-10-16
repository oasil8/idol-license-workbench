import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFile,validateProject} from '../dist/core.mjs';
import {assetSources,evidenceUrls} from '../dist/evidence-sources.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const context={platform:'research',commercial:false,distribute:false};
test('dependency name alone does not invent a website or inherit the parent homepage',()=>{
 const rows=parseFile('package.json',JSON.stringify({name:'parent',homepage:'https://example.com/parent',dependencies:{'example-dependency':'^2.0.0'}}));
 assert.equal(assetSources(rows[1],context).length,0);assert.match(rows[1].notes,/의존성 선언/);
 assert.ok(assetSources(rows[0],context).some(s=>s.url==='https://example.com/parent'));
});
test('evidence links support Markdown, punctuation, balanced parentheses and www without unsafe schemes',()=>{
 assert.deepEqual(evidenceUrls('[원문](https://example.com/license). https://example.com/a_(b) www.example.org/terms, javascript:alert(1) https://user:password@example.com'),['https://example.com/license','https://example.com/a_(b)','https://www.example.org/terms']);
});
test('package and SBOM explicit URLs survive validation and appear as clickable report links',()=>{
 const inputs=[['package.json',{name:'pkg',homepage:'https://example.com/pkg',repository:{url:'https://example.com/repo'}}],['bom.json',{bomFormat:'CycloneDX',components:[{name:'pkg',externalReferences:[{url:'https://example.com/pkg'}]}]}],['sbom.json',{spdxVersion:'SPDX-2.3',packages:[{name:'pkg',homepage:'https://example.com/pkg',downloadLocation:'NOASSERTION'}]}]];
 for(const [file,data] of inputs){
  const assets=parseFile(file,JSON.stringify(data)).map(a=>({...a,selection:'used'}));
  const p=validateProject({name:'test',context,assets},{local:true});
  assert.ok(assetSources(p.assets[0],context).some(s=>s.url==='https://example.com/pkg'));
  const html=buildProjectReport({...p,contextConfirmed:true});assert.match(html,/href="https:\/\/example.com\/pkg"/);assert.ok(html.includes('https://example.com/pkg'));
 }
});
test('all material kinds and custom AI retain user evidence and notes across save validation',()=>{
 for(const kind of ['code','model','image','audio','data','tool','ai']){
  const a={name:'custom material',kind,provider:kind==='ai'?'other':'',serviceName:'Custom AI',selection:'used',evidence:'[원문](https://example.com/source)',notes:'보존할 메모',terms:kind==='ai'?{method:'manual',sourceUrl:'https://example.com/terms',originalText:'preserved original',checkedAt:'2026-10-15',status:'review'}:undefined};
  const p=validateProject(JSON.parse(JSON.stringify({name:'test',context,assets:[a]})),{local:true});
  assert.equal(p.assets[0].notes,'보존할 메모');assert.equal(p.assets[0].evidence,a.evidence);
  const links=assetSources(p.assets[0],context);assert.ok(links.some(s=>s.url==='https://example.com/source'));
  if(kind==='ai'){assert.ok(links.some(s=>s.url==='https://example.com/terms'));assert.equal(p.assets[0].terms.originalText,'preserved original');}
 }
});

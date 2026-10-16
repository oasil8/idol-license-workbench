import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCandidates,candidateUrl,sourceSearchName} from '../dist/source-search.mjs';
import {validateProject,commercialVerdict} from '../dist/core.mjs';
import {assetSources,sourceGroup} from '../dist/evidence-sources.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const candidate={url:'https://vendor.example.com/terms',title:'Official terms',query:'New tool',searchedAt:'2026-10-15T05:00:00Z',verified:true,status:'conditions'};
test('candidate data is bounded, safe and cannot carry approval flags',()=>{
 const [row]=cleanCandidates([candidate,candidate]);assert.equal(cleanCandidates([candidate,candidate]).length,1);
 assert.equal(row.verified,undefined);assert.equal(row.status,undefined);
 for(const url of ['javascript:alert(1)','https://user:pass@site.example.com','http://127.0.0.1','http://[::1]','http://localhost','http://router.local','https://vendor.example.com:1234'])assert.equal(candidateUrl(url),undefined);
 assert.deepEqual(cleanCandidates([{...candidate,searchedAt:'invalid'}]),[]);
 assert.equal(sourceSearchName({name:'asset',kind:'ai',serviceName:'Service'}),'Service');
 assert.equal(sourceSearchName({name:'package',kind:'code',serviceName:'stale AI'}),'package');
});
test('search candidates survive save/backup/report without granting permission',()=>{
 const input={name:'Test',context:{platform:'research'},assets:[{name:'New tool',kind:'tool',selection:'used',sourceCandidates:[candidate]}]};
 const local=validateProject(input,{local:true}),restored=validateProject(JSON.parse(JSON.stringify(local)));
 assert.deepEqual(restored.assets[0].sourceCandidates,local.assets[0].sourceCandidates);
 const a=restored.assets[0],r=commercialVerdict(a,restored.context);assert.equal(r.status,'review');
 const rows=assetSources(a,restored.context);assert.equal(rows[0].type,'candidate');assert.equal(sourceGroup(rows[0]),'검색 후보 · 확인 전');
 const html=buildProjectReport(restored);assert.match(html,/검색 후보 · 확인 전/);assert.match(html,/검색일:/);assert.ok(html.includes(candidate.url));
});

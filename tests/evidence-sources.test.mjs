import test from 'node:test';
import assert from 'node:assert/strict';
import {assetSources} from '../dist/evidence-sources.mjs';
import {queryKey} from '../dist/ai.mjs';
const now=Date.parse('2026-10-15T02:00:00Z'),context={platform:'research',commercial:false};
const ai={name:'Tripo',kind:'ai',provider:'tripo',scope:'output',planType:'unknown'};
const terms={sourceUrl:'https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially',sourceName:'Tripo 공식 문서',checkedAt:'2026-10-15T01:00:00Z',attemptedAt:'2026-10-15T01:00:00Z',queryKey:queryKey(ai)};
test('links distinguish successful terms records from failed, imported, stale or changed records',()=>{
 assert.equal(assetSources({...ai,terms},context,now)[0].type,'queried');
 assert.equal(assetSources({...ai,terms:{...terms,error:'HTTP 403'}},context,now)[0].type,'failed');
 for(const change of [{imported:true},{checkedAt:'2026-01-01'},{queryKey:'changed'}])assert.equal(assetSources({...ai,terms:{...terms,...change}},context,now)[0].type,'saved');
 assert.equal(assetSources({...ai,terms:{...terms,method:'manual'}},context,now)[0].type,'manual');
});
test('rule references and official lookup suggestions do not masquerade as consulted evidence',()=>{
 assert.ok(assetSources({name:'lib',kind:'code',license:'MIT'},context,now).some(s=>s.type==='rule'&&s.url==='https://opensource.org/license/mit'));
 const list=assetSources({name:'Hunyuan3D',kind:'ai',provider:'other'},context,now);
 assert.ok(list.some(s=>s.type==='reference'&&s.url.includes('Hunyuan3D-2/blob/main/LICENSE')&&s.note.includes('한국')));
 assert.ok(!list.some(s=>s.type==='queried'));
 assert.deepEqual(assetSources({name:'Unknown Tool',kind:'tool'},context,now),[]);
});
test('all assignment candidates have relevant official references, and unsafe source URLs are dropped',()=>{
 for(const name of ['Tripo','Rodin','Hunyuan3D','Higgsfield','NVIDIA Cosmos','OpenAI / ChatGPT','Claude','Blender','NVIDIA Isaac Sim','Project Chrono','Unity','Unreal Engine','OpenUSD','Porsche 997','Tesla Cybertruck'])assert.ok(assetSources({name,kind:'tool'},context,now).some(s=>s.type==='reference'),name);
 const list=assetSources({name:'Unknown',kind:'code',terms:{sourceUrl:'javascript:alert(1)'},evidence:'https://example.com/proof'},context,now);
 assert.equal(list.length,1);assert.equal(list[0].type,'user');assert.equal(list[0].url,'https://example.com/proof');
 const dedup=assetSources({...ai,terms,evidence:terms.sourceUrl},context,now);
 assert.equal(dedup.filter(s=>s.url===terms.sourceUrl).length,1);
});

test('matching website verification does not relabel a manually supplied terms record',()=>{
 const url='https://example.com/terms',date='2026-10-15T01:00:00Z';
 const a={name:'Example',kind:'ai',provider:'other',scope:'output',terms:{method:'manual',sourceUrl:url,checkedAt:date,summary:'User supplied text'},sourceCandidates:[{url,query:'Example',title:'Website',searchedAt:date,verification:{url,query:'Example',status:'matched',checkedAt:date,text:'Fetched independently',reason:'Address matched'}}]};
 const rows=assetSources(a,context,now),row=rows.find(s=>s.url===url);
 assert.equal(rows.filter(s=>s.url===url).length,1);assert.equal(row.type,'manual');assert.equal(row.note,'User supplied text');assert.equal(row.date,date);assert.equal(row.verification,undefined);assert.equal(a.sourceCandidates[0].verification.text,'Fetched independently');
});

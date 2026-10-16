import test from 'node:test';
import assert from 'node:assert/strict';
import {supplementCodeLicense,appliedOfficialLicense} from '../dist/official-sources.mjs';
import {evaluate,validateProject} from '../dist/core.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {commitChange} from '../dist/workflow.mjs';
const c={platform:'research',commercial:false,distribute:false,modified:false,network:false};
test('official blank license enrichment preserves records and does not forge user confirmation',()=>{
 const original={name:'NumPy · 출처 보존 검증',kind:'code',license:'',evidence:'https://github.com/numpy/numpy',notes:'keep',confirmed:false};
 const a=supplementCodeLicense(original);assert.equal(original.license,'');assert.equal(a.license,'BSD-3-Clause');assert.equal(a.confirmed,false);assert.equal(a.notes,'keep');assert.ok(a.evidence.startsWith(original.evidence));assert.equal(supplementCodeLicense(a),a);
 assert.equal(evaluate(a,c).status,'conditions');assert.ok(evaluate(a,c).humanChecks.length);assert.equal(assetSources(a,c)[0].type,'supplement');
 const loaded=validateProject({name:'Test',context:c,assets:[a]},{local:true}).assets[0];assert.ok(appliedOfficialLicense(loaded));assert.equal(evaluate(loaded,c).status,'conditions');
});
test('ambiguous names, kinds, explicit versions and existing licenses are not cleared',()=>{
 for(const a of [{name:'NumPy Pro',kind:'code'},{name:'NumPy',kind:'model'},{name:'NumPy · copy',kind:'code',evidence:'https://github.com/numpy/numpy.evil'},{name:'Python',kind:'code',license:'Custom'}])assert.equal(supplementCodeLicense(a),a);
 const a=supplementCodeLicense({name:'Python',kind:'tool',version:'1.6',confirmed:false});assert.equal(a.license,'PSF-2.0');assert.equal(evaluate(a,c).status,'review');
 const good=supplementCodeLicense({name:'NumPy',kind:'code'});assert.equal(evaluate({...good,name:'Other'},c).status,'review');assert.equal(evaluate({...good,license:'MIT'},c).status,'review');
});
test('all three code records support purpose changes without clearing unrelated rights',()=>{
 for(const name of ['NumPy','Python','Project Chrono'])for(const commercial of [true,false]){const a=supplementCodeLicense({name,kind:name==='Python'?'tool':'code',rights:'unknown'});assert.equal(evaluate(a,{...c,commercial,distribute:true}).status,'conditions');assert.equal(a.rights,'unknown');}
 const state={projects:[{assets:[{name:'NumPy',kind:'code'}]}]};const before=structuredClone(state);assert.throws(()=>commitChange(state,s=>{s.projects[0].assets=s.projects[0].assets.map(supplementCodeLicense);},()=>false));assert.deepEqual(state,before);
});

test('expanded records separate public code, model weights, and bundled services',()=>{
 for(const name of ['Docker Engine','Tailscale']){const a=supplementCodeLicense({name,kind:'tool'});assert.equal(evaluate(a,c).status,'conditions');assert.equal(supplementCodeLicense({name,kind:'tool',reviewScope:'service'}).license,undefined);}
 const isaac=supplementCodeLicense({name:'NVIDIA Isaac Sim',kind:'tool'});assert.equal(evaluate(isaac,c).status,'review');assert.equal(evaluate({...isaac,reviewScope:'code'},c).status,'conditions');
 assert.equal(evaluate(supplementCodeLicense({name:'Qwen3.6',kind:'model'}),c).status,'review');
 const q=supplementCodeLicense({name:'Qwen3.6-35B-A3B',kind:'model'});assert.equal(evaluate(q,c).status,'conditions');assert.equal(supplementCodeLicense({name:q.name,kind:'ai',scope:'service'}).license,undefined);
 const o=supplementCodeLicense({name:'OpenSees',kind:'code'});assert.equal(evaluate(o,c).status,'conditions');assert.equal(evaluate(o,{...c,commercial:true,distribute:true}).status,'conflict');assert.equal(evaluate(o,{...c,distribute:true}).status,'review');
});

test('scope changes cannot apply code restrictions to a hosted service; eligible OpenSees nonprofit distribution clears',()=>{
 const o=supplementCodeLicense({name:'OpenSees',kind:'code'});
 const commercial={...c,commercial:true,distribute:true};
 assert.equal(evaluate({...o,reviewScope:'service'},commercial).status,'review');
 assert.equal(evaluate({...o,reviewScope:'service',confirmed:true},commercial).status,'review');
 assert.equal(evaluate({...o,nonprofitEntityConfirmed:true},{...c,distribute:true}).status,'conditions');
 assert.equal(evaluate({...o,nonprofitEntityConfirmed:true},commercial).status,'conflict');
});

test('Qwen family aliases and lookalike model URLs cannot bypass exact distribution requirement',()=>{
 for(const name of ['Qwen3.6','qwen3.6',' QWEN3.6 ','Ｑｗｅｎ３.６']){
  for(const evidence of ['', 'https://huggingface.co/Qwen/Qwen3.6-35B-A3B-Fake']){
   const a=supplementCodeLicense({name,kind:'model',evidence});
   assert.equal(evaluate(a,c).status,'review',name+' / '+evidence);
  }
  const a=supplementCodeLicense({name,kind:'model',evidence:'https://huggingface.co/Qwen/Qwen3.6-35B-A3B'});
  assert.equal(evaluate(a,c).status,'conditions',name);
 }
});

test('adding exact Qwen model provenance resolves a previously incomplete family entry',()=>{
 const a=supplementCodeLicense({name:'qwen3.6',kind:'model',evidence:'Original notes'});
 assert.equal(evaluate(a,c).status,'review');
 const completed={...a,evidence:a.evidence+'\nhttps://huggingface.co/Qwen/Qwen3.6-35B-A3B'};
 assert.equal(evaluate(completed,c).status,'conditions');assert.ok(completed.evidence.startsWith('Original notes'));assert.equal(assetSources(completed,c)[0].type,'supplement');
 assert.equal(evaluate({...completed,reviewScope:'service'},c).status,'review');
});

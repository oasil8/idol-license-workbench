import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,parseFile} from '../dist/core.mjs';
const c={platform:'research',commercial:true,distribute:true,modified:true,network:true};
const a={name:'Open source tool',kind:'tool',confirmed:true,evidence:'LICENSE'};
test('confirmed open source tools follow license conditions without a generic plan blocker',()=>{
 for(const license of ['MIT','Apache-2.0','BSD-3-Clause','PSF-2.0'])assert.equal(evaluate({...a,license},c).status,'conditions');
 for(const extra of [{license:'Custom'},{license:'MIT',confirmed:false},{license:'MIT',evidence:''},{license:'GPL-3.0-only'}])assert.equal(evaluate({...a,...extra},c).status,'review');
 assert.equal(evaluate({...a,license:'CC-BY-NC-4.0'},c).status,'conflict');
});
test('PSF and OFL retain source references and different obligations',()=>{
 const psf=evaluate({...a,license:'PSF-2.0'},c);assert.ok(psf.sources.some(x=>x[1].includes('python.org')));assert.ok(psf.tasks.some(x=>x.includes('변경 사항')));
 const ofl=evaluate({...a,kind:'image',license:'OFL-1.1'},c);assert.equal(ofl.status,'conditions');assert.ok(ofl.sources.some(x=>x[1].includes('openfontlicense.org')));assert.ok(ofl.tasks.some(x=>x.includes('단독 판매')));assert.ok(ofl.tasks.some(x=>x.includes('RFN')));
 assert.ok(!evaluate({...a,license:'PSF-2.0'},{...c,modified:false}).tasks.some(x=>x.includes('변경 사항')));
 for(const license of ['PSF-2.0','OFL-1.1'])assert.equal(evaluate({...a,license,confirmed:false},c).status,'review');
});

import fs from 'node:fs';
test('official PSF page and OFL original title detect candidates, never confirmed permission',()=>{
 const psf=fs.readFileSync(new URL('./fixtures/real-terms/psf-official.txt',import.meta.url),'utf8');
 const ofl='SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\nFont Software'; // Official OFL title/defined term, https://openfontlicense.org/documents/OFL.txt (2026-10-16).
 for(const [text,expected] of [[psf,'PSF-2.0'],[ofl,'OFL-1.1']]){const r=parseFile('LICENSE.txt',text)[0];assert.equal(r.license,expected);assert.equal(r.confirmed,false);}
 for(const license of ['PSF','OFL','OFL-1.0'])assert.equal(evaluate({...a,license},c).status,'review');
});

test('actual installed ISC license is supported with notice obligations, not an unsupported-license hold',()=>{
 const text=fs.readFileSync(new URL('../node_modules/inherits/LICENSE',import.meta.url),'utf8');
 const candidate=parseFile('LICENSE',text)[0];assert.equal(candidate.license,'ISC');assert.equal(candidate.confirmed,false);
 const asset={...a,name:'inherits',kind:'code',license:'ISC',evidence:'node_modules/inherits/LICENSE'};
 for(const commercial of [false,true])for(const distribute of [false,true]){
  const result=evaluate(asset,{...c,commercial,distribute});assert.equal(result.status,'conditions');assert.ok(result.tasks.some(t=>t.includes('고지')));assert.ok(result.sources.some(([,url])=>url==='https://opensource.org/license/isc'));
 }
 assert.equal(evaluate({...asset,confirmed:false},c).status,'review');
});

test('external publication and delivery policies are checks, not license obligations',()=>{
 const asset={...a,license:'MIT'};
 for(const [platform,phrase] of [['conference','학회·출판사'],['enterprise','납품 계약']]){
  const r=evaluate(asset,{...c,platform});assert.equal(r.status,'conditions');
  assert.ok(r.humanChecks.some(x=>x.includes(phrase)));assert.ok(!r.tasks.some(x=>x.includes(phrase)));
 }
});

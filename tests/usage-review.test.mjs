import {needsTerms,readTerms} from './third-party.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeTerms} from '../dist/terms-analysis.mjs';
import {reviewManual} from '../dist/manual-terms.mjs';
import {aiResult,cleanTerms} from '../dist/ai.mjs';
import {evaluate,validateProject} from '../dist/core.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const text=readTerms(new URL('fixtures/real-terms/runway.txt',import.meta.url));
const base={kind:'ai',provider:'other',serviceName:'Runway',scope:'output',planType:'unknown',manual:true};
test('actual Runway output and API grants remain separate with no provider-name rule',needsTerms,()=>{
 for(const serviceName of ['Runway','Renamed service']){
  assert.equal(analyzeTerms({...base,serviceName},text).status,'conditions');
  assert.equal(analyzeTerms({...base,serviceName,scope:'service'},text).status,'review');
  const r=analyzeTerms({...base,serviceName,scope:'service',apiAccessConfirmed:true},text);
  assert.equal(r.status,'conditions');assert.ok(r.conditions.some(x=>x.includes('Powered by Runway')));
  assert.ok(r.excerpts.every(x=>text.replace(/\s+/g,' ').includes(x)));
 }
 assert.equal(analyzeTerms({...base,scope:'weights'},text).status,'review');
 assert.equal(analyzeTerms({...base,scope:'service',apiAccessConfirmed:true},'You may use the generated outputs for commercial purposes.').status,'review');
});
test('API access changes invalidate stored permission and survive local validation',needsTerms,()=>{
 const a={...base,scope:'service',apiAccessConfirmed:true,rights:'unknown'};
 const now=new Date('2026-10-15T03:00:00Z');
 const terms=cleanTerms(reviewManual(a,{text,sourceUrl:'https://runway.com/terms-ofuse',date:'2026-10-15',attested:true},now));
 assert.equal(aiResult({...a,terms},+now).status,'conditions');
 assert.equal(aiResult({...a,apiAccessConfirmed:false,terms},+now).status,'review');
 assert.equal(validateProject({name:'test',assets:[{...a,name:'API',terms}]},{local:true}).assets[0].apiAccessConfirmed,true);
});
test('explicit restrictions and separate contracts cannot be overridden by broad output permission',needsTerms,()=>{
 for(const clause of ['Commercial use is prohibited.','Only paid subscribers are eligible.','A separate agreement is required for commercial use.','You may not use your Outputs for commercial purposes.','Commercial rights are limited to enterprise subscribers.','Output permission is withdrawn.'])
  assert.equal(analyzeTerms(base,text+' '+clause).status,'review',clause);
 for(const name of ['recraft','stability']){
  const full=fs.readFileSync(new URL(`fixtures/real-terms/${name}.txt`,import.meta.url),'utf8');
  assert.equal(analyzeTerms({...base,serviceName:name},full).status,'review');
 }
});
test('code, model, image and audio keep license permission separate from additional rights',needsTerms,()=>{
 const c={platform:'general',commercial:true,distribute:true,modified:false,network:false};
 for(const [kind,license] of [['code','MIT'],['model','Apache-2.0'],['image','CC-BY-4.0'],['audio','CC-BY-4.0']]){
  const a={kind,license,confirmed:true,evidence:'Official LICENSE scope checked',rights:'unknown'};
  const r=evaluate(a,c);assert.equal(r.status,'conditions',kind);assert.ok(r.tasks.length);
  if(kind!=='code')assert.ok(r.humanChecks.length);
  assert.equal(evaluate({...a,confirmed:false},c).status,'review');
 }
 assert.equal(evaluate({kind:'image',license:'CC-BY-NC-4.0',confirmed:true,evidence:'scope'},c).status,'conflict');
 assert.equal(evaluate({kind:'audio',license:'CC-BY-ND-4.0',confirmed:true,evidence:'scope'}, {...c,modified:true}).status,'conflict');
});
test('real distribution records preserve media attribution, source exceptions and unknown rights in report',needsTerms,()=>{
 const assets=JSON.parse(fs.readFileSync(new URL('fixtures/real-terms/media-cases.json',import.meta.url),'utf8'));
 const context={platform:'general',commercial:true,distribute:true,modified:false};
 assert.match(fs.readFileSync(new URL('fixtures/real-terms/lodash-license.txt',import.meta.url),'utf8'),/permission notice shall be/);
 assert.match(fs.readFileSync(new URL('fixtures/real-terms/minilm-card.txt',import.meta.url),'utf8'),/license: apache-2.0/);
 for(const a of assets){const r=evaluate(a,context);assert.equal(r.status,'conditions');assert.ok(r.humanChecks.length);assert.ok(r.tasks.some(x=>x.includes('저작자')));}
 const report=buildProjectReport({contextConfirmed:true,name:'실제 배포 기록 비교',context,assets});
 for(const phrase of ['ESO/A. Cikota et al.','zero-project.gr','Music Archive','허용 근거','지켜야 할 조건','확인 필요'])assert.ok(report.includes(phrase),phrase);
});

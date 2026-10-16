import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluate} from '../dist/core.mjs';
import {aiResult} from '../dist/ai.mjs';
import {analyzeTerms} from '../dist/terms-analysis.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {supplementCodeLicense} from '../dist/official-sources.mjs';
import {pdfReportData} from '../report-pdf.mjs';
const now=Date.parse('2026-10-16T12:00:00+09:00');
const base={kind:'ai',scope:'output',planType:'unknown',rights:'unknown',selection:'used'};
const context={platform:'general',commercial:true,distribute:true};
test('reviewed public grants distinguish output ownership, paid entitlement and missing scope',()=>{
 for(const provider of ['meshy','openai','anthropic']){
  assert.equal(aiResult({...base,provider},now).status,'conditions',provider);
  assert.equal(aiResult({...base,provider,scope:'service'},now).status,'review');
  assert.equal(aiResult({...base,provider,planType:'business'},now).status,'review');
 }
 const runway={...base,name:'Runway',serviceName:'Runway',provider:'other'};
 assert.equal(evaluate(runway,context).status,'conditions');
 assert.ok(assetSources(runway,context).some(s=>s.type==='reference'&&s.clause.includes('non-commercial')));
 assert.equal(pdfReportData({name:'Evidence',context,assets:[runway]}).items[0].status,'사용 가능 (조건부)');
 assert.equal(aiResult({...base,provider:'tripo',planType:'paid'},now).status,'conditions');
 assert.equal(evaluate({...base,provider:'tripo',planType:'free'},context).status,'conflict');
 assert.equal(aiResult({...base,provider:'tripo'},now).status,'review');
 assert.match(aiResult({...base,provider:'other',serviceName:'Midjourney'},now).notes.join(' '),/Pro\/Mega/);
 assert.equal(aiResult({...base,provider:'anthropic',useDescription:'evaluation'},now).status,'review');
});
test('new source search reuses actual Runway terms for output and API without making candidates evidence',()=>{
 const text=fs.readFileSync(new URL('./fixtures/real-terms/runway.txt',import.meta.url),'utf8');
 const url='https://runway.com/terms-ofuse',a={...base,name:'Runway',serviceName:'Runway',provider:'other'};
 const candidate={url,verification:{url,finalUrl:url,query:'Runway',status:'matched',checkedAt:new Date().toISOString(),text}};
 for(const scope of ['output','service']){
  const asset={...a,scope,apiAccessConfirmed:true,sourceCandidates:[candidate]};
  const r=evaluate(asset,context);assert.equal(r.status,'conditions',scope);assert.equal(r.contractConfirmed,true);
  assert.ok(assetSources(asset,context).some(s=>s.type==='queried'&&s.clause.length));
 }
 assert.equal(evaluate({...a,scope:'service',sourceCandidates:[candidate]},context).status,'review');
 for(const patch of [{status:'candidate'},{truncated:true},{imported:true},{query:'Different'},{finalUrl:'https://example.org/terms'}])assert.equal(evaluate({...a,sourceCandidates:[{...candidate,verification:{...candidate.verification,...patch}}]},context).status,'review');
});
test('ordinary obligations do not erase explicit grants, unknown entitlement does',()=>{
 const a={...base,provider:'other',serviceName:'New service',manual:true};
 const grant='You may use your outputs for commercial purposes. ';
 const r=analyzeTerms(a,grant+'You must comply with our usage policy. You must preserve copyright notices. You must not infringe copyright rights of others. Outputs may not be unique.');
 assert.equal(r.status,'conditions');assert.equal(r.conditions.length,2);assert.equal(r.checks.length,2);
 for(const clause of ['Only paid subscribers are eligible.','Commercial use is prohibited.','You must purchase an additional license.'])assert.equal(analyzeTerms(a,grant+clause).status,'review');
});
test('existing code and model catalog follows scope, not an automatic tool hold',()=>{
 for(const [name,kind,extra] of [['NumPy','code',{}],['Python','tool',{}],['Docker Engine','tool',{}],['Tailscale','tool',{}],['Project Chrono','code',{}],['NVIDIA Isaac Sim','tool',{reviewScope:'code'}],['Qwen3.6-35B-A3B','model',{}]]){
  const a=supplementCodeLicense({name,kind,...extra});
  for(const commercial of [false,true])assert.equal(evaluate(a,{...context,commercial}).status,'conditions',name);
 }
 const tool={name:'Standalone tool',kind:'tool',license:'GPL-3.0-only',confirmed:true,evidence:'LICENSE',reviewScope:'code'};
 assert.equal(evaluate(tool,context).status,'conditions');assert.ok(evaluate(tool,context).tasks.some(s=>s.includes('대응 소스')));
 assert.equal(evaluate({...tool,kind:'code'},context).status,'review');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewManual} from '../dist/manual-terms.mjs';
import {aiResult,cleanTerms} from '../dist/ai.mjs';
const a={provider:'openai',planType:'paid',scope:'output',rights:'cleared'};
const input={text:'As between you and OpenAI, you (a) retain your ownership rights in Input and (b) own the Output.',sourceUrl:'https://openai.com/policies/row-terms-of-use/',date:'2026-10-15',attested:true};
const now=new Date('2026-10-15T03:00:00Z');
test('manual evidence retains source, original, date and commercial conditions through storage',()=>{
 const t=reviewManual(a,input,now),saved=cleanTerms(t);
 assert.equal(t.status,'conditions');assert.equal(saved.originalText,input.text);
 assert.equal(saved.sourceUrl,input.sourceUrl);assert.equal(saved.method,'manual');
 assert.equal(aiResult({...a,terms:saved},+now).status,'conditions');
 const result=aiResult({...a,rights:'unknown',terms:saved},+now);assert.equal(result.status,'conditions');assert.equal(result.evidenceMethod,'manual');assert.ok(result.humanChecks.some(s=>s.includes('제3자 권리')));assert.ok(result.humanChecks.some(s=>s.includes('자동 확보한 문서가 아닙니다')));assert.ok(result.notes.some(s=>s.includes('직접 입력한 약관')));
 assert.equal(aiResult({...a,terms:cleanTerms(t,{imported:true})},+now).status,'review');
 assert.equal(aiResult({...a,terms:saved},+now+8*86400000).status,'review');
});
test('manual evidence requires valid source, complete input acknowledgement and non-future date',()=>{
 for(const extra of [{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://u:p@example.com'},{date:'2026-02-30'},{date:'2026-10-16'},{attested:false},{text:'tiny'},{text:'a'.repeat(200001)}])assert.throws(()=>reviewManual(a,{...input,...extra},now));
});
test('unrecognized and restricted manual texts do not acquire permission',()=>{
 assert.equal(reviewManual(a,{...input,text:input.text+' Commercial use is prohibited.'},now).status,'review');
 assert.equal(reviewManual({...a,scope:'weights'},input,now).status,'review');
 assert.equal(reviewManual({...a,provider:'other'},input,now).status,'review');
 const text='Free Users: Tripo retains all rights. If you need commercial use rights, upgrade to a paid plan.';
 assert.equal(reviewManual({...a,provider:'tripo',planType:'free'},{...input,text},now).status,'conflict');
});

test('manual permission rechecks the original instead of trusting a cached positive status',()=>{
 const t=reviewManual(a,input,now);
 for(const extra of [{attested:false},{originalText:''},{originalText:'This agreement does not grant any permission for commercial use.'},{queryKey:'changed'}])assert.equal(aiResult({...a,terms:{...t,...extra}},+now).status,'review');
});


test('unknown AI manual grants preserve provenance and separate attribution from human checks',()=>{
 const custom={...a,provider:'other',serviceName:'Synthetic Studio',planType:'unknown',rights:'unknown'};
 for(const text of ['You may use the generated outputs for commercial purposes. You must provide attribution.','사용자는 생성된 결과물을 상업적 목적으로 사용할 수 있습니다. 사용자는 출처를 표시해야 합니다.']){
  const terms=cleanTerms(reviewManual(custom,{...input,text},now));
  const r=aiResult({...custom,terms},+now);
  assert.equal(r.status,'conditions');assert.equal(r.evidenceMethod,'manual');assert.equal(r.contractConfirmed,true);
  assert.ok(terms.conditions.some(s=>s.includes('출처를 표시')));assert.equal(terms.excerpts.length,2);assert.ok(r.humanChecks.length);
  assert.equal(aiResult({...custom,serviceName:'Different',terms},+now).status,'review');
 }
});
test('unknown service ambiguous grants stay pending with exact blocking evidence',()=>{
 const custom={...a,provider:'other',serviceName:'Synthetic Studio',planType:'unknown'};
 const grant='You may use the generated outputs for commercial purposes.';
 for(const extra of ['Only paid subscribers are eligible.','You must purchase an additional license.','Commercial use is prohibited.','허가는 유료 플랜에 한해 적용됩니다.','Unless approved, outputs cannot be distributed.','Payment is mandatory.','Outputs exclude downloadable files.']){
  const terms=reviewManual(custom,{...input,text:grant+' '+extra},now);
  assert.equal(terms.status,'review',extra);assert.ok(terms.excerpts.includes(extra));
 }
 for(const text of ['If you pay, '+grant,'Example: '+grant,'You own your outputs. This is an ownership statement, not a commercial grant.'])assert.equal(reviewManual(custom,{...input,text},now).status,'review');
 assert.equal(reviewManual({...custom,scope:'weights'},{...input,text:grant},now).status,'review');
 assert.equal(reviewManual({...custom,serviceName:''},{...input,text:grant},now).status,'review');
});

import {needsTerms,readTerms} from './third-party.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewManual} from '../dist/manual-terms.mjs';
import {locateEvidence} from '../dist/document-text.mjs';
import {aiResult,cleanTerms,planImpact} from '../dist/ai.mjs';
const text=readTerms(new URL('./fixtures/real-terms/meshy.txt',import.meta.url));
const now=new Date('2026-10-15T12:00:00Z');
const a={kind:'ai',provider:'other',serviceName:'Meshy',planType:'paid',scope:'output',rights:'unknown'};
const input={text,sourceUrl:'https://www.meshy.ai/terms-of-use',date:'2026-10-15',attested:true};
test('actual full Meshy terms work for a directly entered service with plan-specific evidence',needsTerms,()=>{
 assert.equal(planImpact({...a,serviceName:'Meshy AI'},+now).status,'affected');
 assert.equal(reviewManual({...a,serviceName:'Meshy AI'},input,now).status,'conditions');
 for(const planType of ['paid','free']){
  const asset={...a,planType},t=cleanTerms(reviewManual(asset,input,now));
  assert.equal(t.status,'conditions');assert.equal(aiResult({...asset,terms:t},+now).status,'conditions');
  assert.ok(t.excerpts.every(q=>text.includes(q)));assert.ok(t.originalText.includes('Community License'));
 }
 assert.equal(reviewManual({...a,planType:'unknown'},input,now).status,'conditions');
 for(const patch of [{planType:'business'},{scope:'weights'},{serviceName:'Unrelated AI'}])assert.equal(reviewManual({...a,...patch},input,now).status,'review');
 assert.equal(reviewManual(a,{...input,sourceUrl:'https://unrelated.example/terms'},now).status,'review');
});
test('equivalent explicit grants tolerate wording differences without accepting negation or conditions',needsTerms,()=>{
 const custom={...a,serviceName:'Unlisted Test',planType:'unknown'};
 for(const text of ['You are permitted to use your outputs for commercial purposes.','Commercial use of generated outputs is permitted.','사용자는 생성된 결과물을 상업적 용도로 이용할 수 있습니다. 사용자는 출처를 표시해야 합니다.'])assert.equal(reviewManual(custom,{...input,text},now).status,'conditions',text);
 for(const text of ['Commercial use of generated outputs is not permitted.','Commercial use of generated outputs is permitted only for paid subscribers.','You are not permitted to use your outputs for commercial purposes.'])assert.equal(reviewManual(custom,{...input,text},now).status,'review',text);
});

test('real browser PDF and Word extraction retain all text and evidence positions',needsTerms,()=>{
 for(const file of ['meshy-pdf-extracted.txt','meshy-word-extracted.txt']){
  const original=readFileSync(new URL('./fixtures/real-terms/'+file,import.meta.url),'utf8');
  assert.equal(original.replace(/\s/g,''),text.replace(/\s/g,''));
  const t=reviewManual(a,{...input,text:original},now);
  assert.equal(t.status,'conditions');assert.ok(t.excerpts.every(q=>locateEvidence(original,q).length>0));
 }
});
test('reviewed service rules retain restrictions and reject unrelated output uses',needsTerms,()=>{
 assert.equal(reviewManual({...a,useDescription:'커뮤니티 업로드 이미지 이용'},input,now).status,'review');
 assert.equal(reviewManual(a,{...input,sourceUrl:'https://www.meshy.ai.evil.example/terms-of-use'},now).status,'review');
 assert.equal(reviewManual(a,{...input,text:text.replace('such customers on a paid Meshy plan own their Customer Output','such customers on a paid Meshy plan do not own their Customer Output')},now).status,'review');
 assert.equal(reviewManual(a,{...input,text:text+' Commercial use is prohibited.'},now).status,'review');
});

test('export keeps page or paragraph labels and unique links to manual original evidence',needsTerms,()=>{
 const terms=reviewManual(a,input,now);terms.locations=[{label:'Word 추출 문단 56',start:0,end:text.length}];
 const asset={...a,name:'Actual terms',selection:'used',terms};
 const report=buildProjectReport({contextConfirmed:true,name:'Review',assets:[asset,asset],context:{commercial:true,distribute:true},scan:''});
 assert.match(report,/Word 추출 문단 56/);assert.match(report,/href="#terms-0-0"/);assert.match(report,/id="terms-0-0"/);assert.match(report,/id="terms-1-0"/);
 assert.equal((report.match(/id="terms-0-0"/g)||[]).length,1);
});

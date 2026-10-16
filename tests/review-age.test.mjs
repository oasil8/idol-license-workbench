import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {aiResult,queryKey} from '../dist/ai.mjs';
import {reviewStampMarkup,compactResultMarkup} from '../dist/result-sections.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {pdfReportData} from '../report-pdf.mjs';
const a={name:'Midjourney',serviceName:'Midjourney',kind:'ai',provider:'other',scope:'output',planType:'paid',selection:'used'};
const c={commercial:true,distribute:true};
test('built-in Midjourney evidence remains available in December, warns only after 90 days',t=>{
 for(const [date,old] of [['2026-12-01',false],['2027-02-01',true]]){
  const now=Date.parse(date);t.mock.method(Date,'now',()=>now);
  const r=evaluate(a,c);assert.equal(r.reviewedEvidence.method,'public-review');assert.ok(r.reviewedEvidence.excerpts.length);assert.match(r.notes.join(),/Pro\/Mega/);assert.deepEqual(r.reviewDates,['2026-10-16']);assert.equal(r.reviewWarnings.length,old?1:0);
  assert.equal(reviewStampMarkup(r,String),'');
  const html=compactResultMarkup(a,r,assetSources(a,c),String);assert.match(html,/기록일: 2026-10-16/);assert.equal(html.includes('검토한 지 오래된 기록입니다'),old);
  const pdf=pdfReportData({name:'Dates',contextConfirmed:true,context:c,assets:[a]});assert.deepEqual(pdf.items[0].reviewDates,r.reviewDates);assert.deepEqual(pdf.items[0].reviewWarnings,r.reviewWarnings);t.mock.restoreAll();
 }
});
test('live, imported and failed records do not inherit the built-in age exception',()=>{
 const now=Date.parse('2026-12-01');const terms={status:'conditions',summary:'live',checkedAt:'2026-10-16',queryKey:queryKey(a),sourceUrl:'https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service',excerpts:['permission']};
 assert.equal(aiResult({...a,terms},now).status,'review');assert.equal(aiResult({...a,terms:{...terms,method:'public-review',imported:true}},now).status,'review');
 assert.equal(aiResult({...a,terms:{...terms,error:'hash changed'}},now).status,'review');
 const meshy={name:'Meshy',kind:'ai',provider:'meshy',scope:'output',planType:'paid'};assert.equal(aiResult(meshy,now).status,'conditions');
});

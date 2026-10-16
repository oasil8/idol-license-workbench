import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../dist/core.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {compactResultMarkup,resultItems} from '../dist/result-sections.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {pdfReportData,createReportPdf} from '../report-pdf.mjs';
const a={name:'Midjourney',serviceName:'Midjourney',kind:'ai',provider:'other',scope:'output',planType:'paid',selection:'used'},context={commercial:true,distribute:true},p={name:'중복 확인',contextConfirmed:true,context,assets:[a]};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
test('Midjourney reason appears once including expanded evidence, in screen and HTML/PDF data',()=>{
 const r=evaluate(a,context),sentence=r.reviewedEvidence.summary;
 for(const text of [compactResultMarkup(a,r,assetSources(a,context),esc),buildProjectReport(p),JSON.stringify(pdfReportData(p))])assert.equal(text.split(sentence).length-1,1);
 const html=compactResultMarkup(a,r,assetSources(a,context),esc);assert.ok(html.indexOf('해야 할 일')<html.indexOf('<details'));assert.equal((html.match(/You own all Assets You create with the Services/g)||[]).length,1);
 const items=resultItems({tasks:['same','same'],status:'review',blockers:['same','reason'],humanChecks:['same','other']},'reason');assert.deepEqual(items,{conditions:['same'],checks:['other']});
});
test('rendered PDF contains the Midjourney hold sentence only once',async()=>{
 const pdf=await createReportPdf(p);const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const doc=await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;let text='';for(let n=1;n<=doc.numPages;n++)text+=(await (await doc.getPage(n)).getTextContent()).items.map(x=>x.str).join('');
 const normalize=s=>s.replace(/\s+/g,'');assert.equal(normalize(text).split(normalize(evaluate(a,context).reviewedEvidence.summary)).length-1,1);
});


test('built-in notice is not a task and review date appears once in card and actual PDF',async()=>{
 const r=evaluate(a,context),html=compactResultMarkup(a,r,assetSources(a,context),esc);
 const tasks=[...resultItems(r).conditions,...resultItems(r).checks];
 assert.ok(tasks.every(t=>!t.includes('적용했습니다')&&!t.includes('실시간 조회')));
 assert.equal(html.split('2026-10-16').length-1,1);
 assert.equal(html.split('내장 검토 기록 · 실시간 조회 아님').length-1,1);
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const doc=await getDocument({data:new Uint8Array(await createReportPdf(p)),useSystemFonts:true}).promise;
 let text='';for(let n=1;n<=doc.numPages;n++)text+=(await (await doc.getPage(n)).getTextContent()).items.map(x=>x.str).join('');
 assert.equal(text.split('2026-10-16').length-1,1);
 assert.equal(text.replace(/\s/g,'').split('내장검토기록·실시간조회아님').length-1,1);
});

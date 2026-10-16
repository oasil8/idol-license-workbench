import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluate} from '../dist/core.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {compactResultMarkup} from '../dist/result-sections.mjs';
import {displaySources,reviewStampMarkup,resultItems} from '../dist/result-sections.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {pdfReportData,createReportPdf} from '../report-pdf.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
export const mixed=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url),'utf8'));
export async function pdfText(p=mixed,options){const doc=await getDocument({data:new Uint8Array(await createReportPdf(p,options)),useSystemFonts:true}).promise;let text='';for(let i=1;i<=doc.numPages;i++)text+=(await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join('');return text.replace(/\s+/g,'');}
test('non-AI stale fields never change verdict, sources or web/PDF scope; saved originals survive',async()=>{
 const before=JSON.stringify(mixed),a=mixed.assets[0],clean={...a};for(const k of ['provider','serviceName','scope','planType'])delete clean[k];
 assert.deepEqual(evaluate(a,mixed.context),evaluate(clean,mixed.context));
 assert.doesNotMatch(JSON.stringify(assetSources(a,mixed.context)),/Runway|runway/);
 const p={...mixed,assets:mixed.assets.slice(0,2)};
 assert.doesNotMatch(buildProjectReport(p),/Runway|AI 생성 결과물/);
 assert.match(pdfReportData(p).items[0].scope,/코드/);
 assert.doesNotMatch(await pdfText(p),/Runway|AI생성결과물/);
 assert.equal(JSON.stringify(mixed),before);
});
test('verification actions move to checks without losing mixed prohibition obligations',()=>{
 const r={tasks:['고지를 유지하세요.','공식 도메인의 원문을 확인하세요.','결합 범위 검토','출력물을 경쟁 모델 개발에 이용하지 말고, 정확성을 확인하세요.'],humanChecks:[]};
 const parts=resultItems(r);
 assert.deepEqual(parts.conditions,['고지를 유지하세요.','출력물을 경쟁 모델 개발에 이용하지 마세요.']);
 assert.deepEqual(parts.checks,['공식 도메인의 원문을 확인하세요.','결합 범위 검토','정확성을 확인하세요.']);
 for(const name of ['mixed','sample'])for(const item of pdfReportData(JSON.parse(readFileSync(new URL(`./fixtures/report-${name}.json`,import.meta.url)))).items)assert.ok(item.conditions.every(t=>!t.endsWith('확인하세요.')));
});
test('dates and 90-day warnings belong to each source, never the card heading',()=>{
 const r={reviewDates:['2026-01-01'],reviewWarnings:['old'],ruleDate:'2026-10-16'};
 assert.equal(reviewStampMarkup(r,String),'');
 const rows=displaySources(r,[{type:'reference',url:'https://a.example',date:'2026-01-01'},{type:'reference',url:'https://b.example',date:'2026-01-01'},{type:'user',url:'https://c.example',date:'2026-10-15'}],Date.parse('2026-10-16'));
 assert.deepEqual(rows.map(s=>s.date),['2026-01-01','2026-01-01','2026-10-15']);
 assert.ok(rows[0].warning&&rows[1].warning);assert.equal(rows[2].warning,'');
 const html=compactResultMarkup(mixed.assets[0],r,rows,String);
 assert.equal((html.match(/검토한 지 오래된 기록입니다/g)||[]).length,2);
 assert.ok(html.indexOf('2026-01-01')>html.indexOf('report-citations'));
});
test('untrusted saved candidates stay stored but never appear as web/PDF evidence',async()=>{
 const before=JSON.stringify(mixed),html=buildProjectReport(mixed);
 for(const a of [mixed.assets[2],mixed.assets[3]]){
  const card=compactResultMarkup(a,evaluate(a,mixed.context),assetSources(a,mixed.context),String);
  assert.doesNotMatch(card,/sunnoai.com|suno-api.io|apple.com|termly.io|microsoft.com/);
  assert.match(card,/확인 전 검색 후보 [23]개 · 근거로 사용하지 않음/);
 }
 assert.doesNotMatch(html,/sunnoai.com|suno-api.io|apple.com|termly.io|microsoft.com/);
 assert.doesNotMatch(await pdfText(),/sunnoai.com|suno-api.io|apple.com|termly.io|microsoft.com/);
 assert.match(await pdfText(),/확인전검색후보3개/);
 assert.ok(assetSources(mixed.assets[2],mixed.context).some(s=>s.url==='https://suno.com/terms'));
 assert.equal(JSON.stringify(mixed),before);
});
test('unofficial candidate original excerpts are excluded even from the requested appendix',async()=>{
 const p=structuredClone(mixed),a=p.assets[2],candidate=a.sourceCandidates[1];
 candidate.verification={url:candidate.url,query:'Suno',status:'candidate',checkedAt:candidate.searchedAt,text:'UNOFFICIAL EXCERPT MUST STAY HIDDEN',excerpts:[{text:'UNOFFICIAL EXCERPT MUST STAY HIDDEN',start:0}],reason:'Unconfirmed source'};
 const before=JSON.stringify(p);
 assert.doesNotMatch(buildProjectReport(p),/UNOFFICIAL EXCERPT/);
 for(const includeOriginals of [false,true])assert.doesNotMatch(await pdfText(p,{includeOriginals}),/UNOFFICIALEXCERPT|sunnoai.com/);
 assert.equal(JSON.stringify(p),before);
});

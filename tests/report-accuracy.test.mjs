import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf,pdfReportData} from '../report-pdf.mjs';
import {evaluate} from '../dist/core.mjs';
import {outcomeReason,resultItems,compactResultMarkup} from '../dist/result-sections.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
const sample=JSON.parse(readFileSync(new URL('./fixtures/report-sample.json',import.meta.url),'utf8'));
const norm=s=>s.replace(/\s+/g,'');
async function pages(p=sample,options){const doc=await getDocument({data:new Uint8Array(await createReportPdf(p,options)),useSystemFonts:true}).promise;const out=[];for(let i=1;i<=doc.numPages;i++)out.push((await (await doc.getPage(i)).getTextContent()).items);return out;}
const textOf=pages=>pages.flat().map(x=>x.str).join('');
function markup(a){const r=evaluate(a,sample.context);return compactResultMarkup(a,r,assetSources(a,sample.context),String);}
test('conflict reasons identify the restriction in web and actual PDF',async()=>{
 const tripo=sample.assets[2],nc={...sample.assets[3],license:'CC-BY-NC-4.0'};
 for(const [a,phrase] of [[tripo,'무료 플랜 결과물의 상업 이용 권리는 부여되지 않습니다'],[nc,'비상업용(NC) 조건과 선택한 상업 목적이 충돌']]){
 const r=evaluate(a,sample.context);assert.equal(r.status,'conflict');assert.ok(outcomeReason(a,r).includes(phrase));assert.doesNotMatch(outcomeReason(a,r),/조회하지 않았습니다/);assert.ok(markup(a).includes(phrase));assert.ok(resultItems(r).conditions.every(t=>!r.conflicts.includes(t)));
 assert.ok(norm(textOf(await pages({...sample,assets:[a]}))).includes(norm(phrase)));
 }
});

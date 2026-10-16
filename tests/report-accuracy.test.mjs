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

test('built-in and live evidence use accurate reason wording in web and PDF',async()=>{
 const a=sample.assets[1],r=evaluate(a,sample.context);assert.match(outcomeReason(a,r),/검토된 공식 문서 기록/);assert.doesNotMatch(outcomeReason(a,r),/조회한/);
 const {queryKey}=await import('../dist/ai.mjs');const live={...a,terms:{status:'conditions',summary:'조회한 공식 문서의 출력물 권리 조항상 상용 사용 가능 (조건부).',checkedAt:new Date().toISOString(),queryKey:queryKey(a),sourceUrl:'https://www.meshy.ai/terms-of-use',excerpts:['grant'],conditions:[]}};
 assert.match(outcomeReason(live,evaluate(live,sample.context)),/조회한 공식 문서/);
 assert.ok(norm(textOf(await pages({...sample,assets:[a]}))).includes(norm('검토된 공식 문서 기록')));
 assert.ok(norm(textOf(await pages({...sample,assets:[live]}))).includes(norm('조회한 공식 문서')));
});

test('obligations exclude unresolved checks and shared checks occur once per item',async()=>{
 const data=pdfReportData(sample);
 for(const [i,item] of data.items.entries()){
 assert.doesNotMatch(item.conditions.join(' '),/미확인|확인하지 않았습니다|조회 실행/);
 const html=markup(sample.assets[i]);for(const phrase of ['과거 생성물','제3자 권리'])assert.ok(html.split(phrase).length-1<=1,item.name+phrase);
 const text=norm(textOf(await pages({...sample,assets:[sample.assets[i]]})));
 for(const phrase of ['과거 생성물','제3자 권리'])assert.ok(text.split(norm(phrase)).length-1<=1,item.name+phrase);
 }
});

test('rule date never impersonates an asset review in web or PDF',async()=>{
 const a=sample.assets[3];assert.doesNotMatch(markup(a),/검토일/);assert.match(markup(a),/판정 규칙 기준일/);
 const text=textOf(await pages({...sample,assets:[a]}));assert.doesNotMatch(text,/검토일/);assert.ok(norm(text).includes(norm('판정 규칙 기준일: 2026-10-16')));
 assert.match(markup(sample.assets[0]),/검토일: 2026-10-16/);assert.match(textOf(await pages({...sample,assets:[sample.assets[0]]})),/검토일/);
 assert.deepEqual(evaluate({...a,sourceConditionsConfirmed:true,sourceConditionsDate:'2026-10-15'},sample.context).reviewDates,['2026-10-15']);
});

test('unconfirmed PDF retains actual counts without any verdict',async()=>{
 const p={...sample,contextConfirmed:false},data=pdfReportData(p);assert.equal(data.usedCount,6);assert.equal(data.pending,1);assert.equal(data.items.length,0);
 const text=textOf(await pages(p));assert.ok(norm(text).includes(norm('실제 사용 6개 · 선택 전 1개')));assert.doesNotMatch(text,/사용 가능|판단 보류|사용 불가/);
});

test('first PDF page summarizes all used items, conflicts first, and long tables paginate',async()=>{
 const first=textOf([(await pages())[0]]);assert.ok(first.includes('한 줄 이유'));for(const a of sample.assets.filter(a=>a.selection==='used'))assert.ok(first.includes(a.name),a.name);
 assert.ok(first.indexOf('Tripo')<first.indexOf('Midjourney'));assert.ok(first.indexOf('Midjourney')<first.indexOf('Meshy'));
 const many={...sample,assets:Array.from({length:45},(_,i)=>({...sample.assets[3],name:'Library '+i}))};const rendered=await pages(many);assert.ok(textOf([rendered[1]]).includes('한 줄 이유'));assert.ok(textOf(rendered).includes('Library 44'));
});

test('PDF uses three distinct verdict colors and retains text labels',async()=>{
 const {OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');const doc=await getDocument({data:new Uint8Array(await createReportPdf(sample)),useSystemFonts:true}).promise;
 const ops=await (await doc.getPage(1)).getOperatorList();const colors=ops.fnArray.flatMap((op,i)=>op===OPS.setFillRGBColor?[String(ops.argsArray[i])]:[]);
 for(const hex of ['#9e3025','#775310','#16613c'])assert.ok(colors.some(c=>c===hex||c===hex.slice(1).match(/../g).map(x=>parseInt(x,16)).join(',')),hex+JSON.stringify(colors));
 const first=textOf([(await pages())[0]]);for(const label of ['사용 불가','판단 보류','사용 가능'])assert.ok(first.includes(label));
});

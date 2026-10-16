import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf,pdfReportData,pdfBodyLayout} from '../report-pdf.mjs';
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
 assert.match(markup(sample.assets[0]),/기록일: 2026-10-16/);assert.match(textOf(await pages({...sample,assets:[sample.assets[0]]})),/기록일/);
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

test('PDF wraps Korean words at spaces and long URLs stay inside page margins',async()=>{
 const {wrapPdfText}=await import('../report-pdf.mjs');assert.equal(wrapPdfText('권리입니다 확보되지는 않습니다',s=>s.length,10),'권리입니다\n확보되지는 않습니다');assert.equal(wrapPdfText('abcdefghijk',s=>s.length,4),'abcd\nefgh\nijk');
 const rendered=await pages();const lines=[];for(const page of rendered){let line='';for(const item of page){line+=item.str;if(item.hasEOL){lines.push(line);line='';}}if(line)lines.push(line);}
 const layout=pdfBodyLayout(pdfReportData(sample).items);for(const sentence of [...layout.common.map(n=>n.text),...layout.items.flatMap(item=>[item.reason,...item.conditions.slice(0,3),...item.checks.slice(0,3)])])for(const word of sentence.split(/\s+/).filter(w=>/^[가-힣]+[.,:]?$/.test(w)))assert.ok(lines.some(l=>l.includes(word)),word);
 const long={...sample.assets[3],evidence:'https://github.com/mrdoob/three.js/blob/dev/'+ 'a'.repeat(300)+'/LICENSE'};
 for(const page of await pages({...sample,assets:[long]}))for(const item of page)if(item.str.trim())assert.ok(item.transform[4]>=41&&item.transform[4]+item.width<=554,item.str);
});

test('original appendix explains stored originals and built-in excerpts, even when empty',async()=>{
 for(const p of [sample,{...sample,assets:[sample.assets[0]]}]){
 const text=norm(textOf(await pages(p,{includeOriginals:true}))),title=norm('부록 · 전체 보관 원문'),notice=norm('앱에 저장된 원문과 검토 기록의 발췌를 포함합니다. 실시간 조회한 원문이 아니며 출처와 적용 범위를 확인하세요.');
 assert.ok(text.indexOf(title)>=0);assert.ok(text.indexOf(notice)>text.indexOf(title));
 }
});

test('resolved Tripo plan removes obsolete plan task while unknown retains it in web and PDF',async()=>{
 const task='서비스·플랜을 지정하고 최신 약관 조회 실행';
 for(const planType of ['free','unknown']){
 const a={...sample.assets[2],planType};assert.equal(markup(a).includes(task),planType==='unknown');
 const data=pdfReportData({...sample,assets:[a]}),layout=pdfBodyLayout(data.items),pdf=norm(textOf(await pages({...sample,assets:[a]})));
 assert.equal(data.items[0].checks.includes(task),planType==='unknown');
 const visible=layout.items[0].checks.slice(0,3).includes(task)||layout.common.some(n=>n.text===task);
 assert.equal(pdf.includes(norm(task)),visible);if(planType==='unknown'&&!visible)assert.ok(pdf.includes(norm('전체 목록은 웹 화면에 있습니다.')));
 }
});

test('copyleft scope review is one check, never an obligation, in web and actual PDF',async()=>{
 for(const license of ['GPL-3.0','LGPL-2.1-only','AGPL-3.0-only']){
 const a={...sample.assets[4],license},r=evaluate(a,sample.context),items=resultItems(r,outcomeReason(a,r));
 assert.ok(items.conditions.every(t=>!/(검토|확인)[.]?$/.test(t)));assert.equal(items.checks.filter(t=>t.includes('소스 제공')).length,1);
 assert.equal(markup(a).split('소스 제공·재링크').length-1,1);
 const pdf=norm(textOf(await pages({...sample,assets:[a]})));assert.equal(pdf.split(norm('소스 제공·재링크')).length-1,1);assert.ok(!pdf.includes(norm('소스 제공 의무 검토')));
 }
});

test('summary reasons omit the common tail without changing detailed reasons',async()=>{
 const {summaryReasonText}=await import('../dist/result-sections.mjs');const original=outcomeReason(sample.assets[1],evaluate(sample.assets[1],sample.context));assert.match(original,/남은 일은/);assert.doesNotMatch(summaryReasonText(original),/남은|…\./);
 const rendered=await pages(),first=textOf([rendered[0]]);assert.doesNotMatch(first,/남은|…\./);assert.ok(norm(textOf(rendered.slice(1))).includes(norm(original)));assert.ok(markup(sample.assets[1]).includes(original));
 assert.equal(summaryReasonText('첫 문장입니다. 두 번째 문장이 깁니다.',17),'첫 문장입니다…');
});

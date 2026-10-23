import {violationCasesMarkup} from '../dist/violation-cases.mjs';
import * as verdictLog from '../dist/verdict-log.mjs';
import {RULE_DATE} from '../dist/core.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf,pdfReportData} from '../report-pdf.mjs';
import * as sections from '../dist/result-sections.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {evaluate,statuses} from '../dist/core.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {selectedAssets,conditionsConfirmed} from '../dist/workflow.mjs';
const fixture=name=>JSON.parse(readFileSync(new URL(`./fixtures/report-${name}.json`,import.meta.url)));
const norm=s=>s.replace(/\s+/g,'');
const action='현재 사용 조건에서는 이 자료를 쓰지 마세요. 플랜·계약이나 사용 목적이 바뀌면 정보를 수정해 다시 판정하세요.';
async function pdf(p){const doc=await getDocument({data:new Uint8Array(await createReportPdf(p)),useSystemFonts:true}).promise;let text='',links=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);text+=(await page.getTextContent()).items.map(x=>x.str).join('');links.push(...(await page.getAnnotations()).map(x=>x.url).filter(Boolean));}return {text:norm(text),links};}
function screen(p){
 p=structuredClone(p);p.assets.forEach((a,i)=>a.id??=String(i));
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),content={};
 const box={violationCasesMarkup,...verdictLog,RULE_DATE,transact:change=>{change({projects:[p]});return true;},...sections,project:()=>p,$:()=>content,conditionsConfirmed,selectedAssets,evaluate,statuses,assetSources,brandIcon:()=>'',badge:r=>statuses[r.status],esc:String};
 vm.createContext(box);vm.runInContext(app.slice(app.indexOf('function renderReport(){'),app.indexOf('\nfunction setView('))+'\nrenderReport();',box);return content.innerHTML;
}
test('PDF evidence titles show their hostnames and retain link annotations',async()=>{
 const p=fixture('mixed'),out=await pdf(p);
 for(const item of pdfReportData(p).items)for(const s of item.sources.slice(0,2)){
  const host=new URL(s.url).hostname.replace(/^www\./,'');assert.ok(out.text.includes(norm(`근거: ${s.label} (${host})`)),s.label);assert.ok(out.links.includes(s.url),s.url);
 }
});
test('PDF cards and summary remove reason prefixes and common tail, keeping web reasons',async()=>{
 for(const name of ['mixed','sample']){const p=fixture(name),out=await pdf(p);assert.doesNotMatch(out.text,/이유:|남은일은/);for(const item of pdfReportData(p).items)assert.ok(out.text.includes(norm(item.status+' — '+item.reason.replace(/^(사용 가능|보류|사용 불가) 이유: /,'').replace(/ 남은 일은 아래 사용 조건의 이행입니다\.$/,''))));assert.doesNotMatch(screen(p),/이유:|남은 일은/);assert.doesNotMatch(buildProjectReport(p),/이유:|남은 일은/);}
});
test('screen, exported HTML and PDFs use actions instead of unchecked-state sentences',async()=>{
 for(const name of ['mixed','sample']){const p=fixture(name);for(const text of [screen(p),buildProjectReport(p),(await pdf(p)).text])assert.doesNotMatch(norm(text),/확인하지않았습니다|조회하지않았습니다/);}
 const parts=sections.resultItems({status:'review',blockers:['공식 사이트에서 최신 약관을 열어 원문과 적용 플랜을 기록하세요.'],humanChecks:['공식 사이트에서 최신 약관을 열어 원문과 적용 플랜을 기록하세요.']});assert.equal(parts.checks.length,1);assert.match(parts.checks[0],/기록하세요/);
});
test('only conflict cards show the prescribed next action in web and PDF',async()=>{
 const p=fixture('mixed');for(const a of p.assets.filter(a=>a.selection==='used')){const r=evaluate(a,p.context),html=sections.compactResultMarkup(a,r,assetSources(a,p.context),String);assert.equal(html.includes(action),r.status==='conflict');}
 assert.equal(norm(screen(p)).split(norm(action)).length-1,1);
 for(const text of [buildProjectReport(p),(await pdf(p)).text])assert.equal(norm(text).split(norm(action)).length-1,2);
});
test('web groups common tasks once, sorts cards by verdict and keeps edit shortcuts',()=>{
 const p=fixture('mixed');p.assets.forEach((a,i)=>a.id='asset-'+i);const html=screen(p),cards=[...html.matchAll(/<article class="report-item result-card">([\s\S]*?)<\/article>/g)].map(m=>m[1]);
 assert.match(html,/공통 확인사항/);assert.match(html,/해당 항목:/);assert.match(cards[0],/Tripo/);
 const order=[statuses.conflict,statuses.review,statuses.conditions];let prev=-1;for(const card of cards){const index=order.findIndex(s=>card.includes(s));assert.ok(index>=prev);prev=index;}
 // Generic notes leave the screen entirely (still in each item's dialog and in exported reports); specific ones appear once.
 for(const [phrase,count] of [['과거 생성물·별도 계약·외부 콘텐츠에는 당시 계약과 적용 범위를 확인하세요.',0],['플레이어에게 보이는 AI 생성물이면 Steam 공개 대상인지 확인하세요.',1],['금지 콘텐츠·서비스 이용 정책을 준수하세요.',0]]){assert.equal(html.split(phrase).length-1,count,phrase);assert.ok(cards.every(c=>!c.includes(phrase)));}
 assert.match(html,/data-field="planType">플랜 입력하기/);
});
test('shared plan checks preserve a shortcut for each asset and do not mutate project judgments',()=>{
 const p=fixture('sample'),a=p.assets.find(a=>a.name==='Midjourney');
 p.assets=[{...a,id:'first',name:'Midjourney',serviceName:'Midjourney'},{...a,id:'second',name:'Midjourney copy',serviceName:'Midjourney'}];
 const before=JSON.stringify(p),judgments=p.assets.map(a=>evaluate(a,p.context)),html=screen(p),common=html.slice(0,html.indexOf('<article'));
 for(const id of ['first','second'])assert.ok(common.includes(`data-edit="${id}" data-field="planType">플랜 입력하기`));
 assert.equal(JSON.stringify(p),before);assert.deepEqual(p.assets.map(a=>evaluate(a,p.context)),judgments);
 assert.equal(screen({...p,contextConfirmed:false}),'');
});

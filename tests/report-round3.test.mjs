import {violationCasesMarkup} from '../dist/violation-cases.mjs';
import * as verdictLog from '../dist/verdict-log.mjs';
import {RULE_DATE} from '../dist/core.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf} from '../report-pdf.mjs';
import * as sections from '../dist/result-sections.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {evaluate,statuses} from '../dist/core.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {selectedAssets,conditionsConfirmed} from '../dist/workflow.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const norm=s=>s.replace(/\s+/g,'');
const contexts=[{platform:'general',commercial:false,distribute:false,modified:false,network:false},{platform:'research',commercial:false,distribute:true,modified:true,network:false},{platform:'steam',commercial:true,distribute:true,modified:true,network:true}];
function screen(p){
 p=structuredClone(p);p.assets.forEach((a,i)=>a.id??=String(i));
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),content={};
 const box={violationCasesMarkup,...verdictLog,RULE_DATE,transact:change=>{change({projects:[p]});return true;},...sections,project:()=>p,$:()=>content,conditionsConfirmed,selectedAssets,evaluate,statuses,assetSources,brandIcon:()=>'',badge:r=>statuses[r.status],esc:String};
 vm.createContext(box);vm.runInContext(app.slice(app.indexOf('function renderReport(){'),app.indexOf('\nfunction setView('))+'\nrenderReport();',box);return content.innerHTML;
}
const projects=()=>{
 const media=json('./fixtures/real-terms/media-cases.json').map(a=>({...a,selection:'used'}));
 return [json('./fixtures/report-mixed.json'),json('./fixtures/report-sample.json'),...contexts.map(context=>({name:'media',context,contextConfirmed:true,assets:media}))];
};
const obligations=p=>p.assets.filter(a=>a.selection==='used').flatMap(a=>{const r=evaluate(a,p.context);return sections.resultItems(r,sections.outcomeReason(a,r)).conditions;});
const checkBlock=html=>html.match(/<h3>공통 확인사항<\/h3>([\s\S]*?)<\/section>/)?.[1]||'';

test('common obligations stay under the obligations heading in web and exported HTML',()=>{
 for(const p of projects()){
  const duties=obligations(p);
  for(const html of [screen(p),buildProjectReport(p)]){
   const checks=checkBlock(html);
   for(const duty of duties)assert.ok(!checks.includes(duty),`${p.name}: ${duty}`);
  }
 }
 const html=screen(json('./fixtures/report-mixed.json'));
 assert.ok(!html.includes('금지 콘텐츠·서비스 이용 정책을 준수하세요.'));
 assert.match(buildProjectReport(json('./fixtures/report-mixed.json')),/minor-notes[\s\S]*금지 콘텐츠·서비스 이용 정책을 준수하세요\./);
 assert.ok(!checkBlock(html).includes('금지 콘텐츠'));
});

test('PDF common checks section contains no obligation sentence',async()=>{
 for(const p of projects().slice(0,2)){
  const doc=await getDocument({data:new Uint8Array(await createReportPdf(p)),useSystemFonts:true}).promise;let text='';
  for(let i=1;i<=doc.numPages;i++)text+=(await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join('');
  text=norm(text);const start=text.indexOf('공통확인사항'),end=[text.indexOf('그밖의일반주의사항',start),text.indexOf('1.',start)].filter(i=>i>=0),checks=start<0?'':text.slice(start,Math.min(...end));
  for(const duty of obligations(p))assert.ok(!checks.includes(norm(duty)),duty);
 }
});

test('empty task sections are omitted on screen and in exported HTML',()=>{
 for(const p of projects())for(const html of [screen(p),buildProjectReport(p)]){
  assert.doesNotMatch(html,/추가 항목 없음/);
  assert.doesNotMatch(html,/<h[34]>(해야 할 일|지켜야 할 조건|확인 필요한 부분|결과 설명)<\/h[34]>(?!<ul>)/);
 }
});

test('PDF lines are not re-broken by PDFKit after our own wrapping',async()=>{
 const doc=await getDocument({data:new Uint8Array(await createReportPdf(json('./fixtures/report-mixed.json'))),useSystemFonts:true}).promise;
 for(let i=1;i<=doc.numPages;i++){
  const rows=new Map();
  for(const item of (await (await doc.getPage(i)).getTextContent()).items){const y=Math.round(item.transform[5]);rows.set(y,(rows.get(y)||'')+item.str);}
  for(const row of rows.values())assert.notEqual(row.trim(),'Mega');
 }
});

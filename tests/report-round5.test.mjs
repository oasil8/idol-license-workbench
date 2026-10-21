import test from 'node:test';
import vm from 'node:vm';
import * as sections from '../dist/result-sections.mjs';
import * as workflow from '../dist/workflow.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluate} from '../dist/core.mjs';
import {outcomeReason,projectConclusion,conclusionMarkup} from '../dist/result-sections.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {createReportPdf} from '../report-pdf.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
function screen(p){
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),nodes={overall:{},reportContent:{}};
 const box={...sections,...workflow,project:()=>p,$:id=>nodes[id],assetSources,brandIcon:()=>'',badge:r=>r.status,esc:String,p,summary:workflow.projectSummary(p)};
 vm.createContext(box);
 vm.runInContext(app.slice(app.indexOf('function renderReport(){'),app.indexOf('\nfunction setView('))+'\nrenderReport();'+app.slice(app.indexOf(' const overall=summary.status;'),app.indexOf(' renderProjects();')),box);
 return nodes.overall.innerHTML+nodes.reportContent.innerHTML;
}
const fixture=name=>JSON.parse(readFileSync(new URL(`./fixtures/report-${name}.json`,import.meta.url)));
const norm=s=>s.replace(/\s+/g,'');
const disclaimer='검토 기록이며 출시 승인·법률 의견이 아닙니다.';
test('round5 shared conclusion lists only conflicts, reviews and pending in priority order in all outputs',async()=>{
 for(const name of ['mixed','sample']){
  const p=fixture(name),c=projectConclusion(p);
  assert.equal(c.title,'Steam 상업 출시: 아직 불가');
  const expected=['conflict','review','pending'].flatMap(status=>p.assets.filter(a=>status==='pending'?a.selection==='pending':a.selection!=='pending'&&evaluate(a,p.context).status===status).map(a=>a.name));
  assert.deepEqual(c.actions.map(a=>a.name),expected);
  const htmls=[screen(p),buildProjectReport(p)];
  for(const html of htmls){assert.ok(html.indexOf('project-conclusion')<html.indexOf('common-checks'));}
  for(const item of sections.resultLayout(workflow.selectedAssets(p),p.context).items.filter(i=>i.r.status==='review'))assert.equal(c.actions.find(a=>a.name===item.name).action,item.checks[0]);
  const pdf=await getDocument({data:new Uint8Array(await createReportPdf(p)),useSystemFonts:true}).promise;
  const pages=[];for(let i=1;i<=pdf.numPages;i++)pages.push((await (await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(''));
  // The screen folds actions into one chip per verdict; reports keep the full list.
  const web=htmls[0];assert.ok(norm(web).includes(norm(c.title)));
  for(const key of ['conflict','review','conditions','pending']){
   const group=web.match(new RegExp(`<details class="verdict-group ${key}" name="verdict">([\\s\\S]*?)</details>`))?.[1]||'';
   for(const a of [...c.actions,...c.usable].filter(a=>a.status===key))assert.ok(group.includes(`<b>${a.name}</b> — ${a.action}`),a.name);
  }
  assert.ok(c.usable.length&&c.usable.every(a=>!c.actions.some(x=>x.name===a.name)));
  // PDF page 1 is a single table: every item with its to-do in the same row.
  assert.ok(norm(pages[0]).includes(norm(c.title))&&norm(pages[0]).includes(norm(c.countsText)));
  for(const a of [...c.actions,...c.usable])assert.ok(norm(pages[0]).includes(norm(a.name))&&norm(pages[0]).includes(norm(a.action)),a.name);
  for(const output of [htmls[1]]){
   assert.ok(norm(output).includes(norm(c.title)));
   const list=output.slice(output.indexOf(c.actionsTitle),output.indexOf(c.conditionsText));
   for(const a of c.actions)assert.ok(norm(list).includes(norm(a.name+' — '+a.action)),a.name);
   for(const a of p.assets.filter(a=>a.selection!=='pending'&&evaluate(a,p.context).status==='conditions'))assert.ok(!list.includes(a.name));
   assert.equal(norm(output).split(norm(c.countsText)).length-1,1);
  }
  for(const output of [htmls[1],pages.join('')]){assert.equal(norm(output).split(norm(disclaimer)).length-1,1);assert.equal(norm(output).split(norm(c.countsText)).length-1,1);}
  assert.equal(norm(web).split(norm(disclaimer)).length-1,1);
 }
});
test('round5 no pending or empty project is shown as possible',()=>{
 const p=fixture('sample');p.assets=p.assets.filter(a=>a.name==='three.js');
 assert.equal(projectConclusion(p).title,'Steam 상업 출시: 가능 (조건 이행 필요)');
 p.assets.push({name:'미정',selection:'pending'});assert.match(projectConclusion(p).title,/판단 보류/);
 p.assets=[];assert.match(projectConclusion(p).title,/판단 보류/);
});
test('round5 result starts with conclusion and removes repeated explanations',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const view=html.slice(html.indexOf('<section id="reportView"'),html.indexOf('<section id="guideView"'));
 assert.ok(view.indexOf('id="overall"')<view.indexOf('report-toolbar'));
 assert.ok(view.indexOf('id="overall"')<view.indexOf('id="reportContent"'));
 for(const text of ['실제 사용하는 자료의 결론과 근거를 확인하세요.','결과는 적용 라이선스·계약상 허용 여부입니다. 실제 자료의 권리는 별도 확인 사항을 보세요.','기본은 핵심 결과만 PDF로 저장합니다. 원문은 앱에 그대로 보관됩니다.'])assert.ok(!app.includes(text)&&!view.includes(text));
 assert.ok(!view.includes('id="stats"'));assert.ok(view.includes('id="exportReport"'));
 assert.match(app,/conclusionMarkup\(p,esc,\{fold:true\}\)/);
});
test('round5 Blender ambiguous tool scope stays on hold with actionable reason',()=>{
 const p=fixture('sample'),a=p.assets.find(a=>a.name==='Blender');
 for(const changes of [{},{reviewScope:'bundle'},{reviewScope:'code'}]){
  const asset={...a,...changes},r=evaluate(asset,p.context);
  assert.equal(r.status,'review');if(changes.reviewScope!=='code')assert.match(outcomeReason(asset,r),/도구 자체의 배포·번들 여부 미확인/);
 }
 // The project-level to-do names the tool question, not code-linking details.
 const action=projectConclusion(p).actions.find(x=>x.name==='Blender').action;
 assert.match(action,/도구 자체를 함께 배포·수정·번들/);assert.doesNotMatch(action,/정적\/동적 링크/);
});

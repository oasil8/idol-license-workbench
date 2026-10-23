import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,validateProject} from '../dist/core.mjs';
import {reviewSourceConditions} from '../dist/official-sources.mjs';
import {validateWorkspace} from '../dist/backup.mjs';
import {projectViolationCases,violationCasesMarkup,violationCases,caseDisclaimer} from '../dist/violation-cases.mjs';
import {resultLayout,projectConclusion,reportDisclaimer} from '../dist/result-sections.mjs';
import {organizationCheck} from '../dist/result-layout.mjs';
import {renderReportPdf} from '../dist/pdf-report.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {contextKey,cleanVerdictLog,recordVerdict,inputSnapshot} from '../dist/verdict-log.mjs';
import {assets,contexts} from './sentence-matrix.mjs';
import PDFDocument from 'pdfkit';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {readFileSync} from 'node:fs';

const project=assets=>({name:'21차',contextConfirmed:true,context,assets:assets.map(a=>({...a,selection:'used'}))});
const gpl={name:'GPL 자료',kind:'code',license:'GPL-3.0-only',confirmed:true,evidence:'원문 확인'};
const nc={name:'NC 자료',kind:'image',license:'CC-BY-NC-4.0',confirmed:true,evidence:'원문 확인'};
const ai={name:'AI 자료',kind:'ai',provider:'openai',scope:'output'};
test('cases group relevant materials once and omit an empty section',()=>{
 for(const [a,id] of [[gpl,'A'],[nc,'B'],[ai,'C'],[{name:'미확인 이미지',kind:'image'},'B']]){
  const items=resultLayout([a,{...a,name:a.name+' 2'}],context).items,cases=projectViolationCases(items);
  assert.equal(cases.filter(c=>c.id===id).length,1);assert.deepEqual(cases.find(c=>c.id===id).names,[a.name,a.name+' 2']);
  const html=violationCasesMarkup(items,String);assert.match(html,/<details[^>]*><summary>위반하면/);assert.ok(html.includes(caseDisclaimer));
 }
 const own={name:'직접 만든 이미지',kind:'image',license:'LicenseRef-Own-Work',confirmed:true};
 assert.equal(violationCasesMarkup(resultLayout([own],context).items,String),'');
 const html=buildProjectReport(project([gpl,nc,ai]));
 for(const c of violationCases)for(const e of c.entries)if(e.url)assert.ok(html.includes(e.url));
 assert.equal((html.match(/위반하면 어떤 일이 생기나요/g)||[]).length,1);
});
test('default context preserves every verdict, condition and check across the existing matrix',()=>{
 for(const c of contexts)for(const a of assets)assert.deepEqual(evaluate(a,{...c,region:'',organizationPolicy:false}),evaluate(a,c));
 for(const c of contexts)assert.deepEqual(resultLayout(assets,{...c,region:'',organizationPolicy:false}),resultLayout(assets,c));
});
test('organization checkbox adds only a common check and region identifies history',()=>{
 const p=project([gpl]);const c={...context,region:'kr',organizationPolicy:true};
 assert.deepEqual(evaluate(gpl,c),evaluate(gpl,context));
 assert.ok(resultLayout([gpl],c).common.some(n=>n.text===organizationCheck));
 assert.ok(!resultLayout([gpl],context).common.some(n=>n.text===organizationCheck));
 assert.match(projectConclusion({...p,context:c}).contextText,/사용 지역 한국/);
 assert.doesNotMatch(projectConclusion(p).contextText,/사용 지역/);
 assert.equal(contextKey({...context,region:'',organizationPolicy:false}),contextKey(context));
 const log=recordVerdict([],{status:'review',reason:'확인',inputs:inputSnapshot(gpl),ruleDate:'2026-10-16'},contextKey(c),'2026-10-23');
 assert.equal(cleanVerdictLog(log)[0].context,contextKey(c));
});
test('PDF prints cases after cards, links sources and preserves the closing paragraph',async()=>{
 const calls=[];
 class Capture extends PDFDocument {text(value,x,y,options){calls.push({value,options});return super.text(value,x,y,options);}}
 const p={...project([gpl,nc,ai]),context:{...context,region:'kr',organizationPolicy:true}};
 const bytes=await renderReportPdf(p,{PDFDocument:Capture,font:process.env.IDOL_PDF_FONT||'web/fonts/NanumGothic-Regular.ttf'});
 const index=calls.findIndex(c=>c.value==='참고: 위반 시 사례');assert.ok(index>0);
 assert.ok(calls.findIndex(c=>c.value===reportDisclaimer)>index);
 assert.ok(calls.some(c=>c.value===organizationCheck));
 for(const entry of violationCases.flatMap(c=>c.entries).filter(e=>e.url))assert.ok(calls.slice(index).some(c=>c.options?.link===new URL(entry.url).href));
 const doc=await getDocument({data:bytes,useSystemFonts:true}).promise,links=[];
 for(let i=1;i<=doc.numPages;i++)links.push(...(await (await doc.getPage(i)).getAnnotations()).map(a=>a.url));
 for(const entry of violationCases.flatMap(c=>c.entries).filter(e=>e.url))assert.ok(links.some(url=>decodeURI(url||'')===entry.url));
});
test('new browser module is served and included by the site build copy rule',()=>{
 assert.ok(readFileSync(new URL('../server.mjs',import.meta.url),'utf8').includes("'violation-cases.mjs'"));
 const build=readFileSync(new URL('../tools/build-site.mjs',import.meta.url),'utf8');
 assert.match(build,/for\(const name of readdirSync\(join\(root,'dist'\)\)\)if\(!skip.test\(name\)\)copy/);
 const skip=new RegExp(build.match(/const skip=\/(.*)\/;/)[1]);assert.equal(skip.test('violation-cases.mjs'),false);
});

const context={platform:'steam',commercial:true,distribute:true,modified:false,network:false};
const hunyuan={name:'Hunyuan3D 2.0',kind:'model',version:'2.0',selection:'used'};
test('Hunyuan 2.0 excludes recorded territories and preserves other blockers',()=>{
 for(const region of ['kr','eu','uk'])assert.equal(evaluate(hunyuan,{...context,region}).status,'conflict');
 for(const region of ['','other'])assert.equal(evaluate(hunyuan,{...context,region}).status,'review');
 const us=reviewSourceConditions(hunyuan,{...context,region:'us'});
 assert.ok(!us.blockers.some(t=>t.includes('사용 지역')));
 assert.ok(us.blockers.some(t=>t.includes('조직/고객')));
 assert.equal(evaluate(hunyuan,{...context,region:'us'}).status,'review');
 assert.notEqual(evaluate({...hunyuan,version:'2.1'},{...context,region:'kr'}).status,'conflict');
 assert.notEqual(evaluate({...hunyuan,kind:'ai',scope:'service'},{...context,region:'kr'}).status,'conflict');
 for(const region of ['kr','eu','uk']){
  const r=evaluate(hunyuan,{...context,region});
  assert.ok(r.conflicts.includes(`이 라이선스의 허용 지역에서 ${{kr:'한국',eu:'EU',uk:'영국'}[region]}이 제외됩니다.`));
  assert.ok(r.sources.some(([,url])=>url==='https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE'));
 }
});
test('context values survive validation and backup round trip',()=>{
 const p={name:'지역',context:{...context,region:'kr',organizationPolicy:true},assets:[hunyuan]};
 const restored=validateWorkspace(JSON.parse(JSON.stringify({type:'license-workbench-workspace',schemaVersion:1,projects:[validateProject(p)],trash:[]}))).projects[0];
 assert.equal(restored.context.region,'kr');assert.equal(restored.context.organizationPolicy,true);
 assert.equal(validateProject({...p,context}).context.region,'');
 assert.equal(validateProject({...p,context}).context.organizationPolicy,false);
 assert.equal(validateProject({...p,context:{...context,region:'invalid',organizationPolicy:'true'}}).context.region,'');
});

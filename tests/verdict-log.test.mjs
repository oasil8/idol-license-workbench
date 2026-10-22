import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as history from '../dist/verdict-log.mjs';
import * as sections from '../dist/result-sections.mjs';
import * as workflow from '../dist/workflow.mjs';
import {assetSources} from '../dist/evidence-sources.mjs';
import {RULE_DATE} from '../dist/core.mjs';
import assert from 'node:assert/strict';
import {contextKey,inputSnapshot,recordVerdict,verdictState,verdictHistoryMarkup} from '../dist/verdict-log.mjs';
import {validateProject,evaluate} from '../dist/core.mjs';
import {validateWorkspace} from '../dist/backup.mjs';
import {pdfReportData} from '../dist/pdf-report.mjs';

const context={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
const key=contextKey(context),today='2026-10-22';
const asset={name:'이미지',kind:'image',license:'CC0-1.0',confirmed:true,evidence:'직접 확인한 원문',rights:'cleared',selection:'used'};
const verdict=(a=asset,status=evaluate(a,context).status)=>({status,reason:'판정 이유',inputs:inputSnapshot(a),ruleDate:'2026-10-16'});
const first=()=>recordVerdict([],verdict(),key,today);
const project=log=>({name:'기록',context,contextConfirmed:true,assets:[{...asset,verdictLog:log}]});

test('first verdict and state labels',()=>{
 assert.equal(key,'steam|true|true|true|false');
 assert.equal(first().length,1);assert.equal(first()[0].on,today);
 assert.equal(verdictState('conditions'),'확정');assert.equal(verdictState('conflict'),'확정');assert.equal(verdictState('review'),'잠정');
 assert.equal(recordVerdict([],verdict(asset,'review'),key,today)[0].status,'review');
});
test('unchanged returns same array; wording updates only reason and preserves first date',()=>{
 const log=first();assert.equal(recordVerdict(log,verdict(),key,'2026-10-23'),log);
 const next=recordVerdict(log,{...verdict(),reason:'다듬은 문구',inputs:inputSnapshot({...asset,version:'2'})},key,'2026-10-23');
 assert.deepEqual(next,[{...log[0],reason:'다듬은 문구'}]);assert.equal(log[0].reason,'판정 이유');
});
test('status change retracts prior verdict with readable changed inputs',()=>{
 const log=first(),a={...asset,license:'CC-BY-NC-4.0'};
 assert.equal(evaluate(a,context).status,'conflict');
 const next=recordVerdict(log,verdict(a),key,'2026-10-23');
 assert.equal(next.length,2);assert.equal(next[0].retractedOn,'2026-10-23');
 assert.match(next[0].retractedWhy,/라이선스: CC0-1.0 → CC-BY-NC-4.0/);assert.equal(log[0].retractedOn,undefined);
});
test('different purpose is independent and returning to it uses its active entry',()=>{
 const other=contextKey({...context,platform:'research'});
 const next=recordVerdict(first(),verdict(asset,'review'),other,today);
 assert.ok(next.every(x=>!x.retractedOn));assert.equal(recordVerdict(next,verdict(),key,today),next);
});
test('rule date and evidence fallback explain retractions',()=>{
 assert.match(recordVerdict(first(),{...verdict(asset,'review'),ruleDate:'2026-10-22'},key,today)[0].retractedWhy,/판정 규칙 갱신 \(기준일 2026-10-16 → 2026-10-22\)/);
 assert.equal(recordVerdict(first(),verdict(asset,'review'),key,today)[0].retractedWhy,'공식 기록의 확인 기간 경과 또는 근거 변경');
 const changed=recordVerdict(first(),verdict({...asset,confirmed:false,planType:'paid'},'review'),key,today);
 assert.match(changed[0].retractedWhy,/원문 확인: 예 → 아니요/);assert.match(changed[0].retractedWhy,/플랜: 미확인 → 유료/);
});
test('keeps only newest 30 entries',()=>{
 let log=[];for(let i=0;i<40;i++)log=recordVerdict(log,verdict(asset,i%2?'review':'conditions'),key,today);
 assert.equal(log.length,30);assert.equal(log.filter(x=>!x.retractedOn).length,1);
});
test('validation preserves valid logs, drops malformed entries, and accepts legacy projects',()=>{
 const valid=first()[0];
 const bad=[null,{}, {...valid,status:'ok'},{...valid,status:['review']},{...valid,on:'yesterday'},{...valid,on:[today]},{...valid,ruleDate:[today]},{...valid,reason:'x'.repeat(601)},{...valid,inputs:{confirmed:'yes'}},{...valid,retractedOn:today,retractedWhy:'x'.repeat(301)}];
 assert.deepEqual(validateProject(project([valid,...bad])).assets[0].verdictLog,[valid]);
 assert.deepEqual(validateProject(project(undefined)).assets[0].verdictLog,[]);
 assert.deepEqual(validateProject(project({})).assets[0].verdictLog,[]);
 assert.equal(validateProject(project(Array(40).fill(valid))).assets[0].verdictLog.length,30);
});
test('JSON project and workspace backups preserve verdict history',()=>{
 const p=project(recordVerdict(first(),verdict(asset,'review'),key,today));
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))).assets[0].verdictLog,p.assets[0].verdictLog);
 const restored=validateWorkspace(JSON.parse(JSON.stringify({type:'license-workbench-workspace',schemaVersion:1,projects:[p],trash:[p]})));
 for(const item of [...restored.projects,...restored.trash])assert.deepEqual(item.assets[0].verdictLog,p.assets[0].verdictLog);
});
test('history escapes content, filters context and shows newest first',()=>{
 const log=recordVerdict(first(),{...verdict(asset,'review'),reason:'<script>'},key,'2026-10-23');
 const esc=s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html=verdictHistoryMarkup(log,key,esc);
 assert.match(html,/<details/);assert.match(html,/이전 결론 철회 1건/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.ok(html.indexOf('2026-10-23')<html.indexOf('2026-10-22'));
 assert.equal(verdictHistoryMarkup(log,'other',esc),'');assert.equal(verdictHistoryMarkup(first(),key,esc),'');
});
test('PDF history summary only for current context with a record',()=>{
 assert.equal(pdfReportData(project(first())).items[0].verdictHistory,'판정 기록: 확정 (2026-10-22)');
 const log=recordVerdict(first(),verdict(asset,'review'),key,today);
 assert.equal(pdfReportData(project(log)).items[0].verdictHistory,'판정 기록: 잠정 (2026-10-22) · 이전 결론 철회 1건');
 assert.equal(pdfReportData(project([])).items[0].verdictHistory,'');
});

test('render records only used assets, saves only changes, keeps judgments, and uses Korean date',()=>{
 const p={...project([]),id:'p'};p.assets[0].id='used';
 for(const selection of ['pending','alternative','excluded'])p.assets.push({...asset,id:selection,selection});
 const before=p.assets.map(a=>evaluate(a,p.context));
 const state={projects:[p],trash:[],current:'p'},node={};let saves=0;
 const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const box={...history,...sections,...workflow,assetSources,RULE_DATE,project:()=>state.projects[0],$:()=>node,esc:String,brandIcon:()=>'',badge:r=>r.status,
  Date:class extends Date{constructor(){super('2026-10-21T15:00:00.000Z');}},
  transact:change=>{workflow.commitChange(state,change,()=>{saves++;return true;});return true;}};
 vm.createContext(box);vm.runInContext(source.slice(source.indexOf('function renderReport(){'),source.indexOf('\nfunction setView(')),box);
 vm.runInContext('renderReport();renderReport();',box);
 assert.equal(saves,1);assert.equal(state.projects[0].assets[0].verdictLog[0].on,'2026-10-22');
 assert.ok(state.projects[0].assets.slice(1).every(a=>a.verdictLog===undefined));
 assert.deepEqual(state.projects[0].assets.map(a=>evaluate(a,p.context)),before);
 assert.match(node.innerHTML,/확정 · 2026-10-22/);
 state.projects[0].assets[0].license='CC-BY-NC-4.0';vm.runInContext('renderReport();renderReport();',box);
 assert.equal(saves,2);assert.equal(state.projects[0].assets[0].verdictLog.length,2);assert.match(node.innerHTML,/철회 1건/);
});

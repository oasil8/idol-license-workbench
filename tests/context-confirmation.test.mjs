import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateProject} from '../dist/core.mjs';
import {conditionsConfirmed} from '../dist/workflow.mjs';
import {buildProjectReport} from '../dist/report.mjs';
import {pdfReportData} from '../report-pdf.mjs';
const p={name:'조건 미확인',assets:[{name:'MIT fixture',kind:'code',license:'MIT',evidence:'https://opensource.org/license/mit',selection:'used',confirmed:true}],context:{commercial:true,distribute:true}};
test('new, existing and imported projects require explicit context confirmation before reports',()=>{
 for(const flag of [undefined,false,'true']){const project=validateProject({...p,contextConfirmed:flag});assert.equal(conditionsConfirmed(project),false);assert.match(buildProjectReport(project),/사용 조건을 먼저 정하세요/);assert.doesNotMatch(buildProjectReport(project),/사용 가능|MIT fixture/);assert.equal(pdfReportData(project).items.length,0);assert.equal(pdfReportData(project).status,'사용 조건을 먼저 정하세요');}
 const confirmed=validateProject({...p,contextConfirmed:true});assert.equal(pdfReportData(confirmed).items[0].status,'사용 가능 (조건부)');assert.match(buildProjectReport(confirmed),/MIT fixture/);
});
test('fresh defaults match import defaults and applying conditions sets the flag',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const fresh=vm.runInNewContext(app.match(/const fresh=([^;]+);/)[1],{crypto:{randomUUID:()=> 'id'}})('new');assert.deepEqual(JSON.parse(JSON.stringify(fresh.context)),validateProject({name:'import',assets:[]}).context);assert.equal(fresh.contextConfirmed,false);
 const elements={applyContext:{},contextPending:{}},context={commercial:false,distribute:false};
 vm.runInNewContext(app.slice(app.indexOf("$('applyContext').onclick="),app.indexOf("$('homeLink').onclick=")),{$:id=>elements[id],readContextDraft:()=>context,transact:fn=>{fn({projects:[fresh],current:'id'});return true;},contextDraft:null,contextDraftProject:'',render(){},message(){}});
 elements.applyContext.onclick();assert.equal(fresh.contextConfirmed,true);assert.equal(fresh.context,context);
});


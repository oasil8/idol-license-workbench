import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,validateProject,projectTasks} from '../dist/core.mjs';
import {selectionOf,selectedAssets,projectSummary,commitChange} from '../dist/workflow.mjs';
import {splitImportFiles,isLicenseDocument,licenseAsset} from '../dist/import-files.mjs';
import {buildProjectReport} from '../dist/report.mjs';
const context={platform:'steam',commercial:true,distribute:true,modified:false,network:false};
const mit={name:'own code',kind:'code',license:'MIT',confirmed:true,evidence:'https://example.com/license'};
test('legacy direct entries stay selected; document candidates require a choice; original data survives',()=>{
 const raw={name:'Legacy',context,assets:[mit,{...mit,name:'candidate',notes:'과제 자료에서 언급된 검토 후보입니다. 실제 사용 여부 확인'}]};
 const saved=validateProject(raw,{local:true});
 assert.equal(selectionOf(saved.assets[0]),'used');assert.equal(selectionOf(saved.assets[1]),'pending');
 assert.equal(saved.assets[1].notes,raw.assets[1].notes);assert.equal(saved.assets[0].evidence,mit.evidence);
 for(const state of ['used','alternative','excluded','pending'])assert.equal(validateProject({...raw,assets:[{...mit,selection:state}]},{local:true}).assets[0].selection,state);
});
test('only used assets contribute; unresolved choices prevent an overall clearance',()=>{
 const p={name:'Test',context,assets:[{...mit,selection:'used'},{...mit,license:'CC-BY-NC-4.0',selection:'excluded'},{...mit,selection:'alternative'}]};
 assert.equal(selectedAssets(p).length,1);assert.equal(projectSummary(p).status,'conditions');
 assert.equal(projectTasks(p).some(x=>x.task.includes('대체')),false);
 p.assets.push({...mit,selection:'pending'});assert.equal(projectSummary(p).status,'review');
 p.assets[0].selection='excluded';assert.equal(projectSummary(p).status,'review');
});
test('confirmed Chrono license does not need a redundant version gate',()=>{
 const a={...mit,name:'Project Chrono',license:'BSD-3-Clause',version:''};
 assert.equal(evaluate(a,context).status,'conditions');
 const completed=evaluate({...a,version:'9.0',sourceConditionsConfirmed:true},context);
 assert.equal(completed.status,'conditions');
});
test('save rejection rolls back changes and selection, reports failure',()=>{
 const state={projects:[{id:'a',name:'original'}],current:'a'};
 assert.throws(()=>commitChange(state,s=>{s.projects.push({id:'b'});s.current='b';},()=>false),/저장/);
 assert.deepEqual(state,{projects:[{id:'a',name:'original'}],current:'a'});
 assert.equal(commitChange(state,s=>{s.projects[0].name='updated';},()=>true),true);
 assert.equal(state.projects[0].name,'updated');
});
test('PDF and Word licenses use document extraction and keep text, dates and locations',()=>{
 const files=['LICENSE.pdf','LICENSE.docx','NOTICE.PDF','COPYING.txt','slides.pptx'].map(name=>({name}));
 assert.deepEqual(splitImportFiles(files).documents.map(x=>x.name),['LICENSE.pdf','LICENSE.docx','NOTICE.PDF','slides.pptx']);
 assert.equal(isLicenseDocument('folder/LICENSE.docx'),true);
 const text='Permission is hereby granted, free of charge. This permission notice shall be included.';
 const a=licenseAsset({name:'LICENSE.pdf'},{text,locations:[{label:'PDF 1페이지',start:0,end:text.length}],warnings:[]});
 assert.equal(a.license,'MIT');assert.equal(a.confirmed,false);assert.equal(a.selection,'pending');
 const loaded=validateProject({name:'Test',context,assets:[a]},{local:true}).assets[0];
 assert.equal(loaded.licenseDocument.text,text);assert.equal(loaded.licenseDocument.locations[0].label,'PDF 1페이지');
});
test('report has one material section with conclusion, conditions, evidence and sources',()=>{
 const a={...mit,selection:'used',name:'UNIQUE_MATERIAL',terms:undefined};
 const html=buildProjectReport({name:'Test',context,assets:[a,{...mit,name:'UNUSED',selection:'excluded'}]});
 assert.equal((html.match(/<h2[^>]*>(?:<[^>]+>[^<]*<\/[^>]+>)?UNIQUE_MATERIAL<\/h2>/g)||[]).length,1);
 assert.equal((html.match(/<h2[^>]*>[^]*?UNUSED<\/h2>/g)||[]).length,0);
 assert.match(html,/https:\/\/example.com\/license/);assert.match(html,/지켜야 할 조건/);
 assert.ok(!html.includes('원문 대조와 출처 —'));
});

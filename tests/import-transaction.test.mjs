import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupAssignment} from '../dist/assignment-ui.mjs';
import {commitChange} from '../dist/workflow.mjs';
import {projectFingerprint} from '../dist/projects.mjs';
import {reviewSourceConditions} from '../dist/official-sources.mjs';
const code=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const c={platform:'steam',commercial:true,distribute:true,modified:false,network:false};
function context(){
 const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',disabled:false});return elements.get(id);};
 const p={id:'old',name:'Original',context:c,assets:[]};let persisted=structuredClone(p);
 const box={projects:[p],trash:[],current:'old',structuredClone,commitChange,projectFingerprint,JSON,Error,Set,Map,$,message:()=>{},render:()=>{},setView:()=>{},busy:false,importing:false,save:()=>false};
 box.project=()=>box.projects.find(p=>p.id===box.current);
 vm.createContext(box);
 const inject=(start,end)=>vm.runInContext(code.slice(code.indexOf(start),code.indexOf(end,code.indexOf(start))),box);
 inject('function transact(change){','const badge=');
 inject(' function addProject(p){',"\n $('newForm')");
 return {box,$,inject};
}
test('actual addProject caller propagates quota failure without keeping new project',()=>{
 const {box}=context();const original=JSON.stringify(box.projects);
 assert.equal(box.addProject({id:'new',name:'new',context:c,assets:[]}),undefined);
 assert.equal(JSON.stringify(box.projects),original);assert.equal(box.current,'old');
});
test('mixed import stages docs and assets then rolls back on failed persistence',async()=>{
 const {box,$,inject}=context();box.splitImportFiles=()=>({documents:[{name:'a.pdf'}],assets:[{name:'x.js'}],ignored:[]});
 box.readAssignment=async()=>({...structuredClone(box.project()),assets:[{name:'document'}]});
 box.scan=async(files,p)=>{p.assets.push({name:'source'});return {failed:0};};
 inject(' async function importFiles(files){',"\n for(const id of ['folderInput','filesInput'])");
 await box.importFiles([{name:'a.pdf'},{name:'x.js'}]);
 assert.equal(box.projects[0].assets.length,0);assert.match($('importProgress').textContent,/가져오기 실패/);
 assert.equal(box.importing,false);
});
test('mixed import commits once, preserves context and stays on intake',async()=>{
 const {box,inject}=context();let saves=0,view='';box.save=()=>{saves++;return true;};box.setView=v=>view=v;
 box.splitImportFiles=()=>({documents:[{name:'a.pdf'}],assets:[{name:'x.js'}],ignored:[]});
 box.readAssignment=async(files,p)=>({...structuredClone(p),assets:[{name:'candidate',selection:'pending'}]});
 box.scan=async(files,p)=>{p.assets.push({name:'source',selection:'pending'});return {failed:0};};
 inject(' async function importFiles(files){',"\n for(const id of ['folderInput','filesInput'])");
 await box.importFiles([{name:'a.pdf'},{name:'x.js'}]);
 assert.equal(saves,1);assert.equal(view,'');assert.equal(box.projects[0].assets.length,2);assert.deepEqual(box.projects[0].context,c);
});
test('document loader keeps original data and separates license documents from tool mentions',async()=>{
 const previous=globalThis.document;globalThis.document={getElementById:()=>({})};
 try{
  const p={id:'original',name:'Existing',context:c,assets:[{name:'Original source',notes:'Keep me'}]};
  const original=JSON.stringify(p);const calls=[];
  const read=setupAssignment({project:()=>p,save:()=>true,render:()=>{},extract:async f=>{
   calls.push(f.name);return {text:f.name==='LICENSE.pdf'?'Permission is hereby granted, free of charge. This permission notice shall be included.':'Blender and Unity',locations:[],warnings:[]};
  }});
  const result=await read([{name:'LICENSE.pdf',size:100},{name:'notes.docx',size:100}],p);
  assert.deepEqual(calls,['LICENSE.pdf','notes.docx']);assert.equal(JSON.stringify(p),original);
  assert.equal(result.assets.length,4);assert.equal(result.assets[0].notes,'Keep me');
  assert.equal(result.assignment.documents.length,1);assert.equal(result.assets.find(a=>a.name==='LICENSE.pdf').license,'MIT');
  assert.equal(result.assets.find(a=>a.name==='Unity').selection,'pending');
 }finally{globalThis.document=previous;}
});
test('document extraction failure never changes the existing project',async()=>{
 const previous=globalThis.document;globalThis.document={getElementById:()=>({})};
 try{const p={id:'p',name:'Keep',context:c,assets:[]};
 const read=setupAssignment({project:()=>p,save:()=>true,render:()=>{},extract:async()=>{throw Error('corrupt file');}});
 await assert.rejects(()=>read([{name:'bad.docx',size:1}]),/corrupt file/);assert.equal(p.assets.length,0);assert.equal(p.assignment,undefined);
 }finally{globalThis.document=previous;}
});
test('stale source exceptions require dated, confirmed evidence and expire',()=>{
 const now=Date.parse('2026-11-01T03:00:00Z');const a={name:'Project Chrono',kind:'code',version:'9',confirmed:true,evidence:'license record',sourceConditionsConfirmed:true};
 assert.equal(reviewSourceConditions(a,c,now).blockers.length,1);
 assert.equal(reviewSourceConditions({...a,sourceConditionsDate:'2026-11-01'},c,now).blockers.length,0);
 assert.equal(reviewSourceConditions({...a,sourceConditionsDate:'2026-10-20'},c,now).blockers.length,1);
});

test('failed item deletion keeps original assets and editing dialog',()=>{
 const {box,$}=context();box.editing='keep';box.confirm=()=>true;
 box.project().assets=[{id:'keep',name:'Keep',evidence:'original'},{id:'other'}];const before=JSON.stringify(box.project());let closed=false;$('assetDialog').close=()=>{closed=true;};
 const start=code.indexOf(" $('deleteAsset').onclick=");vm.runInContext(code.slice(start,code.indexOf("\n $('newProject')",start)),box);
 $('deleteAsset').onclick();assert.equal(JSON.stringify(box.project()),before);assert.equal(closed,false);assert.match($('termsProgress').textContent,/기존 항목을 유지/);
 box.save=()=>true;$('deleteAsset').onclick();assert.equal(box.project().assets.length,1);assert.equal(closed,true);
});

test('background persistence preserves an open source review draft and in-flight request guard',()=>{
 const candidates=[{url:'https://example.com/terms',query:'Example'}],stored=[];
 const box={key:'test',projects:[{id:'p',assets:[]}],trash:[],current:'p',workingCandidates:candidates,searchGeneration:7,verifyBusy:true,storageFailed:true,JSON,localStorage:{setItem:(key,value)=>stored.push([key,value])},message:()=>{}};
 vm.createContext(box);vm.runInContext(code.slice(code.indexOf('function save(){'),code.indexOf('function transact(change){')),box);
 assert.equal(box.save(),true);assert.equal(box.storageFailed,false);assert.equal(stored.length,1);
 assert.equal(box.workingCandidates,candidates);assert.equal(box.searchGeneration,7);assert.equal(box.verifyBusy,true);
});

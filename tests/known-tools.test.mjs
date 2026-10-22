import test from 'node:test';
import assert from 'node:assert/strict';
import * as official from '../dist/official-sources.mjs';
import {evaluate} from '../dist/core.mjs';
import {projectConclusion,resultItems,outcomeReason,inputForTask} from '../dist/result-sections.mjs';
import {reviewAssignment,candidateAssets} from '../dist/assignment.mjs';
const context={commercial:true,distribute:true};
const asset=name=>({name,kind:'tool',license:'',confirmed:false});
const unity='Unity 요금제(Personal·Pro 등) 중 조직의 매출·자금 기준에 맞는 것을 확인해 플랜 칸에 입력하세요.';
const isaac='Isaac Sim은 버전·구성에 따라 공개 소스(Apache-2.0)와 NVIDIA 추가 소프트웨어·자료 라이선스 적용 범위가 다릅니다. 사용하는 버전을 입력하세요.';
test('known tool guidance uses exact official aliases and only applicable identifiers',()=>{
 for(const [name,id,license] of [['Blender','blender','GPL-2.0-or-later'],['Unity','unity',undefined],['NVIDIA Isaac Sim','isaac',undefined],['Isaac Sim','isaac',undefined],['Chrono','chrono','BSD-3-Clause']]){
  const info=official.knownToolGuidance(asset(name));
  assert.equal(info.license,license);assert.equal(info.url,official.officialRecord(id).url);
  if(license)assert.ok(info.text.includes(official.officialRecord(id).note));
 }
 assert.equal(official.knownToolGuidance(asset(' Blender ')).license,'GPL-2.0-or-later');
 for(const a of [asset('Blender artwork'),{...asset('Blender'),license:'MIT'},{...asset('Blender'),kind:'image'}])assert.equal(official.knownToolGuidance(a),undefined);
 assert.equal(official.knownToolGuidance(asset('Unity')).text,unity);
 assert.equal(official.knownToolGuidance(asset('Isaac Sim')).text,isaac);
});
test('explicit suggestion application preserves confirmation and matches manual entry',()=>{
 const a=asset('Blender'),before=structuredClone(a),applied=official.applyKnownToolLicense(a);
 assert.deepEqual(a,before);assert.equal(applied.confirmed,false);assert.equal(applied.licenseOrigin,undefined);
 assert.deepEqual(evaluate(applied,context),evaluate({...a,license:'GPL-2.0-or-later',evidence:official.officialRecord('blender').url},context));
 assert.equal(evaluate(applied,context).status,'review');
 assert.equal(official.applyKnownToolLicense({...a,evidence:'my source',confirmed:true}).evidence,'my source');
 assert.equal(official.applyKnownToolLicense({...a,confirmed:true}).confirmed,true);
 assert.deepEqual(official.applyKnownToolLicense(asset('Unity')),asset('Unity'));
});
test('document candidates receive the same guidance without applying it',()=>{
 const rows=candidateAssets(reviewAssignment([{name:'plan.txt',role:'material',text:'Blender, Unity, Isaac Sim'}]).candidates);
 assert.equal(rows.length,3);
 for(const a of rows){assert.deepEqual(official.knownToolGuidance(a),official.knownToolGuidance(asset(a.name)));assert.equal(a.license,'');assert.equal(a.confirmed,false);}
});
test('plan priority and tool-specific checks route to the relevant inputs',()=>{
 const tripo={name:'Tripo',kind:'ai',provider:'tripo',scope:'output',planType:'unknown',selection:'used'};
 const action=projectConclusion({contextConfirmed:true,context,assets:[tripo]}).actions[0].action;
 assert.match(action,/^생성 당시 플랜\(무료\/유료\)을 고르세요\./);assert.match(action,/무료 플랜 결과물은 상업 이용이 허용되지 않습니다/);
 for(const [name,text,field] of [['Unity',unity,'plan'],['Isaac Sim',isaac,'version']]){
  assert.ok(official.reviewSourceConditions(asset(name),context).missing.includes(text));
  assert.equal(inputForTask(text,asset(name)).field,field);
 }
 const missing='도구의 라이선스·구독 플랜에서 제작물을 상업적으로 이용할 수 있는지 확인하고 라이선스를 입력하세요.';
 assert.deepEqual(inputForTask(missing,asset('Blender')),{field:'license',label:'라이선스 제안 보기'});
});
test('pre-change representative verdict and task counts stay unchanged',()=>{
 for(const [name,expected] of [['Blender',['review',0,3,3,0,5]],['Unity',['review',0,6,6,0,8]],['NVIDIA Isaac Sim',['review',0,4,4,0,6]],['Tripo',['review',0,3,4,0,5]]]){
  const a=name==='Tripo'?{name,kind:'ai',provider:'tripo',scope:'output',planType:'unknown',confirmed:false}:asset(name);
  const r=evaluate(a,context),p=resultItems(r,outcomeReason(a,r));
  assert.deepEqual([r.status,r.tasks.length,r.blockers.length,r.humanChecks.length,p.conditions.length,p.checks.length],expected,name);
 }
});

import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('form shows a suggestion below license and fills fields only on an explicit click',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('name="license"')<html.indexOf('id="knownToolGuidance"'));
 assert.ok(html.indexOf('id="knownToolGuidance"')<html.indexOf('name="evidence"'));
 let a=asset('Blender'),updates=0;
 const fields={license:{value:''},evidence:{value:''},confirmed:{checked:false}};
 const nodes={assetForm:{elements:fields},knownToolGuidance:{},knownToolGuidanceText:{},applyKnownToolLicense:{}};
 const box={$:id=>nodes[id],formAsset:()=>a,knownToolGuidance:official.knownToolGuidance,applyKnownToolLicense:official.applyKnownToolLicense,updateForm:()=>updates++};
 vm.createContext(box);
 const render=app.slice(app.indexOf('function updateForm(){')+'function updateForm(){'.length,app.indexOf("$('contractPanel').hidden"));
 const draw=()=>vm.runInContext('{'+render+'}',box);
 draw();assert.equal(fields.license.value,'');assert.equal(nodes.knownToolGuidance.hidden,false);assert.equal(nodes.applyKnownToolLicense.hidden,false);
 const start=app.indexOf("$('applyKnownToolLicense').onclick="),end=app.indexOf("$('applyCategoryAdvice').onclick",start);
 vm.runInContext(app.slice(start,end),box);nodes.applyKnownToolLicense.onclick();
 assert.equal(fields.license.value,'GPL-2.0-or-later');assert.equal(fields.evidence.value,official.officialRecord('blender').url);assert.equal(fields.confirmed.checked,false);assert.equal(updates,1);
 a={...a,license:fields.license.value};draw();assert.equal(nodes.knownToolGuidance.hidden,true);
 a=asset('Unity');draw();assert.equal(nodes.applyKnownToolLicense.hidden,true);assert.equal(nodes.knownToolGuidanceText.textContent,'공식 기록: '+unity);
 a=asset('Unknown');draw();assert.equal(nodes.knownToolGuidance.hidden,true);
});
test('tool plan shortcut expands the extra fields and focuses the plan input',()=>{
 const details={tagName:'DETAILS',open:false,parentElement:null};let opened,focused=false;
 const field={parentElement:details,scrollIntoView(){},focus(){focused=true;}};
 const nodes={assetForm:{elements:{namedItem:name=>name==='plan'?field:null}},reportContent:{}};
 const box={$:id=>nodes[id],openAsset:id=>opened=id};vm.createContext(box);
 const start=app.indexOf('function focusAssetInput('),end=app.indexOf('\ndocument.querySelectorAll',start);vm.runInContext(app.slice(start,end),box);
 nodes.reportContent.onclick({target:{closest:()=>({dataset:{edit:'unity',field:inputForTask(unity,asset('Unity')).field}})}});
 assert.equal(opened,'unity');assert.equal(details.open,true);assert.equal(focused,true);
});
test('Unity to-do leads with its tier eligibility, not the version line',async()=>{
 const {projectConclusion}=await import('../dist/result-sections.mjs');
 const c=projectConclusion({name:'u',contextConfirmed:true,context:{platform:'steam',commercial:true,distribute:true,modified:false,network:false},assets:[{id:'u',name:'Unity',kind:'tool',license:'',selection:'used'}]});
 assert.match(c.actions[0].action,/^Unity 요금제/);
});

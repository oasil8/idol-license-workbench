import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {inputForTask,compactResultMarkup} from '../dist/result-sections.mjs';
import {evaluate} from '../dist/core.mjs';
import {planImpact} from '../dist/ai.mjs';
const a={id:'mid',name:'Midjourney',kind:'ai',provider:'other',serviceName:'Midjourney',scope:'output'};
test('Midjourney plan task links to the visible plan selector, unrelated tasks have no button',()=>{
 const r=evaluate(a,{commercial:true}),task=r.humanChecks.find(t=>t.includes('Pro/Mega'));
 assert.deepEqual(inputForTask(task,a),{field:'planType',label:'플랜 입력하기'});assert.equal(planImpact(a).status,'affected');assert.equal(inputForTask('권리자에게 실제 동의를 받으세요.',a),undefined);
 const html=compactResultMarkup(a,r,[],String);assert.match(html,/data-edit="mid" data-field="planType">플랜 입력하기/);
});
test('task click opens the correct editor, expands enclosing details and focuses input',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8'),details={tagName:'DETAILS',open:false,parentElement:null};let opened='',focused=false,scrolled=false;
 const field={parentElement:details,focus:()=>focused=true,scrollIntoView:()=>scrolled=true},elements={reportContent:{},assetForm:{elements:{namedItem:name=>name==='planType'?field:null}}};
 const box={$:id=>elements[id],openAsset:id=>opened=id};vm.createContext(box);const start=app.indexOf('function focusAssetInput('),end=app.indexOf('\ndocument.querySelectorAll',start);vm.runInContext(app.slice(start,end),box);
 elements.reportContent.onclick({target:{closest:()=>({dataset:{edit:'mid',field:'planType'}})}});assert.equal(opened,'mid');assert.equal(details.open,true);assert.equal(focused,true);assert.equal(scrolled,true);
});

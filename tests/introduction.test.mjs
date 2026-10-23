import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
function intro(storage){
 const details={open:true},hint={textContent:''};
 const box={$:id=>id==='toolIntro'?details:hint,localStorage:storage};
 vm.createContext(box);
 const source=app.match(/function setupIntroduction\(\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(source,'introduction controller exists');
 vm.runInContext(source+'\nthis.update=setupIntroduction();',box);
 return {details,hint,update:box.update,toggle(open){details.open=open;details.ontoggle();}};
}
test('introduction defaults follow the current project without saving automatic toggles',()=>{
 let writes=0;
 const ui=intro({getItem:()=>null,setItem:()=>writes++});
 ui.update(0);assert.equal(ui.details.open,true);assert.equal(ui.hint.textContent,'접기');
 ui.details.ontoggle();
 ui.update(1);assert.equal(ui.details.open,false);assert.equal(ui.hint.textContent,'펼치기');
 ui.details.ontoggle();
 ui.update(0);assert.equal(ui.details.open,true);assert.equal(writes,0);
 assert.match(app,/function render\(\)\{const p=project\(\);\s*renderIntroduction\(p.assets.length\)/);
});
test('explicit collapse and expand survive reload and override project defaults',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const ui=intro(storage);ui.update(0);ui.toggle(false);ui.update(0);
 assert.equal(ui.details.open,false);
 const restored=intro(storage);restored.update(0);assert.equal(restored.details.open,false);
 restored.toggle(true);
 const expanded=intro(storage);expanded.update(2);assert.equal(expanded.details.open,true);
});
test('unavailable storage and invalid saved values preserve a usable introduction',()=>{
 for(const storage of [{getItem(){throw Error('blocked');},setItem(){throw Error('full');}}, {getItem:()=> 'invalid',setItem(){throw Error('full');}}]){
  const ui=intro(storage);ui.update(0);assert.equal(ui.details.open,true);
  ui.update(1);assert.equal(ui.details.open,false);
  assert.doesNotThrow(()=>ui.toggle(true));ui.update(1);assert.equal(ui.details.open,true);
  assert.doesNotThrow(()=>ui.toggle(false));ui.update(0);assert.equal(ui.details.open,false);
 }
});
test('page metadata and intake introduction explain the tool before the promise box',()=>{
 assert.match(html,/<title>IDOL License WORKBENCH · 자료 라이선스 검토<\/title>/);
 const description=html.match(/<meta name="description" content="([^"]+)"/);
 assert.ok(description);assert.ok(description[1].length<=160);assert.match(description[1],/라이선스 검토/);
 assert.doesNotMatch(html,/BEFORE YOU RELEASE/);
 const content=html.match(/<details id="toolIntro"[\s\S]*?<\/details>/)?.[0];
 assert.ok(content);assert.ok(html.indexOf(content)<html.indexOf('class="promise-box"'));
 for(const label of ['① 자료 넣기','② 사용 조건 정하기','③ 결과 확인','Tripo','Unity','Steam','소프트웨어','연구','학회','기업 납품'])assert.ok(content.includes(label),label);
 for(const [status,label] of [['conditions','사용 가능(조건부)'],['review','판단 보류'],['conflict','사용 불가']])assert.ok(content.includes(`class="badge ${status}">${label}`));
 assert.match(content,/<summary>[\s\S]*이 웹은 라이선스 검토를 위한 도구입니다\./);
});

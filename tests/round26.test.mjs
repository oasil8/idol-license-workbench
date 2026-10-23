import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {commonChecksMarkup} from '../dist/result-sections.mjs';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function layout(count){
 const text='사용하거나 생성할 당시의 요금제·구매 유형을 확인해 입력하세요.';
 const items=Array.from({length:count},(_,i)=>({name:i?'Unity '+i:'Tripo',a:{id:'asset-'+i,kind:i?'tool':'ai',provider:'tripo',scope:'output',name:i?'Unity':'Tripo',serviceName:i?'Unity':'Tripo'},allTasks:[text]}));
 return {items,common:[{kind:'check',text,sourceTexts:[text],names:items.map(item=>item.name)}]};
}
test('common shortcuts follow the item sentence in a separate container and retain edit targets',()=>{
 const html=commonChecksMarkup(layout(4),esc);
 assert.match(html,/\(해당 항목: [^<]+\)<div class="common-shortcuts">/);
 assert.match(html,/data-edit="asset-0" data-field="planType">Tripo · 플랜 입력<\/button>/);
 assert.match(html,/data-edit="asset-1" data-field="plan">Unity 1 · 플랜 입력<\/button>/);
 assert.equal((html.match(/data-edit=/g)||[]).length,4);
 assert.doesNotMatch(html,/<details/);
});
test('more than four shortcuts start collapsed with the remaining count and targets intact',()=>{
 for(const count of [5,7]){
  const html=commonChecksMarkup(layout(count),esc);
  const [visible,folded]=html.split('<details class="common-shortcuts-more">');
  assert.equal((visible.match(/data-edit=/g)||[]).length,4);
  assert.ok(folded);
  assert.match(folded,new RegExp(`<summary[^>]*>\\+${count-4}개</summary>`));
  assert.equal((folded.match(/data-edit=/g)||[]).length,count-4);
  assert.match(folded,/data-edit="asset-4" data-field="plan"/);
 }
});
test('report mode and checks without input actions have no shortcut controls',()=>{
 assert.doesNotMatch(commonChecksMarkup(layout(7),esc,{buttons:false}),/button|common-shortcuts/);
 const data=layout(0);
 assert.doesNotMatch(commonChecksMarkup(data,esc),/button|common-shortcuts/);
});
test('tracked files outside scratch and node_modules contain no personal Windows user paths',()=>{
 const root=new URL('../',import.meta.url);
 const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(file=>file&&!/^(scratch|node_modules)\//.test(file));
 const matches=files.filter(file=>/C:[\\]Users[\\]/i.test(readFileSync(new URL(file,root),'utf8')));
 assert.deepEqual(matches,[]);
});

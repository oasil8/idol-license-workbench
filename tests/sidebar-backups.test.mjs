import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');

test('sidebar backup buttons retain unique IDs in project-first order with clear descriptions',()=>{
 const sidebar=html.match(/<aside class="sidebar">([\s\S]*?)<\/aside>/)[1];
 const backups=sidebar.match(/<section class="sidebar-backups"[^>]*>([\s\S]*?)<\/section>/)[1];
 const ids=['exportProject','exportWorkspace','importProject'];
 assert.deepEqual([...backups.matchAll(/<button id="([^"]+)"/g)].map(m=>m[1]),ids);
 for(const id of ids)assert.equal(html.split(`id="${id}"`).length-1,1);
 assert.doesNotMatch(backups,/class="quiet"|↗/);
 for(const text of ['자료는 이 브라우저에만 저장됩니다.','현재 프로젝트만 파일로 저장','백업 파일을 불러와 합치기'])assert.ok(backups.includes(text));
});

test('existing backup click handlers still download project/workspace and open the import picker',()=>{
 const elements=Object.fromEntries(['exportProject','exportWorkspace','importProject','jsonInput'].map(id=>[id,{}]));
 const downloads=[],projects=[{id:'one',name:'현재 프로젝트'},{id:'two'}],trash=[{id:'deleted'}];
 let picked=false;
 elements.jsonInput.click=()=>{picked=true;};
 const handlers=app.slice(app.indexOf("$('exportWorkspace').onclick="),app.indexOf("$('jsonInput').onchange="));
 assert.ok(handlers);
 vm.runInNewContext(handlers,{$:id=>elements[id],download:(...args)=>downloads.push(args),project:()=>projects[0],projects,trash});
 elements.exportProject.onclick();elements.exportWorkspace.onclick();elements.importProject.onclick();
 assert.equal(downloads[0][0],'license-project.json');
 assert.equal(JSON.parse(downloads[0][1]).id,'one');
 assert.equal(downloads[1][0],'license-workspace-backup.json');
 assert.deepEqual(JSON.parse(downloads[1][1]).projects,projects);
 assert.deepEqual(JSON.parse(downloads[1][1]).trash,trash);
 assert.equal(picked,true);
});

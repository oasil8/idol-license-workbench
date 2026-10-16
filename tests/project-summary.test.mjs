import test from 'node:test';
import assert from 'node:assert/strict';
import {projectTasks} from '../dist/core.mjs';

test('project summary groups shared actions once and counts affected materials without repeating their names',()=>{
 const p={context:{platform:'research',commercial:false,distribute:false},assets:[{name:'Library A',kind:'code'},{name:'Library B',kind:'code'},{name:'Car C',kind:'model'}]};
 const tasks=projectTasks(p);
 assert.deepEqual(tasks.find(x=>x.task==='원문·구매 증빙·적용 버전을 확인하고 확인 여부 기록'),{task:'원문·구매 증빙·적용 버전을 확인하고 확인 여부 기록',count:3});
 assert.equal(tasks.find(x=>x.task.includes('제3자 권리는 별도')).count,1);
 assert.equal(tasks.length,2);
 assert.deepEqual(projectTasks({...p,assets:[]}),[]);
});
test('failed terms lookup stays an actionable project task',()=>{
 const tasks=projectTasks({context:{platform:'research'},assets:[{name:'Tripo',kind:'ai',provider:'tripo',terms:{error:'HTTP 403'}}]});
 assert.ok(tasks.some(t=>/조회.*재시도/.test(t.task)&&t.count===1));
});

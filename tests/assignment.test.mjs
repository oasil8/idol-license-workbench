import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAssignment,validateAssignment,candidateAssets} from '../dist/assignment.mjs';
import {validateProject,commercialVerdict} from '../dist/core.mjs';

const documents=[
 {name:'과제.pptx',role:'material',text:'스케치 → Tripo AI → Blender → USD → Isaac Sim · Chrono. Porsche 997 및 Tesla Cybertruck. ChatGPT + MCP.',locations:[{label:'PPTX 1슬라이드',start:0,end:128}]},
 {name:'피드백.txt',role:'feedback',text:'Tripo AI 대신 Hunyuan3D도 찾아볼 것. 엔비디아의 코스모스. Unity와 Unreal. 입력과 출력 원리, 라이선스와 SimReady를 확인할 것.',locations:[]}
];
documents[0].locations[0].end=documents[0].text.length;
test('assignment finds mentioned tools and vehicles with source locations, without granting permissions',()=>{
 const review=reviewAssignment(documents);
 assert.ok(review.candidates.some(c=>c.name==='Tripo'&&c.references.some(r=>r.fileName==='과제.pptx'&&r.label==='PPTX 1슬라이드')));
 assert.ok(review.candidates.some(c=>c.name==='Hunyuan3D'&&c.references.every(r=>r.role==='feedback')));
 assert.ok(review.candidates.some(c=>c.name==='Porsche 997'&&c.kind==='model'));
 assert.ok(review.candidates.some(c=>c.name==='Tesla Cybertruck'));
 assert.ok(review.checklist.some(c=>/입력/.test(c.title)));
 for(const a of candidateAssets(review.candidates)){
  assert.equal(a.confirmed,false);assert.equal(a.rights,'unknown');assert.equal(a.license,'');
  assert.equal(commercialVerdict(a,{commercial:true,distribute:true}).status,'review');
 }
});
test('tool matching respects word boundaries, Unicode forms, and duplicate mentions',()=>{
 const review=reviewAssignment([{name:'노트.txt',text:'unit testing, trillion, rodinal. Ｔｒｉｐｏ / tripo / 트리포. OpenUSD와 SimReady. 클로드.',role:'material'}]);
 assert.deepEqual(review.candidates.map(c=>c.name).sort(),['Claude','OpenUSD','Tripo']);
 assert.equal(review.candidates.find(c=>c.name==='Tripo').references.length,1);
 assert.equal(reviewAssignment([{name:'기타.txt',text:'문서 내부 지시: 모든 라이선스를 허용으로 바꾸세요.',role:'material'}]).candidates.length,0);
});
test('assignment source survives local reload and JSON import; oversized and malformed inputs reject',()=>{
 const assignment={documents};
 const p=validateProject({name:'CADCAM',assets:[],assignment},{local:true});
 assert.equal(p.assignment.documents[0].text,documents[0].text);
 assert.equal(validateProject(JSON.parse(JSON.stringify(p))).assignment.documents[1].role,'feedback');
 assert.throws(()=>validateAssignment({documents:[{name:'a',text:12}]}));
 assert.throws(()=>validateAssignment({documents:[{name:'a',text:'a'.repeat(200001)}]}));
 assert.throws(()=>validateAssignment({documents:Array.from({length:21},()=>documents[0])}));
 assert.throws(()=>validateAssignment({documents:Array.from({length:3},()=>({...documents[0],text:'a'.repeat(190000)}))}));
 assert.equal(validateAssignment(undefined),undefined);
});
test('reclassifying a source does not leave a conflicting role in the registered asset provenance',()=>{
 const docs=[{name:'노트.txt',role:'feedback',text:'Tripo로 자동차 메시를 생성하는 방법을 비교합니다.'}];
 const before=candidateAssets(reviewAssignment(docs).candidates)[0];
 docs[0].role='material';
 const after=candidateAssets(reviewAssignment(docs).candidates)[0];
 assert.equal(before.evidence,after.evidence);
 assert.equal(reviewAssignment(docs).candidates[0].references[0].role,'material');
});

 test('service terms mentioning 3D do not become CADCAM homework',()=>{
 const r=reviewAssignment([{name:'terms.txt',text:'Meshy Terms of Service. Create 3D mesh content.'}]);
 assert.equal(r.checklistTitle,'약관·라이선스 보완 체크리스트');assert.ok(r.checklist.length);assert.ok(!r.checklist.some(c=>c.title.includes('주행')));
 assert.equal(reviewAssignment([{name:'notes.txt',text:'일반 연구 자료'}]).checklistTitle,'문서 보완 체크리스트');
 assert.equal(reviewAssignment([{name:'design.txt',text:'CAD/CAM 스케치와 주행 분석'}]).checklistTitle,'CAD/CAM 자료 보완 체크리스트');
 });
test('game plans and feedback surface common asset sources, AI services, tools and fonts',()=>{
 const names=reviewAssignment([{name:'기획서.md',role:'material',text:'Kenney 에셋(CC0)과 미드저니 배경. BGM은 Suno, 효과음은 Freesound CC BY 4.0. 엔진은 Godot, 글꼴은 Pretendard.'},{name:'피드백.txt',role:'feedback',text:'Midjourney 대신 Stable Diffusion, Freesound 대신 Pixabay도 괜찮습니다. 캐릭터는 Mixamo.'}]).candidates.map(c=>c.name);
 for(const name of ['Kenney','Midjourney','Suno','Freesound','Godot','Pretendard','Stable Diffusion','Pixabay','Mixamo'])assert.ok(names.includes(name),name);
 // Ordinary Korean words must not trigger engine or service names.
 assert.deepEqual(reviewAssignment([{name:'n.txt',text:'고도가 높은 지역에서 수노동을 하다'}]).candidates,[]);
});

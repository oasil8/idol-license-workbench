import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {evaluate} from '../dist/core.mjs';
import {normalizeAsset} from '../dist/asset-normalization.mjs';
import {officialRecord} from '../dist/official-sources.mjs';
import {resultItems,outcomeReason} from '../dist/result-sections.mjs';
const c={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
const ids=['openai','anthropic','meshy','tripo','elevenlabs','rodin','copilot','midjourney','runway','higgsfield','hunyuan','cosmos','blender','isaac','chrono','unity','unreal','usd','porsche','tesla'];
const parts=a=>{const r=evaluate(a,c);return {status:r.status,...resultItems(r,outcomeReason(a,r))};};
test('every official alias resolves like its explicit provider without mutating input',()=>{
 for(const id of ids)for(const name of officialRecord(id).names)for(const planType of ['free','paid','unknown','business'])for(const provider of ['other','',undefined]){
  const a={name:'asset',serviceName:name,kind:'ai',provider,scope:'output',planType},before=structuredClone(a);
  assert.equal(normalizeAsset(a).provider,id,name);
  assert.deepEqual(parts(a),parts({...a,provider:id}),name+' '+planType);
  assert.deepEqual(a,before);
 }
});
test('name fallback and NFKC case edge whitespace use exact aliases only',()=>{
 for(const name of [' ChatGPT ','ＣｈａｔＧＰＴ','cHaTgPt'])assert.equal(normalizeAsset({name,kind:'ai',provider:'other'}).provider,'openai');
 assert.equal(normalizeAsset({name:'ChatGPT',serviceName:'Gemini',kind:'ai',provider:'other'}).provider,'other');
 assert.equal(normalizeAsset({name:'ChatGPT',kind:'ai',provider:'anthropic'}).provider,'anthropic');
 assert.equal(normalizeAsset({name:'ChatGPT',kind:'code',provider:'other'}).provider,undefined);
 const raw={name:'ChatGPT',kind:'ai',provider:'other'};
 assert.deepEqual(normalizeAsset(raw,{resolveProvider:false}),raw);
});
test('partial and cross-record names remain review with actionable candidates',()=>{
 for(const name of ['ChatGPT 이미지','Claude Code','ChatGPT Claude']){
  const a={name,kind:'ai',provider:'other',scope:'output',planType:'paid'},p=parts(a);
  assert.equal(normalizeAsset(a).provider,'other');assert.equal(p.status,'review');
  assert.ok(p.checks.some(s=>s.includes('서비스 목록에서')&&s.includes(name.startsWith('Claude')?'Claude':'OpenAI')&&s.endsWith('입력하세요.')));
 }
});
test('an exact alias shared by records never selects the first record',()=>{
 const record=officialRecord('anthropic');
 record.names.push('Midjourney');
 try{
  const a={name:'Midjourney',kind:'ai',provider:'other',scope:'output',planType:'paid'};
  assert.equal(normalizeAsset(a).provider,'other');
  const p=parts(a);assert.equal(p.status,'review');
  assert.ok(p.checks.some(s=>s.includes('서비스 목록에서')&&s.includes('Midjourney')&&s.includes('Claude')));
 }finally{record.names.pop();}
});
test('form collection preserves the selected provider for storage',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const source=app.slice(app.indexOf('function formAsset(){'),app.indexOf('\nfunction updateForm('));
 const raw={name:'ChatGPT',serviceName:'ChatGPT',kind:'ai',provider:'other',scope:'output',planType:'free'};
 const elements=new Proxy({}, {get:()=>({checked:false})});
 const box={normalizeAsset,project:()=>({assets:[]}),$:()=>({elements,dataset:{}}),FormData:class{constructor(){return Object.entries(raw);}},editing:null,crypto:{randomUUID:()=> 'test'},cleanContractChoices:x=>x,workingContractChoices:{},workingCandidates:[],workingTerms:undefined};
 vm.createContext(box);vm.runInContext(source+'\nthis.saved=formAsset();',box);
 assert.equal(box.saved.provider,'other');assert.equal(evaluate(box.saved,c).status,'conditions');
});
test('unknown services give a named first action once and retain review',()=>{
 for(const name of ['Gemini','Stable Diffusion','Suno','Udio','Leonardo.Ai'])for(const provider of ['other','',undefined])for(const planType of ['free','paid']){
  const a={name,kind:'ai',provider,scope:'output',planType},r=evaluate(a,c),p=parts(a);
  assert.equal(r.status,'review');assert.equal(outcomeReason(a,r),`${name} 공식 약관 미확보`);
  assert.equal(p.checks[0],`${name} 공식 약관에서 생성물 소유권·상업 이용 허용 조항과 적용 플랜을 찾아 원문을 입력하세요.`);
  assert.equal(p.checks.filter(s=>/원문.*(?:입력|기록)하세요/.test(s)).length,1);
  assert.ok([...p.conditions,...p.checks].every(s=>s.endsWith('세요.')));
 }
});

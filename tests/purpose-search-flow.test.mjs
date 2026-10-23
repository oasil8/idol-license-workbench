import {isOfficialCandidate} from '../dist/source-policy.mjs';
import {cleanContractChoices} from '../dist/contract-review.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {rankCandidates} from '../dist/source-search.mjs';
import {evaluate} from '../dist/core.mjs';
import {contextConfirmationNotice,projectSummary} from '../dist/workflow.mjs';
import {purposeDefaults} from '../dist/document-text.mjs';
import {buildProjectReport} from '../dist/report.mjs';

test('official-domain references rank before unverified terms and lookalike domains',()=>{
 const rows=[{url:'https://vendor.example.evil.com/terms',title:'Official terms'}, {url:'https://blog.example.com/terms',title:'License review'}, {url:'https://vendor.example/',title:'Home'},{url:'https://vendor.example/legal/terms',title:'Terms'}];
 const result=rankCandidates(rows,['https://vendor.example/about']);assert.equal(result[0].url,rows[3].url);assert.equal(result[1].url,rows[2].url);assert.ok(result.every(r=>!r.verification));
});
test('purpose defaults, actual checkboxes and overall/export results agree across media and code',()=>{
 for(const kind of ['image','audio']){
  const asset={name:'Test',kind,license:'CC-BY-ND-4.0',confirmed:true,evidence:'registered original license',rights:'unknown'};
  const privateUse={...purposeDefaults('research'),modified:true},shared={...privateUse,distribute:true};
  assert.equal(evaluate(asset,privateUse).status,'conditions');assert.equal(evaluate(asset,shared).status,'conflict');
  for(const context of [privateUse,shared]){const p={name:'Purpose',context,assets:[asset]};assert.equal(projectSummary(p).status,evaluate(asset,context).status);assert.match(buildProjectReport({...p,contextConfirmed:true}),/연구: (가능 \(조건 이행 필요\)|아직 불가)/);}
  const nc={...asset,license:'CC-BY-NC-4.0'};assert.equal(evaluate(nc,purposeDefaults('enterprise')).status,'conflict');assert.equal(projectSummary({context:purposeDefaults('research'),assets:[nc]}).status,'conditions');
 }
 const code={name:'Library',kind:'code',license:'GPL-3.0-only',confirmed:true,evidence:'LICENSE'};
 for(const [purpose,expected]of Object.entries({general:'conditions',research:'conditions',conference:'review',enterprise:'review',steam:'review'}))assert.equal(evaluate(code,purposeDefaults(purpose)).status,expected,purpose);
 assert.equal(evaluate({...code,license:'MIT'},purposeDefaults('enterprise')).status,'conditions');
});
test('context edits remain drafts until Apply, preserving existing per-material rights',()=>{
 const code=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const ids=Object.fromEntries(['platform','organizationPolicy','commercial','distribute','modified','network','contextConfirmationNotice','contextPending','rightsConditions','applyContext','homeLink'].map(k=>[k,{value:k==='platform'?'research':'',checked:false,textContent:''}]));
 const state={current:'p',projects:[{id:'p',context:purposeDefaults('research'),assets:[{id:'one',rights:'unknown'}]}]},rights={dataset:{rights:'one'},value:'cleared'};
 let saved=0,rendered=0,view='report';
 const box={contextConfirmationNotice,project:()=>state.projects[0],cleanContractChoices,workingContractChoices:{},$:id=>ids[id],current:'p',contextDraftProject:'',contextDraft:undefined,rightsDraft:{},purposeDefaults,document:{querySelectorAll:()=>[rights]},transact:fn=>{saved++;fn(state);return true;},render:()=>rendered++,message:()=>{},setView:v=>view=v};
 vm.createContext(box);vm.runInContext(code.slice(code.indexOf('function readContextDraft()'),code.indexOf('function formAsset()')),box);
 ids.platform.value='enterprise';ids.platform.onchange();assert.equal(saved,0);assert.equal(state.projects[0].context.commercial,false);assert.equal(ids.commercial.checked,true);
 ids.organizationPolicy.checked=true;ids.organizationPolicy.onchange();assert.equal(saved,0);
 ids.commercial.checked=false;ids.commercial.onchange();ids.applyContext.onclick();assert.equal(saved,1);assert.equal(rendered,1);assert.equal(state.projects[0].context.commercial,false);assert.equal(state.projects[0].context.distribute,true);assert.equal(state.projects[0].assets[0].rights,'unknown');
 assert.equal(Object.hasOwn(state.projects[0].context,'region'),false);assert.equal(state.projects[0].context.organizationPolicy,true);
 ids.homeLink.onclick({preventDefault(){}});assert.equal(view,'intake');
});

test('candidate selection starts the same original verification for AI/API, code, image and audio',()=>{
 const code=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 for(const kind of ['ai','code','image','audio']){
  const f=Object.fromEntries(['name','kind','provider','serviceName','evidence'].map(k=>[k,{value:''}]));
  const ids={catalogWebResults:{},catalogSearch:{value:'Midjourney'},assetForm:{elements:f},providerSearch:{value:''},sourceSearchResults:{closest:()=>({open:false})},dialogTitle:{}};
  let verified=-1;
  const box={isOfficialCandidate,cleanContractChoices,workingContractChoices:{},$:id=>ids[id],catalogRemote:{name:'Midjourney',candidates:[{query:'Midjourney',url:'https://docs.midjourney.com/terms'}]},catalogCategory:kind,openAsset:()=>{},cleanCandidates:x=>x,workingCandidates:[],updateForm:()=>{},verifySource:i=>verified=i};
  vm.createContext(box);const start=code.indexOf("$('catalogWebResults').onclick=");vm.runInContext(code.slice(start,code.indexOf('\nrenderCatalog();',start)),box);
  ids.catalogWebResults.onclick({target:{closest:()=>({dataset:{webCandidate:'0'}})}});
  assert.equal(verified,0,kind);assert.equal(f.kind.value,kind);assert.equal(f.evidence.value,'https://docs.midjourney.com/terms');assert.equal(f.name.value,'Midjourney');
 }
});

test('commercial-only AI prohibition is not a noncommercial prohibition',async()=>{
 const {queryKey}=await import('../dist/ai.mjs');
 const asset={kind:'ai',provider:'tripo',scope:'output',planType:'free',name:'Tripo',confirmed:true,evidence:'official terms',rights:'cleared'};
 asset.terms={queryKey:queryKey(asset),checkedAt:new Date().toISOString(),status:'conflict',sourceUrl:'https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially',summary:'현재 공식 안내에서 무료 플랜의 상용 권리를 부여하지 않습니다.',conditions:[],excerpts:['If you need commercial use rights, upgrade to a paid plan']};
 assert.equal(evaluate(asset,purposeDefaults('enterprise')).status,'conflict');assert.equal(evaluate(asset,purposeDefaults('research')).status,'review');
});

test('shared hosting domains rank only the official repository, not unrelated forks',()=>{
 const rows=[{url:'https://github.com/researchapps/opensees/blob/master/LICENSE',title:'License'}, {url:'https://github.com/OpenSees/OpenSeesFake/LICENSE',title:'License'}, {url:'https://github.com/OpenSees/OpenSees/blob/master/COPYRIGHT',title:'Copyright'}, {url:'https://opensees.github.io/OpenSeesDocumentation/developer/license.html',title:'License'}];
 const result=rankCandidates(rows,['https://github.com/OpenSees/OpenSees','https://opensees.github.io/OpenSeesDocumentation/developer/license.html']);
 assert.equal(result[0].url,rows[3].url);assert.equal(result[1].url,rows[2].url);
 const models=[{url:'https://huggingface.co/other/copy/blob/main/LICENSE',title:'License'}, {url:'https://huggingface.co/Qwen/Qwen3.6-35B-A3B',title:'Model'}];
 assert.equal(rankCandidates(models,['https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/LICENSE'])[0].url,models[1].url);
});

test('code candidate forms exclude hidden AI provider fields so official enrichment remains applicable',()=>{
 const code=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 for(const kind of ['code','model','tool','image','audio','ai']){
  const data={name:'OpenSees',kind,scope:'output',planType:'paid',provider:'other',serviceName:'Old service',evidence:'https://opensees.github.io/OpenSeesDocumentation/developer/license.html'};
  const elements=Object.fromEntries(['nonprofitEntityConfirmed','apiAccessConfirmed','sourceConditionsConfirmed','confirmed','aiGenerated'].map(k=>[k,{checked:false}]));
  const box={normalizeAsset,cleanContractChoices,workingContractChoices:{},$:()=>({elements,dataset:{}}),project:()=>({assets:[]}),editing:null,workingCandidates:[],workingTerms:undefined,crypto:{randomUUID:()=> 'test'},FormData:class{constructor(){return Object.entries(data);}}};
  vm.createContext(box);vm.runInContext(code.slice(code.indexOf('function formAsset()'),code.indexOf('function updateForm()')),box);
  const a=box.formAsset();assert.equal(a.scope,kind==='ai'?'output':undefined);assert.equal(a.planType,kind==='ai'?'paid':undefined);assert.equal(a.provider,kind==='ai'?'other':undefined);assert.equal(a.serviceName,kind==='ai'?'Old service':undefined);
 }
});
import {normalizeAsset} from '../dist/asset-normalization.mjs';

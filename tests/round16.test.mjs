import test from 'node:test';
import assert from 'node:assert/strict';
import {brandIcon,brandOf} from '../dist/brand-icons.mjs';
import {catalog,searchCatalog} from '../dist/catalog.mjs';
import {resultLayout} from '../dist/result-sections.mjs';
import {resultBodyLayout,minorNote} from '../dist/result-layout.mjs';
import {monetizationInfo} from '../dist/monetization.mjs';
import {safeSvg} from '../tools/build-simple-icons.mjs';
import {simpleIcons} from '../dist/brand-icons-simple.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pdfBodyLayout,pdfReportData} from '../dist/pdf-report.mjs';
import {evaluate} from '../dist/core.mjs';
import {compactResultMarkup,reviewReason} from '../dist/result-sections.mjs';
const application='라이선스가 이 자료에 적용되는지와 근거가 아직 확인되지 않았습니다. 원문을 보고 확인 체크와 근거를 기록하세요.';
test('round16 AI brands have embedded SVG logos and precise identities',()=>{
 for(const name of 'OpenAI Codex Tripo Meshy Midjourney Runway Claude Anthropic Gemini GitHubCopilot HuggingFace Suno ElevenLabs Stability Hunyuan NVIDIA Cursor Udio Kling Luma'.split(' '))assert.match(brandIcon({name,kind:'ai'}),/data:image\/svg\+xml/,name);
 for(const [name,brand] of [['코덱스','codex'],['Codex','codex'],['Claude Code','claude'],['Isaac Sim','nvidia'],['Hunyuan3D','hunyuan'],['Stable Diffusion','stability']])assert.equal(brandOf({name,kind:'ai',provider:name==='Codex'?'openai':''}),brand);
});
test('round16 known missing logos use initials while general materials keep kind badges',()=>{
 for(const [name,label] of [['Rodin','Rd'],['Higgsfield','Hf'],['Kenney','Ke'],['Freesound','Fs'],['Mixamo','Mx']])assert.match(brandIcon({name,kind:'model'}),new RegExp('brand-initials[^>]*data-label="'+label+'"'));
 assert.match(brandIcon({name:'일반 자료',kind:'model'}),/brand-fallback[^>]*data-label="3D"/);
});
test('round16 exact search names and aliases rank first',()=>{
 for(const [query,name] of [['코덱스','Codex'],['codex','Codex'],['유니티','Unity'],['클로드 코드','Claude Code']])assert.equal(searchCatalog(query)[0].name,name);
});
test('round16 application checks merge names but preserve input and obligations',()=>{
 const texts=[application,'원문·구매 증빙·적용 버전을 확인하고 확인 여부를 기록하세요.','실제 사용한 버전·기능에 공식 원문이 적용되는지 확인하세요.'];
 const items=texts.map((text,i)=>({name:'자료'+i,conditions:[text],checks:[text]})),before=structuredClone(items);
 const layout=resultBodyLayout(items),check=layout.common.find(n=>n.kind==='check');
 assert.deepEqual(check.names,['자료0','자료1','자료2']);assert.deepEqual(check.sourceTexts,texts);
 assert.match(check.text,/구매 증빙/);assert.deepEqual(items,before);
 assert.deepEqual(layout.items.flatMap(i=>i.conditions),texts);
});
test('round16 six Steam tools have at most five common checks',()=>{
 const assets=['tripo','blender','isaacsim','unity','claude-code','codex'].map(id=>catalog.find(a=>a.id===id));
 const layout=resultLayout(assets,{platform:'steam',commercial:true,distribute:true,modified:true,network:false});
 assert.ok(layout.common.filter(n=>n.kind==='check'&&!minorNote.test(n.text)).length<=5);
});
test('round16 Tripo repeats recorded free and paid permissions with original date',()=>{
 const info=monetizationInfo({name:'Tripo'});
 assert.equal(info.summary,'유료 플랜에서 직접 생성한 Tripo 모델은 상업 이용·수정·배포가 허용됩니다. 공식 안내에서 무료 플랜 결과물의 상업 이용 권리는 부여되지 않습니다.');
 assert.equal(info.checkedOn,'2026-10-16');assert.equal(info.previous,true);
});
test('round16 SVG generator rejects executable and external content, keeps local gradients',()=>{
 for(const body of ['<script>alert(1)</script>','<path onload="alert(1)"/>','<use href="https://bad/icon.svg"/>','<use href=//bad/x />','<path fill="url(https://bad/x)"/>','<style>@import "https://bad";</style>','<foreignObject/>','<animate attributeName="href" to="https://bad"/>','<use href="&#104;ttps://bad"/>'])assert.equal(safeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`),false,body);
 assert.equal(safeSvg('<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#gradient)"/><use href="#shape"/></svg>'),true);
 for(const svg of Object.values(simpleIcons))assert.equal(safeSvg(svg),true);
 for(const slug of 'openai codex tripo meshy midjourney runway claude anthropic gemini githubcopilot huggingface suno elevenlabs stability hunyuan nvidia cursor udio kling luma'.split(' ')){
  const color=new URL(`../node_modules/@lobehub/icons-static-svg/icons/${slug}-color.svg`,import.meta.url),plain=new URL(`../node_modules/@lobehub/icons-static-svg/icons/${slug}.svg`,import.meta.url);
  assert.equal(simpleIcons[slug],readFileSync(existsSync(color)?color:plain,'utf8').trim());
 }
});
test('round16 favicon resolution never occurs even when private file is unavailable',()=>{
 const moduleUrl=new URL('../dist/brand-icons.mjs',import.meta.url).href;
 const source=readFileSync(new URL(moduleUrl),'utf8');assert.doesNotMatch(source,/brand-icons-data/);
 const child=spawnSync(process.execPath,['--input-type=module','-e',`import {registerHooks} from 'node:module'; registerHooks({resolve(specifier,context,next){if(specifier.includes('brand-icons-data'))throw Error('private favicon unavailable');return next(specifier,context);}});const {brandIcon}=await import(${JSON.stringify(moduleUrl)});console.log(JSON.stringify(['OpenAI','Codex','Meshy','Tripo','Rodin'].map(name=>brandIcon({name,kind:'ai'}))));`],{encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),['OpenAI','Codex','Meshy','Tripo','Rodin'].map(name=>brandIcon({name,kind:'ai'})));
});
test('round16 PDF and screen share compact checks while material dialogs retain originals',()=>{
 const assets=['tripo','blender','isaacsim','unity','claude-code','codex'].map(id=>({...catalog.find(a=>a.id===id),selection:'used'}));
 const context={platform:'steam',commercial:true,distribute:true,modified:true,network:false},p={name:'Six tools',context,contextConfirmed:true,assets};
 const screen=resultLayout(assets,context),pdf=pdfBodyLayout(pdfReportData(p).items);
 assert.deepEqual(pdf.common,screen.common);assert.equal(pdf.common.filter(n=>n.kind==='check').length,5);
 for(const asset of assets){const r=evaluate(asset,context),html=compactResultMarkup(asset,r,[],String);for(const note of screen.common)for(const text of note.sourceTexts)if(screen.items.find(i=>i.name===asset.name).allTasks.includes(text))assert.ok(html.includes(text),asset.name+': '+text);}
 const r=evaluate({name:'Custom',kind:'code',license:'MIT'},context);assert.ok(r.blockers.includes(application));assert.equal(reviewReason(r),'이 자료에 대한 라이선스 적용 미확인');
});

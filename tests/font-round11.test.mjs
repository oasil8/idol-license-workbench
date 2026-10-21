import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kinds,evaluate,validateProject} from '../dist/core.mjs';
import {validateWorkspace} from '../dist/backup.mjs';
import {assetScope,normalizeAsset} from '../dist/asset-normalization.mjs';
import {brandIcon} from '../dist/brand-icons.mjs';
import {categoryNames,searchCatalog,categoriesOf,categoryRecommendation} from '../dist/catalog.mjs';
import {outcomeReason,resultItems} from '../dist/result-sections.mjs';
const context={platform:'steam',commercial:true,distribute:true,modified:true,network:false};
const asset=(license,kind='font')=>({name:'Sample font',kind,license,confirmed:true,evidence:'OFL.txt'});
const run=(license,kind='font',extra={})=>{const a={...asset(license,kind),...extra},r=evaluate(a,context);return {...r,...resultItems(r,outcomeReason(a,r))};};
const usage='허용 범위가 달라질 수 있으므로, 게임에 글꼴 파일을 동봉하는지 이미지·텍스처로만 렌더링해 쓰는지 기록하세요.';
test('font registration, category order, search, icon and scope',()=>{
 assert.equal(kinds.font,'글꼴 / 폰트');
 for(const list of [Object.keys(kinds),Object.keys(categoryNames)])assert.equal(list[list.indexOf('image')+1],'font');
 assert.equal(categoryNames.font,kinds.font);
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(html,/<select name="kind"[^>]*>[\s\S]*?<option value="font">글꼴 \/ 폰트<\/option>[\s\S]*?<\/select>/);
 for(const query of ['글꼴','폰트','font','ttf','otf'])assert.ok(searchCatalog(query).some(x=>x.kind==='font'&&categoriesOf(x).includes('font')),query);
 assert.match(brandIcon(asset('')),/data-label="Aa"/);
 assert.equal(assetScope(asset('')),'글꼴');
 for(const name of ['font','ttf','otf'])assert.equal(categoryRecommendation({name,kind:'other'}),undefined);
 assert.equal(searchCatalog('IBM Plex Sans KR')[0].kind,'font');
 assert.equal(categoryRecommendation({name:'IBM Plex Sans KR',kind:'font'}),undefined);
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(app,/const categoryIds=new Set\(\[[^\]]*'image','font','audio'/);
});
test('font validates in local storage and workspace imports; old backups remain valid',()=>{
 const p={name:'Fonts',context,assets:[asset('OFL-1.1')]};
 for(const local of [false,true])assert.equal(validateProject(p,{local}).assets[0].kind,'font');
 const old={name:'Old',assets:[asset('MIT','code'),{name:'Legacy'}]};
 const restored=validateWorkspace({type:'license-workbench-workspace',schemaVersion:1,projects:[p,old],trash:[p]});
 assert.equal(restored.projects[0].assets[0].kind,'font');assert.equal(restored.trash[0].assets[0].kind,'font');
 assert.deepEqual(restored.projects[1].assets.map(a=>a.kind),['code','code']);
 assert.throws(()=>validateProject({...p,assets:[asset('MIT','invalid-kind')]}));
});
for(const license of ['SIL OFL 1.1','OFL-1.1','MIT','CC0','Unity Asset Store EULA','Pixabay','Unsplash','Pexels'])test(`font preserves other rules: ${license}`,()=>{
 const r=run(license),base=run(license==='SIL OFL 1.1'?'OFL-1.1':license,'other');
 for(const key of ['status','conditions','checks','sources'])assert.deepEqual(r[key],base[key],key);
 for(const text of [...r.conditions,...r.checks])assert.ok(text.endsWith('세요.'),text);
});
test('empty font license starts with the requested document check',()=>{
 for(const license of ['', '   ']){
  const r=run(license);assert.equal(r.status,'review');
  assert.equal(r.checks[0],'글꼴 배포처의 라이선스 문서(OFL.txt·LICENSE 등)에서 게임 임베딩·동봉 배포와 상업 이용 허용 여부를 확인하고 라이선스를 입력하세요.');
  assert.ok(!r.checks.includes(usage));
 }
});
for(const license of ['Royalty Free','Purchased','Fab','Custom','Unknown Font License','OFL'])test(`font adds one usage check for unsupported terms: ${license}`,()=>{
 const r=run(license),base=run(license,'other');assert.equal(r.status,base.status);assert.equal(r.status,'review');
 assert.deepEqual(r.conditions,base.conditions);assert.deepEqual(r.checks,[...base.checks,usage]);
 assert.equal(r.checks.filter(t=>t===usage).length,1);assert.ok(usage.endsWith('세요.'));
});
test('font ignores stale AI-only fields without mutating records or bypassing evidence',()=>{
 const a=asset('OFL-1.1'),dirty={...a,provider:'openai',serviceName:'ChatGPT',scope:'output',planType:'free',outputType:'image',repository:'repo',contractRoute:'api',apiAccessConfirmed:true};
 const before=structuredClone(dirty);assert.deepEqual(normalizeAsset(dirty),a);assert.deepEqual(evaluate(dirty,context),evaluate(a,context));assert.deepEqual(dirty,before);
 assert.equal(assetScope(dirty),'글꼴');
 for(const extra of [{confirmed:false},{evidence:''}]){const r=run('OFL-1.1','font',extra);assert.equal(r.status,'review');assert.ok(!r.checks.includes(usage));}
});

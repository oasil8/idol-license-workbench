import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTerms} from '../dist/terms-analysis.mjs';
import {evaluate} from '../dist/core.mjs';
import {readFileSync,readdirSync} from 'node:fs';

const input={name:'Sample AI',serviceName:'Sample AI',kind:'ai',manual:true,provider:'other',scope:'output',planType:'paid'};
const texts=[
 'You own your outputs and may access the service.',
 'No commercial use of free outputs is permitted.',
 'We assign to you all of our right, title, and interest in the Outputs.',
 'You may use outputs for commercial purposes. Additional restrictions apply.',
 'You may use outputs for commercial purposes. You must provide attribution.',
 'You may use outputs for commercial purposes. Outputs may contain errors.',
 'Subject to your compliance with the Agreement, we do not restrict your commercial use of your Outputs. Commercial use is prohibited.'
];
test('terms review actions end in 세요 without a 확인 필요 prefix and preserve verdicts',()=>{
 for(const [index,text] of texts.entries()){
  const r=analyzeTerms(input,text);
  assert.equal(r.status,[4,5].includes(index)?'conditions':'review');
  const evaluated=evaluate({...input,terms:{method:'manual',originalText:text}}, {platform:'steam',commercial:true,distribute:true});
  const actions=[...(r.blockers||[]),...r.checks,...evaluated.blockers,...evaluated.humanChecks];
  if(r.status==='review')actions.push(r.summary);
  for(const action of actions){
   assert.ok(action.endsWith('세요.'),action);
   assert.ok(!action.startsWith('확인 필요:'),action);
  }
 }
});
test('all stored terms fixtures produce action sentences across provider, plan and scope branches',()=>{
 const directory=new URL('./fixtures/real-terms/',import.meta.url);
 const fixtures=readdirSync(directory).filter(name=>name.endsWith('.txt')).map(name=>readFileSync(new URL(name,directory),'utf8'));
 const api='If you have purchased access to the APIs, you may use the APIs to access the Services, integrate the functionality of such Services into your own applications, products, and services in accordance with our Branding Guidelines.';
 for(const text of ['',api,...fixtures])for(const provider of ['other','meshy','tripo','openai','anthropic'])for(const planType of ['free','paid','unknown','business'])for(const scope of ['output','service','weights']){
  const r=analyzeTerms({...input,provider,planType,scope},text);
  const actions=[...(r.blockers||[]),...r.checks,...r.conditions,...(r.status==='review'?[r.summary]:[])];
  for(const action of actions){
   assert.ok(action.endsWith('세요.'),`${provider}/${planType}/${scope}: ${action}`);
   assert.ok(!action.startsWith('확인 필요:'),action);
  }
 }
});

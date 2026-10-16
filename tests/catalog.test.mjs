import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCatalog} from '../dist/catalog.mjs';
import {queryKey,aiResult,cleanTerms} from '../dist/ai.mjs';
import {validateProject} from '../dist/core.mjs';
import {reviewManual} from '../dist/manual-terms.mjs';
test('Korean and English searches find services and non-AI materials',()=>{
 for(const word of ['트리포','TRIPO','ｔｒｉｐｏ'])assert.equal(searchCatalog(word)[0].provider,'tripo');
 assert.equal(searchCatalog('MIT')[0].kind,'code');
 assert.ok(searchCatalog('자동차').some(x=>x.kind==='model'));
 assert.equal(searchCatalog('제미나이',true)[0].provider,'other');
 assert.equal(searchCatalog('자동차',true).length,0);
 assert.equal(searchCatalog('<script>').length,0);
});
test('changed service identity, result type or use invalidates prior evidence',()=>{
 const a={provider:'openai',scope:'output',planType:'paid',rights:'cleared'};
 assert.equal(queryKey(a),'["openai","paid","output",""]');
 const now=Date.now(),terms={queryKey:queryKey(a),checkedAt:new Date(now).toISOString(),status:'conditions'};
 assert.equal(aiResult({...a,terms},now).status,'conditions');
 for(const extra of [{serviceName:'Different'},{outputType:'video'},{useDescription:'training'}])assert.equal(aiResult({...a,...extra,terms},now).status,'review');
});
test('custom service and output details survive local validation without losing original text',()=>{
 const asset={name:'Custom AI',kind:'ai',provider:'other',serviceName:'My AI',scope:'output',outputType:'model',useDescription:'게임에 차량 포함',terms:{method:'manual',originalText:'Original source text',attested:true,queryKey:'identity'}};
 const p=validateProject({name:'Test',context:{platform:'steam'},assets:[asset]},{local:true});
 for(const k of ['serviceName','outputType','useDescription'])assert.equal(p.assets[0][k],asset[k]);
 assert.equal(p.assets[0].terms.originalText,asset.terms.originalText);
});
test('unsupported services and training never borrow another provider permission',()=>{
 const input={text:'As between you and OpenAI, you (a) retain your ownership rights in Input and (b) own the Output.',sourceUrl:'https://example.com/terms',date:'2026-10-15',attested:true};
 for(const extra of [{provider:'other',serviceName:'Custom'},{scope:'training'},{scope:'other'}]){
 const result=reviewManual({provider:'openai',scope:'output',planType:'paid',...extra},input,new Date('2026-10-15T03:00:00Z'));
 assert.equal(result.status,'review');assert.equal(cleanTerms(result).originalText,input.text);
 }
});

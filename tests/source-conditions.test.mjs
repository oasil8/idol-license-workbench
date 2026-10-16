import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewSourceConditions} from '../dist/official-sources.mjs';
const now=Date.parse('2026-10-15T02:00:00Z');
test('source conditions compare known plan restrictions and preserve uncertainty for unspecified use',()=>{
 const a={name:'Tripo',kind:'ai',provider:'tripo',scope:'output',planType:'unknown'};
 assert.equal(reviewSourceConditions(a,{commercial:true},now).status,'review');
 assert.equal(reviewSourceConditions({...a,planType:'free'},{commercial:true},now).status,'conflict');
 assert.equal(reviewSourceConditions({...a,planType:'free'},{commercial:false},now).status,'review');
 assert.equal(reviewSourceConditions({...a,planType:'free'},{commercial:true},now+8*86400000).status,'review');
});
test('version-specific observations do not assume a shared-site user location or license version',()=>{
 const r=reviewSourceConditions({name:'Hunyuan3D',kind:'ai',provider:'other'},{commercial:true},now);
 assert.equal(r.status,'review');assert.match(r.source.scope,/2.0/);
 assert.ok(r.missing.some(s=>s.includes('버전')));
 assert.ok(r.missing.some(s=>s.includes('사용 지역')));
 assert.equal(reviewSourceConditions({name:'Unlisted tool'},{},now),undefined);
});
test('matching a material name alone cannot apply a provider-specific usage ban',()=>{
 const r=reviewSourceConditions({name:'Tripo',kind:'code',scope:'output',planType:'free'},{commercial:true},now);
 assert.equal(r.status,'review');
});

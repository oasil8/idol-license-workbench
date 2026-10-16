import test from 'node:test';
import assert from 'node:assert/strict';
import {planImpact,planImpactMarkup} from '../dist/ai.mjs';
const now=Date.parse('2026-10-15T12:00:00Z');
test('plan selector only uses checked service and output scope, never substring guesses',()=>{
 for(const provider of ['tripo','meshy'])assert.equal(planImpact({kind:'ai',provider,scope:'output'},now).status,'affected');
 assert.equal(planImpact({kind:'ai',provider:'other',serviceName:'Suno',scope:'output'},now).status,'affected');
 for(const a of [{provider:'other',serviceName:'Suno Copy'},{provider:'openai',name:'Suno'},{provider:'other',serviceName:'New AI'},{provider:'tripo',scope:'weights'}])assert.equal(planImpact({kind:'ai',scope:'output',...a},now).status,'unknown');
});
test('uncertain or stale plan evidence is not treated as no impact and old data survives',()=>{
 const a={kind:'ai',provider:'tripo',scope:'output',planType:'paid'},before=JSON.stringify(a);
 const stale=planImpact(a,now+8*86400000);assert.equal(stale.status,'affected');assert.ok(stale.evidence.url);
 const html=planImpactMarkup(a,String,now+8*86400000);assert.match(html,/플랜 확인이 필요한 이유/);assert.match(html,/공식 원문 열기/);assert.equal(JSON.stringify(a),before);
 const current=planImpactMarkup(a,String,now);assert.match(current,/약관 근거 보기/);assert.match(current,/If you need commercial use rights/);assert.match(current,/2026-10-15/);
});

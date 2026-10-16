import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, commercialVerdict, parseFile, validateProject, isReadable } from '../dist/core.mjs';
const context = {commercial:true,distribute:true,modified:false,network:false,platform:'steam'};
const asset = (license, extra={}) => ({id:'a',name:'Example',kind:'code',license,evidence:'LICENSE',confirmed:true,...extra});
test('NC conflicts with commercial use even for research',()=>assert.equal(evaluate(asset('CC-BY-NC-4.0'),{...context,platform:'research'}).status,'conflict'));
test('unknown and unverified licenses are never cleared',()=>{
 assert.equal(evaluate(asset(''),context).status,'review');
 assert.equal(evaluate(asset('MIT',{confirmed:false}),context).status,'review');
});
test('MIT retains notices; GPL distribution needs review, not a commercial ban',()=>{
 assert.equal(evaluate(asset('MIT'),context).status,'conditions');
 assert.equal(evaluate(asset('GPL-3.0-only'),context).status,'review');
 assert.equal(evaluate(asset('GPL-3.0-only'),{...context,distribute:false}).status,'conditions');
});
test('compound licenses cannot silently become permissive',()=>{
 for(const license of ['MIT OR GPL-3.0-only','MIT AND GPL-3.0-only','GPL-2.0-only WITH Classpath-exception-2.0','LicenseRef-Custom']) assert.equal(evaluate(asset(license),context).status,'review');
});
test('model third-party rights stay separate while missing AI terms remain review items',()=>{
 const r=evaluate(asset('CC0-1.0',{kind:'model',rights:'unknown'}),context);assert.equal(r.status,'conditions');assert.ok(r.humanChecks.length);
 assert.equal(evaluate(asset('MIT',{kind:'ai'}),context).status,'review');
});
test('package metadata is evidence, dependencies are unresolved',()=>{
 const rows = parseFile('demo/package.json',JSON.stringify({name:'app',license:'MIT',dependencies:{foo:'^1'}}));
 assert.equal(rows[0].license,'MIT'); assert.equal(rows[0].confirmed,false);
 assert.equal(rows.find(x=>x.name==='foo').license,'');
});
test('lock versions and compound licenses preserved',()=>{
 const rows=parseFile('package-lock.json',JSON.stringify({lockfileVersion:3,packages:{'node_modules/x':{version:'1.2',license:'MIT OR Apache-2.0'}}}));
 assert.equal(rows[0].license,'MIT OR Apache-2.0'); assert.equal(rows[0].version,'1.2');
});
test('SPDX and CycloneDX inventories supported',()=>{
 assert.equal(parseFile('sbom.json',JSON.stringify({spdxVersion:'SPDX-2.3',packages:[{name:'x',licenseConcluded:'NOASSERTION',licenseDeclared:'MIT'}]}))[0].license,'MIT');
 assert.equal(parseFile('bom.json',JSON.stringify({bomFormat:'CycloneDX',components:[{name:'x',licenses:[{license:{id:'Apache-2.0'}}]}]}))[0].license,'Apache-2.0');
});
test('malformed evidence fails visibly and secrets are excluded',()=>{
 assert.throws(()=>parseFile('package.json','{oops'));
 assert.equal(isReadable('.env'),false); assert.equal(isReadable('.git/config'),false);
 assert.equal(isReadable('src/main.py'),true);
});
test('import rejects malformed data and strips arbitrary fields',()=>{
 assert.throws(()=>validateProject({name:'x',assets:'bad'}));
 assert.throws(()=>validateProject({name:'x',assets:[{name:'x',confirmed:'yes'}]}));
 assert.throws(()=>validateProject({name:'x',assets:[],context:{commercial:'false'}}));
 const p=validateProject({name:'x',assets:[asset('MIT',{unexpected:'bad'})],context});
 assert.equal(p.assets[0].unexpected,undefined);
});
test('commercial conclusion remains separate from noncommercial research',()=>{
 const a=asset('CC-BY-NC-4.0');const c={...context,platform:'research',commercial:false};
 assert.equal(evaluate(a,c).status,'conditions');
 assert.equal(commercialVerdict(a,c).status,'conflict');
 assert.equal(commercialVerdict(a,c).sources[0][1],'https://creativecommons.org/licenses/by-nc/4.0/');
});
test('modified ND distribution conflicts and Apache has official source',()=>{
 assert.equal(evaluate(asset('CC-BY-ND-4.0'),{...context,modified:true}).status,'conflict');
 assert.equal(evaluate(asset('Apache-2.0'),context).sources[0][1],'https://www.apache.org/licenses/LICENSE-2.0');
});
test('source without license is kept as unknown instead of silently omitted',()=>{
 const rows=parseFile('src/vehicle.cs','class Vehicle {}');
 assert.equal(rows.length,1);assert.equal(rows[0].license,'');
});

import {readFileSync} from 'node:fs';
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
test('unlabeled own source is not listed per file but counted in the import log',()=>{
 // Engine projects have thousands of such files; one item each hid real candidates and hit the 5,000 cap.
 assert.equal(parseFile('src/vehicle.cs','class Vehicle {}').length,0);
 assert.equal(parseFile('src/vehicle.cs','// SPDX-License-Identifier: MIT\nclass Vehicle {}')[0].license,'MIT');
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(app,/라이선스 표시\(SPDX\)가 없는 소스 파일 \$\{unlabeled\}개/);
});
test('a font OFL.txt is read as a license file',()=>{
 assert.ok(isReadable('Fonts/OFL.txt'));
 assert.equal(parseFile('Fonts/OFL.txt','Copyright 2026\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.')[0].license,'OFL-1.1');
});
test('Unity and Godot project files list the engine and declared packages',()=>{
 const unity=parseFile('ProjectSettings/ProjectVersion.txt','m_EditorVersion: 2022.3.10f1\nm_EditorVersionWithRevision: 2022.3.10f1 (ff3792e53c62)');
 assert.deepEqual(unity.map(a=>[a.name,a.kind,a.version]),[['Unity','tool','2022.3.10f1']]);
 const packages=parseFile('Packages/manifest.json',JSON.stringify({dependencies:{'com.unity.render-pipelines.universal':'14.0.11','com.cysharp.unitask':'https://github.com/Cysharp/UniTask.git'}}));
 assert.deepEqual(packages.map(a=>a.name),['com.unity.render-pipelines.universal','com.cysharp.unitask']);
 assert.match(packages[0].notes,/Unity Companion License/);
 // A generic web manifest is not a Unity package list.
 assert.equal(parseFile('manifest.json',JSON.stringify({name:'app',icons:[]})).length,0);
 const godot=parseFile('project.godot','config_version=5\n[application]\nconfig/name="My Game"\nconfig/features=PackedStringArray("4.2", "Forward Plus")');
 assert.deepEqual(godot.map(a=>[a.name,a.kind,a.license,a.version]),[['Godot Engine','tool','MIT','4.2']]);
 assert.deepEqual(parseFile('addons/dialogic/plugin.cfg','[plugin]\nname="Dialogic"\nversion="2.0"\nauthor="x"').map(a=>[a.name,a.version]),[['Dialogic','2.0']]);
 for(const p of ['ProjectSettings/ProjectVersion.txt','project.godot','addons/x/plugin.cfg'])assert.ok(isReadable(p),p);
});
test('dependency manifests of Python, Rust, Go, .NET, Java, Unreal and vcpkg are read',()=>{
 const names=(path,text)=>parseFile(path,text).map(a=>a.name);
 assert.deepEqual(names('pyproject.toml','[project]\ndependencies=["torch>=2.0","diffusers[torch]","pillow ; python_version>\'3\'"]\n[tool.poetry.dependencies]\npython="^3.10"\nrequests="^2.31"\n'),['torch','diffusers','pillow','requests']);
 assert.deepEqual(names('Pipfile','[packages]\nflask = "*"\n[dev-packages]\npytest = "*"\n[requires]\npython_version="3.11"\n'),['flask','pytest']);
 assert.deepEqual(names('Cargo.toml','[package]\nname="g"\n[dependencies]\nbevy = "0.14"\nserde = { version = "1" }\n[dependencies.rand]\nversion="0.8"\n'),['bevy','serde','rand']);
 assert.deepEqual(names('go.mod','module m\nrequire (\n\tgithub.com/hajimehoshi/ebiten/v2 v2.7.0\n)\nrequire github.com/pkg/errors v0.9.1\n'),['github.com/hajimehoshi/ebiten/v2','github.com/pkg/errors']);
 assert.deepEqual(parseFile('Game.csproj','<PackageReference Include="Newtonsoft.Json" Version="13.0.3" /><PackageReference Include="MonoGame"><Version>3.8</Version></PackageReference>').map(a=>[a.name,a.version]),[['Newtonsoft.Json','13.0.3'],['MonoGame','3.8']]);
 assert.deepEqual(names('pom.xml','<dependency><groupId>com.badlogicgames.gdx</groupId><artifactId>gdx</artifactId><version>1.12.1</version></dependency>'),['com.badlogicgames.gdx:gdx']);
 assert.deepEqual(names('build.gradle','implementation "com.badlogicgames.gdx:gdx:1.12"\ntestImplementation \'junit:junit:4.13.2\''),['com.badlogicgames.gdx:gdx','junit:junit']);
 assert.deepEqual(names('MyGame.uproject',JSON.stringify({EngineAssociation:'5.3',Plugins:[{Name:'Built-in',Enabled:true},{Name:'Store',Enabled:true,MarketplaceURL:'x'}]})),['Unreal Engine','Store']);
 assert.deepEqual(names('vcpkg.json',JSON.stringify({dependencies:['sdl2',{name:'fmt'}]})),['sdl2','fmt']);
 assert.deepEqual(names('packages-lock.json',JSON.stringify({dependencies:{'com.unity.ugui':{version:'1.0.0',depth:0},'com.unity.burst':{version:'1.8.9',depth:1}}})),['com.unity.burst']);
 for(const p of ['pyproject.toml','Pipfile','Cargo.toml','go.mod','Game.csproj','packages.config','pom.xml','build.gradle.kts','X.uproject','Y.uplugin'])assert.ok(isReadable(p),p);
});
test('license texts beyond MIT/Apache are recognised, and mixed credits stay blank with the list',()=>{
 const one=(name,text)=>parseFile(name,text)[0].license;
 assert.equal(one('LICENSE','GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007'),'GPL-3.0-only');
 assert.equal(one('COPYING','GNU LESSER GENERAL PUBLIC LICENSE\nVersion 2.1, February 1999'),'LGPL-2.1-only');
 assert.equal(one('LICENSE','Redistribution and use in source and binary forms, with or without modification, are permitted. Neither the name of the copyright holder'),'BSD-3-Clause');
 assert.equal(one('LICENSE','Mozilla Public License Version 2.0'),'MPL-2.0');
 assert.equal(one('LICENSE','This is free and unencumbered software released into the public domain.'),'Unlicense');
 assert.equal(one('Readme.txt','Licensed under Creative Commons Attribution-NonCommercial 4.0'),'CC-BY-NC-4.0');
 // The BSD advertising clause is not auto-classified.
 assert.equal(one('LICENSE','Redistribution and use in source and binary forms ... All advertising materials mentioning features'),'');
 const credits=parseFile('CREDITS.txt','Jump sound CC0. Theme music CC BY 4.0 by A.')[0];
 assert.equal(credits.license,'');assert.match(credits.notes,/CC-BY-4\.0, CC0-1\.0/);
});
test('lock files list exact installed versions',()=>{
 const names=(p,t)=>parseFile(p,t).map(a=>a.name+'@'+a.version);
 assert.deepEqual(names('yarn.lock','"@babel/core@^7.0.0", "@babel/core@^7.1.0":\n  version "7.23.2"\n\nlodash@^4.17.21:\n  version "4.17.21"\n'),['@babel/core@7.23.2','lodash@4.17.21']);
 assert.deepEqual(names('pnpm-lock.yaml',"packages:\n  phaser@3.80.1:\n    resolution: {}\n  '@types/node@20.10.0':\n    resolution: {}\nsnapshots:\n  phaser@3.80.1: {}\n"),['phaser@3.80.1','@types/node@20.10.0']);
 assert.deepEqual(names('Cargo.lock','[[package]]\nname = "bevy"\nversion = "0.14.0"\nsource = "registry+x"\n\n[[package]]\nname = "my_game"\nversion = "0.1.0"\n'),['bevy@0.14.0']);
 assert.deepEqual(names('Pipfile.lock',JSON.stringify({default:{flask:{version:'==3.0.0'}}})),['flask@3.0.0']);
 assert.deepEqual(names('go.sum','github.com/pkg/errors v0.9.1 h1:a=\ngithub.com/pkg/errors v0.9.1/go.mod h1:b=\n'),['github.com/pkg/errors@v0.9.1']);
 assert.deepEqual(names('packages.lock.json',JSON.stringify({version:1,dependencies:{'net8.0':{'Newtonsoft.Json':{resolved:'13.0.3'}}}})),['Newtonsoft.Json@13.0.3']);
 for(const p of ['yarn.lock','pnpm-lock.yaml','Cargo.lock','poetry.lock','uv.lock','Pipfile.lock','go.sum'])assert.ok(isReadable(p),p);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {isReadable,parseFile} from '../dist/core.mjs';
import {splitImportFiles,fileAsset} from '../dist/import-files.mjs';

// Every file a game project may have received from someone else must be registered or read; only the project's own files may go unread.
const outside=`a.fbx a.obj a.blend a.dae a.3ds a.max a.ma a.c4d a.vrm a.pmx a.vox a.glb a.usdz a.abc a.spp a.sbsar Content/X.uasset
a.png a.jpg a.psd a.tga a.exr a.dds a.ktx2 a.kra a.aseprite a.clip a.ai a.svg a.webp a.gif a.ico
a.wav a.mp3 a.ogg a.flac a.m4a a.opus a.mid a.xm a.sf2 Master.bank a.bnk a.wem a.mp4 a.webm a.mov a.mkv
a.ttf a.otf a.woff2 a.fnt Fonts/OFL.txt x.dll x.so x.dylib x.aar x.jar pack.zip pack.rar pack.7z pack.unitypackage m.safetensors m.ckpt m.onnx m.gguf
LICENSE LICENSE.md COPYING NOTICE CREDITS.txt ATTRIBUTION.txt AUTHORS THIRD-PARTY-NOTICES.txt COPYRIGHT.txt Pack/Readme.txt
package.json package-lock.json requirements.txt pyproject.toml Pipfile Cargo.toml go.mod Game.csproj packages.config pom.xml build.gradle.kts vcpkg.json bom.json
ProjectSettings/ProjectVersion.txt Packages/manifest.json Packages/packages-lock.json project.godot addons/x/plugin.cfg My.uproject Plugins/X/X.uplugin
src/a.cs src/a.gd src/a.lua Shaders/a.shader Shaders/a.hlsl game/script.rpy scripts/a.gml
docs/plan.pdf docs/plan.docx docs/plan.pptx docs/plan.md docs/plan.hwp docs/plan.xlsx`.split(/\s+/);
const own='Scenes/a.unity Prefabs/a.prefab a.meta a.mat a.anim a.controller a.asset a.asmdef scenes/a.tscn scenes/a.tres a.yyp .gitignore'.split(' ');
const route=path=>{
 const f={webkitRelativePath:'game/'+path,name:path.split('/').pop()},{documents,assets}=splitImportFiles([f]);
 return documents.length?'document':!assets.length?'excluded':fileAsset(f.webkitRelativePath)?'registered':isReadable(f.webkitRelativePath)?'read':'unread';
};
test('every outside-sourced file type is registered, read or extracted; only own project files go unread',()=>{
 for(const p of outside)assert.notEqual(route(p),'unread',p);
 for(const p of own)assert.equal(route(p),'unread',p);
 assert.equal(fileAsset('game/go.mod'),null);
});
test('a README is registered only when it states license or credit terms',()=>{
 assert.equal(parseFile('Pack/Readme.txt','Low Poly Pack. License: CC0 1.0 creativecommons.org/publicdomain/zero/1.0')[0].license,'CC0-1.0');
 assert.equal(parseFile('README.md','# My game\nnpm run build').length,0);
 assert.equal(parseFile('CREDITS.txt','Music by A (CC BY 4.0)').length,1);
});

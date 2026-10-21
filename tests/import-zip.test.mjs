import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {readZip} from '../dist/import-files.mjs';

test('a zip asset pack is listed with the same rules as loose files',async()=>{
 const zip=new JSZip();
 zip.file('Pack/Models/tree.fbx','x');zip.file('Pack/Textures/bark.png','x');zip.file('Pack/Audio/wind.ogg','x');
 zip.file('Pack/License.txt','This work is licensed under Creative Commons Attribution 4.0 International');
 zip.file('Pack/Docs/EULA.pdf','x');zip.file('Pack/Scenes/demo.unity','x');zip.file('Pack/inner.zip','x');
 zip.file('__MACOSX/Pack/._tree.fbx','x');zip.file('Pack/.env','SECRET=1');
 const r=await readZip(await zip.generateAsync({type:'arraybuffer'}),JSZip,'game/pack.zip');
 const by=Object.fromEntries(r.rows.map(a=>[a.name,a]));
 assert.deepEqual(Object.keys(by).sort(),['EULA.pdf','License.txt','bark.png','inner.zip','tree.fbx','wind.ogg'].sort().map(n=>n==='License.txt'?'game/pack.zip!/Pack/License.txt':n).sort());
 assert.equal(by['tree.fbx'].kind,'model');assert.equal(by['tree.fbx'].evidence,'game/pack.zip!/Pack/Models/tree.fbx');
 assert.equal(by['game/pack.zip!/Pack/License.txt'].license,'CC-BY-4.0');
 assert.equal(r.skipped.get('unity'),1);
 assert.ok(!r.rows.some(a=>/\.env|__MACOSX/.test(a.evidence)));
});
test('oversized text entries are refused from the zip directory size, not inflated',async()=>{
 const zip=new JSZip();zip.file('LICENSE','x'.repeat(3*1024*1024));
 const r=await readZip(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}),JSZip,'big.zip');
 assert.equal(r.rows.length,0);assert.match(r.notes[0],/크기 제한/);
});

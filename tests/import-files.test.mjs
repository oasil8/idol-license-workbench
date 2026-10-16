import test from 'node:test';
import assert from 'node:assert/strict';
import {splitImportFiles} from '../dist/import-files.mjs';

test('one selection routes assignment documents and source assets without losing mixed inputs',()=>{
 const files=['발표.PPTX','아이디어.pdf','피드백.txt','설명.md','vehicle.glb','src/main.py','package.json'].map(name=>({name}));
 const r=splitImportFiles(files);
 assert.deepEqual(r.documents.map(f=>f.name),['발표.PPTX','아이디어.pdf','피드백.txt','설명.md']);
 assert.deepEqual(r.assets.map(f=>f.name),['vehicle.glb','src/main.py','package.json']);
});
test('license and dependency evidence stays on the existing scanner route',()=>{
 const files=['LICENSE.txt','COPYING.md','NOTICE.txt','requirements-dev.txt','README.md','package-lock.json'].map(name=>({name}));
 const r=splitImportFiles(files);
 assert.equal(r.documents.length,0);assert.deepEqual(r.assets,files);
});
test('folder paths exclude credentials and keep vendor docs out of assignment analysis',()=>{
 const files=[{name:'memo.txt',webkitRelativePath:'work/.git/memo.txt'},{name:'.env.txt'}, {name:'key.txt',webkitRelativePath:'work/.aws/key.txt'},{name:'README.md',webkitRelativePath:'work/node_modules/lib/README.md'},{name:'제안.txt',webkitRelativePath:'work/docs/제안.txt'}];
 const r=splitImportFiles(files);
 assert.deepEqual(r.documents.map(f=>f.name),['제안.txt']);
 assert.equal(r.ignored.length,3);assert.deepEqual(r.assets.map(f=>f.name),['README.md']);
});

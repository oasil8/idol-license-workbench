import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkspace} from '../dist/backup.mjs';
test('whole workspace backups validate before merging and flag imported evidence',()=>{
 const p={name:'test',context:{platform:'steam'},assets:[{name:'AI',kind:'ai',terms:{method:'manual',originalText:'example',attested:true}}]};
 const r=validateWorkspace({type:'license-workbench-workspace',schemaVersion:1,projects:[p],trash:[p]});
 assert.equal(r.projects.length,1);assert.equal(r.trash.length,1);assert.equal(r.projects[0].assets[0].terms.imported,true);
 assert.throws(()=>validateWorkspace({type:'license-workbench-workspace',schemaVersion:1,projects:[p],trash:null}));
 assert.throws(()=>validateWorkspace({type:'license-workbench-workspace',schemaVersion:1,projects:Array(51).fill(p),trash:[]}));
});

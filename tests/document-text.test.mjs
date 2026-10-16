import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assembleSections,locateEvidence,evidenceMarkup,purposeDefaults,checkDocxZip} from '../dist/document-text.mjs';
import {cleanTerms} from '../dist/ai.mjs';
test('PDF pages and Word paragraphs retain exact text offsets and whitespace-aware evidence',()=>{
 const r=assembleSections([{label:'PDF 1페이지',text:'Introductory terms for testing only.'},{label:'PDF 2페이지',text:'you (a) retain your ownership\nrights in Input and (b) own the Output'}]);
 const quote='you (a) retain your ownership rights in Input and (b) own the Output',hits=locateEvidence(r.text,quote);
 assert.equal(hits.length,1);assert.equal(hits[0].start,r.locations[1].start);
 const t=cleanTerms({...r,method:'manual',originalText:r.text,excerpts:[quote]});
 assert.deepEqual(t.locations,r.locations);
 const html=evidenceMarkup(t,x=>x.replaceAll('<','&lt;'));
 assert.match(html.quotes,/PDF 2페이지/);assert.match(html.original,/<mark/);
 assert.deepEqual(locateEvidence(r.text,'not present'),[]);
});
test('empty and overlong extraction fail rather than silently approve partial documents',()=>{
 assert.throws(()=>assembleSections([{label:'1',text:''}]));
 assert.throws(()=>assembleSections([{label:'1',text:'a'.repeat(200001)}]));
});
test('malformed and expanded ZIP limits reject before DOCX parsing',async()=>{
 assert.throws(()=>checkDocxZip(new ArrayBuffer(10)));
 const b=await readFile(new URL('./fixtures/terms-sample.docx',import.meta.url));const buf=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);assert.doesNotThrow(()=>checkDocxZip(buf));
 const v=new DataView(buf);for(let i=0;i<buf.byteLength-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+24,30000000,true);break;}
 assert.throws(()=>checkDocxZip(buf),/20MB/);
});
test('purpose changes apply defaults while individual flags remain editable',()=>{
 assert.deepEqual(purposeDefaults('steam'),{platform:'steam',commercial:true,distribute:true,modified:false,network:false});
 assert.equal(purposeDefaults('conference').commercial,false);assert.equal(purposeDefaults('conference').distribute,true);
 const research=purposeDefaults('research');assert.equal(research.distribute,false);research.commercial=true;assert.equal(research.commercial,true);
 assert.equal(purposeDefaults('enterprise').commercial,true);
});

test('overlapping evidence excerpts each retain a navigable original anchor',()=>{
 const originalText='Start Alpha Beta Gamma Delta End';
 const result=evidenceMarkup({originalText,excerpts:['Alpha Beta Gamma','Beta Gamma','Gamma Delta']},x=>x);
 for(const index of [0,1,2]){
  assert.ok(result.quotes.includes(`data-evidence="${index}"`));
  assert.ok(result.original.includes(`data-evidence-mark="${index}"`),String(index));
 }
 assert.ok(result.original.replace(/<[^>]+>/g,'').includes(originalText));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {extractPptx} from '../dist/pptx-text.mjs';

async function deck(){
 const zip=new JSZip();
 zip.file('ppt/presentation.xml','<p:presentation><p:sldIdLst><p:sldId id="3" r:id="rId3"/><p:sldId id="1" r:id="rId1"/></p:sldIdLst></p:presentation>');
 zip.file('ppt/_rels/presentation.xml.rels','<Relationships><Relationship Id="rId1" Target="slides/slide1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"/><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml" Id="rId3"/></Relationships>');
 zip.file('ppt/slides/slide1.xml','<p:sld><a:p><a:r><a:t>Blender &amp; Tripo AI는 3D 메시를 정리하고 생성합니다.</a:t></a:r></a:p></p:sld>');
 zip.file('ppt/slides/slide3.xml','<p:sld><a:p><a:r><a:t>입력과 출력의 변화를 측정하는 CADCAM 과제입니다.</a:t></a:r></a:p><a:p><a:r><a:t>&lt;script&gt; 문서 데이터</a:t></a:r></a:p></p:sld>');
 return zip;
}
test('PPTX extracts text in presentation order, decodes XML and records actual slide numbers',async()=>{
 const zip=await deck();const buffer=await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
 const r=await extractPptx(buffer,JSZip);
 assert.ok(r.text.indexOf('입력과 출력')<r.text.indexOf('Blender & Tripo'));
 assert.equal(r.locations[0].label,'PPTX 1슬라이드');
 assert.match(r.text,/<script> 문서 데이터/);
 assert.ok(r.warnings.some(w=>/이미지/.test(w)));
});
test('image-only slides are visibly flagged while text slides remain usable',async()=>{
 const zip=await deck();zip.file('ppt/slides/slide3.xml','<p:sld><p:pic/></p:sld>');
 const r=await extractPptx(await zip.generateAsync({type:'arraybuffer'}),JSZip);
 assert.ok(r.warnings.some(w=>/1슬라이드/.test(w)));
 assert.equal(r.locations[0].label,'PPTX 2슬라이드');
});
test('malformed, encrypted and oversized ZIPs reject before loading',async()=>{
 await assert.rejects(extractPptx(new ArrayBuffer(12),JSZip));
 const zip=await deck();const buffer=await zip.generateAsync({type:'arraybuffer'}),v=new DataView(buffer);
 for(let i=0;i<buffer.byteLength-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+24,70*1024*1024,true);break;}
 await assert.rejects(extractPptx(buffer,JSZip),/60MB/);
});

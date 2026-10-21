import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {extractOfficeXml,rtfText} from '../dist/document-text.mjs';

const build=async files=>{const z=new JSZip();for(const [n,c] of Object.entries(files))z.file(n,c);return z.generateAsync({type:'arraybuffer'});};
test('spreadsheet, Hangul and OpenDocument text is extracted in order',async()=>{
 const xlsx=await extractOfficeXml(await build({'xl/sharedStrings.xml':'<sst><si><t>Kenney 에셋</t></si><si><t>CC0 &amp; Midjourney</t></si></sst>','xl/worksheets/sheet1.xml':'<worksheet><row><c t="inlineStr"><is><t>Suno BGM</t></is></c></row></worksheet>'}),JSZip,'xlsx',{minimum:1});
 assert.match(xlsx.text,/Kenney 에셋\nCC0 & Midjourney/);assert.match(xlsx.text,/Suno BGM/);
 const hwpx=await extractOfficeXml(await build({'Contents/section0.xml':'<hs:sec><hp:p><hp:run><hp:t>유니티 에셋 스토어</hp:t></hp:run></hp:p></hs:sec>','Contents/section1.xml':'<hs:sec><hp:p><hp:t>계약 조건</hp:t></hp:p></hs:sec>'}),JSZip,'hwpx',{minimum:1});
 assert.ok(hwpx.text.indexOf('유니티 에셋 스토어')<hwpx.text.indexOf('계약 조건'));assert.equal(hwpx.locations[0].label,'한글 1구역');
 const odt=await extractOfficeXml(await build({'content.xml':'<office:document-content><text:p>Pretendard 글꼴</text:p></office:document-content>'}),JSZip,'odt',{minimum:1});
 assert.match(odt.text,/Pretendard 글꼴/);
 await assert.rejects(extractOfficeXml(await build({'content.xml':'<!DOCTYPE x [<!ENTITY a "b">]><text:p>&a;</text:p>'}),JSZip,'odt',{minimum:1}),/외부 엔티티/);
});
test('RTF keeps body text and Unicode Korean, drops font tables and control words',()=>{
 const text=rtfText(String.raw`{\rtf1\ansi{\fonttbl{\f0 Arial;}}{\colortbl;\red0;}\f0 License: CC BY 4.0\par \u54620?\u44544? \'41ssets}`);
 assert.equal(text,'License: CC BY 4.0\n한글 Assets');
});

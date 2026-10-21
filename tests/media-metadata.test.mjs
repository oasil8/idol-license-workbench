import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataRights} from '../dist/import-files.mjs';

const bytes=(...parts)=>new Uint8Array(parts.flatMap(p=>typeof p==='string'?[...new TextEncoder().encode(p)]:p));

test('image XMP gives a Creative Commons candidate with rights and creator',()=>{
 const xmp='<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description cc:license rdf:resource="https://creativecommons.org/licenses/by-sa/4.0/">'+
  '<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">© 2026 Jane Artist</rdf:li></rdf:Alt></dc:rights>'+
  '<dc:creator><rdf:Seq><rdf:li>Jane Artist</rdf:li></rdf:Seq></dc:creator></rdf:Description></rdf:RDF></x:xmpmeta>';
 const r=metadataRights(bytes([0xff,0xd8,0xff,0xe1],'http://ns.adobe.com/xap/1.0/\0',xmp));
 assert.equal(r.license,'CC-BY-SA-4.0');
 assert.match(r.summary,/저작권 "© 2026 Jane Artist"/);assert.match(r.summary,/제작자 Jane Artist/);
});

test('OGG Vorbis comments and MP3 ID3 copyright frames are read',()=>{
 const ogg=metadataRights(bytes('OggS',[3],'vorbis',[0,0,0,0],'ARTIST=Composer A',[1],'LICENSE=CC BY 4.0',[1]));
 assert.equal(ogg.license,'CC-BY-4.0');assert.match(ogg.summary,/제작자 Composer A/);
 const text='© 2025 Studio B',size=new TextEncoder().encode(text).length+1;
 // Encoding byte 3 = UTF-8.
 const id3=metadataRights(bytes('ID3',[3,0,0,0,0,0,40],'TCOP',[0,0,0,size],[0,0],[3],text));
 assert.match(id3.summary,/저작권 "© 2025 Studio B"/);assert.equal(id3.license,'');
});

test('files without metadata give nothing, and conflicting hints leave the license blank',()=>{
 assert.deepEqual(metadataRights(bytes([0x89],'PNG',[0,0,0,0])),{license:'',summary:''});
 const mixed=metadataRights(bytes('LICENSE=CC0',[1],'COPYRIGHT=CC BY-NC 4.0',[1]));
 assert.equal(mixed.license,'');
});

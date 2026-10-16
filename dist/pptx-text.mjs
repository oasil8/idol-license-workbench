import {assembleSections} from './document-text.mjs';

function checkZip(buffer){
 const v=new DataView(buffer);let end=-1,total=0;
 for(let i=v.byteLength-22;i>=Math.max(0,v.byteLength-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===v.byteLength){end=i;break;}
 if(end<0)throw Error('유효한 PPTX 압축 구조가 아닙니다. PowerPoint에서 .pptx로 다시 저장하세요.');
 const count=v.getUint16(end+10,true);let offset=v.getUint32(end+16,true);
 if(count>5000||v.getUint16(end+4,true)||v.getUint16(end+6,true))throw Error('분할 ZIP 또는 내부 항목이 너무 많은 PPTX는 지원하지 않습니다.');
 for(let i=0;i<count;i++){
  if(offset+46>end||v.getUint32(offset,true)!==0x02014b50)throw Error('PPTX 압축 구조를 읽을 수 없습니다.');
  if(v.getUint16(offset+8,true)&1)throw Error('암호화된 PPTX는 암호를 해제한 사본을 선택하세요.');
  total+=v.getUint32(offset+24,true);if(total>60*1024*1024)throw Error('PPTX 압축 해제 크기가 60MB를 초과합니다.');
  offset+=46+v.getUint16(offset+28,true)+v.getUint16(offset+30,true)+v.getUint16(offset+32,true);
 }
 if(offset!==end)throw Error('PPTX 압축 항목 길이가 올바르지 않습니다.');
}
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,c)=>{
 if(c[0]==='#'){const n=c[1].toLowerCase()==='x'?parseInt(c.slice(2),16):Number(c.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'�';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[c.toLowerCase()];
});
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1],decode(m[2]??m[3])]));
export async function extractPptx(buffer,JSZip){
 checkZip(buffer);
 const zip=await JSZip.loadAsync(buffer);
 const xml=async name=>{
  const entry=zip.file(name);if(!entry)throw Error('PPTX 내부 문서가 없습니다: '+name);
  const data=await entry.async('uint8array');if(data.length>2*1024*1024)throw Error('PPTX XML 한 항목이 2MB를 초과합니다.');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(data);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('외부 엔티티가 포함된 PPTX는 지원하지 않습니다.');return text;
 };
 const presentation=await xml('ppt/presentation.xml'),rels=await xml('ppt/_rels/presentation.xml.rels');
 const targets=new Map([...rels.matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)].map(m=>attrs(m[0])).filter(a=>a.Type?.endsWith('/slide')&&a.TargetMode!=='External').map(a=>[a.Id,a.Target]));
 const ids=[...presentation.matchAll(/<(?:\w+:)?sldId\b[^>]*>/g)].map(m=>attrs(m[0])['r:id']);
 if(!ids.length||ids.length>150)throw Error('PPTX는 1~150슬라이드까지 지원합니다.');
 const sections=[],warnings=['슬라이드 텍스트만 읽었습니다. 이미지·도형의 의미, 발표자 노트, 스케치 형상은 해석하지 않았습니다.'];
 for(const [i,id] of ids.entries()){
  const target=targets.get(id);if(!target||!/^\/?(?:ppt\/)?slides\/[\w.-]+\.xml$/.test(target))throw Error('PPTX 슬라이드 연결을 읽을 수 없습니다.');
  const name=target.startsWith('/')?target.slice(1):target.startsWith('ppt/')?target:'ppt/'+target;
  const content=await xml(name);
  // shortcut: text runs only; use a visual model when embedded sketches must be interpreted.
  const paragraphs=[...content.matchAll(/<(?:\w+:)?p\b[^>]*>([\s\S]*?)<\/(?:\w+:)?p>/g)];
  const text=paragraphs.map(p=>[...p[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>decode(m[1])).join('')).join('\n');
  if(text.trim())sections.push({label:`PPTX ${i+1}슬라이드`,text});
  else warnings.push(`${i+1}슬라이드는 읽을 텍스트가 없어 검토에서 제외했습니다. 이미지를 직접 확인하세요.`);
 }
 return {...assembleSections(sections,{minimum:1}),warnings};
}

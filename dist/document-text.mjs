export const MAX_TEXT=200000;
export function assembleSections(sections,{minimum=40}={}){
 if(sections.length>5000)throw Error('추출 문단이 5,000개를 초과합니다. 문서를 나누어 검토하세요.');
 let text='';const locations=[];
 for(const s of sections){const content=s.text.trim();const start=text.length;text+=content+'\n\n';locations.push({label:s.label,start,end:start+content.length});if(text.length>MAX_TEXT)throw Error('추출한 텍스트가 200,000자를 초과합니다. 문서를 나누어 검토하세요.');}
 if(text.trim().length<minimum)throw Error('읽을 수 있는 텍스트가 부족합니다. 스캔 PDF는 OCR 처리 후 다시 선택하세요.');
 return {text,locations};
}
export function locateEvidence(text,excerpt){
 const normalized=[],offsets=[];let wasSpace=false;
 for(let i=0;i<text.length;i++){const space=/\s/.test(text[i]);if(space&&wasSpace)continue;normalized.push(space?' ':text[i]);offsets.push(i);wasSpace=space;}
 const needle=excerpt.replace(/\s+/g,' ').trim(),haystack=normalized.join('');if(!needle)return [];
 const matches=[];let from=0,index;
 while((index=haystack.indexOf(needle,from))>=0&&matches.length<50){matches.push({start:offsets[index],end:offsets[index+needle.length-1]+1});from=index+needle.length;}
 return matches;
}
export function purposeDefaults(platform){
 return {platform,commercial:['steam','enterprise'].includes(platform),distribute:['steam','enterprise','conference'].includes(platform),modified:false,network:false};
}
export function evidenceMarkup(t,esc){
 const text=t.originalText||'',excerpts=t.excerpts||[],matches=excerpts.flatMap((quote,index)=>locateEvidence(text,quote).map(r=>({...r,index}))).sort((a,b)=>a.start-b.start);
 const locations=t.locations?.length?t.locations:[{label:'입력 원문',start:0,end:text.length}];
 const quotes=excerpts.map((quote,index)=>{const hit=matches.find(m=>m.index===index),location=hit&&locations.find(l=>l.start<=hit.start&&l.end>=hit.start);return `<blockquote>${esc(quote)}${hit?`<button type="button" class="evidence-jump" data-evidence="${index}">${esc(location?.label||'원문')}에서 확인 →</button>`:'<small>저장된 원문에서 정확한 위치를 찾지 못했습니다.</small>'}</blockquote>`;}).join('');
 const original=locations.map(location=>{
  const ranges=matches.map(m=>({...m,start:Math.max(m.start,location.start),end:Math.min(m.end,location.end)})).filter(m=>m.start<m.end);
  const points=[...new Set([location.start,location.end,...ranges.flatMap(m=>[m.start,m.end])])].sort((a,b)=>a-b);
  let html='';
  for(let i=0;i<points.length-1;i++){
   const start=points[i],end=points[i+1];
   html+=ranges.filter(m=>m.start===start).map(m=>`<span tabindex="-1" data-evidence-mark="${m.index}"></span>`).join('');
   const chunk=esc(text.slice(start,end));html+=ranges.some(m=>m.start<=start&&m.end>=end)?`<mark>${chunk}</mark>`:chunk;
  }
  return `<section><h4>${esc(location.label)}</h4><pre class="terms-original">${html}</pre></section>`;
 }).join('');
 return {quotes,original};
}
// Reject oversized ZIP expansion before a DOCX parser allocates its contents.
export function checkDocxZip(buffer){
 const view=new DataView(buffer);let end=-1;
 for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('유효한 DOCX 파일이 아닙니다. Word에서 .docx로 다시 저장하세요.');
 const count=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true),total=0;
 if(count>2000)throw Error('DOCX 내부 항목이 너무 많습니다.');
 for(let i=0;i<count;i++){
  if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)throw Error('DOCX 압축 구조를 읽을 수 없습니다.');
  if(view.getUint16(offset+8,true)&1)throw Error('암호화된 Word 파일은 암호를 해제한 사본을 선택하세요.');
  total+=view.getUint32(offset+24,true);if(total>20*1024*1024)throw Error('DOCX 압축 해제 크기가 20MB를 초과합니다.');
  offset+=46+view.getUint16(offset+28,true)+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
 }
}

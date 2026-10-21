import {resultBodyLayout as pdfBodyLayout,commonGroups,noteNames,minorNote} from './dist/result-layout.mjs';
import {normalizeAsset,assetScope} from './dist/asset-normalization.mjs';
import PDFDocument from 'pdfkit';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {evaluate,statuses,validateProject} from './dist/core.mjs';
import {conditionsConfirmed,conditionsPrompt,selectedAssets,selectionOf,projectSummary,summaryReason} from './dist/workflow.mjs';
import {projectConclusion,reportDisclaimer,summaryReasonText,displaySources,resultItems,outcomeReason,conflictNextAction} from './dist/result-sections.mjs';
import {candidateNotice,assetSources,sourceGroup} from './dist/evidence-sources.mjs';

export const verdictColor=status=>({[statuses.conflict]:'#9e3025',[statuses.review]:'#775310',[statuses.conditions]:'#16613c'}[status]||'#263e38');

// PDFKit permits CJK breaks anywhere; pre-wrap at whitespace using the actual font metrics.
export function wrapPdfText(value,measure,width){
 return String(value??'').split('\n').map(paragraph=>{
  const lines=[];let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   if(measure(word)>width){
    if(line){lines.push(line);line='';}
    for(const char of word){if(line&&measure(line+char)>width){lines.push(line);line='';}line+=char;}
   }else if(line&&measure(line+' '+word)>width){lines.push(line);line=word;}
   else line+=(line?' ':'')+word;
  }
  lines.push(line);return lines.join('\n');
 }).join('\n');
}

export function pdfNameWords(value){
 const words=String(value).trim().split(/\s+/),result=[];
 for(let i=0;i<words.length;i++){
  if(words[i]==='·'&&result.length)result[result.length-1]+=' ·'+(words[i+1]?' '+words[++i]:'');
  else result.push(words[i]);
 }
 return result;
}
export function wrapPdfName(value,measure,width){
 const lines=[];let line='';
 for(const word of pdfNameWords(value)){
  if(line&&measure(line+' '+word)>width){lines.push(line);line=word;}
  else line+=(line?' ':'')+word;
 }
 return [...lines,line].join('\n');
}

// Ignore extraction whitespace only; changed words/conditions stay separate.
export function originalKey(text) {
 return String(text).normalize('NFC').replace(/\s+/g,' ').trim();
}
export function pdfReportData(input, includeOriginals=false) {
 const p=validateProject(input,{local:true});
 if(!conditionsConfirmed(p))return {name:p.name,context:p.context,status:conditionsPrompt,reason:'2단계에서 실제 사용 조건을 확인하고 적용하세요.',usedCount:selectedAssets(p).length,pending:p.assets.filter(a=>selectionOf(a)==='pending').length,items:[],originals:[],contextConfirmed:false};
 const summary=projectSummary(p), originals=[];
 const add=(label,text)=>{if(!text?.trim())return;const key=originalKey(text);const existing=originals.find(x=>x.key===key);if(existing){if(!existing.labels.includes(label))existing.labels.push(label);}else originals.push({key,labels:[label],text});};
 const items=summary.assets.map(normalizeAsset).map(a=>{
  const r=evaluate(a,p.context), parts=resultItems(r,outcomeReason(a,r)), sources=assetSources(a,p.context);
  if(includeOriginals){
   add(a.name+' · 저장된 약관 · '+(a.terms?.fileName||a.terms?.sourceUrl||''),a.terms?.originalText);
   add(a.name+' · '+a.licenseDocument?.name,a.licenseDocument?.text);
   add(a.name+' · 입력 근거',a.evidence);add(a.name+' · 검토 메모',a.notes);
   for(const s of sources){add(a.name+' · '+s.label+' · '+s.url,s.verification?.text);if(!s.verification?.text)add(a.name+' · '+s.label+' · 발췌',s.clause||s.verification?.excerpts?.map(x=>x.text).join('\n'));}
   if(!a.terms?.originalText)add(a.name+' · 저장된 발췌',a.terms?.excerpts?.join('\n'));
  }
  const quotes=[...new Set([...(a.terms?.excerpts||[]),...sources.filter(s=>!s.contractDocument).flatMap(s=>(s.verification?.excerpts||[]).map(x=>x.text))].filter(Boolean))];
  return {candidateNotice:candidateNotice(a),ruleDate:r.ruleDate,reviewDates:r.reviewDates,reviewWarnings:r.reviewWarnings,name:a.name,status:statuses[r.status],reason:outcomeReason(a,r),...parts,
   sources:displaySources(r,sources).map(s=>({type:s.type,recordLabel:s.recordLabel,label:s.label,url:s.url,group:sourceGroup(s),date:s.date,dateLabel:s.dateLabel,warning:s.warning,scope:s.scope,note:outcomeReason(a,r).includes(s.note)?'':s.note,clause:outcomeReason(a,r).includes(s.clause)?'':s.clause,quote:s.contractDocument?s.verification?.excerpts?.[0]?.text:''})),
   quotes:quotes.slice(0,3),extraQuotes:Math.max(0,quotes.length-3),evidence:a.evidence,
   scope:assetScope(a)};
 });
 if(includeOriginals)for(const d of p.assignment?.documents||[])add(d.name+' · '+(d.role==='feedback'?'피드백':'검토 자료'),d.text);
 return {conclusion:projectConclusion(p),name:p.name,context:p.context,status:statuses[summary.status],reason:summaryReason(summary),usedCount:summary.assets.length,pending:summary.pending,items,originals};
}

export {resultBodyLayout as pdfBodyLayout} from './dist/result-layout.mjs';

export async function createReportPdf(project,{includeOriginals=false}={}) {
 const data=pdfReportData(project,includeOriginals);
 const font=process.env.IDOL_PDF_FONT||join(process.env.WINDIR||'C:/Windows','Fonts','malgun.ttf');
 if(!existsSync(font))throw Error('한글 PDF 글꼴을 찾지 못했습니다. 서버의 IDOL_PDF_FONT에 한글 TTF/OTF 글꼴 경로를 설정하세요.');
 const doc=new PDFDocument({size:'A4',margins:{top:40,bottom:44,left:42,right:42},bufferPages:true,info:{Title:data.name+' — 라이선스 검토',Author:'IDOL License WORKBENCH'},font});
 const chunks=[];const complete=new Promise((resolve,reject)=>{doc.on('data',x=>chunks.push(x));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const width=doc.page.width-84;
 const room=(height=40)=>{if(doc.y+height>doc.page.height-44)doc.addPage();};
 // PDFKit's own wrapper needs about a space more room than widthOfString reports, or it re-breaks after '/'.
 const wrapped=(value,w=width)=>wrapPdfText(value,t=>doc.widthOfString(t),w-1-doc.widthOfString('  '));
 const text=(value,size=9,color='#263e38')=>{doc.fontSize(size).fillColor(color).text(wrapped(value),42,doc.y,{width,lineGap:2,paragraphGap:3});};
 const heading=(value,size=12,color='#1f2f2a')=>{room(55);doc.moveDown(.4);text(value,size,color);doc.moveDown(.2);};
 text(data.name,18);text('IDOL License WORKBENCH · '+new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}),8);
 if(data.conclusion){
  const c=data.conclusion;
  heading(c.title,14,verdictColor(data.status));text(c.contextText,8);
  if(c.emptyText)text(c.emptyText,9);
  text(c.countsText,8);
 }else{heading(data.status);text(data.reason);text(`실제 사용 ${data.usedCount}개 · 선택 전 ${data.pending}개`,8);}
 if(data.items.length){
  const columns=[42,180,290],widths=[138,110,width-248];
  const row=(values,header=false)=>{
   const sizes=values.map(()=>header?9:8);
   doc.fontSize(sizes[0]);const longest=Math.max(...pdfNameWords(values[0]).map(w=>doc.widthOfString(w)),1);
   sizes[0]*=Math.min(1,(widths[0]-14)/longest);
   values=values.map((v,i)=>{doc.fontSize(sizes[i]);return i===0?wrapPdfName(v,t=>doc.widthOfString(t),widths[i]-14):wrapped(v,widths[i]-12);});
   const height=Math.max(26,...values.map((v,i)=>{doc.fontSize(sizes[i]);return doc.heightOfString(v,{width:widths[i]-12})+14;}));
   if(doc.y+height>doc.page.height-44){doc.addPage();row(header_,true);}
   const y=doc.y;doc.save().rect(42,y,width,height).fill(header?'#e8efec':'#ffffff').restore();
   for(let i=0;i<values.length;i++){doc.fontSize(sizes[i]).fillColor(!header&&i===1?verdictColor(values[i]):'#263e38').text(values[i],columns[i]+6,y+6,{width:widths[i]-12});}
   doc.save().strokeColor('#c7d4cf').moveTo(42,y+height).lineTo(42+width,y+height).stroke().restore();doc.y=y+height;
  };
  // One table answers "what do I do with each item"; the detailed reasons follow on the next pages.
  const c=data.conclusion,todo=c?[...c.actions,...c.usable]:[];
  const header_=c?['항목','판정','해야 할 일']:['항목','판정','한 줄 이유'];
  row(header_,true);
  const order=[statuses.conflict,statuses.review,statuses.conditions];
  for(const item of [...data.items].sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status)))row([item.name,item.status,c?todo.find(t=>t.name===item.name&&statuses[t.status]===item.status)?.action||summaryReasonText(item.reason):summaryReasonText(item.reason)]);
  for(const t of todo.filter(t=>t.status==='pending'))row([t.name,'선택 전',t.action]);
  doc.moveDown();
 }
 const layout=pdfBodyLayout(data.items);
 if(data.items.length)doc.addPage();
 // Measure the same wrapped blocks we draw, keeping ordinary cards on one page.
 // box: a shaded band so each item's title stands apart without borrowing a verdict colour.
 const drawBlock=({value,size=8.5,color='#263e38',link,box})=>{
  const pad=box?6:0,w=width-pad*2;
  doc.fontSize(size);const valueWrapped=wrapped(value,w),height=doc.heightOfString(valueWrapped,{width:w,lineGap:1})+2+pad*2;
  room(height);
  if(box)doc.save().rect(42,doc.y,width,height).fill('#e8efec').restore();
  doc.fillColor(color).text(valueWrapped,42+pad,doc.y+pad,{width:w,lineGap:1,link});doc.y+=2+pad;
 };
 for(const [kind,title] of commonGroups){
  const notes=layout.common.filter(note=>note.kind===kind&&!minorNote.test(note.text));
  if(!notes.length)continue;
  drawBlock({value:title,size:13,color:'#1f2f2a'});
  for(const note of notes)drawBlock({value:'• '+note.text+' (해당 항목: '+noteNames(note.names)+')',size:8.5});
  doc.y+=6;
 }
 const minor=layout.common.filter(note=>minorNote.test(note.text));
 if(minor.length){
  drawBlock({value:'그 밖의 일반 주의사항',size:9,color:'#65766e'});
  for(const note of minor)drawBlock({value:'• '+note.text+' (해당 항목: '+noteNames(note.names)+')',size:7.5,color:'#65766e'});
  doc.y+=6;
 }
 for(const [i,item] of layout.items.entries()){
  const blocks=[{value:`${i+1}. ${item.name}`,size:12,color:'#1f2f2a',box:true},{value:item.status+' — '+item.reason,size:9,color:verdictColor(item.status)}];
  if(item.status===statuses.conflict)blocks.push({value:conflictNextAction});
  for(const [title,values] of [['지켜야 할 조건',item.conditions],['확인 필요',item.checks]]){
   if(!values.length)continue;
   blocks.push({value:title,size:9});
   for(const value of values.slice(0,3))blocks.push({value:'• '+value});
   if(values.length>3)blocks.push({value:`외 ${values.length-3}개 · 전체 목록은 웹 화면에 있습니다.`,size:8,color:'#65766e'});
  }
  blocks.push({value:'검토 범위: '+item.scope,size:8,color:'#65766e'});

  for(const source of item.sources.slice(0,2)){
   const kind=source.recordLabel||({'reference':'공식 기록·실시간 조회 아님','supplement':'공식 기록·실시간 조회 아님','verified':'공식 주소 대조 기록','suggested':'공식 참고·적용 미확인','rule':'규칙 참고','user':'직접 입력·출처 미검증','manual':'직접 입력·출처 미검증','candidate':'공식 도메인·원문 미확인'}[source.type])||source.group;
   blocks.push({value:'근거: '+source.label+' ('+new URL(source.url).hostname.replace(/^www\./,'')+')'+(source.date?' · '+source.dateLabel+': '+source.date:'')+' · '+kind+(source.warning?' · '+source.warning:''),size:7.5,color:'#65766e',link:source.url});
  }
  if(item.sources.length>2)blocks.push({value:`외 ${item.sources.length-2}개 · 전체 근거는 웹 화면에 있습니다.`,size:7.5,color:'#65766e'});
  if(item.candidateNotice)blocks.push({value:item.candidateNotice,size:8,color:'#65766e'});
  if(!item.sources.length&&item.evidence)blocks.push({value:'입력 근거: '+item.evidence,size:8});
  const height=blocks.reduce((total,b)=>{doc.fontSize(b.size||8.5);return total+doc.heightOfString(wrapped(b.value),{width,lineGap:1})+2+(b.box?12:0);},0)+14;
  if(height<doc.page.height-84)room(height);
  doc.y+=12;
  for(const block of blocks)drawBlock(block);
 }
 // A disclaimer that no longer fits goes in the bottom margin instead of opening a page by itself.
 if(doc.y+16>doc.page.height-44){const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.fontSize(8).fillColor('#65766e').text(reportDisclaimer,42,doc.page.height-40,{width:width-60,lineBreak:false});doc.page.margins.bottom=bottom;}
 else text(reportDisclaimer,8,'#65766e');
 if(includeOriginals){
  doc.addPage();heading('부록 · 전체 보관 원문',15);
  text('앱에 저장된 원문과 검토 기록의 발췌를 포함합니다. 실시간 조회한 원문이 아니며 출처와 적용 범위를 확인하세요.',9);
  if(!data.originals.length)text('이 프로젝트에 저장된 원문이 없습니다.',9);
  text('추출 공백을 정리한 내용이 동일한 원문만 합칩니다. 다른 버전·조건은 별도로 보존합니다.',8);
  for(const [i,original] of data.originals.entries()){
   heading(`원문 ${i+1} · ${original.labels.join(' / ')}`,10);
   // Compact output only; source records and their location metadata are untouched.
   text(original.text.replace(/\n{3,}/g,'\n\n'),8);
  }
 }
 const {count}=doc.bufferedPageRange();
 for(let i=0;i<count;i++){doc.switchToPage(i);const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.fontSize(8).fillColor('#65766e').text(`${i+1} / ${count}`,42,doc.page.height-28,{width,align:'right',lineBreak:false});doc.page.margins.bottom=bottom;}
 doc.end();return complete;
}

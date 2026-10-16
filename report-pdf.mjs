import PDFDocument from 'pdfkit';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {evaluate,statuses,validateProject} from './dist/core.mjs';
import {conditionsConfirmed,conditionsPrompt,selectedAssets,selectionOf,projectSummary,summaryReason} from './dist/workflow.mjs';
import {displaySources,resultItems,outcomeReason} from './dist/result-sections.mjs';
import {assetSources,sourceGroup} from './dist/evidence-sources.mjs';

// Ignore extraction whitespace only; changed words/conditions stay separate.
export function originalKey(text) {
 return String(text).normalize('NFC').replace(/\s+/g,' ').trim();
}
export function pdfReportData(input, includeOriginals=false) {
 const p=validateProject(input,{local:true});
 if(!conditionsConfirmed(p))return {name:p.name,context:p.context,status:conditionsPrompt,reason:'2단계에서 실제 사용 조건을 확인하고 적용하세요.',usedCount:selectedAssets(p).length,pending:p.assets.filter(a=>selectionOf(a)==='pending').length,items:[],originals:[],contextConfirmed:false};
 const summary=projectSummary(p), originals=[];
 const add=(label,text)=>{if(!text?.trim())return;const key=originalKey(text);const existing=originals.find(x=>x.key===key);if(existing){if(!existing.labels.includes(label))existing.labels.push(label);}else originals.push({key,labels:[label],text});};
 const items=summary.assets.map(a=>{
  const r=evaluate(a,p.context), parts=resultItems(r,outcomeReason(a,r)), sources=assetSources(a,p.context);
  if(includeOriginals){
   add(a.name+' · 저장된 약관 · '+(a.terms?.fileName||a.terms?.sourceUrl||''),a.terms?.originalText);
   add(a.name+' · '+a.licenseDocument?.name,a.licenseDocument?.text);
   add(a.name+' · 입력 근거',a.evidence);add(a.name+' · 검토 메모',a.notes);
   for(const s of sources)add(a.name+' · '+s.label+' · '+s.url,s.verification?.text);
  }
  const quotes=[...new Set([...(a.terms?.excerpts||[]),...sources.filter(s=>!s.contractDocument).flatMap(s=>(s.verification?.excerpts||[]).map(x=>x.text))].filter(Boolean))];
  return {ruleDate:r.ruleDate,reviewDates:r.reviewDates,reviewWarnings:r.reviewWarnings,name:a.name,status:statuses[r.status],reason:outcomeReason(a,r),...parts,
   sources:displaySources(r,sources).map(s=>({recordLabel:s.recordLabel,label:s.label,url:s.url,group:sourceGroup(s),date:s.date,scope:s.scope,note:outcomeReason(a,r).includes(s.note)?'':s.note,clause:outcomeReason(a,r).includes(s.clause)?'':s.clause,quote:s.contractDocument?s.verification?.excerpts?.[0]?.text:''})),
   quotes:quotes.slice(0,3),extraQuotes:Math.max(0,quotes.length-3),evidence:a.evidence,
   scope:({code:'코드·오픈소스 자체',model:'모델·가중치',service:'서비스·API 계약',bundle:'패키지·번들 전체'}[a.reviewScope]||({output:'AI 생성 결과물',weights:'모델 가중치',service:'API·서비스 계약',training:'학습·미세조정',other:'기타 이용'}[a.scope])||'등록한 자료 범위')};
 });
 if(includeOriginals)for(const d of p.assignment?.documents||[])add(d.name+' · '+(d.role==='feedback'?'피드백':'검토 자료'),d.text);
 return {name:p.name,context:p.context,status:statuses[summary.status],reason:summaryReason(summary),usedCount:summary.assets.length,pending:summary.pending,items,originals};
}

export async function createReportPdf(project,{includeOriginals=false}={}) {
 const data=pdfReportData(project,includeOriginals);
 const font=process.env.IDOL_PDF_FONT||join(process.env.WINDIR||'C:/Windows','Fonts','malgun.ttf');
 if(!existsSync(font))throw Error('한글 PDF 글꼴을 찾지 못했습니다. 서버의 IDOL_PDF_FONT에 한글 TTF/OTF 글꼴 경로를 설정하세요.');
 const doc=new PDFDocument({size:'A4',margins:{top:40,bottom:44,left:42,right:42},bufferPages:true,info:{Title:data.name+' — 라이선스 검토',Author:'IDOL License WORKBENCH'},font});
 const chunks=[];const complete=new Promise((resolve,reject)=>{doc.on('data',x=>chunks.push(x));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const width=doc.page.width-84;
 const room=(height=40)=>{if(doc.y+height>doc.page.height-44)doc.addPage();};
 const text=(value,size=9,color='#263e38')=>{doc.fontSize(size).fillColor(color).text(String(value??''),42,doc.y,{width,lineGap:2,paragraphGap:3});};
 const heading=(value,size=12)=>{room(55);doc.moveDown(.4);text(value,size,'#086f64');doc.moveDown(.2);};
 const list=(title,values)=>{heading(title,10);if(values.length)for(const value of values)text('• '+value);else text('추가 항목 없음',9,'#65766e');};
 text(data.name,18);text('IDOL License WORKBENCH · '+new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}),8);
 heading('전체 결과: '+data.status);text(data.reason);
 if(data.items.length){
  const columns=[42,124,229],widths=[82,105,width-187];
  const row=(values,header=false)=>{
   doc.fontSize(header?9:8);
   const height=Math.max(26,...values.map((v,i)=>doc.heightOfString(v,{width:widths[i]-12})+14));
   if(doc.y+height>doc.page.height-44){doc.addPage();row(['항목','판정','한 줄 이유'],true);}
   const y=doc.y;doc.save().rect(42,y,width,height).fill(header?'#e8efec':'#ffffff').restore();
   for(let i=0;i<values.length;i++){doc.fontSize(header?9:8).fillColor('#263e38').text(values[i],columns[i]+6,y+6,{width:widths[i]-12});}
   doc.save().strokeColor('#c7d4cf').moveTo(42,y+height).lineTo(42+width,y+height).stroke().restore();doc.y=y+height;
  };
  row(['항목','판정','한 줄 이유'],true);
  const order=[statuses.conflict,statuses.review,statuses.conditions];
  for(const item of [...data.items].sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status))){const reason=item.reason.length>56?item.reason.slice(0,53)+'…':item.reason;row([item.name,item.status,reason]);}
  doc.moveDown();
 }
 const c=data.context;
 text(`사용 목적: ${ {general:'일반 이용',research:'연구',conference:'학회·논문',enterprise:'기업·납품',steam:'Steam 출시'}[c.platform]} · 상업 ${c.commercial?'예':'아니요'} · 배포 ${c.distribute?'예':'아니요'} · 수정 ${c.modified?'예':'아니요'} · 네트워크 ${c.network?'예':'아니요'}`,8);
 text(`실제 사용 ${data.usedCount}개 · 선택 전 ${data.pending}개 · 전체 원문 부록 ${includeOriginals?'포함':'제외'}`,8);
 if(data.items.length)doc.addPage();
 for(const [i,item] of data.items.entries()) {
  heading(`${i+1}. ${item.name} — ${item.status}`,12);text(item.reason);
  if(item.ruleDate)text('판정 규칙 기준일: '+item.ruleDate,8);
  for(const date of item.reviewDates||[])text('검토일: '+date,8);for(const warning of item.reviewWarnings||[])text(warning,9);
  list('지켜야 할 조건',item.conditions);list('확인 필요한 부분',item.checks);
  heading('적용 범위·핵심 근거',10);text('검토 범위: '+item.scope);
  for(const s of item.sources){
   room(45);text(`${s.group} · ${s.label}${s.recordLabel?' · '+s.recordLabel:''}${s.date?' · '+s.date:''}`,9);
   if(s.scope)text('적용 범위: '+s.scope,8);
   if(s.note)text(s.note,8);
   if(s.clause)text('근거: '+s.clause,8);
   if(s.quote)text('원문 발췌: '+s.quote,8);
   if(/^https?:\/\//i.test(s.url)){doc.fontSize(8).fillColor('#086f64').text(s.url,42,doc.y,{width,link:s.url,lineGap:2});}
  }
  if(!item.sources.length)text('공식 출처 미등록. 입력 근거를 확인하세요.',8);
  for(const quote of item.quotes)text('원문 발췌: '+quote,8);
  if(item.extraQuotes)text(`추가 발췌 ${item.extraQuotes}개는 웹의 상세 근거에서 확인하세요.`,8);
  if(item.evidence&&!item.sources.length)text('입력 근거: '+item.evidence,8);
 }
 text('검토 기록이며 출시 승인·법률 의견이 아닙니다. 확인 날짜와 실제 적용 범위를 함께 확인하세요.',8,'#65766e');
 if(includeOriginals&&data.originals.length){
  doc.addPage();heading('부록 · 전체 보관 원문',15);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import {reviewAssignment,candidateAssets} from '../dist/assignment.mjs';
import {projectConclusion,reviewReason,reportDisclaimer} from '../dist/result-sections.mjs';
import {renderReportPdf,pdfReportData,pdfBodyLayout} from '../dist/pdf-report.mjs';

const names=text=>reviewAssignment([{name:'handover.md',text}]).candidates;
for(const [name,yes,no] of [
 ['SAM 3D',['SAM 3D','SAM 3D Objects','SAM 3'],['SAM','sample','SAM 30','SAM 3Dfoo']],
 ['NVIDIA Isaac Lab',['Isaac Lab','IsaacLab','아이작 랩'],['Isaac Sim','IsaacLaboratory']],
 ['trimesh',['trimesh','TRIMESH'],['extrimesh','trimeshes']],
 ['NumPy',['numpy','NumPy'],['numpyish','anumpy']],
 ['pandas',['pandas','PANDAS'],['expandas','pandastic']],
 ['BlenderMCP',['BlenderMCP','Blender MCP','blender-mcp'],['Blender','BlenderMCPish']]
])test(`document candidate: ${name}`,()=>{
 for(const text of yes){const c=names(text).find(c=>c.name===name);assert.ok(c,text);assert.equal(candidateAssets([c])[0].license,'');}
 for(const text of no)assert.ok(!names(text).some(c=>c.name===name),text);
 assert.ok(!names('Isaac Lab').some(c=>c.name==='NVIDIA Isaac Sim'));
 assert.ok(names('Blender + BlenderMCP').some(c=>c.name==='Blender'));
});
const context={platform:'research',commercial:false,distribute:false,modified:false,network:false};
const project={name:'20차 확인',contextConfirmed:true,context,assets:[{name:'Tripo',kind:'ai',provider:'tripo',scope:'output',planType:'unknown',selection:'used'}]};
test('Tripo plan todo follows the commercial purpose',()=>{
 assert.doesNotMatch(projectConclusion(project).actions[0].action,/상업 이용/);
 assert.match(projectConclusion({...project,context:{...context,platform:'steam',commercial:true}}).actions[0].action,/무료 플랜 결과물은 상업 이용이 허용되지 않습니다\./);
});
test('joined review reasons omit trailing full stops',()=>{
 assert.equal(reviewReason({status:'review',blockers:['적용 라이선스의 사용 허가','버전이 미정']}),'적용 라이선스가 기록되지 않았습니다 · 실제 배포판·모델 버전 필요');
});
async function capture(p,includeOriginals=false){
 const calls=[];let page=0;
 class MeasuredPDF extends PDFDocument{
  addPage(...args){page++;return super.addPage(...args);}
  text(value,x,y,options){const c={value,x,y,page};const result=super.text(value,x,y,options);calls.push({...c,end:this.y});return result;}
 }
 await renderReportPdf(p,{includeOriginals,PDFDocument:MeasuredPDF,font:process.env.IDOL_PDF_FONT||'web/fonts/NanumGothic-Regular.ttf'});
 return calls;
}
test('PDF common checks use available summary space for at least two notes',async()=>{
 const calls=await capture({...project,assets:[project.assets[0],{...project.assets[0],name:'Tripo 두 번째'}]}),heading=calls.findIndex(c=>c.value==='공통 확인사항');
 assert.equal(calls[heading].page,1);
 assert.ok(calls.slice(heading).filter(c=>c.page===1&&c.value.startsWith('(해당 항목:')).length>=2);
});
test('PDF prints all common names and measures their wrapped attribution',async()=>{
 const p={...project,assets:Array.from({length:9},(_,i)=>({...project.assets[0],name:`Tripo 자료 ${i+1} 이름이 긴 검토 대상`} ))};
 const expected=pdfBodyLayout(pdfReportData(p).items).common;
 const calls=await capture(p),namesCalls=calls.filter(c=>c.value.startsWith('(해당 항목:'));
 for(const note of expected)assert.ok(namesCalls.some(c=>c.value.replace(/\s/g,'')===('(해당 항목: '+note.names.join(', ')+')').replace(/\s/g,'')));
 for(const c of namesCalls){assert.ok(c.end<=797.89);const next=calls[calls.indexOf(c)+1];if(next?.page===c.page)assert.ok(next.y>=c.end+5);}
});
test('PDF disclaimer is a separate closing paragraph before the appendix',async()=>{
 const calls=await capture(project,true),i=calls.findIndex(c=>c.value===reportDisclaimer),last=calls[i-1];
 assert.ok(i>0);if(last.page===calls[i].page)assert.ok(calls[i].y-last.end>=20);
 assert.ok(calls.findIndex(c=>c.value==='부록 · 전체 보관 원문')>i);
});

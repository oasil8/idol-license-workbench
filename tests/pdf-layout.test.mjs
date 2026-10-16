import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf,pdfReportData,pdfBodyLayout} from '../report-pdf.mjs';
const norm=s=>s.replace(/\s+/g,'');
export async function render(p,options){const doc=await getDocument({data:new Uint8Array(await createReportPdf(p,options)),useSystemFonts:true}).promise;const pages=[];for(let i=1;i<=doc.numPages;i++)pages.push((await (await doc.getPage(i)).getTextContent()).items);return pages;}
test('mixed and sample PDFs fit three pages and preserve every verdict and full reason',async()=>{
 for(const name of ['mixed','sample']){
  const p=JSON.parse(readFileSync(new URL(`./fixtures/report-${name}.json`,import.meta.url))),data=pdfReportData(p),pages=await render(p),text=norm(pages.flat().map(x=>x.str).join(''));
  assert.ok(pages.length<=3,`${name}: ${pages.length}`);
  for(const item of data.items)for(const value of [item.name,item.status,item.reason])assert.ok(text.includes(norm(value)),value);
  for(const phrase of ['과거 생성물·별도 계약·외부 콘텐츠에는 당시 계약과 적용 범위를 확인하세요.','플레이어에게 제공되는 AI 콘텐츠인지와 Steam 공개 범위를 확인하세요.','금지 콘텐츠·서비스 이용 정책을 준수하세요.'])assert.equal(text.split(norm(phrase)).length-1,1,phrase);
  assert.doesNotMatch(text,/추가항목없음|원문발췌:/);
  assert.ok(text.includes('해당항목:'));
  const layout=pdfBodyLayout(data.items);
  const detailText=norm(pages.slice(1).flat().map(x=>x.str).join(''));
  let previous=-1;
  for(const [index,item] of layout.items.entries()){
   const position=detailText.indexOf(norm(`${index+1}. ${item.name}`));assert.ok(position>previous);previous=position;
   const original=data.items.find(x=>x.name===item.name);
   for(const field of ['conditions','checks'])for(const entry of original[field]){
    const shared=layout.common.find(n=>n.sourceTexts.includes(entry));
    if(shared){assert.ok(shared.names.includes(item.name));assert.ok(text.includes(norm(shared.text)));}
    else{assert.ok(item[field].includes(entry));if(item[field].indexOf(entry)<3)assert.ok(text.includes(norm(entry)));else assert.ok(text.includes(norm(`외 ${item[field].length-3}개 · 전체 목록은 웹 화면에 있습니다.`)));}
   }
  }
  assert.equal(detailText.split('제3자권리').length-1,1);
 }
});
test('summary names keep Korean words and middle dots together in actual PDF lines',async()=>{
 const p=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));
 const names=['합성 PDF 직접입력','실제 Runway API · 접근권한'];p.assets=names.map(name=>({...p.assets[0],name}));
 const [page]=await render(p);
 const cells=page.filter(x=>x.transform[4]>=48&&x.transform[4]<180&&x.transform[5]<680);
 const lines=new Map();for(const cell of cells){const y=cell.transform[5];lines.set(y,(lines.get(y)||'')+cell.str);}
 for(const line of lines.values())assert.doesNotMatch(line.trim(),/^·/);
 for(const word of ['직접입력','접근권한'])assert.ok([...lines.values()].some(line=>line.includes(word)),word);
});
test('original excerpts appear only in requested appendix',async()=>{
 const p=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));p.assets=[{...p.assets[0],terms:{excerpts:['UNIQUE ORIGINAL EXCERPT'],originalText:'UNIQUE ORIGINAL EXCERPT'}}];
 const text=async options=>norm((await render(p,options)).flat().map(x=>x.str).join(''));
 assert.ok(!(await text()).includes('UNIQUEORIGINALEXCERPT'));
 const appendix=await text({includeOriginals:true});assert.ok(appendix.indexOf('UNIQUEORIGINALEXCERPT')>appendix.indexOf('부록'));
});
test('PDF clickable links exclude unrelated candidates and stale AI sources',async()=>{
 const mixed=JSON.parse(readFileSync(new URL('./fixtures/report-mixed.json',import.meta.url)));
 for(const p of [mixed,{...mixed,assets:mixed.assets.slice(0,2)}]){
  const doc=await getDocument({data:new Uint8Array(await createReportPdf(p)),useSystemFonts:true}).promise,links=[];
  for(let i=1;i<=doc.numPages;i++)links.push(...(await (await doc.getPage(i)).getAnnotations()).map(a=>a.url).filter(Boolean));
  assert.doesNotMatch(links.join(' '),/sunnoai.com|suno-api.io|apple.com|termly.io|microsoft.com|runway/i);
  assert.ok(links.includes(mixed.assets[0].evidence));
 }
});

import {referenceCatalog} from './catalog.mjs';
import {cleanCandidates,verificationLabel,sourceSearchName} from './source-search.mjs';
import {evaluate,commercialVerdict} from './core.mjs';
import {queryKey} from './ai.mjs';
import {officialSource,matchingCodeLicense,webLicenseRecord,codeLicenseRecords,appliedOfficialLicense} from './official-sources.mjs';

export const sourceTypes={supplement:'공식 원문 자동 보완 · 표시된 범위 기준',verified:'공식 주소 대조 · 원문 확보',candidate:'검색 후보 · 공식성·원문 미확인',queried:'공식 자동 조회 기록',failed:'공식 조회 실패',saved:'저장된 조회 기록 · 재확인 필요',manual:'사용자가 직접 등록한 약관',rule:'검토 규칙의 참고 문서',reference:'기존 공식 원문 검토 기록',suggested:'공식 참고 링크 · 개별 적용 미확인',user:'사용자 제공 링크 · 출처 미검증'};

// These addresses were researched once, not fetched on every render. They never change a verdict.
const suggestions=[
 [['Meshy','Meshy AI','메시','메쉬'],'Meshy 공식 이용약관','https://www.meshy.ai/terms-of-use','생성물·플랜·서비스 범위를 구분하세요.'],
 [['GitHub Copilot','깃허브 코파일럿'],'GitHub 생성형 AI 기업 계약','https://github.com/customer-terms/github-generative-ai-services-terms','GitHub 직접 기업 구매에 적용되는 계약입니다.'],
 [['Runway','Runway ML','런웨이'],'Runway 이용약관 · API 및 출력물','https://runway.com/terms-ofuse','출력물 허가와 API 구매·표시 의무를 구분하세요.'],
 [['Nano Banana (Gemini 이미지 생성)','Nano Banana','nanobanana','나노바나나','나노 바나나'],'Google Nano Banana 공식 제품 안내','https://deepmind.google/models/gemini-image/','Google 이미지 생성 제품 안내입니다. 비슷한 이름의 제3자 서비스와 구분하고 Gemini Apps·API·Vertex 계약은 실제 사용 경로에 맞게 확인하세요.'],
 [['Gemini','Google Gemini','제미나이'],'Gemini 적용 약관 안내','https://support.google.com/gemini/answer/13594961?hl=en','Gemini Apps 안내입니다. API·Workspace 계약과 구분하세요.'],
 [['Midjourney','미드저니'],'Midjourney 이용약관','https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service','생성 당시 플랜·매출 조건·적용 버전은 별도 확인하세요.'],
 [['GitHub Copilot','깃허브 코파일럿'],'GitHub 제품별 약관 안내','https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features','구매 경로에 따라 GitHub 또는 Microsoft 계약을 확인하세요.'],
 [['Suno','수노'],'Suno 이용약관','https://suno.com/terms','생성 당시 구독과 출력물 이용 조건은 별도 확인하세요.'],
 [['Hugging Face','Hugging Face 모델','HuggingFace','허깅페이스'],'Hugging Face 서비스 약관','https://huggingface.co/terms-of-service','플랫폼 약관입니다. 개별 모델·데이터셋의 라이선스를 대신하지 않습니다.']
];
export function officialSuggestions(a){
 const name=String(a.serviceName||a.name||'').normalize('NFKC').trim().toLowerCase();
 const references=referenceCatalog.filter(x=>x.name.toLowerCase()===name).map(x=>({type:'suggested',label:x.name+' 공식 프로젝트 · 적용 자료 확인',url:x.url,note:'프로젝트 참고 링크입니다. 실제 버전·모델·서비스 계약의 이용 허가를 확인한 기록이 아닙니다.'}));
 const codeReferences=codeLicenseRecords.filter(r=>r.names.some(n=>n.normalize('NFKC').toLowerCase()===name)).flatMap(r=>[{type:'suggested',label:r.names[0]+' 공식 라이선스',url:r.url,date:r.date,note:r.scope+'에 대한 참고 링크입니다. 다른 버전·배포판·서비스 계약에는 자동 적용하지 않습니다.'},{type:'suggested',label:r.names[0]+' 공식 프로젝트',url:r.home,date:r.date,note:r.scope}]);
 const result=references.concat(codeReferences,suggestions.filter(([names])=>names.some(n=>n.toLowerCase()===name)||(a.provider==='huggingface'&&names[0]==='Hugging Face')).map(([,label,url,note])=>({type:'suggested',label,url,date:'2026-10-15',note:'공식 페이지 주소를 확인한 날짜입니다. 이 자료의 허가 근거로 검증한 것은 아닙니다. '+note})));
 return [...new Map(result.map(source=>[source.url,source])).values()];
}
export function sourceGroup(s){
 if(s.type==='candidate')return '검색 후보 · 확인 전';
 if(s.type==='supplement'||s.type==='verified'||s.type==='reference'||s.type==='queried'&&s.clause)return '확인한 원문 기록';
 if(['rule','suggested'].includes(s.type))return '참고 링크 · 적용 미확인';
 return '미검증·재확인 기록';
}
export function sourceSearchUrl(a){
 const name=String(a.serviceName||a.name||'').trim();
 return name?'https://www.google.com/search?q='+encodeURIComponent(name+' official website license terms'):'';
}

function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}}
export function evidenceUrls(text){
 return [...new Set((String(text||'').match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)||[]).map(value=>{
  let url=value.replace(/[.,;!?。。，；！？」』]+$/u,'');
  while(url.endsWith(')')&&(url.match(/\)/g)||[]).length>(url.match(/\(/g)||[]).length)url=url.slice(0,-1);
  while(url.endsWith(']'))url=url.slice(0,-1);
  return safeUrl(/^www\./i.test(url)?'https://'+url:url);
 }).filter(Boolean))];
}
export function assetSources(a,c,now=Date.now()){
 const rows=[],seen=new Set();
 const add=row=>{const url=safeUrl(row.url);if(!url)return;if(seen.has(url)){if(row.verification){const prior=rows.find(s=>s.url===url);if(!prior.contractDocument)prior.verification=row.verification;if(['candidate','user','suggested','rule'].includes(prior.type)){prior.type=row.type;prior.note=row.note;prior.date=row.type==='verified'?row.verification.checkedAt:row.date;}}return;}seen.add(url);rows.push({...row,url});};
 for(const d of evaluate(a,c).contractDocuments||[])add({contractDocument:true,type:'verified',label:d.label,url:d.url,date:d.checkedAt,clause:d.clause,scope:'일반·추가 약관 대조 · 현재 선택한 이용 범위',note:d.contractDate||'보관한 공식 원문',verification:{...d,finalUrl:d.url,query:a.serviceName||a.name,reason:'연결된 공식 원문과 검토한 본문 일치 확인',excerpts:d.excerpts||[]}});
 const record=matchingCodeLicense(a)||webLicenseRecord(a);
 if(record&&(a.licenseOrigin===record.id||appliedOfficialLicense(a)?.id===record.id))add({type:record.trusted===false?'candidate':'supplement',label:record.scope+' 라이선스',url:record.url,date:record.date,clause:record.clause,scope:record.scope,note:record.trusted===false?'저장소 원문은 확보했으나 공식성·최신성·적용 범위는 미확인입니다.':'공식 문서 확인 기록으로 보완했습니다. 사용자 직접 확인이나 개별 파일 전체 검증이 아닙니다. 명시한 버전·별도 구성요소의 적용 여부는 결과의 확인 사항을 보세요.'});
 const t=a.terms?.method==='manual'?a.terms:evaluate(a,c).reviewedEvidence||a.terms;
 if(t?.sourceUrl){
  const stale=!t.checkedAt||!Number.isFinite(Date.parse(t.checkedAt))||now-Date.parse(t.checkedAt)>7*86400000||Date.parse(t.checkedAt)>now+60000;
  const type=t.method==='public-review'?'reference':t.method==='manual'?'manual':t.error?'failed':t.imported||stale||t.queryKey!==queryKey(a)?'saved':'queried';
  add({type,label:t.sourceName||'등록된 약관 원문',url:t.sourceUrl,date:type==='failed'?t.attemptedAt:t.checkedAt,clause:['queried','reference'].includes(type)?(t.excerpts||[]).join('\n'):'',note:t.error||t.summary||'저장된 원문과 실제 적용 범위를 확인하세요.'});
 }
 const reference=officialSource(a);
 if(reference)add({type:'reference',label:reference.title,url:reference.url,date:reference.observedOn,note:reference.note,scope:reference.scope,clause:reference.clause});
 for(const [label,url]of [...evaluate(a,c).sources,...commercialVerdict(a,c).sources])add({type:'rule',label,url,note:'이 문서를 참고한 규칙입니다. 해당 버전의 원문을 실시간 조회했다는 뜻은 아닙니다.'});
 for(const url of evidenceUrls(a.evidence))add({type:'user',label:'등록된 근거 링크',url,note:'사용자가 제공한 출처이며 진위·적용 범위는 별도 확인합니다.'});
 for(const suggestion of officialSuggestions(a))add(suggestion);
 for(const item of cleanCandidates(a.sourceCandidates)){const label=verificationLabel(item,sourceSearchName(a),now);add({type:label==='공식 주소 대조 · 원문 확보'?'verified':'candidate',label:item.title,url:item.url,date:item.searchedAt,verification:item.verification,note:label+' · 검색어: '+item.query+' · '+(item.verification?.reason||'공식 사이트 여부·원문·버전·이용 허가는 아직 확인하지 않았습니다.')});}
 return rows;
}

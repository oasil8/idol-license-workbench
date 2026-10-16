import {analyzeTerms} from './terms-analysis.mjs';
import {queryKey} from './ai.mjs';
export function reviewManual(a,{text,sourceUrl,date,attested,fileName='',locations=[]},now=new Date()){
 if(!a.provider)throw Error('AI 서비스를 먼저 선택하세요.');
 if(typeof text!=='string'||text.trim().length<40||text.length>200000)throw Error('약관 원문을 40~200,000자로 입력하세요.');
 let url;try{url=new URL(sourceUrl);}catch{throw Error('원문 출처의 HTTPS 링크를 입력하세요.');}
 if(url.protocol!=='https:'||url.username||url.password)throw Error('원문 출처의 HTTPS 링크를 입력하세요.');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>today)throw Error('확인 날짜를 오늘 또는 과거의 유효한 날짜로 지정하세요.');
 if(!attested)throw Error('원문 전체와 선택한 플랜의 적용 여부를 확인해 주세요.');
 const analysis=analyzeTerms({...a,manual:true,sourceUrl:url.href},text.replace(/\s+/g,' ').trim());
 return {...analysis,summary:analysis.summary.replace('조회한 공식 문서','직접 입력한 약관'),method:'manual',originalText:text,sourceUrl:url.href,sourceName:'사용자 입력 원문 · 출처 미검증',checkedAt:date+'T00:00:00+09:00',attemptedAt:now.toISOString(),documentDate:'문서 시행·수정일은 입력 원문에서 별도 확인',queryKey:queryKey(a),attested:true,imported:false,fileName,locations,
 conditions:[...analysis.conditions.map(x=>x.replace('현재 공개 문서 기준입니다.','사용자가 제공한 문서 기준입니다.')),'사용자가 입력한 문서 기준입니다. 최신성·진위·누락 여부는 자동 검증하지 않았습니다.']};
}

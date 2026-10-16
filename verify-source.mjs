import {officialDomains,isOfficialCandidate} from './dist/source-policy.mjs';
import {profileForQuery,collectContractDocuments} from './contract-fetch.mjs';
import {createHash} from 'node:crypto';
import {officialSource} from './dist/official-sources.mjs';
import {officialSuggestions} from './dist/evidence-sources.mjs';
import {candidateUrl,documentDate} from './dist/source-search.mjs';
import {htmlText} from './terms.mjs';
import {fetchPublic} from './public-fetch.mjs';
const normalized=s=>s.normalize('NFKC').trim().toLowerCase();
export function currentWebsites(entity){
 return (entity.claims?.P856||[]).filter(x=>x.rank!=='deprecated'&&!x.qualifiers?.P582&&!x.qualifiers?.P1534).map(x=>x.mainsnak?.datavalue?.value).filter(x=>typeof x==='string'&&candidateUrl(x)&&x.startsWith('https://'));
}
export function documentEvidence(page){
 if(!/text\/html|text\/plain/i.test(page.contentType))throw Error('HTML·텍스트 원문만 자동 확인합니다. PDF·로그인 문서는 후보로 유지합니다.');
 if(/challenge-form|cf-chl-|verify you are human|checking your browser|enable javascript and cookies/i.test(page.text))throw Error('자동 접근 제한으로 원문을 확인하지 못했습니다.');
 const text=/text\/html/i.test(page.contentType)?htmlText(page.text.replace(/&#x([0-9a-f]+);/gi,(_,hex)=>{const n=parseInt(hex,16);return n<=0x10ffff?String.fromCodePoint(n):' ';})):page.text.trim();
 if(text.length<200)throw Error('확인 가능한 원문이 부족합니다.');
 const title=htmlText(page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'원문');
 const legal=/(terms (?:of (?:service|use)|and conditions)|licen[sc]e|이용\s?약관|라이선스)/i;
 const patterns=[/permitted commercial use|commercial use restriction|상업적?\s*이용/i,/ownership|pro and premier accounts|소유권/i,/free or basic tier|redistribution|license grant|재배포/i,/copyright|licen[sc]e|저작권/i];
 const excerpts=[];
 for(const pattern of patterns){
  const match=pattern.exec(text);if(!match)continue;
  let start=Math.max(0,match.index-60);if(start)start=text.indexOf(' ',start)+1;
  if(excerpts.some(x=>Math.abs(x.start-start)<300))continue;
  let end=Math.min(text.length,start+450);if(end<text.length)end=text.lastIndexOf(' ',end);
  excerpts.push({start,text:text.slice(start,end)});if(excerpts.length===3)break;
 }

 const contractDate=documentDate(text);
 return {title,contractDate,documentKind:legal.test(title)?'약관·라이선스 제목 확인':'웹페이지 · 약관 여부 미확정',text:text.slice(0,80000),truncated:text.length>80000,excerpts,hash:createHash('sha256').update(text).digest('hex')};
}
export async function verifyCandidate(input,{fetchPage=fetchPublic,now=Date.now}={}){
 if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>200||!candidateUrl(input.url)||input.url.length>2000)throw Error('이름과 유효한 후보 URL이 필요합니다.');
 const query=input.name.trim(),url=candidateUrl(input.url),attemptedAt=new Date(now()).toISOString();
 const base={status:'candidate',query,url,attemptedAt,reason:'공식성을 확인하지 못해 후보로 유지합니다.'};
 if(officialDomains(query).length&&!isOfficialCandidate(query,url))return {...base,reason:'비공식 해설 · 근거로 사용 불가'};
 const deadline=Date.now()+45000;
 const get=target=>fetchPage(target,{deadline,allowedHost:new URL(target).hostname});
 try{
  if(!url.startsWith('https://'))throw Error('HTTPS 원문만 확인합니다.');
  const profile=profileForQuery(query);
  const known=[officialSource({name:query}),...officialSuggestions({name:query})].filter(Boolean).map(x=>x.url).concat(profile?.documents.map(d=>d.url)||[]);
  let basisUrl='',homepage='',reason='',status='candidate',publishedVersion='',sourceRef='';
  const repo=new URL(url).hostname==='github.com'?new URL(url).pathname.match(/^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/blob\/([^/]+)\/(?:LICENSE|LICENCE|COPYING)(?:\.[A-Za-z]+)?)?\/?$/i):null;
  if(repo&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(query)){try{
   const registryUrl='https://pypi.org/pypi/'+encodeURIComponent(query)+'/json';
   const info=JSON.parse((await get(registryUrl)).text).info;
   const norm=s=>String(s).toLowerCase().replace(/[-_.]+/g,'-');
   const root='https://github.com/'+repo[1]+'/'+repo[2];
   const links=Object.values(info?.project_urls||{}).concat(info?.home_page||'');
   if(norm(info?.name)===norm(query)&&links.some(link=>typeof link==='string'&&link.replace(/\.git$|\/$/g,'').toLowerCase()===root.toLowerCase())){status='matched';basisUrl=registryUrl;homepage=root;publishedVersion=String(info.version||'').slice(0,100);reason='동일 이름의 PyPI 배포 정보에 등록된 소스 저장소와 일치합니다. 패키지 코드 범위이며 호스팅 서비스·동명 복제본은 포함하지 않습니다.';}
  }catch{/* Registry lookup failure does not establish identity. */}}
  if(known.includes(url)){basisUrl=url;reason='기존에 검토한 공식 원문 주소와 정확히 일치합니다.';status='matched';}
  else if(status!=='matched'){
   try{
   const api=new URL('https://www.wikidata.org/w/api.php');api.search=new URLSearchParams({action:'wbsearchentities',format:'json',language:/[가-힣]/.test(query)?'ko':'en',search:query,limit:'5'});
   const found=JSON.parse((await get(api.href)).text);
   const exact=(found.search||[]).filter(x=>[x.label,x.match?.text].some(s=>typeof s==='string'&&normalized(s)===normalized(query))&&/^Q\d+$/.test(x.id));
   if(exact.length!==1)throw Error('같은 이름의 대상을 하나로 식별하지 못했습니다. 후보로 유지합니다.');
   const entityUrl='https://www.wikidata.org/wiki/Special:EntityData/'+exact[0].id+'.json';
   const entity=JSON.parse((await get(entityUrl)).text).entities?.[exact[0].id];
   const sites=currentWebsites(entity||{});homepage=sites.find(s=>new URL(s).hostname===new URL(url).hostname);
   if(!homepage)throw Error('공개 데이터의 현재 공식 등록 주소와 도메인이 일치하지 않습니다. 후보로 유지합니다.');
   const home=await get(homepage);
   const links=[...home.text.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(m=>{try{return candidateUrl(new URL(m[1].replaceAll('&amp;','&'),home.url).href);}catch{return '';}});
   if(candidateUrl(home.url)!==url&&!links.includes(url))throw Error('등록된 홈페이지에서 이 원문으로 연결되는 링크를 찾지 못했습니다. 후보로 유지합니다.');
   basisUrl='https://www.wikidata.org/wiki/'+exact[0].id;reason='Wikidata의 현재 공식 주소와 도메인이 일치하고 해당 홈페이지에서 원문 연결을 확인했습니다. 공동 편집 데이터이므로 공식성은 추가 확인이 필요합니다.';
   }catch(error){reason=(error.message||'공식성을 확인하지 못했습니다.')+' 원문은 미검증 후보 자료로 별도 보관합니다.';}
  }
  if(repo){
   const repositoryId=repo[1]+'/'+repo[2],apiUrl='https://api.github.com/repos/'+repositoryId+'/license'+(repo[3]?'?ref='+encodeURIComponent(repo[3]):'');
   sourceRef=repo[3]||'';
   const data=JSON.parse((await get(apiUrl)).text);
   if(data.encoding!=='base64'||typeof data.content!=='string')throw Error('저장소 라이선스 원문이 없습니다.');
   const raw=Buffer.from(data.content,'base64').toString('utf8');
   const evidence=documentEvidence({contentType:'text/plain',text:raw});
   const licenseKey=['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','MPL-2.0','ISC','GPL-3.0','GPL-2.0'].includes(data.license?.spdx_id)?data.license.spdx_id:'';
   return {...base,...evidence,status,reason,basisUrl,homepage,finalUrl:apiUrl,repositoryId,licenseKey,publishedVersion,sourceRef,checkedAt:new Date(now()).toISOString()};
  }
  const page=await get(url),evidence=documentEvidence(page);
  const documents=profile&&status==='matched'?await collectContractDocuments(profile,{get,evidence:documentEvidence,now}):undefined;
  return {...base,...evidence,documents,status,reason,basisUrl,homepage,finalUrl:page.url,checkedAt:new Date(now()).toISOString()};
 }catch(error){return {...base,reason:error.message?.slice(0,600)||base.reason};}
}

// Source verification shared by the local server and the link (GitHub Pages) version.
// Callers pass fetchPage; on the link version the browser can only read sites that allow cross-origin requests.
import {officialDomains,isOfficialCandidate} from './source-policy.mjs';
import {officialSource} from './official-sources.mjs';
import {officialSuggestions} from './evidence-sources.mjs';
import {candidateUrl,documentDate} from './source-search.mjs';
import {contractProfiles,contractBody} from './contract-profiles.mjs';

// SHA-256 of the UTF-8 text, identical to node:crypto createHash('sha256').update(text).digest('hex').
const K=Uint32Array.from([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
export function sha256Hex(text){
 const bytes=new TextEncoder().encode(text),bits=bytes.length*8,total=((bytes.length+9+63)>>6)<<6,m=new Uint8Array(total);
 m.set(bytes);m[bytes.length]=0x80;const v=new DataView(m.buffer);v.setUint32(total-8,Math.floor(bits/2**32));v.setUint32(total-4,bits>>>0);
 const h=Uint32Array.from([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64);
 const r=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let o=0;o<total;o+=64){
  for(let i=0;i<16;i++)w[i]=v.getUint32(o+i*4);
  for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3),s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
  let [a,b,c,d,e,f,g,k]=h;
  for(let i=0;i<64;i++){const t1=(k+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  h[0]+=a;h[1]+=b;h[2]+=c;h[3]+=d;h[4]+=e;h[5]+=f;h[6]+=g;h[7]+=k;
 }
 return [...h].map(x=>x.toString(16).padStart(8,'0')).join('');
}
const base64Utf8=b64=>new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0)));

export function htmlText(html){
 return html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|quot|apos|lt|gt);/g,s=>({'&amp;':'&','&nbsp;':' ','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[s])).replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):' ').replace(/\s+/g,' ').trim();
}
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
 return {title,contractDate,documentKind:legal.test(title)?'약관·라이선스 제목 확인':'웹페이지 · 약관 여부 미확정',text:text.slice(0,80000),truncated:text.length>80000,excerpts,hash:sha256Hex(text)};
}
const cache=new Map();
export function profileForQuery(name){return contractProfiles.find(p=>p.names.includes(String(name).normalize('NFKC').trim().toLowerCase()));}
export async function collectContractDocuments(profile,{get,evidence,now=Date.now}){
 const cached=cache.get(profile.id);if(cached&&now()-cached.time<600000)return cached.documents;
 const allowed=new Set([profile.root]),documents=[];let total=0;
 for(const def of profile.documents){try{
  if(!allowed.has(def.url))throw Error('일반·추가 약관에서 연결을 확인하지 못했습니다.');
  const page=await get(def.url);if(page.url!==def.url)throw Error('공식 약관 주소가 변경되었습니다.');
  for(const m of page.text.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)){try{const u=new URL(m[1].replaceAll('&amp;','&'),page.url);u.hash='';if(u.origin===new URL(profile.root).origin)allowed.add(u.href);}catch{}}
  const parsed=evidence(page);total+=parsed.text.length;if(total>360000)throw Error('추가 약관 보관 한도 초과');
  documents.push({...parsed,url:def.url,checkedAt:new Date(now()).toISOString(),status:'matched',contractHash:sha256Hex(contractBody(parsed.text))});
 }catch(e){documents.push({url:def.url,status:'candidate',error:String(e.message).slice(0,300),checkedAt:new Date(now()).toISOString()});}}
 if(documents.every(d=>d.text))cache.set(profile.id,{time:now(),documents});
 return documents;
}
export async function verifyCandidate(input,{fetchPage,now=Date.now}={}){
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
   const raw=base64Utf8(data.content);
   const evidence=documentEvidence({contentType:'text/plain',text:raw});
   const licenseKey=['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','MPL-2.0','ISC','GPL-3.0','GPL-2.0'].includes(data.license?.spdx_id)?data.license.spdx_id:'';
   return {...base,...evidence,status,reason,basisUrl,homepage,finalUrl:apiUrl,repositoryId,licenseKey,publishedVersion,sourceRef,checkedAt:new Date(now()).toISOString()};
  }
  const page=await get(url),evidence=documentEvidence(page);
  const documents=profile&&status==='matched'?await collectContractDocuments(profile,{get,evidence:documentEvidence,now}):undefined;
  return {...base,...evidence,documents,status,reason,basisUrl,homepage,finalUrl:page.url,checkedAt:new Date(now()).toISOString()};
 }catch(error){return {...base,reason:error.message?.slice(0,600)||base.reason};}
}
export async function huggingfaceTerms(input,base,fetchText){
   base.sourceUrl=`https://huggingface.co/${input.repository}`;
   const page=await fetchText(`https://huggingface.co/api/models/${input.repository}`),data=JSON.parse(page.text);
   const declared=data.cardData?.license||data.tags?.find(t=>t.startsWith('license:'))?.slice(8)||'';
   const aliases={mit:'MIT','apache-2.0':'Apache-2.0','bsd-3-clause':'BSD-3-Clause','bsd-2-clause':'BSD-2-Clause','cc0-1.0':'CC0-1.0','cc-by-4.0':'CC-BY-4.0','cc-by-nc-4.0':'CC-BY-NC-4.0'};
   const license=typeof declared==='string'?(aliases[declared]||declared):'';
   const permissive=['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','CC0-1.0','CC-BY-4.0'].includes(license);
   const status=input.scope!=='weights'?'review':/\bnc\b|non.?commercial/i.test(license)?'conflict':permissive?'conditions':'review';
   return {...base,checkedAt:new Date().toISOString(),license,status,summary:input.scope!=='weights'?'모델 카드의 가중치 라이선스를 출력물에 자동 적용할 수 없습니다.':status==='conditions'?'저장소가 선언한 모델 라이선스상 상용 사용 가능 (조건부).':status==='conflict'?'모델 카드에 비상업용 라이선스가 선언되어 있습니다.':'모델의 선언 라이선스가 미확인 또는 개별 검토 대상입니다.',conditions:['모델 카드의 선언은 게시자 주장입니다. 원저작자·LICENSE·추가 이용 제한을 직접 확인하세요.','다운로드한 모델 버전과 저장소 리비전이 같은지 확인하세요.'],excerpts:[`model card license: ${String(declared).slice(0,200)}`],documentDate:data.lastModified?`저장소 수정: ${data.lastModified}`:'저장소 수정일 미표시',revision:typeof data.sha==='string'?data.sha:'',hash:sha256Hex(page.text)};
}

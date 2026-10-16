import {officialSource} from './official-sources.mjs';
import {officialSuggestions} from './evidence-sources.mjs';
import {contractProfile} from './contract-review.mjs';
export function officialDomains(name){
 const urls=[officialSource({name})?.url,...officialSuggestions({name}).map(s=>s.url),...(contractProfile({name})?.documents||[]).map(d=>d.url)];
 return [...new Set(urls.filter(Boolean).map(url=>new URL(url).hostname))];
}
export function isOfficialCandidate(name,url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&officialDomains(name).includes(u.hostname);}catch{return false;}}
export function candidateGroupsMarkup(rows,name,renderOfficial,esc){
 const official=[],other=[];rows.forEach((r,i)=>(isOfficialCandidate(name,r.url)?official:other).push({r,i}));
 return (official.length?'<h3>공식 도메인 후보 · 적용 범위 확인 필요</h3>'+official.map(({r,i})=>renderOfficial(r,i)).join(''):'<p>등록된 공식 도메인과 일치하는 검색 결과가 없습니다.</p>')+(other.length?'<details class="unofficial-sources"><summary>비공식 해설 · 근거로 사용 불가 ('+other.length+')</summary>'+other.map(({r})=>`<p>${esc(r.title)} · <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">참고로 열기 ↗</a></p>`).join('')+'</details>':'');
}

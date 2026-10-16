import {contractProfiles,contractBody} from './dist/contract-profiles.mjs';
import {createHash} from 'node:crypto';
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
  documents.push({...parsed,url:def.url,checkedAt:new Date(now()).toISOString(),status:'matched',contractHash:createHash('sha256').update(contractBody(parsed.text)).digest('hex')});
 }catch(e){documents.push({url:def.url,status:'candidate',error:String(e.message).slice(0,300),checkedAt:new Date(now()).toISOString()});}}
 if(documents.every(d=>d.text))cache.set(profile.id,{time:now(),documents});
 return documents;
}

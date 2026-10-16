import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {candidateUrl} from './dist/source-search.mjs';
export function publicIPv4(ip){
 const n=ip.split('.').map(Number);if(n.length!==4||n.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
 const [a,b]=n;return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);
}
export async function fetchPublic(url,{allowedHost=new URL(url).hostname,deadline=Date.now()+18000}={}){
 let target=new URL(url);
 for(let hop=0;hop<4;hop++){
  if(!candidateUrl(target.href)||target.protocol!=='https:'||target.hostname!==allowedHost)throw Error('허용된 공개 HTTPS 주소 밖으로 이동하여 후보로 유지합니다.');
  const remaining=deadline-Date.now();if(remaining<=0)throw Error('원문 확인 시간이 초과되었습니다.');
  const addresses=await Promise.race([lookup(target.hostname,{family:4,all:true}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('DNS 시간 초과')),remaining);timer.unref();})]);
  if(!addresses.length||addresses.some(x=>!publicIPv4(x.address)))throw Error('공개 인터넷 주소가 아니어서 조회하지 않았습니다.');
  // Pin the checked address; a second DNS lookup must not reach an internal host.
  const response=await new Promise((resolve,reject)=>{
   const request=https.get(target,{headers:{'User-Agent':'IDOL-License-Workbench/1.4 (public source verification)',Accept:'text/html,application/json,text/plain','Accept-Encoding':'identity'},lookup:(_host,options,cb)=>cb(null,options.all?[addresses[0]]:addresses[0].address,4)},res=>{
    if(res.statusCode>=300&&res.statusCode<400){res.resume();resolve({redirect:res.headers.location});return;}
    if(res.statusCode!==200){res.resume();reject(Error('원문 접근 실패 (HTTP '+res.statusCode+'). 후보로 유지합니다.'));return;}
    const chunks=[];let size=0;
    res.on('data',chunk=>{size+=chunk.length;if(size>2000000){request.destroy(Error('원문이 2MB 제한을 초과했습니다.'));return;}chunks.push(chunk);});
    res.on('end',()=>resolve({text:Buffer.concat(chunks).toString('utf8'),contentType:res.headers['content-type']||'',url:target.href}));res.on('error',reject);
   });
   const timer=setTimeout(()=>request.destroy(Error('원문 확인 시간이 초과되었습니다.')),Math.max(1,deadline-Date.now()));timer.unref();request.on('close',()=>clearTimeout(timer));request.on('error',reject);
  });
  if(response.redirect){target=new URL(response.redirect,target);continue;}return response;
 }
 throw Error('리디렉션이 너무 많아 후보로 유지합니다.');
}

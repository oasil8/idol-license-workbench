export function projectFingerprint(p){
 const stable=v=>{if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).filter(k=>!['id','deletedAt','demo'].includes(k)).sort().map(k=>[k,stable(v[k])]));return v;};
 return JSON.stringify(stable(p));
}
export function deduplicate(projects){const seen=new Set(),kept=[],removed=[];for(const p of projects){const key=projectFingerprint(p);if(seen.has(key))removed.push(p);else{seen.add(key);kept.push(p);}}return {projects:kept,removed};}

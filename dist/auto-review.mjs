import {contractProfile,contractBundleNeeded} from './contract-review.mjs';
import {evaluate} from './core.mjs';
import {categoryRecommendation} from './catalog.mjs';
import {officialSource} from './official-sources.mjs';
import {officialSuggestions} from './evidence-sources.mjs';
import {sourceSearchName} from './source-search.mjs';
import {selectionOf} from './workflow.mjs';
// Missing evidence only: never overwrite saved originals or user-reviewed contracts.
export function sourceRefreshJobs(projects,now=Date.now()){
 const work=[];
 for(const p of projects)for(const a of p.assets){
  if(selectionOf(a)!=='used'||a.terms?.method==='manual'||a.terms?.status==='conflict'||categoryRecommendation(a))continue;
  const profile=contractProfile(a);
  if(profile&&contractBundleNeeded(a,now)){work.push({projectId:p.id,assetId:a.id,name:sourceSearchName(a),url:profile.root,signature:JSON.stringify(a)});continue;}
  const result=evaluate(a,p.context);
  if(result.status!=='review'||result.reviewedEvidence||a.sourceCandidates?.some(s=>s.verification?.text)||a.licenseOrigin)continue;
  const name=sourceSearchName(a);if(!name||name.length>200)continue;
  if(a.sourceCandidates?.some(s=>s.query===name&&now-Date.parse(s.verification?.attemptedAt||s.searchedAt)<7*86400000))continue;
  const links=[officialSource(a),...officialSuggestions(a)].filter(Boolean).map(s=>s.url);
  const url=['code','tool'].includes(a.kind)?links.find(u=>/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(u)):links[0];
  if(a.provider==='huggingface')continue; // A concrete model ID is required, never choose one by platform name.
  work.push({projectId:p.id,assetId:a.id,name,url,signature:JSON.stringify(a)});
 }
 return work.slice(0,20);
}

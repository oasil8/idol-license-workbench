import {readFileSync} from 'node:fs';
import {evaluate} from '../dist/core.mjs';
import {resultItems,outcomeReason,resultLayout} from '../dist/result-sections.mjs';
const json=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
export const contexts=[{platform:'steam',commercial:true,distribute:true,modified:true,network:true},{platform:'research',commercial:false,distribute:false,modified:false,network:false}];
export const assets=[...json('report-mixed').assets,...json('report-sample').assets,...json('real-terms/media-cases'),...['code','tool','model','image','audio','data'].flatMap(kind=>['MIT','GPL-3.0','LGPL-3.0','AGPL-3.0','CC-BY-NC-4.0','CC-BY-SA-4.0','Apache-2.0','Unity Asset Store EULA',''].map(license=>({name:`${kind}:${license}`,kind,license,confirmed:true}))),...['openai','anthropic','meshy','tripo','huggingface','copilot','elevenlabs'].flatMap(provider=>['free','paid','unknown','business'].map(planType=>({name:provider,kind:'ai',scope:'output',provider,planType})))];
export function matrix(){return contexts.flatMap(context=>assets.map((a,index)=>{const r=evaluate(a,context),parts=resultItems(r,outcomeReason(a,r));return {id:`${context.platform}:${index}:${a.name}`,status:r.status,...parts};}));}
export function counts(){return matrix().map(({id,status,conditions,checks})=>({id,status,conditions:conditions.length,checks:checks.length}));}
export function layouts(){return contexts.map(context=>resultLayout(assets,context));}

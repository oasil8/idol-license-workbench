from pathlib import Path
p=Path('dist/workflow.mjs');p.write_text('''import {commercialVerdict} from './core.mjs';
export const selectionLabels={pending:'선택 전',used:'실제 사용',alternative:'대안 보관',excluded:'사용 안 함'};
export function selectionOf(a){
 if(Object.hasOwn(selectionLabels,a.selection))return a.selection;
 return String(a.notes||'').startsWith('과제 자료에서 언급된 검토 후보입니다.')?'pending':'used';
}
export const selectedAssets=p=>p.assets.filter(a=>selectionOf(a)==='used');
export function projectSummary(p){
 const assets=selectedAssets(p),pending=p.assets.filter(a=>selectionOf(a)==='pending').length;
 const counts={conditions:0,review:0,conflict:0};
 for(const a of assets)counts[commercialVerdict(a,p.context).status]++;
 return {assets,pending,counts,status:counts.conflict?'conflict':!assets.length||pending||counts.review?'review':'conditions'};
}
// Mutate an isolated snapshot; keep the old state if persistence is refused.
export function commitChange(state,change,persist){
 const before=structuredClone(state);
 try{change(state);if(!persist(state))throw Error('저장 공간에 기록하지 못했습니다. 기존 데이터는 유지했습니다.');return true;}
 catch(error){for(const k of Object.keys(state))delete state[k];Object.assign(state,before);throw error;}
}
''',encoding='utf-8')
p=Path('dist/core.mjs');s=p.read_text(encoding='utf-8');s="import {selectionOf,selectedAssets} from './workflow.mjs';\n"+s
s=s.replace('for(const a of p.assets){','for(const a of selectedAssets(p)){',1)
s=s.replace("if(review.status==='conflict')result.status='conflict';","if(review.status==='conflict')result.status='conflict';\n  else if(review.blockers.length&&result.status==='conditions')result.status='review';")
s=s.replace('name:str(a.name,500),kind:',"name:str(a.name,500),selection:selectionOf(a),sourceConditionsConfirmed:bool(a.sourceConditionsConfirmed),licenseDocument:a.licenseDocument?validateAssignment({documents:[a.licenseDocument]}).documents[0]:undefined,kind:")
p.write_text(s,encoding='utf-8')
p=Path('dist/official-sources.mjs');s=p.read_text(encoding='utf-8')
s=s.replace("if(stale)missing.push(","if(stale&&!a.sourceConditionsConfirmed)missing.push(")
s=s.replace("if(['hunyuan','unity','unreal'].includes(source.id))", "if(['hunyuan','unity','unreal'].includes(source.id)&&!a.sourceConditionsConfirmed)")
s=s.replace('return {source,status,missing,stale,summary:source.note};','return {source,status,missing,blockers:[...missing],stale,summary:source.note};')
p.write_text(s,encoding='utf-8')
p=Path('dist/assignment.mjs');s=p.read_text(encoding='utf-8').replace("name:c.name,kind:c.kind","name:c.name,selection:'pending',kind:c.kind");p.write_text(s,encoding='utf-8')
p=Path('dist/import-files.mjs');s=p.read_text(encoding='utf-8').replace("import {isReadable}","import {isReadable,parseFile}")
s=s.replace("const document=!vendor&&!reference&&(/\\.(pdf|pptx|docx)$/i.test(name)||(/\\.(txt|md)$/i.test(name)&&!isReadable(path)));","const document=!vendor&&(/\\.(pdf|pptx|docx)$/i.test(name)||(!reference&&/\\.(txt|md)$/i.test(name)&&!isReadable(path)));")
s+='''
export const isLicenseDocument=path=>/^(?:licen[cs]es?|copying|notice|terms)(?:[.-].*)?$/i.test(String(path).replaceAll('\\\\','/').split('/').pop());
export function licenseAsset(file,result){
 const path=file.webkitRelativePath||file.name;
 const candidate=parseFile('LICENSE.txt',result.text)[0];
 return {id:crypto.randomUUID(),name:file.name,kind:'code',selection:'pending',license:candidate?.license||'',confirmed:false,rights:'unknown',evidence:path,
 notes:'추출한 라이선스 문서입니다. 이름과 종류를 실제 적용 대상에 맞게 바꾸고 적용 범위·출처를 확인하세요. 주변 자료에 자동 적용되지 않습니다.',
 date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
 licenseDocument:{name:path,role:'material',text:result.text,locations:result.locations||[],warnings:result.warnings||[]}};
}
''';p.write_text(s,encoding='utf-8')
p=Path('server.mjs');s=p.read_text(encoding='utf-8').replace("'report.mjs']","'report.mjs','workflow.mjs']");p.write_text(s,encoding='utf-8')

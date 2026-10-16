import {isReadable,parseFile} from './core.mjs';

export function splitImportFiles(files){
 const documents=[],assets=[],ignored=[];
 for(const file of files){
  const path=(file.webkitRelativePath||file.name).replaceAll('\\','/'),name=path.split('/').pop();
  if(/(^|\/)(\.git|\.env[^/]*|\.ssh|\.aws)(\/|$)/i.test(path)){ignored.push(file);continue;}
  const reference=/^(?:licenses?|copying|notice|readme|changelog)(?:[.-].*)?$/i.test(name);
  const vendor=/(^|\/)(?:node_modules|\.venv|venv)(\/|$)/i.test(path);
  const document=!vendor&&(/\.(pdf|pptx|docx)$/i.test(name)||(!reference&&/\.(txt|md)$/i.test(name)&&!isReadable(path)));
  (document?documents:assets).push(file);
 }
 return {documents,assets,ignored};
}

export const isLicenseDocument=path=>/^(?:licen[cs]es?|copying|notice|terms)(?:[.-].*)?$/i.test(String(path).replaceAll('\\','/').split('/').pop());
export function licenseAsset(file,result){
 const path=file.webkitRelativePath||file.name;
 const candidate=parseFile('LICENSE.txt',result.text)[0];
 return {id:crypto.randomUUID(),name:file.name,kind:'code',selection:'pending',license:candidate?.license||'',confirmed:false,rights:'unknown',evidence:path,
 notes:'추출한 라이선스 문서입니다. 이름과 종류를 실제 적용 대상에 맞게 바꾸고 적용 범위·출처를 확인하세요. 주변 자료에 자동 적용되지 않습니다.',
 date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
 licenseDocument:{name:path,role:'material',text:result.text,locations:result.locations||[],warnings:result.warnings||[]}};
}

import {validateProject} from './core.mjs';
export function validateWorkspace(raw){
 if(raw?.type!=='license-workbench-workspace'||raw.schemaVersion!==1||!Array.isArray(raw.projects)||!Array.isArray(raw.trash)||raw.projects.length>50||raw.trash.length>100)throw Error('지원하지 않는 전체 백업 형식입니다.');
 return {projects:raw.projects.map(p=>validateProject(p)),trash:raw.trash.map(p=>({...validateProject(p),deletedAt:typeof p.deletedAt==='string'?p.deletedAt:new Date().toISOString()}))};
}

from pathlib import Path
p=Path('dist/assignment-ui.mjs');s=p.read_text(encoding='utf-8').replace('return async function readAssignment(files){','return async function readAssignment(files,base=project()){').replace('const p=structuredClone(project());','const p=structuredClone(base);');p.write_text(s,encoding='utf-8')
p=Path('dist/app.mjs');s=p.read_text(encoding='utf-8').replace('await readAssignment(documents):','await readAssignment(documents,original):')
s=s.replace("if(storageFailed&&!error){text='저장 실패 · 변경 내용은 메모리에만 있습니다. 전체 백업을 내려받으세요. '+text;error=true;}","if(storageFailed&&!error){text='최근 저장에 실패했습니다. 저장 상태를 확인하세요. '+text;error=true;}")
# selection statuses preserved after asset creation, navigate to step 2
s=s.replace("render();$('assetDialog').close();message('검토 기록을 저장했습니다.');", "render();$('assetDialog').close();setView('inventory');message('검토 기록을 저장했습니다.');")
# context rollback and project rename, deletions preserve persisted state if save fails
start=s.index("for(const field of ['platform','commercial','distribute','modified','network'])$(field).onchange=");end=s.index('\nfunction formAsset',start)
s=s[:start]+'''for(const field of ['platform','commercial','distribute','modified','network'])$(field).onchange=()=>{
 const ok=transact(state=>{const p=state.projects.find(x=>x.id===state.current);if(field==='platform')p.context=purposeDefaults($(field).value);else p.context[field]=$(field).checked;});
 render();if(ok&&field==='platform')message('사용 목적에 맞는 추천값을 적용했습니다. 실제 조건에 맞게 변경하세요.');
};''' +s[end:]
# backup import all or nothing
start=s.index(" $('importProject').onclick=");end=s.index("\n $('exportReport')",start)
s=s[:start]+''' $('importProject').onclick=()=>$('jsonInput').click();$('jsonInput').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>50*1024*1024)throw Error('백업 JSON은 최대 50MB입니다.');
  const raw=JSON.parse(await file.text());
  const restored=raw.type==='license-workbench-workspace'?validateWorkspace(raw):{projects:[validateProject(raw)],trash:[]};
  const ok=transact(state=>{
   // Imported flags indicate trust, not different project content.
   const identity=p=>projectFingerprint(JSON.parse(JSON.stringify(p),(k,v)=>k==='imported'?undefined:v));
   const merge=(target,items,limit)=>{for(const p of items){const match=target.find(x=>identity(x)===identity(p));if(match)continue;if(target.length>=limit)throw Error('프로젝트·휴지통 개수 제한을 초과합니다.');target.push(p);}};
   merge(state.projects,restored.projects,50);merge(state.trash,restored.trash,100);
  });
  render();if(ok){setView('inventory');message('백업을 병합했습니다. 기존 자료는 유지하며 가져온 AI 약관은 재확인해야 합니다.');}
 }catch(error){message('가져오기 실패: '+error.message,true);}finally{e.target.value='';}
 };
''' +s[end:]
p.write_text(s,encoding='utf-8')

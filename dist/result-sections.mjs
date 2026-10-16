export function permissionMarkup(a,r,esc){
 let permission=r.status==='conditions'?(r.permissions||[]).join(' '):'';
 if(!permission&&r.status==='conditions')permission=a.kind==='ai'?'확보한 약관에서 선택한 이용 범위의 허용 조항을 확인했습니다.':`${a.license}의 이용 허가와 이 자료에 대한 적용 확인 기록에 근거합니다.`;
 const url=a.kind==='ai'?(a.terms?.sourceUrl||r.sources?.[0]?.[1]):r.sources?.[0]?.[1];
 const legal=r.status==='conflict'?`<details class="legal-reference"><summary>법적 참고 · 위반 확정 아님</summary><p>현재 선택한 조건과 허가 범위가 충돌한다는 뜻입니다. 별도 허가를 받거나 실제 이용 조건을 바꾸면 다시 검토할 수 있습니다. 처벌·벌금·손해배상은 관할과 구체적 사실에 따라 달라지므로 자동 산정하지 않습니다.</p><p><a href="https://www.cafc.uscourts.gov/opinions-orders/08-1001.pdf" target="_blank" rel="noopener noreferrer">미국 Jacobsen v. Katzer (2008) · 법원 원문 ↗</a>: Artistic License의 고지 등 조건이 저작권 허락 범위를 제한할 수 있다고 보고 환송한 사례입니다. 현재 자료와 동일한 사건이 아니며, 이 판결은 벌금이나 배상액을 확정한 판결이 아닙니다.</p></details>`:'';
 let link='';try{const u=new URL(url);if(u.protocol==='https:'&&!u.username&&!u.password)link=` <a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${a.kind==='ai'?'약관 원문':'라이선스 규칙 원문'} ↗</a>`;}catch{}
 return `<section class="permission-section"><h3>${r.status==='conflict'?'이유·제한 근거':'이유·허용 근거'}</h3><p>${esc(outcomeReason(a,r))}</p><p>${esc(permission||(r.status==='conflict'?'현재 선택한 이용 방식은 확인한 허가 범위를 벗어납니다.':'현재 이용 조건의 허용 여부를 결정할 필수 근거가 아직 확인되지 않았습니다.'))}${link}</p>${legal}</section>`;
}

export function reviewReason(r){
 if(r.status!=='review')return '';
 const reasons=(r.blockers?.length?r.blockers:r.notes||[]).filter(t=>!t.includes('실시간 조회한 기록은 아닙니다')).map(t=>
 t.includes('출력물의 상업 이용을 명시적으로 허용하는 문구를 인식하지 못')?'원문 확보됨 · 자동 해석 지원 범위 밖, 허용·예외 조항 검토 필요':
 t.includes('허용 문구는 있지만 적용 플랜·예외')?'허용 근거 확보됨 · 플랜·예외 조항 해석 필요':
 t.includes('Copilot 계약 경로가 필요')?'Copilot 계약 경로 선택 필요':
 t.includes('Microsoft 구매 경로')?'Microsoft 구매 약관·허용 범위 확인 필요':
 t.includes('모델 ID는 owner/model')?'사용할 모델의 owner/model 주소 필요':
 t.includes('실제 MinerU 배포 버전')?'MinerU 배포 버전 필요 · 현재/과거 라이선스가 다름':
 t.includes('합산 MAU')?'조직 규모 기준·별도 상업 허가 적용 여부 필요':
 t.includes('요금제·구매 유형이 미정')?'생성 당시 플랜·구매 유형 필요':
 t.includes('버전이 미정')?'실제 배포판·모델 버전 필요':
 t.includes('개인용 또는 기업/API')?'개인용 / 기업·API 중 적용 계약 필요':
 t.includes('조회 실패:')?'공식 원문 확보 실패 · 재조회 또는 직접 원문 필요':
 t.includes('최신 약관을 아직 조회')?'해당 이용 방식의 공식 허용 근거 필요':
 t.includes('사용 허가를 확인할 수 없습니다')?'적용 라이선스 미기록':
 t.includes('라이선스 적용 범위와 근거')?'이 자료에 대한 라이선스 적용 미확인':
 t.includes('소스 제공·재링크')?'결합·배포 범위와 소스 제공 방법 미확인':
 t.includes('지원하지 않는 라이선스')?'지원하지 않는 라이선스·개별 계약':t);
 const specific=reasons.filter(t=>!t.includes('제3자 권리가 미확인')&&!t.includes('원문 적용 범위를 아직 직접'));
 return [...new Set(specific.length?specific:reasons)].slice(0,2).join(' · ')||'필수 근거 확인 필요';
}

export function outcomeReason(a,r){
 if(r.status==='review')return '보류 이유: '+reviewReason(r);
 if(r.status==='conflict')return '사용 불가 이유: '+(r.notes?.find(n=>/충돌|별도 허가|허용하지|권리는 부여/.test(n))||r.notes?.[0]||'현재 이용 조건이 명시된 제한과 충돌합니다.');
 const specific=(r.notes||[]).find(note=>/허용|가능|금지되지|조건은 간소/.test(note)&&!note.startsWith('공식 원문'));
 return '사용 가능 이유: '+(specific||(a.kind==='ai'?'해당 약관에서 선택한 이용 범위의 허용을 확인했습니다.':`${a.license==='LicenseRef-OpenSees'?'OpenSees 라이선스':a.license||'확인한 라이선스'}에 따라 현재 이용이 허용됩니다.`))+' 남은 일은 아래 사용 조건의 이행입니다.';
}

export function resultItems(r){
 return {conditions:[...new Set(r.tasks||[])],checks:[...new Set([...(r.status==='review'?r.blockers||[]:[]),...(r.humanChecks||[])])]};
}

export function reviewStampMarkup(r,esc){return (r.reviewDates||[]).map(d=>'<small>검토일: '+esc(d)+'</small>').join('')+(r.reviewWarnings||[]).map(w=>'<p class="warning">'+esc(w)+'</p>').join('');}

from pathlib import Path
p=Path('dist/index.html');s=p.read_text(encoding='utf-8')
s=s.replace('<button class="nav active" data-view="inventory">▦ <span>자료 등록·점검</span></button><button class="nav" data-view="report">≡ <span>결과·리포트</span></button>', '<button class="nav active" data-view="intake">① <span>자료 넣기</span></button><button class="nav" data-view="inventory">② <span>실제 사용할 것 선택</span></button><button class="nav" data-view="report">③ <span>결과 확인</span></button>')
s=s.replace('IDOL / v1.3','IDOL / v1.4')
start=s.index('<section class="add-panel">');end=s.index('<section class="inventory">',start)
intake=s[start:end];s=s[:start]+s[end:]
s=s.replace('<section id="importPanel"', '<section id="intakeView"><section id="importPanel"',1)
s=s.replace('<section id="inventoryView">',intake+'<div class="step-actions"><button class="primary" data-view="inventory">다음: 실제 사용할 것 선택 →</button></div></section><section id="inventoryView" hidden>',1)
s=s.replace('문서는 새 검토 프로젝트로 열고, 함께 선택한 소스·에셋도 같은 프로젝트에 등록합니다.','현재 프로젝트에 추가합니다. 새 작업은 왼쪽에서 새 프로젝트를 먼저 만드세요.')
s=s.replace('PDF·PPTX·DOCX·TXT·MD는 문서 검토로 연결합니다. LICENSE·NOTICE·requirements와 코드·에셋은 기존 라이선스 점검으로 연결하며, 소스·에셋만 선택하면 현재 프로젝트에 추가합니다.','PDF·PPTX·DOCX는 파일명에 관계없이 문서 추출기를 사용합니다. LICENSE·COPYING·NOTICE·terms 문서는 원문을 보관하고 적용 대상을 직접 확인합니다. 새 자료는 선택 전 상태로 등록됩니다.')
s=s.replace('<h2>등록한 자료 <span', '<h2>실제로 사용하는 자료를 골라주세요 <span')
s=s.replace('각 자료의 판정·근거를 확인하고 필요한 정보를 보완하세요. 이름을 누르면 자료를 수정할 수 있습니다.','문서에서 언급됐다고 실제 사용하는 것은 아닙니다. 대안·사용 안 함은 보관하되 판정에서 제외합니다.')
s=s.replace('<div class="filters">','<p id="selectionSummary" role="status"></p><div class="filters">',1)
s=s.replace('<th>상용 판정 / 근거 상태</th>', '<th>사용 여부</th>')
s=s.replace('</div></section></section>\n<section id="reportView"', '</div></section><div class="step-actions"><button class="outline" data-view="intake">← 자료 더 넣기</button><button class="primary" data-view="report">다음: 결과 확인 →</button></div></section>\n<section id="reportView"')
s=s.replace('자료 보완하러 가기 →','← 사용 여부·정보 보완')
s=s.replace('<label class="asset-type">','<label class="full">사용 여부<select name="selection"><option value="used">실제 사용</option><option value="pending">선택 전</option><option value="alternative">대안 보관</option><option value="excluded">사용 안 함</option></select></label><label class="asset-type">',1)
s=s.replace('<label class="check full"><input name="aiGenerated"', '<label class="check full"><input name="sourceConditionsConfirmed" type="checkbox">공식 참고 문서의 최신 조건과 지역·조직·배포 범위를 확인하고 근거에 기록했습니다.</label><label>공식 조건을 직접 확인한 날짜<input name="sourceConditionsDate" type="date"></label><label class="check full"><input name="aiGenerated"',1)
# concise guide replaces outdated instructions only first guide card
start=s.index('<div class="guide-card"><h2>처음이라면');end=s.index('<div class="guide-card"><h2>근거를',start)
s=s[:start]+'''<div class="guide-card"><h2>세 단계로 검토하세요</h2><ol><li><b>자료 넣기:</b> 파일·폴더를 선택하거나 서비스·자료 이름을 검색합니다. 기존 프로젝트에 추가하며 원본 파일은 수정하지 않습니다.</li><li><b>실제 사용할 것 선택:</b> 사용 조건을 정하고 각 자료를 실제 사용, 대안 보관, 사용 안 함으로 분류합니다. 선택 전 항목이 남으면 전체 결론은 보류됩니다.</li><li><b>결과 확인:</b> 실제 사용하는 자료의 결론과 근거를 펼쳐보고 HTML 보고서를 내려받습니다. 자료 정보·라이선스가 부족하면 ‘정보 보완’에서 수정하세요.</li></ol><p>기존 직접 등록 자료는 실제 사용 상태를 유지합니다. 문서에서 추출한 미확인 후보는 선택 전으로 표시하며 기존 기록·원문·메모는 보존합니다.</p></div>''' +s[end:]
p.write_text(s,encoding='utf-8')
p=Path('dist/style.css');s=p.read_text(encoding='utf-8');s+='''
/* v1.4: three explicit steps, evidence stays with its material. */
.step-actions{display:flex;justify-content:flex-end;gap:12px;margin:24px 0}.nav.active{font-weight:700}.nav span{white-space:normal}#selectionSummary{padding:12px 16px;background:#edf4ef;border-radius:8px;color:#28533b}#assetRows select{min-width:130px}.result-card>summary{gap:16px;justify-content:space-between}.result-card>summary strong{flex:1}.result-detail pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto}.project-task-summary{margin:16px 0;padding:16px;background:#f5f8f6;border-radius:10px}.step-actions button{min-height:44px}@media(max-width:760px){.step-actions{flex-wrap:wrap}.nav{font-size:12px}.section-head{align-items:flex-start}.result-card>summary{flex-wrap:wrap}} 
''';p.write_text(s,encoding='utf-8')
p=Path('dist/core.mjs');s=p.read_text(encoding='utf-8').replace('sourceConditionsConfirmed:bool(a.sourceConditionsConfirmed),','sourceConditionsConfirmed:bool(a.sourceConditionsConfirmed),sourceConditionsDate:str(a.sourceConditionsDate,100),');p.write_text(s,encoding='utf-8')
p=Path('dist/official-sources.mjs');s=p.read_text(encoding='utf-8').replace("const missing=[];let status='review';", "const checked=Date.parse((a.sourceConditionsDate||'')+'T00:00:00+09:00');\n const reviewedRecently=a.sourceConditionsConfirmed&&a.confirmed&&!!a.evidence?.trim()&&Number.isFinite(checked)&&checked<=now&&now-checked<=7*86400000;\n const missing=[];let status='review';")
s=s.replace('!a.sourceConditionsConfirmed','!reviewedRecently')
p.write_text(s,encoding='utf-8')
for name in ['package.json','package-lock.json']:
 p=Path(name);p.write_text(p.read_text(encoding='utf-8').replace('"version": "1.3.0"','"version": "1.4.0"'),encoding='utf-8')

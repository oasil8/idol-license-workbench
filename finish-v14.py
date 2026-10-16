from pathlib import Path
p=Path('dist/index.html');s=p.read_text(encoding='utf-8-sig').replace('id="pageLabel">자료 등록·점검','id="pageLabel">1. 자료 넣기');p.write_text(s,encoding='utf-8')
p=Path('dist/assignment-ui.mjs');s=p.read_text(encoding='utf-8-sig').replace("import {purposeDefaults} from './document-text.mjs';\n",'').replace('항목별 권리·출처는 ‘자료 등록·점검’의 판정·근거에서 확인하세요.','실제 사용할 자료를 2단계에서 선택한 뒤, 항목별 권리·출처는 3단계 결과 확인에서 확인하세요.');p.write_text(s,encoding='utf-8')
p=Path('dist/app.mjs');s=p.read_text(encoding='utf-8-sig').replace('setupAssignment,renderAssignment,assignmentReportText','setupAssignment,renderAssignment');p.write_text(s,encoding='utf-8')
p=Path('README.md');s=p.read_text(encoding='utf-8-sig');start=s.index('## 과제 자료 일괄 검토');end=s.index('`official-sources.mjs`');s=s[:start]+'''## v1.4 사용 순서

1. **자료 넣기**: 파일·폴더를 선택하거나 서비스·모델 이름으로 검색합니다. 자료는 현재 프로젝트에 추가됩니다. 별도 작업은 먼저 새 프로젝트를 만드세요.
2. **실제 사용할 것 선택**: 자동 탐지한 자료는 ‘선택 전’입니다. 실제 사용 / 대안 보관 / 사용 안 함을 선택하고 버전·플랜·출처 등 정보를 보완합니다. 사용 목적을 고르면 추천 체크값이 적용되며 이후 직접 변경할 수 있습니다.
3. **결과 확인**: 실제 사용하는 자료만 판정합니다. 선택 전 자료가 남거나 필수 조건이 누락되면 전체 결론을 보류합니다. 각 자료의 결론·조건·출처·원문을 한 곳에서 확인하고 HTML 리포트로 저장합니다.

기존 직접 등록 자료는 실제 사용으로 유지합니다. 기존 문서 추출 후보는 선택 전으로 분류하며 삭제하지 않습니다. 대안·사용 안 함도 프로젝트와 JSON 백업에 남습니다. 저장 공간 부족이나 문서 추출 실패 시 가져오기 전체를 취소하고 기존 상태를 유지합니다.

## 문서 가져오기

TXT/MD, PDF, DOCX, PPTX에서 텍스트를 추출합니다. LICENSE.pdf나 LICENSE.docx도 문서 추출기로 읽고 라이선스 자료로 등록합니다. 추출 원문·위치를 보관하지만 다른 파일에 그 라이선스를 자동 적용하지 않습니다. 일반 문서에서 찾은 도구 이름은 사용 여부를 확정하지 않은 후보입니다.

문서 최대 20개·합계 60MB, 파일당 텍스트 200,000자·전체 500,000자 제한이 있습니다. PDF/DOCX 최대 10MB, PPTX 최대 30MB, PDF/PPTX 최대 150페이지입니다. OCR과 외부 LLM 연결은 없습니다. 이미지 속 글자와 발표자 노트는 분석하지 않습니다. AI 약관은 항목에서 조회하거나 텍스트·파일로 직접 등록하세요. 업로드 직후 자동으로 외부 조회하지 않습니다.

## 판정과 근거

필수 버전·플랜·적용 범위가 빠지면 조건부 허용으로 처리하지 않습니다. 원문 확인 체크는 사용자가 직접 확인한 기록이며 자동 허가가 아닙니다. 출처 확인일·적용 범위·근거 문구와 사용자 입력을 구분합니다.

'''+s[end:];s=s.replace("모든 자료는 ‘자료 등록·점검’", "모든 자료는 ‘실제 사용할 것 선택’");p.write_text(s,encoding='utf-8')
p=Path('HANDOFF.txt');s=p.read_text(encoding='utf-8-sig').replace('v1.3','v1.4');s=s.replace('기존 서버를 종료하거나 PORT를 바꾸세요. 포트가 바뀌면 그 주소에서 백업을 다시 가져와야 합니다.','기존 서버 창에서 Ctrl+C로 종료하고 이 폴더의 서버를 실행하세요. 기존 데이터를 계속 보려면 같은 브라우저와 같은 주소를 사용하세요.');s+='\n\nv1.4 변경: 3단계 화면, 실제 사용 선택, 필수 조건 보류, PDF/Word 라이선스 추출, 저장 실패 원복, 항목별 통합 리포트.\n저장 키 license-workbench-v1을 유지합니다. 기존 문서 후보는 선택 전으로 표시되며 삭제되지 않습니다.\n브라우저 자동화 접근이 정책상 차단되어 이번 버전의 실제 화면 클릭 검증은 완료하지 못했습니다. VALIDATION.txt를 확인하세요.\n';p.write_text(s,encoding='utf-8')

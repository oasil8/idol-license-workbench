// Display-only observations supplied and checked on 2026-10-22; never used by evaluate.
import {officialRecord} from './official-sources.mjs';
const checkedOn='2026-10-22';
const entries={
 unity:{names:['Unity','유니티'],summary:'최근 12개월 총 매출+자금(USD): Personal 무료 $200,000 이하; Pro $200,001~$24,999,999(연 $2,310/좌석 또는 월 $210/좌석); Enterprise $25,000,000 이상. 비게임·비엔터테인먼트 산업 용도(Industry) 기준 $1,000,000. Unity 6 이하 프로젝트 런타임 배포는 로열티·수익 배분·런타임 요금 없음.',urls:['https://unity.com/legal/editor-terms-of-service/software','https://unity.com/products/pricing-updates']},
 godot:{names:['Godot','고도 엔진','고도엔진'],summary:'MIT 엔진, 모든 목적에 무료. 제작 게임에는 Godot 라이선스가 적용되지 않으며 제작자가 저작권자. 배포물 문서에 Godot 저작권·라이선스 고지 포함(라이선스 페이지 링크 가능).',urls:['https://godotengine.org/license/']},
 blender:{names:['Blender','블렌더'],summary:'결과물은 제작자 단독 소유, 상업 이용 가능. GPL은 프로그램 자체 배포·수정에 적용(소스 GPL-2.0-or-later, 바이너리 GPL-3.0-or-later; Cycles Apache-2.0).',urls:['https://www.blender.org/about/license/']},
 isaacsim:{names:['NVIDIA Isaac Sim','Isaac Sim','IsaacSim','아이작 심','아이작심'],summary:'GitHub 소스 Apache-2.0; Kit SDK·3D 모델·텍스처는 추가 소프트웨어·자료 라이선스. 내부 연구·개발 무료, 앱·서비스 형태의 제3자 재배포는 NVIDIA AI Enterprise 필요 — 공식 FAQ 확인 필요(원문 일부 요약 확인).',urls:['https://docs.isaacsim.omniverse.nvidia.com/latest/common/license-faq.html']},
 meshy:{names:['Meshy','메시','메쉬'],summary:'무료 결과물 CC BY 4.0: “Model created with Meshy – CC BY 4.0 License” 출처 표시 시 상업 이용 가능. 유료(Pro·Premium·Ultra·Studio)는 Meshy 커뮤니티에 공개하지 않은 결과물을 사용자가 비공개로 소유.',urls:['https://www.meshy.ai/pricing','https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models']},
 anthropic:{names:['Claude','Claude Code','Anthropic','클로드','클로드 코드'],summary:'개인 약관(2025-10-08 시행)은 출력물 권리를 사용자에게 양도. 상업 약관(API 등, 2025-06-17 시행)은 고객이 출력물 소유, 고객 콘텐츠로 학습하지 않음. 두 약관 모두 경쟁 제품·모델 제작 금지.',urls:['https://www.anthropic.com/legal/consumer-terms','https://www.anthropic.com/legal/commercial-terms']}
};
const key=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
export function monetizationInfo(asset={}){
 const name=key(asset.serviceName||asset.name);
 const entry=Object.values(entries).find(x=>x.names.some(n=>key(n)===name));
 if(entry)return {summary:entry.summary,urls:entry.urls,checkedOn};
 const previous={tripo:['tripo','트리포'],unreal:['unreal engine','unreal','언리얼'],openai:['codex','코덱스','openai','openai / chatgpt','chatgpt']} ;
 const id=Object.keys(previous).find(id=>previous[id].includes(name));
 if(id){const record=officialRecord(id);return {summary:record.note,urls:[record.url],checkedOn:record.observedOn,previous:true};}
 return {summary:'공식 라이선스에서 확인 필요',urls:[]};
}
export function monetizationMarkup(asset,esc){
 const info=monetizationInfo(asset);
 return `<small class="monetization">수익화: ${esc(info.summary)}${info.urls.length?' — '+info.urls.map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(url).hostname.replace(/^www\./,''))}</a>`).join(' · '):''}${info.checkedOn?' · 확인 '+esc(info.checkedOn):''}${info.previous?' · 기존 공식 기록':''}</small>`;
}

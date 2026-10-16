// Reviewed documents are data; selection, precedence and evidence checks are shared across services.
const E='https://elevenlabs.io/';
const question=(key,label,options,when={},why='')=>({key,label,options,when,why});
const rule=(when,status,reason,docs=[])=>({when,status,reason,docs});
export const contractProfiles=[{
 planDependent:true,planExplanation:'일반 기능은 무료·유료에 따라 상업 이용이 달라집니다. 음악·베타·API 외부 제공은 아래 추가 조건이 우선합니다.',id:'elevenlabs',names:['elevenlabs','일레븐랩스'],root:E+'terms-of-use',checkedOn:'2026-10-16',
 documents:[
 ['general','terms-of-use','일반 약관 · 비EEA',{}],['eu','terms-of-use-eu','일반 약관 · EEA',{}],['index','service-specific-terms','서비스별 추가 약관 목록',{}],['policy','use-policy','금지 이용 정책',{}],
 ['creative','creative-terms','ElevenCreative 추가 약관',{product:['speech','sfx','dubbing','image']}],['voice','vla','음성 라이브러리 추가 약관',{product:['speech']}],['stt','speech-to-text-terms','Speech to Text 추가 약관',{product:['stt']}],
 ['api','elevenapi-terms','ElevenAPI 추가 약관',{scope:['service']}],['oem','oem-terms','외부 서비스 제공 · OEM 약관',{scope:['service'],audience:['endusers'],product:['speech','sfx','stt','music','dubbing','image','other']}],['beta','bsa','베타 추가 약관',{edition:['beta']}],['music','music-terms','Music 추가 약관·플랜 표',{product:['music']}],['agents','agents-terms','ElevenAgents 추가 약관',{product:['agents']}]
 ].map(([id,path,label,when])=>({id,url:E+path,label,when})),
 questions:[
 question('edition','이용한 기능의 상태',[['stable','정식 기능'],['beta','베타·미리보기']],{},'베타는 유료여도 상업·실서비스 이용이 금지됩니다.'),
 question('product','실제로 사용한 기능',[['speech','음성 생성 · TTS / Voice Changer'],['sfx','효과음'],['stt','음성 인식 · 전사'],['music','음악 생성'],['dubbing','Dubbing v2'],['image','이미지·영상 / Studio의 외부 모델'],['agents','대화형 에이전트'],['other','그 외 기능']],{edition:['stable']},'기능별 추가 약관을 자동으로 연결합니다.'),
 question('contract','적용 계약',[['public','공개 일반 약관'],['custom','별도로 체결한 계약']],{},'별도 계약 내용은 공개 사이트에서 확인할 수 없습니다.'),
 question('audience','API 이용 대상',[['internal','본인·조직 내부 작업'],['endusers','고객에게 생성 기능·서비스 제공']],{scope:['service']},'API 직접 호출과 고객에게 기능을 제공하는 권한은 다릅니다.'),
 question('oem','고객 제공 권한',[['small','Free / Starter / Creator / Pro'],['eligible','Scale / Business / Enterprise 조직 · 제공 권한 포함'],['custom','별도 OEM 계약']],{scope:['service'],audience:['endusers'],product:['speech','sfx','stt','music','dubbing','image','other']},'OEM 약관은 작은 플랜의 서비스 재제공을 금지합니다. 조직 계약의 제공 범위는 실제 주문과 일치해야 합니다.'),
 question('soundUse','효과음 배포 방식',[['combined','영상·게임·다른 콘텐츠에 결합'],['standalone','독립 파일·샘플·음원 라이브러리']],{product:['sfx']},'효과음은 결합 이용만 허용되며 독립 파일 배포는 제한됩니다.'),
 question('dubbingUse','더빙 이용 매체',[['ugc','직접 올리는 YouTube·SNS 콘텐츠'],['ads','유료 광고 소재'],['production','영화·TV·구독 스트리밍 등 상업 제작물']],{product:['dubbing']},'Dubbing v2의 전문 영상 제작 제한과 예외를 구분합니다.'),
 question('musicTier','음악에 적용되는 플랜',[['free','Free'],['starter','Starter'],['creator','Creator'],['pro','Pro'],['scale','Scale'],['business','Business'],['enterprise-lite','Enterprise Music Lite'],['enterprise','Enterprise Music']],{product:['music']},'음악은 자체 플랜 표가 일반 약관보다 우선합니다. 업그레이드 시 기존 계정 출력물도 새 플랜 적용, 다운그레이드 시 생성 당시 플랜 유지.'),
 question('musicUse','음악 이용 방식',[['general','일반 온라인·오프라인 콘텐츠'],['streaming','음악 스트리밍 배포'],['broadcast','영화·TV·라디오·Studio Game'],['library','음원 라이브러리 구성·배포']],{product:['music']},'Studio Game은 약관의 Indie Game 매출 기준(게임 50만 달러 미만, 개발자 전체 게임 연매출 100만 달러 미만 등)을 충족하지 않는 게임입니다.'),
 question('musicEntity','음악 이용 주체',[['person','개인'],['under10','직원 10명 미만 조직'],['under50','직원 10명 이상 50명 미만 조직'],['large','직원 50명 이상 조직']],{product:['music']},'음악 Free~Pro는 개인용, Scale은 10명 미만, Business는 50명 미만 조직까지입니다.'),
 question('betaUse','베타 이용 목적',[['testing','비상업 테스트만'],['production','실서비스·상업 이용']],{edition:['beta']})
 ],
 rules:[
 rule({contract:['custom']},'review','별도로 체결한 계약 원문 필요',['general']),
 rule({scope:['weights','training','other','']},'review','생성물·API 외 이용 범위의 별도 허가 필요',['general']),
 rule({edition:['beta'],commercial:[true]},'conflict','베타 추가 약관은 상업 이용을 금지합니다.',['beta']),
 rule({edition:['beta'],betaUse:['production']},'conflict','베타 추가 약관은 실서비스 환경 이용을 금지합니다.',['beta']),
 rule({edition:['stable'],planType:['free'],commercial:[true],product:['speech','sfx','stt','dubbing','agents','image','other']},'conflict','무료 일반 서비스는 비상업 용도로 제한됩니다.',['general','eu']),
 rule({edition:['stable'],planType:['unknown',''],commercial:[true],product:['speech','sfx','stt','dubbing','agents','image','other']},'review','이용 당시 무료·유료 플랜 선택 필요',['general']),
 rule({planType:['business']},'review','기업 별도 계약의 적용 원문 필요',['general']),
 rule({product:['other']},'review','실제로 이용한 기능 이름·모델 주소 필요',['index']),
 rule({product:['image','agents']},'review','함께 사용한 외부 모델·제공자 이름과 적용 약관 필요',['index']),
 rule({scope:['service'],apiAccessConfirmed:[false]},'review','선택한 API 기능의 실제 접근 권한 확인 필요',['api']),
 rule({scope:['service'],audience:['endusers'],oem:['small'],product:['speech','sfx','stt','music','dubbing','image','other']},'conflict','해당 플랜은 생성 기능을 고객에게 재제공할 수 없습니다.',['oem']),
 rule({scope:['service'],audience:['endusers'],oem:['custom']},'review','별도 OEM 계약 원문 필요',['oem']),
 rule({product:['sfx'],soundUse:['standalone']},'conflict','효과음의 독립 파일·샘플·라이브러리 배포는 허용되지 않습니다.',['creative']),
 rule({product:['dubbing'],dubbingUse:['production']},'conflict','Dubbing v2의 전문 상업 영상 이용에는 서면 허가가 필요합니다.',['creative']),
 rule({product:['music'],musicUse:['library']},'conflict','음원 라이브러리 구성·배포에는 별도 서면 허가가 필요합니다.',['music']),
 rule({product:['music'],musicUse:['streaming'],musicTier:['free','starter']},'conflict','해당 음악 플랜은 스트리밍 배포를 허용하지 않습니다.',['music']),
 rule({product:['music'],musicUse:['broadcast'],musicTier:['free','starter','creator','pro','scale','business','enterprise-lite']},'conflict','영화·TV·라디오·Studio Game의 음악 이용에는 Enterprise Music 권한이 필요합니다.',['music']),
 rule({product:['music'],musicTier:['free'],distribute:[true]},'conflict','음악 Free 플랜은 다운로드가 허용되지 않습니다.',['music']),
 rule({product:['music'],musicTier:['free'],scope:['service']},'conflict','음악 Free 플랜은 API 접근을 허용하지 않습니다.',['music']),
 rule({product:['music'],musicTier:['free','starter','creator','pro'],musicEntity:['under10','under50','large']},'conflict','해당 음악 플랜은 개인 이용만 허용합니다.',['music']),
 rule({product:['music'],musicTier:['scale'],musicEntity:['under50','large']},'conflict','음악 Scale은 직원 10명 미만 조직까지 허용합니다.',['music']),
 rule({product:['music'],musicTier:['business'],musicEntity:['large']},'conflict','음악 Business는 직원 50명 미만 조직까지 허용합니다.',['music'])
 ],
 duties:[
 {when:{},text:'입력·음성·초상 권리를 확보하고 사칭·유해 콘텐츠 등 금지 이용 정책과 계정·이용 한도를 준수하세요.',docs:['general','policy']},
 {when:{},text:'공개 약관의 현재 기능 범위입니다. 개별 모델·주문서에 별도 조건이 표시된 경우 그 조건을 우선 적용하세요.',docs:['index']},
 {when:{edition:['stable'],planType:['free','unknown'],product:['speech','sfx','stt','dubbing']},text:'비상업 용도를 유지하고 공개한 생성물에 ElevenLabs 출처를 표시하세요.',docs:['general']},
 {when:{scope:['service']},text:'API 키를 외부에 노출하지 말고 접근 통제·호출 한도·웹훅 서명 검증·개인정보 처리 조건을 준수하세요. SDK의 MIT 허가는 서비스 접근 권한이 아닙니다. MCP·CLI 이용 시 해당 추가 조항과 자동 실행 승인·보안 의무도 지키세요.',docs:['api']},
 {when:{audience:['endusers'],oem:['eligible']},text:'주문서에 허용된 범위에서만 고객에게 제공하고, 제한 조건·데이터 처리·제3자 수익자 조항을 포함한 최종 사용자 계약을 체결하세요. 재재판매·무단 정부기관 제공은 금지됩니다.',docs:['oem']},
 {when:{product:['speech','sfx','dubbing','image']},text:'식별 가능한 사람의 음성·초상 입력은 동의를 확보하고 법정 기간 또는 최소 5년간 증빙을 보존하세요.',docs:['creative']},
 {when:{product:['stt']},text:'녹음·전사 고지와 동의를 확보하고 증빙을 최소 5년 또는 더 긴 법정 기간 보존하세요. 실시간 전사는 수집 전에 고지하세요.',docs:['stt']},
 {when:{product:['sfx']},text:'효과음은 다른 콘텐츠에 결합해 사용하고 독립 샘플·라이브러리로 배포하지 마세요.',docs:['creative']},
 {when:{product:['music']},text:'음악 약관의 아티스트명·곡명·가사 등 금지 프롬프트, 사칭 금지, 플랜별 자격·다운로드·배포 제한 및 AI 표시 의무를 준수하세요.',docs:['music']},
 {when:{product:['music'],musicTier:['free']},text:'음악 Free는 배포 시 Eleven Music 표시가 필요하며 다운로드·API·스트리밍 제한을 별도로 지켜야 합니다.',docs:['music']},
 {when:{edition:['beta']},text:'베타는 테스트 용도로만 사용하고 개인정보 입력·공개 발표·실서비스 이용을 하지 마세요. 비밀유지 의무를 준수하세요.',docs:['beta']}
 ]
}, {
 id:'runway',names:['runway','runway ml','런웨이'],root:'https://runway.com/terms-ofuse',checkedOn:'2026-10-16',
 documents:[
 {id:'runwayGeneral',url:'https://runway.com/terms-ofuse',label:'Runway 일반·API 약관',when:{},anchors:['commercial use','Powered by Runway']},
 {id:'runwayPolicy',url:'https://runway.com/safety/usage-policy',label:'Runway 이용 정책',when:{},anchors:['non-consensual intimate imagery','We prohibit the following:']},
 {id:'runwayBrand',url:'https://runway.com/brand-guidelines',label:'Runway API 브랜드 표시 지침',when:{scope:['service']},anchors:['Runway']}
 ],
 questions:[question('contract','적용 계약',[['public','공개 일반 약관'],['custom','별도로 체결한 계약']]),question('material','검토하는 자료',[['own','직접 생성한 출력물·그 생성 API'],['stock','Stock Avatar·다른 이용자의 콘텐츠·외부 모델']])],
 rules:[rule({scope:['weights','training','other','']},'review','출력물·API 이외 범위의 별도 허가 확인 필요',['runwayGeneral']),rule({contract:['custom']},'review','별도 체결 계약 원문 필요',['runwayGeneral']),rule({material:['stock']},'review','사용한 아바타·제3자 콘텐츠·외부 모델의 개별 이용 조건 필요',['runwayGeneral']),rule({scope:['service'],apiAccessConfirmed:[false]},'review','구매한 API 접근 권한 확인 필요',['runwayGeneral'])],
 duties:[{when:{},text:'입력·초상·음성 등의 이용 권리를 확보하고 금지 이용 정책을 준수하세요. 경쟁 제품·모델 개발에 이용하지 마세요.',docs:['runwayGeneral','runwayPolicy']},{when:{scope:['service']},text:'구매한 API 범위·호출 한도를 지키고 API 키를 보호하세요. 고객에게 약관 제한이 반영된 이용 계약을 적용하세요.',docs:['runwayGeneral']},{when:{scope:['service']},text:'연동 화면에 Powered by Runway와 Runway 홈페이지 링크를 표시하고 공식 브랜드 지침을 준수하세요.',docs:['runwayGeneral','runwayBrand']}]
}];
export const normalizeContractText=text=>String(text||'').replace(/\s+/g,' ').trim();
export function contractBody(text){let t=normalizeContractText(text),start=t.search(/Last Updated|Last updated|Updated \d/i);if(start>=0)t=t.slice(start);const end=t.indexOf('Create with the highest quality AI Audio');if(end>=0)t=t.slice(0,end);return t.trim();}

const anchors={general:[{text:'you may only use the Services for non-commercial purposes',when:{planType:['free']}},{text:'you may use the Services for commercial purposes',when:{planType:['paid']}},'you retain all rights in and to your Output','Supplemental Terms will control'],eu:['you may use the Services for commercial purposes'],creative:[{text:'You may exercise those rights only in respect of Output combined with other material',when:{product:['sfx']}},{text:'Unless expressly authorized in an Order Form',when:{product:['dubbing']}},'you have given all notices and obtained all consents','five (5) years from the date obtained'],api:['Your credentials are not a substitute','Those licenses grant no right'],oem:['Free, Starter, Creator, or Pro tier plan','End Users must be bound'],beta:['use the Beta Services for any commercial purposes'],music:['Music Commercial Rights Table','If you upgrade to a higher-priced plan'],stt:['five (5) years'],voice:['For clarity, others may be able to generate Output'],policy:['Prohibited'],index:['terms corresponding'],agents:['does not constitute resale']};
for(const p of contractProfiles)for(const d of p.documents)d.anchors=d.anchors||anchors[d.id]||[];

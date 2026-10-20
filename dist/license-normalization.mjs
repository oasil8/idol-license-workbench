// Match entire names and explicit source wrappers; never discard unknown qualifiers.
const nameKey=value=>value.toLowerCase().replace(/\b(?:the|license|licence|version)\b/g,'').replace(/\bv(?=\s*\d)/g,'').replace(/[\s,-]+/g,'');
const aliases=new Map([
 ...['Unity Asset Store EULA','Unity Asset Store Standard EULA','Standard Unity Asset Store EULA','Unity Asset Store End User License Agreement'].map(name=>[nameKey(name),'LicenseRef-Unity-Asset-Store-EULA']),
 ['mit','MIT'],['mit(mit)','MIT'],['apache2.0','Apache-2.0'],
 ['bsd3clause','BSD-3-Clause'],['newbsd','BSD-3-Clause'],
 ['bsd2clause','BSD-2-Clause'],['simplifiedbsd','BSD-2-Clause'],
 ['isc','ISC'],['mpl2.0','MPL-2.0'],['psf2.0','PSF-2.0'],
 ['cc0','CC0-1.0'],['cc01.0','CC0-1.0'],['cc01.0universal','CC0-1.0'],
 ['ofl1.1','OFL-1.1'],['silofl1.1','OFL-1.1'],['openfont1.1','OFL-1.1'],['silopenfont1.1','OFL-1.1'],
 ['zlib','Zlib'],['bsl1.0','BSL-1.0'],['boostsoftware1.0','BSL-1.0'],
 ['0bsd','0BSD'],['unlicense','Unlicense'],['epl2.0','EPL-2.0'],['wtfpl','WTFPL']
]);
function normalizeSingleLicense(value){
 const original=(value||'').trim(),key=nameKey(original);
 if(aliases.has(key))return aliases.get(key);
 const gpl=key.match(/^(a?gpl|lgpl)v?(2(?:\.0)?|2\.1|3(?:\.0)?)(only|orlater|\+)?$/);
 if(gpl&&(gpl[2]!=='2.1'||gpl[1]==='lgpl')&&(gpl[1]!=='agpl'||gpl[2].startsWith('3'))){
  const version=gpl[2].includes('.')?gpl[2]:gpl[2]+'.0';
  return `${gpl[1].toUpperCase()}-${version}-${['orlater','+'].includes(gpl[3])?'or-later':'only'}`;
 }
 const cc=key.replace(/^creativecommonsattribution/,'ccby').replace('noncommercial','nc').replace('sharealike','sa').replace('noderivatives','nd');
 const match=cc.match(/^ccby(nc)?(sa|nd)?([34]\.0)$/);
 if(match)return `CC-BY${match[1]?'-NC':''}${match[2]?'-'+match[2].toUpperCase():''}-${match[3]}`;
 return original;
}

export function licenseClarification(license){
 const key=license.toLowerCase().replace(/\b(?:the|license|licence)\b/g,'').replace(/[\s-]+/g,'');
 const gpl=key.match(/^(a?gpl|lgpl)$/);
 if(gpl){const family=gpl[1].toUpperCase();return [`${family} 버전 미확인`,`${family} 버전(${family==='LGPL'?'2/2.1/3':family==='AGPL'?'3':'2/3'})과 'or later' 여부를 확인해 입력하세요.`];}
 if(['ofl','silofl','openfont','silopenfont'].includes(key))return ['OFL 버전 미확인','글꼴에 포함된 OFL 원문에서 버전(1.0/1.1)을 확인해 입력하세요.'];
 if(key==='bsd')return ['BSD 조항 수 미확인','BSD 라이선스 원문에서 조항 수(2/3 등)를 확인해 입력하세요.'];
 if(/^(?:ccby|creativecommonsattribution)(?:nc|noncommercial)?(?:sa|nd|sharealike|noderivatives)?$/.test(key))return ['Creative Commons 버전 미확인','Creative Commons 라이선스의 버전과 BY·NC·SA·ND 조건을 원문에서 확인해 입력하세요.'];
 if(key==='publicdomain')return ['Public Domain 권리 포기·만료 근거 미확인','Public Domain의 권리 포기 선언 또는 저작권 만료 근거와 적용 지역을 확인해 입력하세요.'];
 if(key==='royaltyfree')return ['Royalty Free 계약 범위 미확인','판매처의 라이선스 원문에서 게임 판매·배포 허용 범위와 제한 조건을 확인해 입력하세요.'];
 if(key==='boost')return ['Boost 라이선스 버전 미확인','Boost 배포판에 적용된 라이선스 원문과 버전을 확인해 입력하세요.'];
 const store=[
  [/^unity\s+asset\s+store\b/i,'Unity Asset Store'],[/^fab\b/i,'Fab'],
  [/^unreal\s+engine\b/i,'Unreal Engine'],[/^epic\s+content\b/i,'Epic Content'],
  [/^pixabay\b/i,'Pixabay'],[/^unsplash\b/i,'Unsplash'],[/^pexels\b/i,'Pexels'],
  [/^adobe\s+stock\b/i,'Adobe Stock'],[/^envato\b/i,'Envato'],
  [/^epidemic\s+sound\b/i,'Epidemic Sound'],[/^itch\.io\b/i,'itch.io']
 ].find(([pattern])=>pattern.test(license));
 if(store)return [`판매처 라이선스(${license})`,`구매·다운로드 당시 ${store[1]} 라이선스 원문을 저장하고, 게임에 포함해 판매·배포하는 것이 허용되는지와 단독 재배포 금지 조건을 확인하세요.`];
}

const creationAliases=new Map([
 ...['직접 제작','자체 제작','직접 만듦','Original','Own work','Self-made','LicenseRef-Own-Work'].map(s=>[s.toLowerCase().replace(/\s/g,''),'LicenseRef-Own-Work']),
 ...['팀 내부 제작','팀원 제작','Team work','LicenseRef-Team-Work'].map(s=>[s.toLowerCase().replace(/\s/g,''),'LicenseRef-Team-Work']),
 ...['외주 제작','외주','Commissioned','Work for hire','LicenseRef-Commissioned'].map(s=>[s.toLowerCase().replace(/\s/g,''),'LicenseRef-Commissioned']),
 ...['구매함','구매','Purchased','Paid asset','LicenseRef-Purchased'].map(s=>[s.toLowerCase().replace(/\s/g,''),'LicenseRef-Purchased'])
]);
const permissive=new Set(['MIT','BSD-2-Clause','BSD-3-Clause','ISC','Apache-2.0','Zlib','BSL-1.0','0BSD','Unlicense','CC0-1.0']);
const sourceNames=['Kenney','Freesound','Google Fonts','Sketchfab','OpenGameArt','itch.io','GitHub','Poly Haven','ambientCG'];
function sourceLicense(value){
 for(const source of sourceNames){
  const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+');
  for(const pattern of [new RegExp(`^(?:${escaped}\\s+|\\(${escaped}\\)\\s*)(.+)$`,'i'),new RegExp(`^(.+?)(?:\\s+${escaped}|\\s*\\(${escaped}\\))$`,'i')]){
   const match=value.match(pattern);if(!match)continue;
   const license=normalizeSingleLicense(match[1]);
   // Keep unknown qualifiers intact; a site name is never evidence of a license.
   if(aliases.has(nameKey(license))||/^(?:CC-BY(?:-NC)?(?:-SA|-ND)?-[34]\.0|(?:A?GPL|LGPL)-[23]\.[01]-(?:only|or-later))$/.test(license)||licenseClarification(license)&&!licenseClarification(license)[0].startsWith('판매처'))return {license,source};
  }
 }
 return null;
}
export function licenseDetails(value){
 const original=(value||'').trim();
 const creation=creationAliases.get(original.toLowerCase().replace(/\s/g,''));
 if(creation)return {license:creation};
 const sourced=sourceLicense(original);
 const license=sourced?.license||normalizeSingleLicense(original);
 const operators=license.match(/(?:^|[\s()])(AND|OR|WITH)(?=$|[\s()])/gi)||[];
 const multiple=operators.length>0||license.includes('/');
 let expression;
 if(multiple&&!/[()]/.test(license)&&!operators.some(op=>op.trim().toUpperCase()==='WITH')){
  const operations=operators.map(op=>op.trim().toUpperCase());if(license.includes('/'))operations.push('OR');
  if(new Set(operations).size===1){
   const ids=license.split(/\s+(?:AND|OR)\s+|\//i).map(part=>normalizeSingleLicense(part.trim()));
   if(ids.length>1&&ids.every(id=>permissive.has(id)))expression={operator:operations[0],licenses:ids};
  }
 }
 return {license,...(sourced?{source:sourced.source}:{}),...(multiple?{multiple:true}:{}),...(expression?{expression}:{})};
}
export function normalizeLicense(value){return licenseDetails(value).license;}

// Match the entire name; never discard unknown qualifiers or choose between licenses.
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
export function normalizeLicense(value){
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

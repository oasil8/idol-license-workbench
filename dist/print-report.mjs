// Used by the app and embedded in standalone HTML reports; no storage changes.
export function installReportPrint(root, win = window) {
 let state;
 function restore() {
  if (!state) return;
  for (const {node, marker} of state.originals) marker.replaceWith(node);
  state.appendix.remove();
  for (const {node, open} of state.details) if (node.isConnected) node.open = open;
  state = undefined;
 }
 function prepare() {
  if (state) return;
  const doc = root.ownerDocument;
  const details = Array.from(root.querySelectorAll('details'), node => ({node, open: node.open}));
  const appendix = doc.createElement('section');
  appendix.className = 'print-appendix';
  const title = doc.createElement('h2');
  title.textContent = '부록 · 보관된 원문과 근거';
  appendix.append(title);
  state = {details, appendix, originals: []};
  const originals = Array.from(root.querySelectorAll('.assignment-source, .original-sections, pre'));
  for (const node of originals) {
   let grouped = false;
   for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
    if (originals.includes(parent)) { grouped = true; break; }
   }
   if (grouped) continue;
   const headings = [];
   for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
    const heading = parent.querySelector(':scope > summary, :scope > h2, :scope > h3');
    if (heading) headings.unshift(heading.textContent.trim());
   }
   const ownHeading = node.querySelector(':scope > summary');
   if (ownHeading) headings.push(ownHeading.textContent.trim());
   const previous = node.previousElementSibling;
   if (previous?.tagName === 'H4') headings.push(previous.textContent.trim());
   const section = doc.createElement('section');
   const heading = doc.createElement('h3');
   const index = state.originals.length + 1;
   heading.textContent = `원문 ${index} · ${headings.join(' / ') || '보관 원문'}`;
   const marker = doc.createElement('p');
   marker.className = 'print-original-reference';
   marker.textContent = `원문 전문: 뒤쪽 부록의 원문 ${index} 참조`;
   node.replaceWith(marker);
   section.append(heading, node);
   appendix.append(section);
   state.originals.push({node, marker});
  }
  for (const {node} of details) node.open = true;
  if (state.originals.length) root.append(appendix);
 }
 win.addEventListener('beforeprint', prepare);
 win.addEventListener('afterprint', restore);
 return {prepare, restore};
}

export const reportPrintCss = `
@media print {
 details, details::details-content { display:block!important; content-visibility:visible!important; }
 .assessment-evidence,.verification-record,.assignment-source,.legal-reference { display:block!important; }
 .assignment-source>label,button { display:none!important; }
 details, .result-card, .result-detail, .assessment-sources, .source-links-panel,
 .source-links-panel article, .verification-record, .assignment-source, .evidence-body,
 .material-evidence, .original-sections, .print-appendix section, pre, blockquote {
  max-height:none!important; height:auto!important; overflow:visible!important;
  break-inside:auto; min-width:0; max-width:100%;
 }
 .result-card,.assessment-sources,.material-evidence,.assignment-source,.verification-record {
  border:0!important; border-radius:0!important; box-shadow:none!important;
 }
 pre,blockquote { white-space:pre-wrap!important; overflow-wrap:anywhere!important; word-break:break-word; font:10pt/1.6 "Malgun Gothic",sans-serif; }
 h2,h3,h4,summary { break-after:avoid; overflow-wrap:anywhere; }
 p,li { orphans:3; widows:3; overflow-wrap:anywhere; }
 .print-appendix { break-before:page; border:0; padding:0; }
 .print-appendix section { border:0; margin:18pt 0; padding:0; }
 .print-original-reference { font-size:9pt; }
 .report-table-wrap { overflow:visible!important; }
 table { table-layout:fixed; width:100%; min-width:0!important; }
 td,th { overflow-wrap:anywhere; }
 thead { display:table-header-group; }
}
`;

export function dotRun(document, parts, { className = '' } = {}) {
  const paragraph = document.createElement('p');
  paragraph.className = ['d40-runbox', className].filter(Boolean).join(' ');
  const run = document.createElement('span');
  run.className = 'd40-run';
  parts.filter(part => part != null).forEach((part, index) => {
    if (index) run.appendChild(document.createElement('wbr'));
    const segment = document.createElement('span');
    segment.className = 'd40-rs';
    if (index) {
      const dot = document.createElement('span');
      dot.className = 'd40-rd';
      dot.textContent = '\u00a0·\u00a0';
      segment.appendChild(dot);
    }
    if (part?.nodeType) segment.appendChild(part);
    else segment.appendChild(document.createTextNode(String(part)));
    run.appendChild(segment);
  });
  paragraph.appendChild(run);
  return paragraph;
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 muku66
// Page logic for the offline converter: reads the chosen files, converts them in this browser, offers downloads.
import { docxToMd } from './core/docx.js';
import { pptxToMd } from './core/pptx.js';
import { xlsxToMd } from './core/xlsx.js';
import { pdfToMd } from './core/pdf.js';

const EN = document.documentElement.lang.startsWith('en');
const T = EN ? {
  reading: 'Reading…', page: (a, b) => `Reading page ${a} of ${b}…`, done: 'Done',
  legacy: (ext) => `The old .${ext} format is not supported. Open the file in Office and save it as .${ext}x first.`,
  unsupported: 'Unsupported file type. Please use PDF, Word (.docx), PowerPoint (.pptx) or Excel (.xlsx).',
  password: 'This PDF is password protected. Remove the password first.', failed: 'Could not read this file.',
  md: 'Download .md', copy: 'Copy', copied: 'Copied', csv: 'Download CSV', preview: 'Preview', zip: 'Download all (.zip)',
  stats: { pdf: (r) => `${r.pages} pages · about ${r.chars.toLocaleString()} characters`, docx: (r) => `about ${r.chars.toLocaleString()} characters`, pptx: (r) => `${r.slides} slides · about ${r.chars.toLocaleString()} characters`, xlsx: (r) => `${r.sheets} sheet(s) · about ${r.chars.toLocaleString()} characters shown` },
  notes: { images: (n) => `${n} image(s) in the file were not exported.`, tables: (n) => `${n} table(s) converted.`, scanned: 'No text was found. This is probably a scanned PDF (pictures of pages). This tool cannot read those; run OCR on it first.', furniture: (n) => `Removed ${n} header, footer or page-number line(s).`, hiddenSheets: 'The workbook has hidden sheets; they are included and marked.' },
  more: (n) => `Showing the first ${n.toLocaleString()} characters. Download the file for everything.`,
} : {
  reading: '读取中…', page: (a, b) => `正在读第 ${a} / ${b} 页…`, done: '完成',
  legacy: (ext) => `不支持旧格式 .${ext}。请先用 Office 打开，另存为 .${ext}x 再转换。`,
  unsupported: '不支持这种文件。请使用 PDF、Word（.docx）、PowerPoint（.pptx）或 Excel（.xlsx）。',
  password: '这个 PDF 有密码，请先去掉密码。', failed: '读取失败，这个文件可能已损坏。',
  md: '下载 .md', copy: '复制', copied: '已复制', csv: '下载 CSV', preview: '预览', zip: '全部打包下载 (.zip)',
  stats: { pdf: (r) => `${r.pages} 页 · 约 ${r.chars.toLocaleString()} 字`, docx: (r) => `约 ${r.chars.toLocaleString()} 字`, pptx: (r) => `${r.slides} 页幻灯片 · 约 ${r.chars.toLocaleString()} 字`, xlsx: (r) => `${r.sheets} 个工作表 · 显示约 ${r.chars.toLocaleString()} 字` },
  notes: { images: (n) => `文件里有 ${n} 张图片，没有导出。`, tables: (n) => `转换了 ${n} 个表格。`, scanned: '没有读到文字，这很可能是扫描版 PDF（整页是图片）。本工具无法识别，请先做文字识别（OCR）。', furniture: (n) => `已去掉 ${n} 处页眉、页脚或页码。`, hiddenSheets: '工作簿里有隐藏的工作表，已一并转换并标注。' },
  more: (n) => `这里只显示前 ${n.toLocaleString()} 个字符，完整内容请下载文件。`,
};

const $ = (id) => document.getElementById(id);
const results = $('results'), zipBtn = $('zip');
const outputs = [];   // { name, text, mime } for the zip

function download(name, text, mime = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const baseName = (n) => n.replace(/\.[^.]+$/, '');
const tick = () => new Promise((r) => setTimeout(r, 0));

let pdfjsPromise = null;
function loadPdfjs() {
  pdfjsPromise ||= import('./vendor/pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href; return m; });
  return pdfjsPromise;
}

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

async function convert(file, card, status) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (['doc', 'ppt', 'xls'].includes(ext)) throw new Error(T.legacy(ext));
  if (!['pdf', 'docx', 'pptx', 'xlsx'].includes(ext)) throw new Error(T.unsupported);
  const buf = await file.arrayBuffer();
  const notes = [], opts = { lang: EN ? 'en' : 'zh', previewRows: +$('rows').value, csvBom: $('bom').checked };
  let r;
  if (ext === 'docx') r = await docxToMd(buf, notes);
  else if (ext === 'pptx') r = await pptxToMd(buf, opts, notes);
  else if (ext === 'xlsx') r = await xlsxToMd(buf, opts, notes);
  else {
    const pdfjs = await loadPdfjs();
    r = await pdfToMd(buf, pdfjs, { ...opts, onProgress: async (a, b) => { status.textContent = T.page(a, b); if (a % 5 === 0) await tick(); } }, notes);
  }
  return { ext, r, notes };
}

async function handle(file) {
  const card = el('section', 'card'), head = el('div', 'head'), status = el('p', 'status', T.reading);
  head.append(el('strong', '', file.name)); card.append(head, status); results.prepend(card);
  try {
    await tick();
    const { ext, r, notes } = await convert(file, card, status);
    const base = baseName(file.name), mdName = `${base}.md`;
    outputs.push({ name: mdName, text: r.md, mime: 'text/markdown' });
    status.textContent = `${T.done} · ${T.stats[ext](r)}`;
    const merged = {}; for (const n of notes) merged[n.key] = (merged[n.key] || 0) + (n.n || 1);
    for (const [k, n] of Object.entries(merged)) if (T.notes[k]) card.append(el('p', k === 'scanned' ? 'warn' : 'note', typeof T.notes[k] === 'function' ? T.notes[k](n) : T.notes[k]));
    const bar = el('div', 'bar');
    const b1 = el('button', '', T.md); b1.onclick = () => download(mdName, r.md);
    const b2 = el('button', 'ghost', T.copy);
    b2.onclick = async () => { try { await navigator.clipboard.writeText(r.md); b2.textContent = T.copied; setTimeout(() => (b2.textContent = T.copy), 1500); } catch { prev.focus(); prev.select(); } };
    bar.append(b1, b2);
    for (const f of r.files || []) { const b = el('button', 'ghost', `${T.csv}: ${f.sheet}`); b.onclick = () => download(`${base}-${f.name}`, f.text, 'text/csv;charset=utf-8'); bar.append(b); outputs.push({ name: `${base}-${f.name}`, text: f.text, mime: 'text/csv' }); }
    card.append(bar);
    const LIMIT = 20000, prev = el('textarea', 'prev'); prev.readOnly = true; prev.value = r.md.length > LIMIT ? r.md.slice(0, LIMIT) : r.md; prev.setAttribute('aria-label', T.preview);
    card.append(prev);
    if (r.md.length > LIMIT) card.append(el('p', 'note', T.more(LIMIT)));
    zipBtn.hidden = outputs.length < 2;
  } catch (e) {
    const msg = e && e.name === 'PasswordException' ? T.password : (e && e.message && /^(不支持|The old|Unsupported|这个|This PDF)/.test(e.message) ? e.message : `${T.failed} (${(e && e.message) || e})`);
    status.textContent = msg; status.className = 'status err';
  }
}

async function handleAll(files) { for (const f of files) await handle(f); }
$('file').addEventListener('change', (e) => { handleAll([...e.target.files]); e.target.value = ''; });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => { e.preventDefault(); handleAll([...e.dataTransfer.files]); });
zipBtn.addEventListener('click', async () => {
  const z = new JSZip(); const used = new Set();
  for (const o of outputs) { let n = o.name, i = 2; while (used.has(n)) n = o.name.replace(/(\.[^.]+)$/, `-${i++}$1`); used.add(n); z.file(n, o.text); }
  const blob = await z.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = EN ? 'markdown-files.zip' : 'markdown文件.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
});

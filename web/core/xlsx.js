// SPDX-License-Identifier: MIT
// Copyright (c) 2026 muku66
// Excel (.xlsx) to Markdown tables plus full CSV files, read straight from the file's XML.
import { parseXml, kids, first, descendants, attrOf, readZip, zipText, readRels, resolvePath, mdTable, csvOf, tidy, countChars } from './util.js';

const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const isDateCode = (code) => /[dmyhs]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '').replace(/[eE][+-]/g, ''));
const pad = (n) => String(n).padStart(2, '0');

function serialToText(v, time) {
  const ms = Math.round((v - 25569) * 86400 * 1000), d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const clock = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  if (v < 1) return clock;
  return Math.abs(v - Math.floor(v)) < 1e-9 || !time ? date : `${date} ${clock}`;
}
function formatNumber(raw, code) {
  const v = parseFloat(raw);
  if (!isFinite(v)) return raw;
  const clean = String(+v.toPrecision(15));
  if (!code || code === 'General') return clean;
  const c = code.split(';')[0].replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
  const dec = (c.split('.')[1] || '').replace(/[^0#?]/g, '').length;
  if (c.includes('%')) return (v * 100).toFixed(dec) + '%';
  if (/^[#0?,]+(\.[0#?]+)?$/.test(c.trim())) return c.includes(',') ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
  return clean;
}

export async function xlsxToMd(buf, opts = {}, notes = []) {
  const limit = opts.previewRows ?? 50;
  const zip = await readZip(buf);
  const wbXml = await zipText(zip, 'xl/workbook.xml');
  if (!wbXml) throw new Error('xl/workbook.xml not found');
  const wb = parseXml(wbXml), rels = await readRels(zip, 'xl/workbook.xml');

  const shared = [];
  const ssXml = await zipText(zip, 'xl/sharedStrings.xml');
  if (ssXml) for (const si of descendants(parseXml(ssXml), 'si')) shared.push(descendants(si, 't').filter((t) => t.parentElement.localName !== 'rPh').map((t) => t.textContent).join(''));

  const customFmt = {}, xfFmt = [];
  const stXml = await zipText(zip, 'xl/styles.xml');
  if (stXml) {
    const st = parseXml(stXml);
    for (const n of descendants(st, 'numFmt')) customFmt[attrOf(n, 'numFmtId')] = attrOf(n, 'formatCode');
    const xfs = first(st.documentElement, 'cellXfs');
    for (const xf of kids(xfs, 'xf')) xfFmt.push(+(attrOf(xf, 'numFmtId') || 0));
  }
  const date1904 = attrOf(first(first(wb.documentElement, 'workbookPr'), 'x') || first(wb.documentElement, 'workbookPr'), 'date1904') === '1';

  const sheets = [];
  for (const s of descendants(wb, 'sheet')) {
    const name = attrOf(s, 'name'), state = attrOf(s, 'state');
    const rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rel = rels[rid]; if (!rel) continue;
    const path = resolvePath('xl/workbook.xml', rel.target);
    const xml = await zipText(zip, path); if (!xml) continue;
    const sx = parseXml(xml);
    const grid = []; let maxCol = -1;
    for (const row of descendants(sx, 'row')) {
      const r = +attrOf(row, 'r') - 1;
      for (const c of kids(row, 'c')) {
        const ref = attrOf(c, 'r'); if (!ref) continue;
        const col = colIndex(ref), t = attrOf(c, 't'), v = first(c, 'v')?.textContent ?? '', style = +(attrOf(c, 's') || 0);
        let text = '';
        if (t === 's') text = shared[+v] ?? '';
        else if (t === 'inlineStr') text = descendants(c, 't').map((x) => x.textContent).join('');
        else if (t === 'b') text = v === '1' ? 'TRUE' : 'FALSE';
        else if (t === 'str' || t === 'e') text = v;
        else if (v !== '') {
          const id = xfFmt[style] ?? 0, code = customFmt[id];
          const dateLike = BUILTIN_DATE.has(id) || (code && isDateCode(code));
          text = dateLike && isFinite(+v) ? serialToText(+v - (date1904 ? 1462 : 0), id !== 14 && id !== 15 && !(code && !/h|s/i.test(code.replace(/"[^"]*"/g, '')))) : formatNumber(v, code || (id === 9 ? '0%' : id === 10 ? '0.00%' : id === 2 ? '0.00' : id === 4 ? '#,##0.00' : id === 3 ? '#,##0' : ''));
        }
        if (text === '') continue;
        (grid[r] ||= [])[col] = text; maxCol = Math.max(maxCol, col);
      }
    }
    const rows = [];
    for (let r = 0; r < grid.length; r++) { const row = grid[r]; if (!row || !row.some((x) => x)) { if (rows.length) rows.push([]); continue; } rows.push(Array.from({ length: maxCol + 1 }, (_, i) => row[i] ?? '')); }
    while (rows.length && !rows[rows.length - 1].length) rows.pop();
    const dense = rows.map((r) => (r.length ? r : Array(maxCol + 1).fill('')));
    sheets.push({ name, hidden: state === 'hidden' || state === 'veryHidden', rows: dense });
  }

  const files = [], parts = [];
  let total = 0;
  for (const sh of sheets) {
    if (!sh.rows.length) continue;
    total++;
    const shown = limit > 0 ? sh.rows.slice(0, limit) : sh.rows;
    const note = shown.length < sh.rows.length ? (opts.lang === 'en' ? `Showing the first ${shown.length} of ${sh.rows.length} rows; the CSV file has all of them.` : `共 ${sh.rows.length} 行，这里只显示前 ${shown.length} 行；完整数据见 CSV 文件。`) : '';
    parts.push(`## ${sh.name}${sh.hidden ? (opts.lang === 'en' ? ' (hidden sheet)' : '（隐藏的工作表）') : ''}\n\n${mdTable(shown)}${note ? `\n\n> ${note}` : ''}`);
    files.push({ name: `${sh.name.replace(/[\\/:*?"<>|]/g, '_')}.csv`, text: csvOf(sh.rows, opts.csvBom !== false), sheet: sh.name });
  }
  if (sheets.some((s) => s.hidden)) notes.push({ key: 'hiddenSheets' });
  const md = tidy(parts.join('\n\n'));
  return { md, chars: countChars(md), files, sheets: total };
}

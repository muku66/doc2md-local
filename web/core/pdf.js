// SPDX-License-Identifier: MIT
// Copyright (c) 2026 muku66
// PDF to Markdown using pdf.js to read the text layer. No OCR: scanned (image-only) PDFs have no text to read.
// Headings come from font sizes, lists from line starts, paragraphs from line spacing, simple tables from aligned columns.
import { isCjk, joinText, mdTable, tidy, countChars } from './util.js';

const BULLET = /^[•·●○■□▪◦‣▶►◆◇•●○]\s*/;
const DASH_BULLET = /^[-–—*]\s+/;
const NUMBERED = /^(?:(\d{1,3})\s*[.)、．]|[(（](\d{1,3})[)）])\s*/;
const TERMINAL = /[。！？!?.:：；;”"）)]$/;
const PAGENUM = /^(?:[-–— ]*\d{1,4}[-–— ]*|第\s*\d+\s*页(?:\s*[/／]\s*共?\s*\d+\s*页)?|page\s*\d+(?:\s*of\s*\d+)?|\d+\s*[/／]\s*\d+)$/i;

function buildLines(items) {
  items = items.filter((i) => i.s.trim() || i.s === ' ').sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(l.size, it.size) * 0.45);
    if (line) { line.items.push(it); line.size = Math.max(line.size, it.size); } else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    let text = '', prevEnd = null, cells = [], cur = '', curX = l.items[0].x, chars = 0;
    const sizeVotes = {};
    for (const it of l.items) {
      const gap = prevEnd === null ? 0 : it.x - prevEnd;
      if (prevEnd !== null && gap > l.size * 1.6 && it.s.trim()) { cells.push({ x: curX, text: cur.trim() }); cur = ''; curX = it.x; text += ' '; }
      else if (prevEnd !== null && gap > l.size * 0.2 && !isCjk(text.slice(-1)) && !isCjk(it.s[0])) { text += ' '; cur += ' '; }
      text += it.s; cur += it.s; prevEnd = it.x + it.w; chars += it.s.length;
      sizeVotes[Math.round(it.size * 2) / 2] = (sizeVotes[Math.round(it.size * 2) / 2] || 0) + it.s.length;
    }
    cells.push({ x: curX, text: cur.trim() });
    l.text = text.replace(/\s+/g, ' ').trim();
    l.cells = cells.filter((c) => c.text);
    l.x0 = l.items[0].x; l.x1 = prevEnd; l.chars = chars;
    l.size = +Object.entries(sizeVotes).sort((a, b) => b[1] - a[1])[0][0];
  }
  return lines.filter((l) => l.text).sort((a, b) => b.y - a.y);
}

export async function pdfToMd(buf, pdfjs, opts = {}, notes = []) {
  const base = opts.vendorUrl || new URL('../vendor/', import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), cMapUrl: base + 'cmaps/', cMapPacked: true, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const [vx0, vy0, vx1, vy1] = page.view;
    const tc = await page.getTextContent();
    const items = tc.items.filter((i) => typeof i.str === 'string').map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0, size: Math.hypot(i.transform[2], i.transform[3]) || i.height || 10 }));
    pages.push({ lines: buildLines(items), top: vy1, bottom: vy0, left: vx0, right: vx1 });
    page.cleanup();
    if (opts.onProgress) { await opts.onProgress(p, doc.numPages); }
  }
  const allLines = pages.flatMap((pg) => pg.lines);
  const totalChars = allLines.reduce((a, l) => a + l.chars, 0);
  if (totalChars < 20 * Math.max(1, Math.min(doc.numPages, 5))) { notes.push({ key: 'scanned' }); }

  // margin furniture: page numbers, and short lines repeated near the top or bottom of many pages
  const norm = (t) => t.replace(/\d+/g, '#');
  const seen = {};
  pages.forEach((pg) => pg.lines.forEach((l) => { const h = pg.top - pg.bottom, edge = (pg.top - l.y) < h * 0.08 || (l.y - pg.bottom) < h * 0.08; l.edge = edge; if (edge) { const k = norm(l.text); (seen[k] ||= new Set()).add(pg); } }));
  let removed = 0;
  for (const pg of pages) pg.lines = pg.lines.filter((l) => {
    const repeated = pages.length >= 4 && l.edge && l.text.length < 80 && seen[norm(l.text)] && seen[norm(l.text)].size >= Math.max(3, pages.length * 0.4);
    const num = l.edge && PAGENUM.test(l.text);
    if (repeated || num) { removed++; return false; } return true;
  });

  // body size = the most common size by characters; heading sizes are the larger ones
  const votes = {};
  for (const l of pages.flatMap((pg) => pg.lines)) votes[l.size] = (votes[l.size] || 0) + l.chars;
  const body = +(Object.entries(votes).sort((a, b) => b[1] - a[1])[0] || [10])[0];
  const headSizes = Object.keys(votes).map(Number).filter((s) => s >= body * 1.15 && votes[s] < totalChars * 0.2).sort((a, b) => b - a).slice(0, 3);
  const levelOf = (l) => { const i = headSizes.findIndex((s) => Math.abs(s - l.size) < 0.3); return i; };

  const blocks = [];
  let para = null, listItem = null;
  const flush = () => { if (para) { blocks.push({ t: 'p', text: para.text }); para = null; } };
  const flushList = () => { if (listItem) { blocks.push({ t: 'li', text: listItem.text }); listItem = null; } };
  let prev = null, prevPage = -1, rightEdge = 0;

  for (let pi = 0; pi < pages.length; pi++) {
    const lines = pages[pi].lines;
    const rights = lines.map((l) => l.x1).sort((a, b) => a - b);
    rightEdge = rights.length ? rights[Math.floor(rights.length * 0.9)] : pages[pi].right;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      // simple tables: 3+ consecutive lines with the same number (>=2) of aligned cells
      if (l.cells.length >= 2) {
        let j = i; const rows = [];
        while (j < lines.length && lines[j].cells.length === l.cells.length && lines[j].cells.every((c, k) => Math.abs(c.x - l.cells[k].x) < body * 2.5)) { rows.push(lines[j].cells.map((c) => c.text)); j++; }
        const wordy = rows.flat().filter((c) => /[\p{L}\p{N}]{2,}/u.test(c)).length >= rows.flat().length * 0.6;
        if (rows.length >= 3 && wordy) { flush(); flushList(); blocks.push({ t: 'table', text: mdTable(rows) }); notes.push({ key: 'tables', n: 1 }); i = j - 1; prev = null; continue; }
      }
      const text = l.text;
      const lvl = levelOf(l);
      const short = text.length <= 70 && !/[。.!?！？]$/.test(text);
      if (lvl >= 0 && short) { flush(); flushList(); blocks.push({ t: 'h', text: `${'#'.repeat(lvl + 1)} ${text}` }); prev = null; continue; }
      let m;
      let item = null;
      if ((m = text.match(BULLET)) || (m = text.match(DASH_BULLET))) item = `- ${text.slice(m[0].length)}`;
      else if ((m = text.match(NUMBERED)) && text.length > m[0].length) item = `${m[1] || m[2]}. ${text.slice(m[0].length)}`;
      if (item) { flush(); flushList(); listItem = { text: item, x: l.x0 }; prev = l; continue; }
      const gap = prev && prevPage === pi ? prev.y - l.y : 0;
      const newPara = !prev || gap > Math.max(prev.size, l.size) * 1.9 || Math.abs(prev.size - l.size) > 0.6 || (TERMINAL.test(prev.text) && prev.x1 < rightEdge - body * 3) || (l.x0 - prev.x0 > body * 1.2 && prev.x0 <= l.x0 && !listItem);
      if (listItem && !newPara) { listItem.text = joinText(listItem.text, text); prev = l; prevPage = pi; continue; }
      if (listItem) flushList();
      if (!para || newPara) { flush(); para = { text }; }
      else {
        let a = para.text; const b = text;
        if (/[A-Za-z][-\u2010\u00ad]$/.test(a) && /^[a-z]/.test(b)) para.text = a.slice(0, -1) + b; else para.text = joinText(a, b);
      }
      prev = l; prevPage = pi;
    }
    prevPage = -1; // a new page may continue the paragraph, but the vertical gap no longer applies
  }
  flush(); flushList();

  let md = '';
  blocks.forEach((b, i) => { md += (i === 0 ? '' : (b.t === 'li' && blocks[i - 1].t === 'li' ? '\n' : '\n\n')) + b.text; });
  if (removed) notes.push({ key: 'furniture', n: removed });
  const out = tidy(md);
  return { md: out, chars: countChars(out), pages: doc.numPages };
}

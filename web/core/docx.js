// SPDX-License-Identifier: MIT
// Copyright (c) 2026 muku66
// Word (.docx) to Markdown, read straight from the file's XML: headings, lists, bold/italic, links, tables.
import { parseXml, kids, first, descendants, attrOf, readZip, zipText, readRels, mdTable, tidy, countChars } from './util.js';

const onOff = (el) => { if (!el) return false; const v = attrOf(el, 'val'); return !(v === '0' || v === 'false' || v === 'off'); };

function headingLevelOf(name) {
  const n = (name || '').toLowerCase().trim();
  let m = n.match(/^heading\s*(\d)$/) || n.match(/^标题\s*(\d)$/);
  if (m) return Math.min(6, +m[1]);
  if (n === 'title' || n === '标题') return 1;
  return 0;
}

export async function docxToMd(buf, notes = []) {
  const zip = await readZip(buf);
  const docXml = await zipText(zip, 'word/document.xml');
  if (!docXml) throw new Error('word/document.xml not found');
  const doc = parseXml(docXml);
  const rels = await readRels(zip, 'word/document.xml');

  // styles: id -> { level, numId, ilvl, basedOn }
  const styles = {};
  const stXml = await zipText(zip, 'word/styles.xml');
  if (stXml) {
    for (const s of descendants(parseXml(stXml), 'style')) {
      const id = attrOf(s, 'styleId'); if (!id) continue;
      const pPr = first(s, 'pPr');
      const outline = first(pPr, 'outlineLvl');
      const numPr = first(pPr, 'numPr');
      styles[id] = {
        level: headingLevelOf(attrOf(first(s, 'name'), 'val')) || (outline ? Math.min(6, +attrOf(outline, 'val') + 1) : 0),
        numId: numPr ? attrOf(first(numPr, 'numId'), 'val') : null,
        ilvl: numPr && first(numPr, 'ilvl') ? +attrOf(first(numPr, 'ilvl'), 'val') : null,
        basedOn: attrOf(first(s, 'basedOn'), 'val'),
      };
    }
  }
  const styleInfo = (id, key) => { for (let i = 0; id && i < 6; i++) { const s = styles[id]; if (!s) break; if (s[key]) return s[key]; id = s.basedOn; } return 0; };

  // numbering: numId -> abstract; level format
  const numFmt = {};
  const numXml = await zipText(zip, 'word/numbering.xml');
  if (numXml) {
    const nx = parseXml(numXml), abs = {};
    for (const a of descendants(nx, 'abstractNum')) {
      const lv = {};
      for (const l of kids(a, 'lvl')) lv[attrOf(l, 'ilvl')] = attrOf(first(l, 'numFmt'), 'val') || 'decimal';
      abs[attrOf(a, 'abstractNumId')] = lv;
    }
    for (const n of descendants(nx, 'num')) numFmt[attrOf(n, 'numId')] = abs[attrOf(first(n, 'abstractNumId'), 'val')] || {};
  }
  const isOrdered = (numId, ilvl) => { const f = (numFmt[numId] || {})[String(ilvl)]; return !!f && f !== 'bullet' && f !== 'none'; };

  let images = 0;
  function runsOf(p) {
    const segs = [];
    const push = (text, b, i, s, link) => { if (text) segs.push({ text, b, i, s, link }); };
    const walk = (node, link) => {
      for (const c of node.children) {
        const n = c.localName;
        if (n === 'r') {
          const rPr = first(c, 'rPr');
          const b = onOff(first(rPr, 'b')), i = onOff(first(rPr, 'i')), s = onOff(first(rPr, 'strike'));
          let t = '';
          for (const x of c.children) {
            if (x.localName === 't') t += x.textContent;
            else if (x.localName === 'tab') t += ' ';
            else if (x.localName === 'br' || x.localName === 'cr') t += '\n';
            else if (x.localName === 'noBreakHyphen') t += '-';
            else if (x.localName === 'drawing' ? descendants(x, 'blip').length : (x.localName === 'pict' && descendants(x, 'imagedata').length)) images++;
          }
          push(t, b, i, s, link);
        } else if (n === 'hyperlink') {
          const rid = c.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
          const target = rid && rels[rid] ? rels[rid].target : null;
          walk(c, target && /^https?:|^mailto:/.test(target) ? target : link);
        } else if (n === 'ins' || n === 'smartTag' || n === 'sdt' || n === 'sdtContent' || n === 'fldSimple') walk(c, link);
      }
    };
    walk(p, null);
    return segs;
  }
  function inline(segs, plain) {
    // merge neighbours that share formatting, then wrap in markers (spaces stay outside)
    const merged = [];
    for (const s of segs) {
      const last = merged[merged.length - 1];
      if (last && last.b === s.b && last.i === s.i && last.s === s.s && last.link === s.link) last.text += s.text; else merged.push({ ...s });
    }
    return merged.map((s) => {
      let t = s.text.replace(/\n/g, '  \n');
      if (plain) return t;
      const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      let core = m[2];
      if (!core) return t;
      if (s.s) core = `~~${core}~~`;
      if (s.b && s.i) core = `***${core}***`; else if (s.b) core = `**${core}**`; else if (s.i) core = `*${core}*`;
      if (s.link) core = `[${core}](${s.link})`;
      return m[1] + core + m[3];
    }).join('');
  }

  function paragraph(p) {
    const pPr = first(p, 'pPr');
    const styleId = attrOf(first(pPr, 'pStyle'), 'val');
    let level = styleInfo(styleId, 'level');
    const outline = first(pPr, 'outlineLvl');
    if (!level && outline) level = Math.min(6, +attrOf(outline, 'val') + 1);
    const segs = runsOf(p);
    const raw = segs.map((s) => s.text).join('');
    if (!raw.trim()) return null;
    if (level) return { type: 'h', text: `${'#'.repeat(level)} ${inline(segs, true).replace(/\s*\n\s*/g, ' ').trim()}` };
    const numPr = first(pPr, 'numPr');
    let numId = numPr ? attrOf(first(numPr, 'numId'), 'val') : styleInfo(styleId, 'numId');
    let ilvl = numPr && first(numPr, 'ilvl') ? +attrOf(first(numPr, 'ilvl'), 'val') : (styleInfo(styleId, 'ilvl') || 0);
    if (numId && numId !== '0') return { type: 'li', ordered: isOrdered(numId, ilvl), ilvl, text: inline(segs).replace(/\s*\n\s*/g, ' ').trim() };
    return { type: 'p', text: inline(segs).trim() };
  }

  function tableRows(tbl) {
    const rows = [];
    for (const tr of kids(tbl, 'tr')) {
      const row = [];
      for (const tc of kids(tr, 'tc')) {
        const tcPr = first(tc, 'tcPr');
        const span = +(attrOf(first(tcPr, 'gridSpan'), 'val') || 1);
        const vm = first(tcPr, 'vMerge');
        const text = descendants(tc, 'p').map((p) => runsOf(p).map((s) => s.text).join('').trim()).filter(Boolean).join('\n');
        row.push(vm && attrOf(vm, 'val') !== 'restart' ? '' : text);
        for (let k = 1; k < span; k++) row.push('');
      }
      if (row.some((c) => c)) rows.push(row);
    }
    return rows;
  }

  const body = first(doc.documentElement, 'body');
  const out = [];
  let listWidths = [];
  let counters = [];
  const flushList = () => { listWidths = []; counters = []; };
  let tables = 0, listOpen = false;
  const blocks = [];
  const visit = (parent) => {
    for (const c of parent.children) {
      if (c.localName === 'p') {
        const b = paragraph(c);
        if (b) blocks.push(b);
      } else if (c.localName === 'tbl') {
        const rows = tableRows(c);
        if (rows.length) { tables++; blocks.push({ type: 'table', text: mdTable(rows) }); }
      } else if (c.localName === 'sdt') {
        const content = first(c, 'sdtContent'); if (content) visit(content);
      }
    }
  };
  visit(body);

  for (const b of blocks) {
    if (b.type === 'li') {
      listWidths.length = b.ilvl + 1;
      const indent = ' '.repeat(listWidths.slice(0, b.ilvl).reduce((a, w) => a + (w || 2), 0));
      counters.length = b.ilvl + 1;
      if (b.ordered) counters[b.ilvl] = (counters[b.ilvl] || 0) + 1; else counters[b.ilvl] = 0;
      const marker = b.ordered ? `${counters[b.ilvl]}.` : '-';
      listWidths[b.ilvl] = marker.length + 1;
      out.push({ list: true, top: b.ilvl === 0, kind: b.ordered ? 'ol' : 'ul', text: `${indent}${marker} ${b.text}` });
      listOpen = true;
    } else { flushList(); out.push({ list: false, text: b.text }); listOpen = false; }
  }
  // list items stay on consecutive lines; everything else is separated by a blank line
  let md = '';
  out.forEach((o, i) => { const sameList = i > 0 && o.list && out[i - 1].list && !(o.top && o.kind !== out[i - 1].kind && /^\S/.test(o.text)); md += (i === 0 ? '' : (sameList ? '\n' : '\n\n')) + o.text; });
  if (images) notes.push({ key: 'images', n: images });
  if (tables) notes.push({ key: 'tables', n: tables });
  const result = tidy(md);
  return { md: result, chars: countChars(result) };
}

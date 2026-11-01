// SPDX-License-Identifier: MIT
// Copyright (c) 2026 muku66
// PowerPoint (.pptx) to Markdown: one section per slide, text in reading order, tables, speaker notes.
import { parseXml, kids, first, descendants, attrOf, readZip, zipText, readRels, resolvePath, mdTable, tidy, countChars } from './util.js';

const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function xfrmOf(shape) {
  const x = descendants(shape, 'xfrm')[0] || descendants(shape, 'off')[0]?.parentElement;
  const off = x ? first(x, 'off') : null;
  return off ? { x: +attrOf(off, 'x'), y: +attrOf(off, 'y') } : null;
}
const phOf = (shape) => { const nv = first(shape, 'nvSpPr') || first(shape, 'nvPicPr') || first(shape, 'nvGraphicFramePr'); const ph = nv ? descendants(nv, 'ph')[0] : null; return ph ? { type: attrOf(ph, 'type') || 'body', idx: attrOf(ph, 'idx') } : null; };

function paragraphs(txBody) {
  const out = [];
  for (const p of kids(txBody, 'p')) {
    const pPr = first(p, 'pPr');
    let text = '';
    for (const r of p.children) {
      if (r.localName === 'r' || r.localName === 'fld') text += first(r, 't')?.textContent ?? '';
      else if (r.localName === 'br') text += ' ';
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    out.push({ text, lvl: +(attrOf(pPr, 'lvl') || 0), bullet: pPr ? (!!first(pPr, 'buChar') || !!first(pPr, 'buAutoNum')) : false, noBullet: pPr ? !!first(pPr, 'buNone') : false, ordered: pPr ? !!first(pPr, 'buAutoNum') : false });
  }
  return out;
}

export async function pptxToMd(buf, opts = {}, notes = []) {
  const en = opts.lang === 'en';
  const zip = await readZip(buf);
  const pres = parseXml(await zipText(zip, 'ppt/presentation.xml'));
  const rels = await readRels(zip, 'ppt/presentation.xml');
  const slidePaths = [];
  for (const id of descendants(pres, 'sldId')) { const rel = rels[id.getAttributeNS(R, 'id')]; if (rel) slidePaths.push(resolvePath('ppt/presentation.xml', rel.target)); }

  const layoutCache = {};
  async function layoutPositions(path) {
    if (layoutCache[path] !== undefined) return layoutCache[path];
    const xml = await zipText(zip, path); const map = {};
    if (xml) for (const sp of descendants(parseXml(xml), 'sp')) { const ph = phOf(sp); const pos = xfrmOf(sp); if (ph && pos) { map[`${ph.type}:${ph.idx ?? ''}`] = pos; map[`idx:${ph.idx ?? ''}`] = pos; map[`${ph.type}:`] = map[`${ph.type}:`] || pos; } }
    return (layoutCache[path] = map);
  }

  const out = []; let pictures = 0, tables = 0;
  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const slide = parseXml(await zipText(zip, path));
    const srels = await readRels(zip, path);
    let lpos = {};
    const lay = Object.values(srels).find((r) => /slideLayout$/.test(r.type));
    if (lay) lpos = await layoutPositions(resolvePath(path, lay.target));
    const tree = first(first(slide.documentElement, 'cSld'), 'spTree');

    const items = []; let title = '';
    const walk = (parent, base) => {
      for (const c of parent.children) {
        const n = c.localName;
        if (n === 'grpSp') { const pos = xfrmOf(first(c, 'grpSpPr') || c) || base; walk(c, pos || base); continue; }
        if (n === 'pic') { pictures++; continue; }
        let pos = xfrmOf(c), ph = phOf(c);
        if (!pos && ph) pos = lpos[`${ph.type}:${ph.idx ?? ''}`] || lpos[`idx:${ph.idx ?? ''}`] || lpos[`${ph.type}:`] || null;
        pos = pos || base || { x: 1e12, y: 1e12 };
        if (n === 'graphicFrame') {
          const tbl = descendants(c, 'tbl')[0]; if (!tbl) continue;
          const rows = [];
          for (const tr of kids(tbl, 'tr')) { const row = []; for (const tc of kids(tr, 'tc')) { if (attrOf(tc, 'hMerge') === '1' || attrOf(tc, 'vMerge') === '1') { row.push(''); continue; } row.push(paragraphs(first(tc, 'txBody')).map((p) => p.text).join('\n')); } if (row.some((x) => x)) rows.push(row); }
          if (rows.length) { tables++; items.push({ ...pos, kind: 'table', text: mdTable(rows) }); }
        } else if (n === 'sp') {
          const tx = first(c, 'txBody'); if (!tx) continue;
          const ps = paragraphs(tx); if (!ps.length) continue;
          if (ph && (ph.type === 'title' || ph.type === 'ctrTitle')) { title = ps.map((p) => p.text).join(' '); continue; }
          const isBody = ph && (ph.type === 'body' || ph.type === 'obj' || ph.idx);
          const lines = ps.map((p) => {
            const list = !p.noBullet && (p.bullet || p.lvl > 0 || (isBody && ps.length > 1));
            return list ? `${'  '.repeat(p.lvl)}${p.ordered ? '1.' : '-'} ${p.text}` : p.text;
          });
          const asList = lines.every((l) => /^\s*(-|1\.) /.test(l));
          items.push({ ...pos, kind: 'text', text: lines.join(asList ? '\n' : '\n\n') });
        }
      }
    };
    walk(tree, null);
    items.sort((a, b) => Math.round(a.y / 360000) - Math.round(b.y / 360000) || a.x - b.x);

    let note = '';
    const nrel = Object.values(srels).find((r) => /notesSlide$/.test(r.type));
    if (nrel) {
      const nx = await zipText(zip, resolvePath(path, nrel.target));
      if (nx) { const sp = descendants(parseXml(nx), 'sp').find((s) => phOf(s)?.type === 'body'); if (sp) note = paragraphs(first(sp, 'txBody')).map((p) => p.text).join(' ').trim(); }
    }
    const head = en ? `## Slide ${i + 1}${title ? `: ${title}` : ''}` : `## 第 ${i + 1} 页${title ? `：${title}` : ''}`;
    out.push([head, ...items.map((t) => t.text), note ? `> ${en ? 'Notes' : '备注'}: ${note}` : ''].filter(Boolean).join('\n\n'));
  }
  if (pictures) notes.push({ key: 'images', n: pictures });
  if (tables) notes.push({ key: 'tables', n: tables });
  const md = tidy(out.join('\n\n'));
  return { md, chars: countChars(md), slides: slidePaths.length };
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 muku66
// Shared helpers for the converters. Everything here runs in the browser; nothing is sent anywhere.
export const parseXml = (text) => new DOMParser().parseFromString(text, 'application/xml');
export const kids = (el, name) => (el ? [...el.children].filter((c) => c.localName === name) : []);
export const first = (el, name) => kids(el, name)[0] || null;
export const descendants = (el, name) => (el ? [...el.getElementsByTagName('*')].filter((c) => c.localName === name) : []);
export const attrOf = (el, name) => {
  if (!el) return null;
  for (const a of el.attributes) if (a.localName === name) return a.value;
  return null;
};
export const isCjk = (ch) => /[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch || '');

// Join two pieces of text: no space between CJK characters, one space between Latin words.
export function joinText(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = a.slice(-1), y = b[0];
  if (/\s/.test(x) || /\s/.test(y) || isCjk(x) || isCjk(y)) return a + b;
  return `${a} ${b}`;
}

export const cellText = (s) => String(s ?? '').replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim();

// rows: array of arrays of strings. The first row becomes the header.
export function mdTable(rows) {
  const width = Math.max(0, ...rows.map((r) => r.length));
  if (!rows.length || !width) return '';
  const fix = (r) => Array.from({ length: width }, (_, i) => cellText(r[i]));
  const [head, ...body] = rows.map(fix);
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...body.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

export function csvOf(rows, bom = true) {
  const q = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return (bom ? '﻿' : '') + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}

export const tidy = (md) => md.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
export const countChars = (s) => s.replace(/\s/g, '').length;

export async function readZip(buf) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip is not loaded');
  return JSZip.loadAsync(buf);
}
export async function zipText(zip, path) {
  const f = zip.file(path);
  return f ? f.async('string') : null;
}
// Resolve a relative target of a .rels entry against the folder of the source part.
export function resolvePath(fromPart, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = fromPart.split('/').slice(0, -1);
  for (const seg of target.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
}
export async function readRels(zip, partPath) {
  const dir = partPath.split('/').slice(0, -1).join('/');
  const name = partPath.split('/').pop();
  const txt = await zipText(zip, `${dir ? dir + '/' : ''}_rels/${name}.rels`);
  const map = {};
  if (!txt) return map;
  for (const r of descendants(parseXml(txt), 'Relationship')) map[r.getAttribute('Id')] = { type: r.getAttribute('Type') || '', target: r.getAttribute('Target') || '', mode: r.getAttribute('TargetMode') || '' };
  return map;
}

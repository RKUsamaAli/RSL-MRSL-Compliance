/* ==========================================================================
   xlsx-lite.js — a small, dependency-free Excel (.xlsx) reader and writer.

   The prototype must open from a folder with no server and no libraries, so
   the two things Excel import / export need are written here by hand:
     • write(spec)  → Uint8Array of a real .xlsx (ZIP, stored entries) with
                      styled header row, frozen pane, column widths, text-
                      formatted columns, drop-down lists and hidden sheets
     • read(buffer) → { sheets:[{ name, hidden, rows:[[cell,…],…] }] }
                      (shared strings, inline strings, numbers, dates;
                      own INFLATE so it works in every browser)
     • parseCSV(text) → rows
   Implementation: replaced by the server-side spreadsheet library.
   ========================================================================== */
(function (root) {
  'use strict';
  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8');

  /* ------------------------------------------------------------- CRC-32 */
  const CRC_T = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------------------------------------------------------- ZIP write */
  function zip(files) {
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const chunks = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((n, c) => n + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const all = chunks.concat(central, [new Uint8Array(end.buffer)]);
    const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
    let p = 0; all.forEach(c => { out.set(c, p); p += c.length; });
    return out;
  }

  /* ------------------------------------------------------------ INFLATE */
  const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  function tree(lengths, off, num) {
    const count = new Uint16Array(16), symbol = new Uint16Array(num), offs = new Uint16Array(16);
    for (let i = 0; i < num; i++) count[lengths[off + i]]++;
    count[0] = 0;
    let sum = 0; for (let i = 0; i < 16; i++) { offs[i] = sum; sum += count[i]; }
    for (let i = 0; i < num; i++) if (lengths[off + i]) symbol[offs[lengths[off + i]]++] = i;
    return { count, symbol };
  }
  let FIXED = null;
  function fixedTrees() {
    if (FIXED) return FIXED;
    const l = new Uint8Array(288);
    for (let i = 0; i < 144; i++) l[i] = 8;
    for (let i = 144; i < 256; i++) l[i] = 9;
    for (let i = 256; i < 280; i++) l[i] = 7;
    for (let i = 280; i < 288; i++) l[i] = 8;
    const d = new Uint8Array(30).fill(5);
    FIXED = { lt: tree(l, 0, 288), dt: tree(d, 0, 30) };
    return FIXED;
  }

  function inflate(src, sizeHint) {
    let out = new Uint8Array(sizeHint || Math.max(1024, src.length * 4));
    let op = 0, ip = 0, bitBuf = 0, bitCnt = 0;
    const bit = () => { if (!bitCnt) { if (ip >= src.length) throw new Error('Unexpected end of compressed data'); bitBuf = src[ip++]; bitCnt = 8; } const b = bitBuf & 1; bitBuf >>>= 1; bitCnt--; return b; };
    const bits = n => { let v = 0; for (let i = 0; i < n; i++) v |= bit() << i; return v; };
    const sym = t => { let sum = 0, cur = 0, len = 0; do { cur = 2 * cur + bit(); len++; if (len > 15) throw new Error('Corrupt compressed data'); sum += t.count[len]; cur -= t.count[len]; } while (cur >= 0); return t.symbol[sum + cur]; };
    const room = n => { if (op + n > out.length) { const b = new Uint8Array(Math.max(out.length * 2, op + n)); b.set(out.subarray(0, op)); out = b; } };

    let last = 0;
    while (!last) {
      last = bit();
      const type = bits(2);
      if (type === 0) {
        bitCnt = 0;
        const len = src[ip] | (src[ip + 1] << 8); ip += 4;
        room(len); out.set(src.subarray(ip, ip + len), op); op += len; ip += len;
      } else if (type === 1 || type === 2) {
        let lt, dt;
        if (type === 1) { const f = fixedTrees(); lt = f.lt; dt = f.dt; }
        else {
          const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
          const cl = new Uint8Array(19);
          for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]] = bits(3);
          const ct = tree(cl, 0, 19);
          const lens = new Uint8Array(hlit + hdist);
          for (let n = 0; n < hlit + hdist;) {
            const s = sym(ct);
            if (s < 16) lens[n++] = s;
            else if (s === 16) { const prev = lens[n - 1]; for (let r = bits(2) + 3; r; r--) lens[n++] = prev; }
            else if (s === 17) n += bits(3) + 3;
            else n += bits(7) + 11;
          }
          lt = tree(lens, 0, hlit); dt = tree(lens, hlit, hdist);
        }
        for (;;) {
          const s = sym(lt);
          if (s === 256) break;
          if (s < 256) { room(1); out[op++] = s; continue; }
          const li = s - 257, len = LEN_BASE[li] + bits(LEN_EXTRA[li]);
          const di = sym(dt), dist = DIST_BASE[di] + bits(DIST_EXTRA[di]);
          if (dist > op) throw new Error('Corrupt compressed data');
          room(len);
          for (let i = 0; i < len; i++, op++) out[op] = out[op - dist];
        }
      } else throw new Error('Corrupt compressed data');
    }
    return out.subarray(0, op);
  }

  /* ----------------------------------------------------------- ZIP read */
  function unzipIndex(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('This is not an Excel .xlsx file (it is not a ZIP archive).');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
    const files = {};
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      files[name] = { method, csize, usize, lo };
      p += 46 + nl + xl + cl;
    }
    return files;
  }
  function extract(u8, f) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const start = f.lo + 30 + dv.getUint16(f.lo + 26, true) + dv.getUint16(f.lo + 28, true);
    const data = u8.subarray(start, start + f.csize);
    if (f.method === 0) return data;
    if (f.method === 8) return inflate(data, f.usize);
    throw new Error('Unsupported compression in this file.');
  }

  /* ------------------------------------------------------- XML helpers */
  const xmlEsc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const xmlDec = s => String(s)
    .replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, g) => g[0] === '#'
      ? String.fromCodePoint(g[1] === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10)) : ENT[g])
    .replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\r\n?/g, '\n');
  const attr = (tag, name) => { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(tag); return m ? xmlDec(m[1]) : null; };
  /* concatenated text of every <t> inside a string item (phonetic runs dropped) */
  function tText(xml) {
    let s = ''; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let m;
    xml = xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '');
    while ((m = re.exec(xml))) s += m[1];
    return xmlDec(s);
  }

  /* A1 helpers */
  function colName(i) { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }
  function colIndex(ref) { let n = 0; for (let i = 0; i < ref.length; i++) { const c = ref.charCodeAt(i); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); } return n - 1; }

  /* --------------------------------------------------------------- read */
  /* read(buffer, { maxRows }) — maxRows caps the rows returned PER SHEET
     (the count of rows actually present is reported in sheet.totalRows).   */
  function read(buf, opts) {
    opts = opts || {};
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const files = unzipIndex(u8);
    const text = name => (files[name] ? dec.decode(extract(u8, files[name])) : null);
    const wbXml = text('xl/workbook.xml');
    if (!wbXml) throw new Error('This file is not an Excel workbook (.xlsx). Old .xls files must be saved as .xlsx first.');

    const rels = {};
    (text('xl/_rels/workbook.xml.rels') || '').replace(/<Relationship\b[^>]*>/g, t => { rels[attr(t, 'Id')] = attr(t, 'Target'); return t; });

    const shared = [];
    const ss = text('xl/sharedStrings.xml');
    if (ss) { const re = /<si\s*\/>|<si>([\s\S]*?)<\/si>/g; let m; while ((m = re.exec(ss))) shared.push(m[1] ? tText(m[1]) : ''); }

    /* which cell styles are dates */
    const dateStyle = [];
    const st = text('xl/styles.xml');
    if (st) {
      const custom = {};
      st.replace(/<numFmt\b[^>]*>/g, t => { custom[attr(t, 'numFmtId')] = attr(t, 'formatCode') || ''; return t; });
      const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(st);
      if (xfs) xfs[1].replace(/<xf\b[^>]*>/g, t => {
        const id = Number(attr(t, 'numFmtId') || 0);
        let isDate = (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58);
        if (custom[id] !== undefined) isDate = /[dmyhs]/i.test(custom[id].replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''));
        dateStyle.push(isDate); return t;
      });
    }
    const serialToDate = n => {
      const ms = Math.round((n - 25569) * 86400000), d = new Date(ms);
      const p = x => String(x).padStart(2, '0');
      const day = d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
      return (n % 1) ? day + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) : day;
    };

    const sheets = [];
    wbXml.replace(/<sheet\b[^>]*>/g, t => {
      const target = rels[attr(t, 'r:id')] || '';
      const path = target[0] === '/' ? target.slice(1) : 'xl/' + target;
      sheets.push({ name: attr(t, 'name') || '', hidden: !!attr(t, 'state') && attr(t, 'state') !== 'visible', path });
      return t;
    });

    sheets.forEach(s => {
      s.rows = []; s.totalRows = 0;
      const xml = text(s.path); delete s.path;
      if (!xml) return;
      const rowRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g; let rm, seq = 0, kept = 0;
      while ((rm = rowRe.exec(xml))) {
        const rAttr = attr(rm[1], 'r'); const ri = rAttr ? Number(rAttr) - 1 : seq; seq = ri + 1;
        if (!rm[2]) continue;
        const cells = []; let any = false, ci = 0;
        const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm;
        while ((cm = cRe.exec(rm[2]))) {
          const ref = attr(cm[1], 'r'); if (ref) ci = colIndex(ref);
          const body = cm[2]; let v = '';
          if (body) {
            const t = attr(cm[1], 't');
            const vm = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body);
            if (t === 'inlineStr') v = tText(body);
            else if (vm) {
              const raw = xmlDec(vm[1]);
              if (t === 's') v = shared[Number(raw)] || '';
              else if (t === 'str' || t === 'e') v = raw;
              else if (t === 'b') v = raw === '1' ? 'TRUE' : 'FALSE';
              else { const n = Number(raw); v = isNaN(n) ? raw : (dateStyle[Number(attr(cm[1], 's') || 0)] ? serialToDate(n) : n); }
            }
          }
          if (v !== '') { cells[ci] = v; any = true; }
          ci++;
        }
        if (!any) continue;
        s.totalRows++;
        if (opts.maxRows && kept >= opts.maxRows) continue;
        kept++;
        for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
        s.rows[ri] = cells;
      }
      for (let i = 0; i < s.rows.length; i++) if (!s.rows[i]) s.rows[i] = [];
    });
    return { sheets };
  }

  /* -------------------------------------------------------------- write */
  /* Named cell styles — index into cellXfs below. */
  const STYLE = { def: 0, head: 1, headSys: 2, text: 3, sys: 4, title: 5, note: 6, label: 7, wrap: 8, example: 9 };
  const STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="5">' +
      '<font><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="15"/><color rgb="FF2D6254"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><i/><sz val="10"/><color rgb="FF737373"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="6">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF2D6254"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF737373"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FFD0D0D0"/></left><right style="thin"><color rgb="FFD0D0D0"/></right><top style="thin"><color rgb="FFD0D0D0"/></top><bottom style="thin"><color rgb="FFD0D0D0"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="10">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="49" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="49" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="49" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="49" fontId="3" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  const sheetNameSafe = s => String(s || 'Sheet').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Sheet';

  /* write({ sheets:[{ name, rows, cols:[{w, s}], freeze, hidden, filter, merges:['A1:D1'],
                       lists:[{ ref:'D2:D5000', values:['X'] }], active }] })
     A cell is a string, a number, null, or { v, s:'head'|'text'|… }.        */
  function write(spec) {
    const sheets = spec.sheets || [];
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const files = [];
    const add = (name, xml) => files.push({ name, data: enc.encode(xml) });

    add('[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>');
    add('_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    const active = Math.max(0, sheets.findIndex(s => s.active));
    add('xl/workbook.xml', X + '<workbook xmlns="' + NS + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView activeTab="' + active + '"/></bookViews><sheets>' +
      sheets.map((s, i) => '<sheet name="' + xmlEsc(sheetNameSafe(s.name)) + '" sheetId="' + (i + 1) + '"' + (s.hidden ? ' state="hidden"' : '') + ' r:id="rId' + (i + 1) + '"/>').join('') +
      '</sheets>' +
      (sheets.some(s => s.filter) ? '<definedNames>' + sheets.map((s, i) => s.filter
        ? '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + xmlEsc(sheetNameSafe(s.name)) + '\'!' + s.filter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2') + '</definedName>' : '').join('') + '</definedNames>' : '') +
      '</workbook>');
    add('xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    add('xl/styles.xml', STYLES_XML);

    sheets.forEach((s, si) => {
      const parts = [X, '<worksheet xmlns="' + NS + '">'];
      parts.push('<sheetViews><sheetView workbookViewId="0"' + (si === active ? ' tabSelected="1"' : '') + '>' +
        (s.freeze ? '<pane ySplit="' + s.freeze + '" topLeftCell="A' + (s.freeze + 1) + '" activePane="bottomLeft" state="frozen"/>' : '') +
        '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>');
      if (s.cols && s.cols.length) parts.push('<cols>' + s.cols.map((c, i) =>
        '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.w || 14) + '" customWidth="1"' + (c.s ? ' style="' + STYLE[c.s] + '"' : '') + '/>').join('') + '</cols>');
      parts.push('<sheetData>');
      (s.rows || []).forEach((row, ri) => {
        if (!row || !row.length) return;
        let r = '<row r="' + (ri + 1) + '">';
        row.forEach((cell, ci) => {
          if (cell === null || cell === undefined || cell === '') return;
          const o = (typeof cell === 'object') ? cell : { v: cell };
          const colStyle = s.cols && s.cols[ci] && s.cols[ci].s;
          const sId = STYLE[o.s || colStyle || 'def'] || 0;
          const ref = colName(ci) + (ri + 1);
          if (o.v === null || o.v === undefined || o.v === '') { if (sId) r += '<c r="' + ref + '" s="' + sId + '"/>'; return; }
          if (typeof o.v === 'number' && isFinite(o.v)) r += '<c r="' + ref + '"' + (sId ? ' s="' + sId + '"' : '') + '><v>' + o.v + '</v></c>';
          else r += '<c r="' + ref + '" t="inlineStr"' + (sId ? ' s="' + sId + '"' : '') + '><is><t xml:space="preserve">' + xmlEsc(o.v) + '</t></is></c>';
        });
        parts.push(r + '</row>');
      });
      parts.push('</sheetData>');
      if (s.filter) parts.push('<autoFilter ref="' + s.filter + '"/>');
      if (s.merges && s.merges.length) parts.push('<mergeCells count="' + s.merges.length + '">' + s.merges.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>');
      if (s.lists && s.lists.length) parts.push('<dataValidations count="' + s.lists.length + '">' + s.lists.map(l =>
        '<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="' + l.ref + '"><formula1>' + xmlEsc('"' + l.values.join(',') + '"') + '</formula1></dataValidation>').join('') + '</dataValidations>');
      parts.push('</worksheet>');
      add('xl/worksheets/sheet' + (si + 1) + '.xml', parts.join(''));
    });
    return zip(files);
  }

  /* ---------------------------------------------------------------- CSV */
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '';
    const delim = (first.split(';').length > first.split(',').length) ? ';' : (first.split('\t').length > first.split(',').length ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  const api = { read, write, parseCSV, colName, crc32, inflate,
                MIME: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  root.XLSXLite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

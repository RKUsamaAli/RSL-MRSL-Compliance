/* ==========================================================================
   rsl-excel.js — template download and Excel / CSV import rules.

   • template(ds, kind)   blank template or a copy of the current data
   • parseFile(file)      .xlsx / .csv → { sheets } (Promise)
   • analyse(ds, wb, o)   finds the sheet and heading row, validates every row
                          and returns the plan: issues + the complete next
                          state of the list + the diff. Nothing is saved.
   • apply(ds, plan, m)   saves the plan as a new version

   A blank template has a highlighted EXAMPLE row; the import ignores it
   whether or not the user deleted it. The hidden _meta sheet records which
   list and version a file came from.

   Load order: … rsl-common.js → xlsx-lite.js → rsl-excel.js → <screen>-app.js
   Implementation: these rules move to the server unchanged.
   ========================================================================== */
window.RSLX = (function () {
  const clone = o => JSON.parse(JSON.stringify(o));
  const norm = s => String(s === undefined || s === null ? '' : s).toLowerCase().replace(/[^a-z0-9µ]+/g, '');
  const cellText = v => (v === undefined || v === null ? '' : String(v).trim());
  const WIDTH = { sm: 18, md: 28, lg: 46 };
  const EXAMPLE = 'EXAMPLE';
  const CAS_ONLY = /^\d{2,7}-\d{2}-\d$/;
  const stamp = () => new Date().toISOString();

  /* ---- layout: the template's columns for a dataset ---------------------- */
  function layout(ds, snap) {
    if (ds === RSL.PRODUCTS) {
      return CFG.productTemplate.map(c => ({ key: c.key, header: c.label, aliases: c.aliases || [], help: c.help, width: c.width,
        example: c.example, role: c.role, options: c.options, required: c.required }));
    }
    const cat = RSL.category(ds), s = snap || RSL.snapshot(ds);
    const out = [{ key: '__id', header: 'Row ID', aliases: [], width: 16, system: true,
      help: 'Filled in by the system. Leave it alone on existing rows and leave it empty on new rows.' }];
    if (cat.hasSections !== false) out.push({ key: '__section', header: cat.sectionLabel || 'Section', aliases: (cat.sectionAliases || []).concat(['Section', 'Section title']), width: 30,
      help: 'The heading the row sits under in the document.', required: !!CFG.settings.requireSectionTitle });
    const labels = s.columns.map(c => c.label);
    s.columns.forEach(c => out.push({ key: c.key, col: c, header: (c.group ? c.group + ' — ' : '') + c.label,
      aliases: labels.filter(l => l === c.label).length === 1 ? [c.label] : [], width: WIDTH[c.width] || 24,
      role: c.role, required: !!c.required, help: columnHelp(c) }));
    return out;
  }
  function columnHelp(c) {
    if (c.role === 'cas') return 'One CAS number per line, or free text such as "Various". Each number is checked against its check digit.';
    if (c.role === 'name') return 'The chemical or substance name. Used for search.';
    if (c.type === 'flag') return 'X = yes. Leave empty if not marked.';
    if (c.type === 'number') return 'A number only.';
    return 'Text, as printed in the document.';
  }
  function exampleValue(f) {
    if (f.example !== undefined) return f.example;
    if (f.key === '__id') return EXAMPLE;
    if (f.key === '__section') return 'Example section';
    if (f.role === 'cas') return '50-00-0';
    if (f.role === 'name') return 'Example substance — this row is ignored';
    if (f.col && f.col.type === 'flag') return 'X';
    if (f.col && f.col.type === 'number') return '10';
    return 'Example';
  }

  /* ---- template / data download ------------------------------------------ */
  function dataRows(ds, snap, fields) {
    if (ds !== RSL.PRODUCTS) {
      return snap.entries.map(e => fields.map(f => {
        if (f.key === '__id') return e.id;
        if (f.key === '__section') return e.section || '';
        const v = e.values[f.key];
        if (f.col.type === 'flag') return v === 'yes' ? 'X' : (v === 'no' ? 'No' : '');
        if (f.col.type === 'number' && v !== '' && !isNaN(Number(v))) return { v: Number(v) };
        return v === undefined ? '' : v;
      }));
    }
    const byId = {}; snap.materials.forEach(m => { byId[m.id] = m; });
    const line = (p, m) => {
      const o = { product_code: p ? p.code : '', product_name: p ? p.name : '', customer: p ? p.customer : '',
        material_name: m ? m.name : '', material_code: m ? m.code : '', material_type: m ? RSL.typeLabel(m.type) : '',
        supplier: m ? m.supplier : '', cas: m ? m.cas : '' };
      return fields.map(f => o[f.key] || '');
    };
    const rows = [], used = {};
    snap.products.forEach(p => {
      const mats = (p.materials || []).map(id => byId[id]).filter(Boolean);
      if (!mats.length) rows.push(line(p, null));
      mats.forEach(m => { used[m.id] = 1; rows.push(line(p, m)); });
    });
    snap.materials.filter(m => !used[m.id]).forEach(m => rows.push(line(null, m)));
    return rows;
  }

  function workbook(ds, kind, snap, versionNo) {
    const fields = layout(ds, snap);
    const name = RSL.datasetName(ds);
    const head = fields.map(f => ({ v: f.header + (f.required ? ' *' : ''), s: f.system ? 'headSys' : 'head' }));
    const rows = [head];
    if (kind === 'blank') rows.push(fields.map(f => ({ v: exampleValue(f), s: 'example' })));
    else dataRows(ds, snap, fields).forEach(r => rows.push(r));
    const lastCol = XLSXLite.colName(fields.length - 1);
    const lists = [];
    fields.forEach((f, i) => {
      const ref = XLSXLite.colName(i) + '2:' + XLSXLite.colName(i) + '5000';
      if (f.col && f.col.type === 'flag') lists.push({ ref, values: ['X'] });
      if (f.options) lists.push({ ref, values: CFG[f.options].map(o => o.t) });
    });
    const steps = ds === RSL.PRODUCTS
      ? ['One row per product × raw material. A product with 4 raw materials has 4 rows sharing the same Product ID.',
         'Several CAS numbers for one raw material: one per line in the cell, or one row per CAS number.',
         'The yellow EXAMPLE row is ignored on import, so you may leave it or delete it.',
         'Upload the file on the Excel import screen. You see every change before anything is saved.']
      : ['One row per record. Keep the headings on the Data sheet as they are.',
         'Merged cells do not import: repeat the text on each row it covers.',
         'The grey Row ID column links a row to the record it came from. Leave it empty on new rows.',
         'The yellow EXAMPLE row is ignored on import, so you may leave it or delete it.',
         'Upload the file on the Excel import screen. You see every change before anything is saved.'];
    const how = [[{ v: 'How to fill this template', s: 'title' }], [{ v: name, s: 'label' }], []];
    steps.forEach((t, i) => how.push([{ v: i + 1, s: 'label' }, { v: t, s: 'wrap' }]));
    how.push([], [{ v: 'Column', s: 'head' }, { v: 'What to enter', s: 'head' }]);
    fields.forEach(f => how.push([{ v: f.header + (f.required ? ' *' : ''), s: 'label' }, { v: f.help || '', s: 'wrap' }]));
    how.push([], [{ v: '* required', s: 'note' }]);
    return XLSXLite.write({ sheets: [
      { name: 'Data', active: true, freeze: 1, filter: 'A1:' + lastCol + Math.max(rows.length, 1), lists, rows,
        cols: fields.map(f => ({ w: f.width || 20, s: f.system ? 'sys' : (f.col && f.col.type === 'number' ? 'def' : 'text') })) },
      { name: 'How to fill', cols: [{ w: 30 }, { w: 95 }], rows: how },
      { name: '_meta', hidden: true, rows: [['dataset', ds], ['name', name], ['kind', kind], ['version', versionNo], ['generated', stamp()]] }
    ] });
  }
  const fileSlug = s => String(s).replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  function template(ds, kind) {
    const cur = RSL.currentVersion(ds);
    RSL.captureManual(ds); RSL.persist();
    const v = RSL.currentVersion(ds) || cur;
    const name = fileSlug(RSL.datasetName(ds)) + (kind === 'blank' ? '-template' : '-v' + v.n + '-data') + '.xlsx';
    RSL.downloadBytes(name, workbook(ds, kind, RSL.snapshot(ds), v.n), XLSXLite.MIME);
    return name;
  }
  function downloadVersion(ds, n) {
    const v = RSL.version(ds, n);
    const name = fileSlug(RSL.datasetName(ds)) + '-v' + n + '.xlsx';
    RSL.downloadBytes(name, workbook(ds, 'data', v.snap, n), XLSXLite.MIME);
    return name;
  }

  /* ---- read a file ------------------------------------------------------- */
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('The file could not be read.'));
      r.onload = () => {
        try {
          if (/\.csv$/i.test(file.name)) resolve({ sheets: [{ name: 'CSV', hidden: false, rows: XLSXLite.parseCSV(new TextDecoder().decode(r.result)) }] });
          else if (/\.xls$/i.test(file.name)) reject(new Error('Old .xls files cannot be read. Open it in Excel and save it as .xlsx.'));
          else resolve(XLSXLite.read(r.result));
        } catch (e) { reject(e); }
      };
      r.readAsArrayBuffer(file);
    });
  }

  /* ---- find the sheet + heading row ------------------------------------- */
  function matchHeaders(row, fields) {
    const lookup = {};
    fields.forEach(f => [f.header].concat(f.aliases).forEach(h => { const n = norm(h); if (n && !lookup[n]) lookup[n] = f; }));
    const map = {}; const unknown = [];
    (row || []).forEach((cell, i) => {
      const t = cellText(cell); if (!t) return;
      const f = lookup[norm(t)];
      if (f && map[f.key] === undefined) map[f.key] = i; else unknown.push(t);
    });
    return { map, unknown, score: Object.keys(map).length };
  }
  function findTable(wb, fields, sheetName) {
    let best = null;
    wb.sheets.filter(s => !s.hidden && s.name !== '_meta' && (!sheetName || s.name === sheetName)).forEach(s => {
      for (let i = 0; i < Math.min(s.rows.length, 20); i++) {
        const m = matchHeaders(s.rows[i], fields);
        if (m.score && (!best || m.score > best.score)) best = Object.assign(m, { sheet: s, headerRow: i });
      }
    });
    return best;
  }

  /* ---- analyse ----------------------------------------------------------- */
  function analyse(ds, wb, opts) {
    opts = opts || {};
    const mode = opts.mode || 'replace';
    const plan = { ds, mode, issues: [], fatal: null, otherDs: null, rowsRead: 0, skipped: 0, truncated: null, sheetNames: wb.sheets.filter(s => !s.hidden).map(s => s.name) };
    const add = (level, row, msg) => plan.issues.push({ level, row, msg });

    const metaSheet = wb.sheets.find(s => s.name === '_meta');
    const meta = {}; if (metaSheet) metaSheet.rows.forEach(r => { if (r && r[0]) meta[r[0]] = r[1]; });
    if (meta.dataset && meta.dataset !== ds) {
      if (RSL.datasets().some(d => d.id === meta.dataset)) plan.otherDs = meta.dataset;
      plan.fatal = 'This file is the template for “' + (meta.name || meta.dataset) + '”, not “' + RSL.datasetName(ds) + '”.';
      return plan;
    }
    const fields = layout(ds);
    const t = findTable(wb, fields, opts.sheet);
    const hasKey = k => t && t.map[k] !== undefined;
    let usable = !!t;
    if (ds === RSL.PRODUCTS) usable = usable && (hasKey('product_code') || hasKey('material_name'));
    else usable = usable && fields.some(f => (f.role === 'cas' || f.role === 'name') && hasKey(f.key));
    if (!usable) {
      plan.fatal = 'No matching headings found. Expected headings such as ' + fields.filter(f => !f.system).slice(0, 4).map(f => '“' + f.header + '”').join(', ') + '. Download the template to see the layout.';
      return plan;
    }
    plan.sheet = t.sheet.name; plan.headerRow = t.headerRow + 1;
    plan.columnsFound = fields.filter(f => hasKey(f.key)).map(f => f.header);
    plan.columnsMissing = fields.filter(f => !hasKey(f.key) && !f.system).map(f => f.header);
    if (t.unknown.length) add('warn', null, 'Ignored ' + (t.unknown.length > 1 ? t.unknown.length + ' columns that are' : '1 column that is') + ' not part of this list: ' + t.unknown.slice(0, 8).join(', ') + (t.unknown.length > 8 ? '…' : ''));
    fields.filter(f => f.required && !hasKey(f.key)).forEach(f => add('error', null, 'Required column “' + f.header + '” is missing from the file.'));

    const latest = RSL.currentVersion(ds);
    if (meta.kind === 'data' && Number(meta.version) !== latest.n) add('warn', null, 'This file was downloaded from version ' + meta.version + '; the list is now at version ' + latest.n + '. Changes made since then will be overwritten where the file differs.');
    if (RSL.hasManualEdits(ds)) add('warn', null, 'The list has row-by-row edits made after version ' + latest.n + '. They are saved as their own version first, so they can be recovered.');

    /* mapped rows; a row counts only if a mapped cell has content, because the
       client's own sheets carry formula columns far below the real data. */
    let rows = [];
    for (let i = t.headerRow + 1; i < t.sheet.rows.length; i++) {
      const r = t.sheet.rows[i] || {}; const o = {}; let any = false;
      fields.forEach(f => { if (hasKey(f.key)) { o[f.key] = cellText(r[t.map[f.key]]); if (o[f.key]) any = true; } });
      if (!any) continue;
      if (o.__id === EXAMPLE || o.product_code === EXAMPLE) continue;
      rows.push({ row: i + 1, raw: r, o });
    }
    plan.rowsRead = rows.length;
    const limit = CFG.settings.importRowLimit;
    if (limit && rows.length > limit) {
      plan.truncated = { total: rows.length, kept: limit };
      add('warn', null, 'The file has ' + rows.length.toLocaleString() + ' rows. This browser prototype takes the first ' + limit.toLocaleString() + '; the real system has no such limit.');
      rows = rows.slice(0, limit);
    }
    if (!rows.length) { plan.fatal = 'The sheet “' + t.sheet.name + '” has the right headings but no data rows.'; return plan; }

    const cur = RSL.snapshot(ds);
    if (ds === RSL.PRODUCTS) planProducts(plan, cur, rows, mode, add);
    else planCategory(plan, cur, rows, fields, mode, add, hasKey);

    plan.errors = plan.issues.filter(i => i.level === 'error').length;
    plan.warnings = plan.issues.filter(i => i.level === 'warn').length;
    plan.badRows = new Set(plan.issues.filter(i => i.level === 'error' && i.row).map(i => i.row)).size;
    plan.diff = RSL.diff(ds, cur, plan.next);
    const fileBlocked = plan.issues.some(i => i.level === 'error' && !i.row);
    plan.blocked = fileBlocked || (plan.errors > 0 && CFG.settings.importBadRows === 'block');
    return plan;
  }

  /* CAS cell: separators → one per line, only when every part is a CAS number
     (free text such as "All CAS of isomers of NP, OP" keeps its commas). */
  function tidyCas(v, row, add, heading) {
    if (!v) return v;
    const parts = String(v).split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const out = parts.every(p => CAS_ONLY.test(p)) ? parts.join('\n') : v;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) add('warn', row, heading + ' “' + v + '” looks like a date: Excel may have converted a CAS number. Check it.');
    else if (/^\d+(\.\d+)?$/.test(v)) add('warn', row, heading + ' “' + v + '” is a plain number, not a CAS number with dashes.');
    parts.filter(p => RSL.casStatus(p) === 'checksum').forEach(p => add('warn', row, heading + ' ' + p + ' fails its check digit.'));
    return out;
  }

  function planCategory(plan, cur, rows, fields, mode, add, hasKey) {
    const cat = RSL.category(plan.ds);
    const cols = fields.filter(f => f.col);
    const pc = RSL.primaryCols(cat);
    const rowKey = e => {
      if (cat.rowKey && e.values[cat.rowKey]) return 'k:' + norm(e.values[cat.rowKey]);
      return 'n:' + norm(pc.cas ? e.values[pc.cas.key] : '') + '|' + norm(pc.name ? e.values[pc.name.key] : '') + (hasKey('__section') ? '|' + norm(e.section) : '');
    };
    const byId = {}, byKey = {}, used = {};
    cur.entries.forEach(e => { byId[e.id] = e; const k = rowKey(e); (byKey[k] = byKey[k] || []).push(e); });
    const take = list => { const m = (list || []).find(e => !used[e.id]); if (m) used[m.id] = 1; return m; };

    const ids = {}, keys = {}, output = [];
    rows.forEach(r => {
      const o = r.o; let bad = false;
      const err = m => { bad = true; add('error', r.row, m); };
      const values = {};
      cols.forEach(f => {
        if (!hasKey(f.key)) return;
        let v = o[f.key];
        const c = f.col;
        if (f.required && !v) err('“' + f.header + '” is required.');
        if (c.type === 'number' && v && isNaN(Number(v))) err('“' + f.header + '” must be a number, found “' + v + '”.');
        if (c.type === 'flag' && v) {
          const k = v.toLowerCase();
          if (['x', 'yes', 'y', '1', 'true'].includes(k)) v = 'yes';
          else if (['no', 'n', '0', 'false'].includes(k)) v = 'no';
          else err('“' + f.header + '” must be X or empty, found “' + v + '”.');
        }
        if (c.role === 'cas') v = tidyCas(v, r.row, add, f.header);
        values[f.key] = v;
      });
      const section = o.__section === undefined ? undefined : o.__section;
      if (CFG.settings.requireSectionTitle && cat.hasSections !== false && hasKey('__section') && !section) err('A section title is required.');
      if (!(pc.cas && values[pc.cas.key]) && !(pc.name && values[pc.name.key])) err('Enter at least a CAS number or a chemical name: otherwise the row can never be found.');

      /* which existing row is this? Row ID first, then the row's natural key */
      let match = null;
      if (o.__id) {
        if (ids[o.__id]) add('warn', r.row, 'Row ID ' + o.__id + ' appears twice in the file; this row is treated as new.');
        else if (byId[o.__id] && !used[o.__id]) { match = byId[o.__id]; used[o.__id] = 1; }
        else if (!byId[o.__id]) add('warn', r.row, 'Row ID ' + o.__id + ' is not in this list (it may have been deleted); the row is treated as new.');
        ids[o.__id] = 1;
      }
      const probe = { values, section: section || '' };
      const key = rowKey(probe);
      if (!match) match = take(byKey[key]);
      if (keys[key]) add('warn', r.row, 'Same ' + (cat.rowKey ? 'record' : 'CAS number and name') + ' as row ' + keys[key] + ' of this file.');
      keys[key] = keys[key] || r.row;

      if (bad) { plan.skipped++; if (match) output.push({ keep: match }); return; }
      const e = match ? clone(match) : { id: RSL.newId('e'), cat: plan.ds, section: '', values: {}, createdAt: stamp() };
      const was = JSON.stringify([e.section, cols.map(f => e.values[f.key] || '')]);
      Object.assign(e.values, values);
      if (section !== undefined) e.section = section;
      if (was !== JSON.stringify([e.section, cols.map(f => e.values[f.key] || '')])) { e.updatedAt = stamp(); delete e.sample; }
      e.updatedAt = e.updatedAt || stamp();
      output.push({ entry: e, match });
    });

    const next = clone(cur);
    if (mode === 'replace') next.entries = output.map(x => x.keep || x.entry);
    else {
      const byMatch = {}; output.forEach(x => { if (x.match) byMatch[x.match.id] = x.entry; });
      next.entries = cur.entries.map(e => byMatch[e.id] || e).concat(output.filter(x => x.entry && !x.match).map(x => x.entry));
    }
    plan.next = next;
  }

  function planProducts(plan, cur, rows, mode, add) {
    const replace = mode === 'replace';
    const next = replace ? { products: [], materials: [] } : clone(cur);
    const nameSeen = {};
    const findIn = (list, key, value) => list.find(x => RSL.normCode(x[key]) === RSL.normCode(value));
    const allCodes = () => cur.materials.concat(next.materials);

    function materialFor(o) {
      const lookup = list => (o.material_code && findIn(list, 'code', o.material_code)) || (o.material_name && findIn(list, 'name', o.material_name));
      let m = lookup(next.materials);
      if (m) return m;
      const old = lookup(cur.materials);
      m = old ? clone(old) : { id: RSL.newId('m'), code: o.material_code || RSL.nextCodeFrom(allCodes()), name: o.material_name, type: 'other', supplier: '', cas: '', notes: '', createdAt: stamp() };
      if (replace && old) m.cas = '';
      next.materials.push(m);
      return m;
    }
    function productFor(o) {
      let p = findIn(next.products, 'code', o.product_code);
      if (p) return p;
      const old = findIn(cur.products, 'code', o.product_code);
      p = old ? clone(old) : { id: RSL.newId('p'), code: o.product_code, name: '', customer: '', notes: '', materials: [], createdAt: stamp() };
      if (replace && old) p.materials = [];
      next.products.push(p);
      return p;
    }
    const typeFor = (text, row) => {
      const t = CFG.materialTypes.find(x => norm(x.t) === norm(text) || x.v === text);
      if (t) return t.v;
      add('warn', row, 'Material type “' + text + '” is not on the list; saved as “Other”.');
      return 'other';
    };

    const badProducts = [];
    rows.forEach(r => {
      const o = r.o;
      if (!o.product_code && !o.material_name && !o.material_code) { add('error', r.row, 'Enter a Product ID or a raw material.'); plan.skipped++; return; }
      if (o.material_code && !o.material_name && !findIn(cur.materials.concat(next.materials), 'code', o.material_code)) {
        add('error', r.row, 'Raw material code ' + o.material_code + ' does not exist and the row has no raw material name.');
        plan.skipped++; if (o.product_code) badProducts.push(o.product_code); return;
      }
      let m = null;
      if (o.material_name || o.material_code) {
        m = materialFor(o);
        if (o.material_name && m.name !== o.material_name) add('warn', r.row, 'Code ' + m.code + ' already belongs to “' + m.name + '”: name updated to “' + o.material_name + '”.');
        if (o.material_name) m.name = o.material_name;
        if (o.material_type) m.type = typeFor(o.material_type, r.row);
        if (o.supplier) m.supplier = o.supplier;
        if (o.cas) {
          const cas = tidyCas(o.cas, r.row, add, 'CAS');
          const have = RSL.casList(m.cas), list = String(cas).includes('\n') ? cas.split('\n') : [cas];
          list.forEach(c => { if (!have.includes(c)) have.push(c); });
          m.cas = have.join('\n');
        }
      } else if (o.cas) add('warn', r.row, 'CAS number without a raw material: ignored, because CAS numbers are held on raw materials.');
      if (o.product_code) {
        const p = productFor(o);
        const n = norm(p.code);
        if (o.product_name && nameSeen[n] && nameSeen[n] !== o.product_name) add('warn', r.row, 'Product ' + p.code + ' has two names in this file; the first is kept.');
        else if (o.product_name) { nameSeen[n] = o.product_name; p.name = o.product_name; }
        if (o.customer) p.customer = o.customer;
        if (m && !p.materials.includes(m.id)) p.materials.push(m.id);
      }
    });
    /* error rows must not make a product vanish under replace + skip */
    if (replace) badProducts.forEach(code => {
      const old = findIn(cur.products, 'code', code);
      if (!old || findIn(next.products, 'code', code)) return;
      next.products.push(clone(old));
      old.materials.forEach(id => { if (!next.materials.some(m => m.id === id)) { const m = cur.materials.find(x => x.id === id); if (m) next.materials.push(clone(m)); } });
    });
    next.products.forEach(p => { if (!p.name) { p.name = p.code; add('warn', null, 'Product ' + p.code + ' has no name in the file; its code is used as the name.'); } });
    const at = stamp();
    next.products.concat(next.materials).forEach(x => { x.updatedAt = x.updatedAt || at; });
    plan.next = next;
  }

  /* ---- apply ------------------------------------------------------------- */
  function apply(ds, plan, meta) {
    const next = clone(plan.next);
    if (ds !== RSL.PRODUCTS && meta.label) next.version = meta.label;
    return RSL.commitImport(ds, next, { mode: 'import-' + plan.mode, file: meta.file || '', label: meta.label || '', note: meta.note || '' });
  }

  return { template, downloadVersion, parseFile, analyse, apply, layout };
})();

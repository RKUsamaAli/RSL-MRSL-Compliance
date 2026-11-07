/* ==========================================================================
   rsl-common.js — shared layer for every screen of the RSL / MRSL prototype.

   • Store      — categories + entries persisted in localStorage so a row
                  added on entry.html is searchable on data.html. Seeded
                  from CFG.seedCategories + DEMO.entries on first load.
                  (Implementation: this becomes the REST layer.)
   • Products   — products, raw materials, the tags between them (round 2)
   • Versions   — every import / revert stores a full copy of a list, so any
                  earlier state can be viewed, compared, downloaded, restored
   • CAS tools  — normalisation, check-digit validation, multi-value split
   • Search     — primary (CAS + name) or all-column matching, AND-ed tokens,
                  dash-insensitive CAS matching, advanced column filters
   • Table      — grouped header bands + section band rows, driven purely
                  by the category's column schema
   Load order: config.js → demo-data.js → core.js → rsl-common.js → <screen>-app.js
   ========================================================================== */
window.RSL = (function () {
  const { $, el } = UI;
  const KEY = 'rsl-mrsl-proto-v1';
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ------------------------------------------------------------------ store */
  let db = null;
  const PRODUCTS = 'products';   /* dataset id of the product + raw-material data */
  const stampRows = (rows, at) => rows.forEach(r => { r.updatedAt = r.updatedAt || r.createdAt || at; });
  function seed() {
    const d = { schema: 2, categories: clone(CFG.seedCategories), entries: clone(DEMO.entries),
                materials: clone(DEMO.materials), products: clone(DEMO.products), versions: {},
                seededAt: new Date().toISOString() };
    d.categories.forEach(c => { c.createdAt = c.createdAt || d.seededAt; c.updatedAt = c.updatedAt || d.seededAt; });
    [d.entries, d.materials, d.products].forEach(l => stampRows(l, d.seededAt));
    persist(d); return d;
  }
  /* Browsers that opened round 1 keep their rows; round-2 data is added once. */
  function migrate(d) {
    if (d.schema >= 2) return false;
    const at = new Date().toISOString();
    d.materials = d.materials || clone(DEMO.materials);
    d.products = d.products || clone(DEMO.products);
    d.versions = d.versions || {};
    stampRows(d.materials, at); stampRows(d.products, at);
    CFG.seedCategories.filter(c => c.addedIn === 2 && !d.categories.some(x => x.id === c.id)).forEach(c => {
      d.categories.push(Object.assign(clone(c), { createdAt: at, updatedAt: at }));
      const rows = clone(DEMO.entries.filter(e => e.cat === c.id)); stampRows(rows, at);
      d.entries = d.entries.concat(rows);
    });
    d.schema = 2;
    return true;
  }
  /* false when the browser refused the write (storage full, private mode) */
  function persist(d) {
    db = d || db;
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { db = JSON.parse(raw); if (migrate(db)) persist(); return db; }
    } catch (e) { /* ignore */ }
    return seed();
  }
  load();
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } seed(); ensureVersions(); }
  const now = () => new Date().toISOString();
  const newId = p => (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

  const categories = () => db.categories.slice();
  const category = id => db.categories.find(c => c.id === id) || null;
  function saveCategory(cat) {
    const i = db.categories.findIndex(c => c.id === cat.id);
    cat.updatedAt = now();
    if (i >= 0) db.categories[i] = cat; else { cat.createdAt = cat.updatedAt; db.categories.push(cat); }
    persist(); return cat;
  }
  function deleteCategory(id) {
    db.categories = db.categories.filter(c => c.id !== id);
    db.entries = db.entries.filter(e => e.cat !== id);
    delete db.versions[id];
    persist();
  }
  const entries = catId => db.entries.filter(e => !catId || e.cat === catId);
  const entry = id => db.entries.find(e => e.id === id) || null;
  function saveEntry(e) {
    const i = db.entries.findIndex(x => x.id === e.id);
    e.updatedAt = now();
    if (i >= 0) db.entries[i] = e; else { e.id = e.id || newId('e'); e.createdAt = e.updatedAt; db.entries.push(e); }
    persist(); return e;
  }
  function deleteEntry(id) { db.entries = db.entries.filter(e => e.id !== id); persist(); }
  function sections(catId) {
    const seen = [];
    entries(catId).forEach(e => { const s = (e.section || '').trim(); if (s && !seen.includes(s)) seen.push(s); });
    return seen;
  }
  function stats() {
    return { categories: db.categories.length, entries: db.entries.length,
             sections: db.categories.reduce((n, c) => n + sections(c.id).length, 0) };
  }

  /* ------------------------------------------------- products + raw materials */
  const materials = () => db.materials.slice();
  const material = id => db.materials.find(m => m.id === id) || null;
  const products = () => db.products.slice();
  const product = id => db.products.find(p => p.id === id) || null;
  const normCode = s => String(s || '').trim().toLowerCase();
  const materialByCode = code => db.materials.find(m => normCode(m.code) === normCode(code)) || null;
  const productByCode = code => db.products.find(p => normCode(p.code) === normCode(code)) || null;
  const materialsOf = p => (p.materials || []).map(material).filter(Boolean);
  const productsUsing = id => db.products.filter(p => (p.materials || []).includes(id));
  function nextCodeFrom(list) {
    const n = list.reduce((m, x) => { const r = /^RM-(\d+)$/i.exec(x.code || ''); return r ? Math.max(m, Number(r[1])) : m; }, 0);
    return 'RM-' + String(n + 1).padStart(3, '0');
  }
  const nextMaterialCode = () => nextCodeFrom(db.materials);
  function saveRow(list, row, prefix) {
    const i = list.findIndex(x => x.id === row.id);
    row.updatedAt = now();
    if (i >= 0) list[i] = row; else { row.id = row.id || newId(prefix); row.createdAt = row.updatedAt; list.push(row); }
    persist(); return row;
  }
  const saveMaterial = m => saveRow(db.materials, m, 'm');
  const saveProduct = p => saveRow(db.products, p, 'p');
  function deleteMaterial(id) {
    db.materials = db.materials.filter(m => m.id !== id);
    db.products.forEach(p => { p.materials = (p.materials || []).filter(x => x !== id); });
    persist();
  }
  function deleteProduct(id) { db.products = db.products.filter(p => p.id !== id); persist(); }

  /* Every list row that names this exact CAS number. Being listed is a fact
     about the list, not a verdict on the product. */
  function listHits(cas) {
    const d = digits(cas); const hits = [];
    if (!d || casStatus(cas) === 'text') return hits;
    db.categories.forEach(c => {
      const pc = primaryCols(c).cas; if (!pc) return;
      entries(c.id).forEach(e => { if (casList(e.values[pc.key]).some(x => digits(x) === d)) hits.push({ cat: c, entry: e }); });
    });
    return hits;
  }
  const materialFields = m => [m.code, m.name, m.supplier, typeLabel(m.type)];
  const typeLabel = v => (CFG.materialTypes.find(t => t.v === v) || { t: '' }).t;

  /* CAS numbers of list rows found by this text, so "formaldehyde" also finds a
     raw material that only states 50-00-0. */
  function casFromLists(q) {
    const set = {};
    if (String(q || '').trim().length < 3) return set;
    db.categories.forEach(c => {
      const pc = primaryCols(c).cas; if (!pc) return;
      entries(c.id).forEach(e => {
        if (matchEntry(e, c, q, 'primary').hit) casList(e.values[pc.key]).forEach(x => { if (casStatus(x) !== 'text') set[digits(x)] = x; });
      });
    });
    return set;
  }
  /* A material matches when every token is in its own fields or CAS numbers. */
  function materialMatch(m, tokens, listed) {
    const own = tokens.length && tokens.every(t => materialFields(m).some(f => cellMatches(f, t, false)) || cellMatches(m.cas, t, true));
    if (own) return 'direct';
    return casList(m.cas).find(x => listed[digits(x)]) ? 'listed' : '';
  }
  /* searchProducts(q) → { products:[{ product, viaProduct, mats:[{ m, why }] }], loose:[materials on no product] }
     A hit on the product itself returns ALL its tagged materials; `why` marks
     the ones that matched ('direct' | 'listed' | '').                        */
  function searchProducts(q) {
    const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return { products: db.products.map(p => ({ product: p, viaProduct: false, mats: materialsOf(p).map(m => ({ m, why: '' })) })),
                                 loose: db.materials.filter(m => !productsUsing(m.id).length) };
    const listed = casFromLists(q);
    const out = [];
    db.products.forEach(p => {
      const mats = materialsOf(p).map(m => ({ m, why: materialMatch(m, tokens, listed) }));
      const fields = [p.code, p.name, p.customer];
      /* each token may be met by the product or by one of its materials */
      const viaProduct = tokens.every(t => fields.some(f => cellMatches(f, t, false)));
      const mixed = tokens.every(t => fields.some(f => cellMatches(f, t, false)) ||
        materialsOf(p).some(m => materialFields(m).some(f => cellMatches(f, t, false)) || cellMatches(m.cas, t, true)));
      if (viaProduct || mixed || mats.some(x => x.why)) out.push({ product: p, viaProduct, mats });
    });
    return { products: out, loose: db.materials.filter(m => !productsUsing(m.id).length && materialMatch(m, tokens, listed)) };
  }
  function searchMaterials(q) {
    const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return db.materials.map(m => ({ m, why: '' }));
    const listed = casFromLists(q);
    return db.materials.map(m => ({ m, why: materialMatch(m, tokens, listed) })).filter(x => x.why);
  }

  /* ----------------------------------------------------------------- versions
     A dataset is one category (its id) or PRODUCTS. A version holds a full
     snapshot; reverting never deletes history, it adds a new version.       */
  const datasetName = ds => ds === PRODUCTS ? 'Products & raw materials' : (category(ds) || { name: ds }).name;
  const datasets = () => db.categories.map(c => ({ id: c.id, name: c.name })).concat([{ id: PRODUCTS, name: datasetName(PRODUCTS) }]);
  function snapshot(ds) {
    if (ds === PRODUCTS) return clone({ products: db.products, materials: db.materials });
    const c = category(ds);
    return clone({ version: c.version || '', columns: c.columns, entries: entries(ds) });
  }
  function restore(ds, snap) {
    const s = clone(snap);
    if (ds === PRODUCTS) { db.products = s.products; db.materials = s.materials; return; }
    const c = category(ds);
    c.columns = s.columns; c.version = s.version; c.updatedAt = now();
    db.entries = db.entries.filter(e => e.cat !== ds).concat(s.entries);
  }
  const countOf = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const snapRows = (ds, s) => ds === PRODUCTS ? countOf(s.products.length, 'product') + ' · ' + countOf(s.materials.length, 'raw material') : countOf(s.entries.length, 'row');

  /* Flatten a snapshot to comparable records: { id, kind, title, fields:{key:{label,value}} } */
  function diffRecords(ds, s) {
    const f = pairs => { const o = {}; pairs.forEach(p => { o[p[0]] = { label: p[1], value: String(p[2] === undefined || p[2] === null ? '' : p[2]).trim() }; }); return o; };
    if (ds === PRODUCTS) {
      const names = {}; s.materials.forEach(m => { names[m.id] = m.name; });
      return s.products.map(p => ({ id: p.id, kind: 'Product', title: p.code + ' — ' + p.name,
          fields: f([['code', 'Product ID', p.code], ['name', 'Product name', p.name], ['customer', 'Customer / buyer', p.customer], ['notes', 'Notes', p.notes],
                     ['materials', 'Raw materials', (p.materials || []).map(id => names[id] || id).join('\n')]]) }))
        .concat(s.materials.map(m => ({ id: m.id, kind: 'Raw material', title: m.code + ' — ' + m.name,
          fields: f([['code', 'Code', m.code], ['name', 'Raw material', m.name], ['type', 'Material type', typeLabel(m.type)], ['supplier', 'Supplier', m.supplier], ['cas', 'CAS Number', m.cas], ['notes', 'Notes', m.notes]]) })));
    }
    const nameCol = s.columns.find(c => c.role === 'name');
    return s.entries.map(e => ({ id: e.id, kind: 'Row',
      title: (nameCol ? String(e.values[nameCol.key] || '').split('\n')[0] : '') || '(unnamed)',
      fields: f([['__section', 'Section', e.section]].concat(s.columns.map(c => [c.key, (c.group ? c.group + ' — ' : '') + c.label, e.values[c.key]]))) }));
  }
  /* diff(ds, a, b) → what happens going from snapshot a to snapshot b */
  function diff(ds, a, b) {
    const A = {}, seen = {}; diffRecords(ds, a).forEach(r => { A[r.id] = r; });
    const res = { added: [], updated: [], removed: [], unchanged: 0, columnsChanged: false };
    diffRecords(ds, b).forEach(r => {
      seen[r.id] = 1;
      const old = A[r.id];
      if (!old) { res.added.push(r); return; }
      const changes = [];
      Object.keys(Object.assign({}, old.fields, r.fields)).forEach(k => {
        const x = old.fields[k] || {}, y = r.fields[k] || {};
        if ((x.value || '') !== (y.value || '')) changes.push({ label: y.label || x.label, from: x.value || '', to: y.value || '' });
      });
      if (changes.length) res.updated.push({ id: r.id, kind: r.kind, title: r.title, changes }); else res.unchanged++;
    });
    diffRecords(ds, a).forEach(r => { if (!seen[r.id]) res.removed.push(r); });
    if (ds !== PRODUCTS) res.columnsChanged = JSON.stringify(a.columns) !== JSON.stringify(b.columns) || a.version !== b.version;
    res.total = res.added.length + res.updated.length + res.removed.length;
    return res;
  }
  const versions = ds => (db.versions[ds] || []).slice();
  const version = (ds, n) => versions(ds).find(v => v.n === n) || null;
  const currentVersion = ds => { const l = db.versions[ds] || []; return l[l.length - 1] || null; };
  function addVersion(ds, meta) {
    const list = db.versions[ds] = db.versions[ds] || [];
    const prev = list[list.length - 1], snap = snapshot(ds);
    const d = prev ? diff(ds, prev.snap, snap) : null;
    const v = Object.assign({ n: prev ? prev.n + 1 : 1, at: now(), by: CFG.user, mode: 'manual', file: '', label: '', note: '',
      rows: snapRows(ds, snap), added: d ? d.added.length : 0, updated: d ? d.updated.length : 0, removed: d ? d.removed.length : 0, snap }, meta);
    list.push(v); return v;
  }
  function ensureVersions() {
    let added = false;
    datasets().forEach(d => { if (!(db.versions[d.id] || []).length) { addVersion(d.id, { mode: 'initial', note: 'Data as it stood when version history began' }); added = true; } });
    if (added) persist();
  }
  const hasManualEdits = ds => { const c = currentVersion(ds), s = snapshot(ds), d = diff(ds, c.snap, s); return d.total > 0 || d.columnsChanged; };
  /* Row-by-row edits since the last version become a version of their own, so
     an import or a revert can never swallow them. */
  function captureManual(ds) {
    if (!hasManualEdits(ds)) return null;
    return addVersion(ds, { mode: 'manual', note: 'Edits made row by row on the Add row, Columns or Products screens' });
  }
  /* All-or-nothing: if the browser refuses the write, the previous state stays. */
  function transact(fn) {
    const before = JSON.stringify(db);
    const result = fn();
    if (persist()) return { ok: true, result };
    db = JSON.parse(before); persist();
    return { ok: false };
  }
  function commitImport(ds, next, meta) {
    return transact(() => { captureManual(ds); restore(ds, next); return addVersion(ds, meta); });
  }
  function revert(ds, n) {
    const v = version(ds, n);
    return transact(() => {
      captureManual(ds); restore(ds, v.snap);
      return addVersion(ds, { mode: 'revert', revertedTo: n, label: v.label, note: 'Restored the content of version ' + n });
    });
  }

  /* -------------------------------------------------------------- helpers */
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'col';
  const param = n => new URLSearchParams(location.search).get(n);
  const esc = s => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const widthPx = w => { const f = CFG.widths.find(x => x.v === w); return f ? f.px : 180; };
  const col = (cat, role) => (cat.columns || []).find(c => c.role === role) || null;
  const primaryCols = cat => ({ cas: col(cat, 'cas'), name: col(cat, 'name'), ec: col(cat, 'ec') });
  function entryTitle(cat, e) {
    const n = primaryCols(cat).name;
    const v = n ? String(e.values[n.key] || '') : '';
    return v.split('\n')[0] || '(unnamed)';
  }
  function fmtWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return UI.fmtDate(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------------------------------------------------------------- CAS */
  /* Split a multi-value cell: newline, comma or semicolon separated. */
  const casList = v => String(v || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
  /* Check digit: sum of digits × position (from right, excluding check digit) mod 10. */
  function casValid(s) {
    s = String(s || '').trim(); if (!CAS_RE.test(s)) return false;
    const d = s.replace(/-/g, ''); const chk = Number(d[d.length - 1]);
    let sum = 0; for (let i = 0; i < d.length - 1; i++) sum += Number(d[d.length - 2 - i]) * (i + 1);
    return sum % 10 === chk;
  }
  const casStatus = s => CAS_RE.test(String(s).trim()) ? (casValid(s) ? 'valid' : 'checksum') : 'text';
  const digits = s => String(s || '').replace(/\D+/g, '');

  /* ------------------------------------------------------------- search */
  /* A query token is treated as a CAS fragment when it is mostly digits/dashes
     and has at least 3 digits — then it matches dash-insensitively.        */
  const looksLikeCas = t => /^[\d\-\s]+$/.test(t) && digits(t).length >= 3;

  function cellMatches(value, token, isCasCol) {
    const v = String(value === undefined || value === null ? '' : value);
    if (!v) return false;
    const tl = token.toLowerCase();
    /* 1–2 character tokens ("B" in "Part B", "OP") must match a whole word,
       otherwise every cell containing that letter would hit.              */
    if (tl.length <= 2 && !looksLikeCas(token)) {
      return new RegExp('(^|[^a-z0-9])' + tl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i').test(v);
    }
    if (v.toLowerCase().includes(tl)) return true;
    if (looksLikeCas(token) && (isCasCol || /\d-\d/.test(v))) {
      const td = digits(token);
      return casList(v).some(c => digits(c).includes(td));
    }
    return false;
  }

  /* Returns { hit, cols:[keys that matched] }.
     mode 'primary' → only cas / name / ec role columns; 'all' → every column + section. */
  function matchEntry(e, cat, q, mode) {
    const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
    const cols = mode === 'all' ? cat.columns
      : cat.columns.filter(c => c.role === 'cas' || c.role === 'name' || c.role === 'ec');
    const hitCols = new Set();
    if (!tokens.length) return { hit: true, cols: [] };
    /* a whole quoted phrase also works: "nonylphenol ethoxylates" */
    const ok = tokens.every(t => {
      let any = false;
      cols.forEach(c => { if (cellMatches(e.values[c.key], t, c.role === 'cas')) { any = true; hitCols.add(c.key); } });
      if (mode === 'all' && !any && cellMatches(e.section, t, false)) { any = true; hitCols.add('__section'); }
      return any;
    });
    return { hit: ok, cols: Array.from(hitCols) };
  }

  /* Advanced filters: [{ label, op, val }] — matched by column LABEL so one
     filter can span categories that share a heading ("Country").          */
  function applyFilters(e, cat, filters) {
    return (filters || []).every(f => {
      if (!f.label) return true;
      const c = cat.columns.find(x => x.label === f.label) || (f.label === '__section' ? { key: '__section' } : null);
      if (!c) return false;
      const raw = c.key === '__section' ? e.section : e.values[c.key];
      const v = String(raw === undefined || raw === null ? '' : raw).toLowerCase().trim();
      const t = String(f.val || '').toLowerCase().trim();
      switch (f.op) {
        case 'empty':    return !v;
        case 'notempty': return !!v;
        case 'equals':   return v === t;
        case 'starts':   return v.startsWith(t);
        default:         return v.includes(t);
      }
    });
  }

  function highlight(text, q) {
    let h = esc(text);
    const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
    tokens.forEach(t => {
      if (!t) return;
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      h = h.replace(re, '<mark>$1</mark>');
      if (looksLikeCas(t)) {
        /* dash-insensitive: mark CAS numbers whose digits contain the token's digits */
        h = h.split('\n').map(line => {
          const m = line.match(/\b\d{2,7}-\d{2}-\d\b/g);
          if (!m) return line;
          let out = line;
          m.forEach(c => { if (digits(c).includes(digits(t)) && !out.includes('<mark>' + c)) out = out.replace(c, '<mark>' + c + '</mark>'); });
          return out;
        }).join('\n');
      }
    });
    return h;
  }

  /* ---------------------------------------------------------- rendering */
  function cellHtml(c, v, q) {
    if (c.type === 'flag') return v === 'yes' ? '<span class="flag-x" title="Yes">X</span>' : '<span class="muted">—</span>';
    if (v === undefined || v === null || v === '') return '<span class="muted">—</span>';
    let h = q ? highlight(v, q) : esc(v);
    if (c.role === 'cas') {
      h = casList(v).map(x => {
        const st = casStatus(x);
        const inner = q ? highlight(x, q) : esc(x);
        return '<span class="cas ' + st + '" title="' + (st === 'valid' ? 'CAS check digit OK' : st === 'checksum' ? 'CAS check digit does NOT match' : 'Free text (not a CAS number)') + '">' + inner + '</span>';
      }).join('');
      return h;
    }
    return '<span class="' + (c.type === 'multiline' ? 'ml' : '') + '">' + h + '</span>';
  }

  /* Header: one row when no column has a group, two rows otherwise. */
  function headerRows(cat) {
    const cols = cat.columns;
    const grouped = cols.some(c => c.group);
    const r1 = el('tr'), r2 = el('tr');
    let i = 0;
    while (i < cols.length) {
      const c = cols[i];
      if (c.group) {
        let j = i; while (j < cols.length && cols[j].group === c.group) j++;
        r1.appendChild(el('th', { colspan: j - i, class: 'grp-th', text: c.group }));
        for (let k = i; k < j; k++) r2.appendChild(el('th', { class: 'sub-th', text: cols[k].label, style: 'min-width:' + widthPx(cols[k].width) + 'px' }));
        i = j;
      } else {
        r1.appendChild(el('th', { rowspan: grouped ? 2 : 1, text: c.label, style: 'min-width:' + widthPx(c.width) + 'px' }));
        i++;
      }
    }
    return grouped ? [r1, r2] : [r1];
  }

  /* renderTable(host, cat, rows, { q, onRow, emptyTitle, emptyText, showMeta }) */
  function renderTable(host, cat, rows, opts) {
    opts = opts || {};
    host = typeof host === 'string' ? $(host) : host;
    host.innerHTML = '';
    const wrap = el('div', { class: 'ltable-wrap rsl-wrap' });
    const t = el('table', { class: 'ltable rsl-table' });
    const thead = el('thead'); headerRows(cat).forEach(r => thead.appendChild(r)); t.appendChild(thead);
    const tb = el('tbody');
    const span = cat.columns.length;
    if (!rows.length) {
      tb.appendChild(el('tr', {}, [el('td', { colspan: span }, [el('div', { class: 'empty-state' }, [
        el('span', { class: 'ic', text: '\u{1F4ED}' }),
        el('h4', { text: opts.emptyTitle || 'No rows' }),
        el('p', { text: opts.emptyText || 'Nothing in this category matches.' })])])]));
    }
    let lastSec = null;
    rows.forEach(e => {
      if (cat.hasSections) {
        const s = (e.section || '').trim() || '(no ' + (cat.sectionLabel || 'section').toLowerCase() + ')';
        if (s !== lastSec) {
          tb.appendChild(el('tr', { class: 'grp' }, [el('td', { colspan: span, html: esc(s) +
            (opts.q ? '' : '') })]));
          lastSec = s;
        }
      }
      const tr = el('tr', { class: 'row' + (e.sample ? ' sample' : '') });
      cat.columns.forEach(c => {
        const td = el('td', { class: c.type === 'number' ? 'num' : '' });
        td.innerHTML = cellHtml(c, e.values[c.key], opts.q);
        tr.appendChild(td);
      });
      if (opts.onRow) { tr.style.cursor = 'pointer'; tr.addEventListener('click', () => opts.onRow(e)); }
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); host.appendChild(wrap);
    return wrap;
  }

  /* Sort rows the way the document reads: by section (first-seen order), then by insertion. */
  function ordered(rows) {
    const order = []; rows.forEach(r => { const s = (r.section || '').trim(); if (!order.includes(s)) order.push(s); });
    return rows.slice().sort((a, b) => {
      const d = order.indexOf((a.section || '').trim()) - order.indexOf((b.section || '').trim());
      return d !== 0 ? d : String(a.createdAt).localeCompare(String(b.createdAt));
    });
  }

  /* ----------------------------------------------------------------- CSV */
  function toCSV(cat, rows) {
    const q = v => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
    const head = [(cat.sectionLabel || 'Section')].concat(cat.columns.map(c => (c.group ? c.group + ' — ' : '') + c.label));
    const lines = [head.map(q).join(',')];
    rows.forEach(e => lines.push([e.section].concat(cat.columns.map(c => c.type === 'flag' ? (e.values[c.key] === 'yes' ? 'X' : '') : e.values[c.key])).map(q).join(',')));
    return lines.join('\r\n');
  }
  function download(name, text) {
    const a = el('a', { href: 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(text), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }

  function downloadBytes(name, bytes, mime) {
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------------------------------------------------------- page nav */
  /* Replaces the product shell (module rail + app bar) with a slim in-page
     navigation strip: brand on the left, the four screens on the right,
     current page highlighted. Rendered at the top of .wrap.               */
  const NAV = [
    ['index.html', '\u{1F3E0} Home'],
    ['categories.html', 'Categories'],
    ['entry.html', '+ Add row'],
    ['data.html', 'Search & data table'],
    ['products.html', 'Products & raw materials'],
    ['import.html', 'Excel import & versions']
  ];
  function shell() {
    const here = (location.pathname.split('/').pop() || 'index.html');
    const nav = el('div', { class: 'topnav' }, [
      el('a', { class: 'brand', href: 'index.html', text: CFG.brand || 'RSL Compliance' }),
      el('span', { class: 'spacer' })
    ]);
    NAV.forEach(n => nav.appendChild(el('a', { href: n[0], text: n[1],
      class: (here === n[0] || (n[0] === 'categories.html' && here === 'category-form.html') || (n[0] === 'products.html' && (here === 'product-form.html' || here === 'report.html'))) ? 'on' : '' })));
    const wrap = $('.wrap');
    if (wrap) wrap.insertBefore(nav, wrap.firstChild);
  }

  /* --------------------------------------------------------------- toast */
  function toast(msg, kind) {
    let t = $('#rslToast');
    if (!t) { t = el('div', { id: 'rslToast', class: 'rsl-toast' }); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'rsl-toast show ' + (kind || '');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  ensureVersions();

  return { KEY, PRODUCTS, shell, reset, categories, category, saveCategory, deleteCategory,
           materials, material, materialByCode, saveMaterial, deleteMaterial, nextMaterialCode, nextCodeFrom,
           products, product, productByCode, saveProduct, deleteProduct, materialsOf, productsUsing,
           listHits, typeLabel, normCode, searchProducts, searchMaterials,
           datasets, datasetName, snapshot, snapRows, diff, versions, version, currentVersion,
           hasManualEdits, captureManual, commitImport, revert, persist, downloadBytes,
           entries, entry, saveEntry, deleteEntry, sections, stats,
           slug, param, esc, newId, widthPx, primaryCols, entryTitle, fmtWhen,
           casList, casValid, casStatus, looksLikeCas, matchEntry, applyFilters, highlight,
           cellHtml, renderTable, ordered, toCSV, download, toast };
})();

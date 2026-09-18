/* ==========================================================================
   rsl-common.js — shared layer for every screen of the RSL / MRSL prototype.

   • Store      — categories + entries persisted in localStorage so a row
                  added on entry.html is searchable on data.html. Seeded
                  from CFG.seedCategories + DEMO.entries on first load.
                  (Implementation: this becomes the REST layer.)
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
  function seed() {
    const d = { categories: clone(CFG.seedCategories), entries: clone(DEMO.entries), seededAt: new Date().toISOString() };
    d.categories.forEach(c => { c.createdAt = c.createdAt || d.seededAt; c.updatedAt = c.updatedAt || d.seededAt; });
    d.entries.forEach(e => { e.updatedAt = e.updatedAt || e.createdAt; });
    persist(d); return d;
  }
  function persist(d) { db = d || db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* private mode */ } }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); return db; } } catch (e) { /* ignore */ }
    return seed();
  }
  load();
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } seed(); }
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

  /* ---------------------------------------------------------- page nav */
  /* Replaces the product shell (module rail + app bar) with a slim in-page
     navigation strip: brand on the left, the four screens on the right,
     current page highlighted. Rendered at the top of .wrap.               */
  const NAV = [
    ['index.html', '\u{1F3E0} Home'],
    ['categories.html', 'Categories'],
    ['entry.html', '+ Add row'],
    ['data.html', 'Search & data table']
  ];
  function shell() {
    const here = (location.pathname.split('/').pop() || 'index.html');
    const nav = el('div', { class: 'topnav' }, [
      el('a', { class: 'brand', href: 'index.html', text: CFG.brand || 'RSL Compliance' }),
      el('span', { class: 'spacer' })
    ]);
    NAV.forEach(n => nav.appendChild(el('a', { href: n[0], text: n[1],
      class: (here === n[0] || (n[0] === 'categories.html' && here === 'category-form.html')) ? 'on' : '' })));
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

  return { KEY, shell, reset, categories, category, saveCategory, deleteCategory,
           entries, entry, saveEntry, deleteEntry, sections, stats,
           slug, param, esc, newId, widthPx, primaryCols, entryTitle, fmtWhen,
           casList, casValid, casStatus, looksLikeCas, matchEntry, applyFilters, highlight,
           cellHtml, renderTable, ordered, toCSV, download, toast };
})();

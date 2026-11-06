/* ==========================================================================
   data-app.js — cross-category search + per-category data tables.
   ?cat=<id>  limit scope       ?q=<text>  pre-filled search
   Search rules live in rsl-common.js (matchEntry / applyFilters); this file
   only wires the inputs and renders one table per category using that
   category's own column schema.
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL', links: [{ href: 'index.html', text: '← All screens' }, { href: 'categories.html', text: 'Categories' }] });

  const cats = RSL.categories();
  const filters = [];   /* [{label, op, val}] */
  cats.forEach(c => $('#scope').appendChild(el('option', { value: c.id, text: c.name })));
  if (RSL.param('cat') && RSL.category(RSL.param('cat'))) $('#scope').value = RSL.param('cat');
  if (RSL.param('q')) $('#q').value = RSL.param('q');
  $('#mode').value = CFG.settings.searchMode || 'primary';

  const scopeCats = () => $('#scope').value ? [RSL.category($('#scope').value)] : cats;

  /* ---- column filters --------------------------------------------------- */
  function filterLabels() {
    const seen = []; scopeCats().forEach(c => c.columns.forEach(x => { if (!seen.includes(x.label)) seen.push(x.label); }));
    return seen;
  }
  function drawFilters() {
    const host = $('#filters'); host.innerHTML = '';
    filters.forEach((f, i) => {
      const row = el('div', { class: 'frow' });
      const col = el('select', {}, [el('option', { value: '', text: '— column —' }), el('option', { value: '__section', text: 'Section title' })]
        .concat(filterLabels().map(l => el('option', { value: l, text: l, selected: l === f.label ? '' : null }))));
      if (f.label === '__section') col.value = '__section';
      col.addEventListener('change', () => { f.label = col.value; run(); });
      const op = el('select', {}, CFG.filterOps.map(o => el('option', { value: o.v, text: o.t, selected: o.v === f.op ? '' : null })));
      op.addEventListener('change', () => { f.op = op.value; val.disabled = /empty/.test(f.op); run(); });
      const val = el('input', { type: 'text', placeholder: 'value…', value: f.val || '' }); val.disabled = /empty/.test(f.op);
      val.addEventListener('input', () => { f.val = val.value; run(); });
      row.appendChild(col); row.appendChild(op); row.appendChild(val);
      row.appendChild(el('span', { class: 'icon-btn del', text: '✕', title: 'Remove filter', onclick: () => { filters.splice(i, 1); drawFilters(); run(); } }));
      host.appendChild(row);
    });
  }
  $('#btnFilter').addEventListener('click', () => { filters.push({ label: '', op: 'contains', val: '' }); drawFilters(); UI.$$('#filters select')[filters.length * 2 - 2].focus(); });
  $('#btnClear').addEventListener('click', () => { $('#q').value = ''; filters.length = 0; drawFilters(); run(); $('#q').focus(); });

  /* ---- run the search --------------------------------------------------- */
  let lastResult = [];
  function run() {
    const q = $('#q').value.trim(), mode = $('#mode').value, active = q || filters.some(f => f.label);
    const per = scopeCats().map(c => {
      const rows = RSL.ordered(RSL.entries(c.id)).filter(e => RSL.matchEntry(e, c, q, mode).hit && RSL.applyFilters(e, c, filters));
      return { cat: c, rows, total: RSL.entries(c.id).length };
    });
    lastResult = per;
    const matches = per.reduce((n, p) => n + p.rows.length, 0);
    const inScope = per.reduce((n, p) => n + p.total, 0);
    const hitCats = per.filter(p => p.rows.length).length;

    UI.kpis('#kpis', [
      { label: active ? 'Matching rows' : 'Rows in scope', value: String(matches), accent: true, delta: active ? 'of ' + inScope + ' in scope' : '' },
      { label: 'Categories with a match', value: hitCats + ' / ' + per.length },
      { label: 'Search mode', value: mode === 'all' ? 'Any column' : 'CAS + name', delta: q && RSL.looksLikeCas(q) ? 'CAS query — dashes ignored' : (q ? 'text query' : '') },
      { label: 'Column filters', value: String(filters.filter(f => f.label).length) }
    ]);

    $('#sum').innerHTML = active
      ? '<b>' + matches + '</b> row' + (matches === 1 ? '' : 's') + ' match ' + (q ? '“' + RSL.esc(q) + '”' : 'the filters') + ' across <b>' + hitCats + '</b> categor' + (hitCats === 1 ? 'y' : 'ies') +
        (per.length - hitCats ? ' <span class="hint">· ' + (per.length - hitCats) + ' categor' + (per.length - hitCats === 1 ? 'y has' : 'ies have') + ' no match and ' + (per.length - hitCats === 1 ? 'is' : 'are') + ' collapsed</span>' : '')
      : 'Showing every row in scope. Type in the search box to narrow down.';

    drawProducts(q);

    const host = $('#results'); host.innerHTML = '';
    if (!per.length) { host.innerHTML = '<div class="empty-state"><span class="ic">&#128203;</span><h4>No categories yet</h4><p>Create one to start entering rows.</p><a class="btn primary" href="category-form.html">New category</a></div>'; return; }
    per.forEach(p => {
      const c = p.cat;
      const card = el('section', { class: 'card' });
      const ch = el('div', { class: 'ch' }, [
        el('h2', { html: RSL.esc(c.name) + ' <span class="cnt-badge' + (p.rows.length ? '' : ' zero') + '">' + p.rows.length + (active ? ' / ' + p.total : '') + '</span>' }),
        el('span', { class: 'tag', text: (c.source || '') + (c.version ? ' · ' + c.version : '') }),
        el('span', { class: 'spacer', style: 'flex:1' }),
        el('a', { class: 'btn sm', href: 'entry.html?cat=' + c.id, text: '+ Add row' }),
        el('a', { class: 'btn sm', href: 'import.html?ds=' + c.id, text: 'Excel' }),
        el('a', { class: 'btn sm', href: 'category-form.html?id=' + c.id, text: 'Columns' })
      ]);
      card.appendChild(ch);
      const cb = el('div', { class: 'cb' }); card.appendChild(cb);
      if (active && !p.rows.length) {
        const d = el('details', {}, [el('summary', { class: 'hint', text: 'No match in this category — show its ' + p.total + ' row' + (p.total === 1 ? '' : 's') + ' anyway' })]);
        const inner = el('div', { style: 'margin-top:10px' }); d.appendChild(inner);
        d.addEventListener('toggle', () => { if (d.open && !inner.childElementCount) RSL.renderTable(inner, c, RSL.ordered(RSL.entries(c.id)), { onRow: e => openRow(c, e) }); });
        cb.appendChild(d);
      } else {
        RSL.renderTable(cb, c, p.rows, { q: q, onRow: e => openRow(c, e),
          emptyTitle: 'No rows in this category yet', emptyText: 'Use “+ Add row” to enter the first one.' });
        if (p.rows.some(r => r.sample)) cb.appendChild(el('div', { class: 'hint', style: 'margin-top:8px', text: 'Striped rows are illustrative samples, not transcribed from your document.' }));
      }
      host.appendChild(card);
    });
  }

  /* ---- products + raw materials that match the search ------------------ */
  function drawProducts(q) {
    const host = $('#productHits'); host.innerHTML = '';
    if (!q || !CFG.settings.searchShowsProducts) return;
    const res = RSL.searchProducts(q);
    if (!res.products.length && !res.loose.length) return;
    const card = el('section', { class: 'card search-products' });
    card.appendChild(el('div', { class: 'ch' }, [
      el('h2', { html: 'Products &amp; attached raw materials <span class="cnt-badge">' + res.products.length + '</span>' }),
      el('span', { class: 'spacer', style: 'flex:1' }),
      el('a', { class: 'btn sm', href: 'products.html?q=' + encodeURIComponent(q), text: 'Open in Products' })
    ]));
    const cb = el('div', { class: 'cb' }); card.appendChild(cb);
    res.products.forEach(h => cb.appendChild(RSLP.productBlock(h, { q })));
    if (res.loose.length) {
      cb.appendChild(el('div', { class: 'sub', text: 'Raw materials not on any product' }));
      cb.appendChild(RSLP.materialsTable(res.loose, { q }));
    }
    host.appendChild(card);
  }

  /* ---- row drawer ------------------------------------------------------- */
  function openRow(c, e) {
    const q = $('#q').value.trim();
    const body = el('div');
    const pairs = [];
    if (c.hasSections !== false) pairs.push([c.sectionLabel || 'Section', RSL.esc(e.section || '—')]);
    c.columns.forEach(col => pairs.push([(col.group ? col.group + ' — ' : '') + col.label, RSL.cellHtml(col, e.values[col.key], q)]));
    pairs.push(['Saved', RSL.fmtWhen(e.updatedAt) + (e.sample ? ' <span class="st draft">sample</span>' : '')]);
    const kv = body.appendChild(el('div', { class: 'rsl-kv' })); UI.kv(kv, pairs);
    UI.drawer({
      title: RSL.entryTitle(c, e), body,
      actions: [
        el('button', { class: 'btn', text: 'Close', onclick: UI.closeDrawer }),
        el('button', { class: 'btn danger', text: 'Delete', onclick: () => { if (confirm('Delete this row?')) { RSL.deleteEntry(e.id); UI.closeDrawer(); RSL.toast('Row deleted'); run(); } } }),
        el('span', { class: 'spacer', style: 'flex:1' }),
        el('a', { class: 'btn primary', href: 'entry.html?id=' + e.id, text: 'Edit row' })
      ]
    });
  }

  /* ---- CSV -------------------------------------------------------------- */
  $('#btnCsv').addEventListener('click', () => {
    const withRows = lastResult.filter(p => p.rows.length);
    if (!withRows.length) { RSL.toast('Nothing to export', 'warn'); return; }
    withRows.forEach(p => RSL.download(p.cat.id + '-' + (($('#q').value.trim() || 'all').replace(/[^\w-]+/g, '_')) + '.csv', RSL.toCSV(p.cat, p.rows)));
    RSL.toast(withRows.length + ' CSV file' + (withRows.length > 1 ? 's' : '') + ' downloaded — one per category', 'ok');
  });

  /* ---- wiring ----------------------------------------------------------- */
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
  $('#scope').addEventListener('change', () => {
    $('#btnAdd').href = 'entry.html' + ($('#scope').value ? '?cat=' + $('#scope').value : '');
    $('#btnExcel').href = 'import.html' + ($('#scope').value ? '?ds=' + $('#scope').value : '');
    drawFilters(); run();
  });
  $('#mode').addEventListener('change', run);
  $('#scope').dispatchEvent(new Event('change'));
})();

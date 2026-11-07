/* ==========================================================================
   products-app.js — product and raw-material registers with one search.
   ?q=<text>  pre-filled search    ?open=<product id>  open its drawer
   ?tab=materials  start on the raw-material tab
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL' });

  if (RSL.param('q')) $('#q').value = RSL.param('q');
  if (RSL.param('tab') === 'materials') UI.$$('#tabs button')[1].classList.add('on');
  UI.tabs('#tabs');

  function draw() {
    const q = $('#q').value.trim();
    const res = RSL.searchProducts(q);
    const mats = RSL.searchMaterials(q);
    $('#cntP').textContent = res.products.length;
    $('#cntM').textContent = mats.length;
    const tagged = RSL.products().reduce((n, p) => n + RSL.materialsOf(p).length, 0);
    const listed = RSL.materials().filter(m => RSL.casList(m.cas).some(c => RSL.listHits(c).length)).length;
    UI.kpis('#kpis', [
      { label: q ? 'Matching products' : 'Products', value: String(res.products.length), accent: true, delta: q ? 'of ' + RSL.products().length : '' },
      { label: q ? 'Matching raw materials' : 'Raw materials', value: String(mats.length), delta: q ? 'of ' + RSL.materials().length : '' },
      { label: 'Raw-material tags', value: String(tagged) },
      { label: 'Raw materials with a listed CAS', value: String(listed), delta: 'CAS appears on a loaded list' }
    ]);

    /* products: each block lists its attached raw materials straight away */
    const host = $('#productList'); host.innerHTML = '';
    if (!res.products.length) host.appendChild(emptyState(q ? 'No product matches “' + q + '”' : 'No products yet', q ? 'Try a product code, raw material, supplier or CAS number.' : 'Create the first one with “+ New product”.'));
    res.products.forEach(h => {
      const block = RSLP.productBlock(h, { q, onMaterial: openMaterial });
      const open = el('button', { class: 'btn sm', type: 'button', text: 'Details', onclick: () => openProduct(h.product) });
      block.firstChild.appendChild(el('span', { class: 'spacer', style: 'flex:1' }));
      block.firstChild.appendChild(open);
      host.appendChild(block);
    });

    /* raw materials: each row lists the products it is tagged to */
    UI.table('#materialList', {
      search: false, sortable: false, pageSize: 25, rows: mats.map(x => Object.assign({ why: x.why }, x.m)),
      columns: [
        { k: 'code', label: 'Code', render: m => '<span class="rowlink">' + (q ? RSL.highlight(m.code, q) : RSL.esc(m.code)) + '</span>' },
        { k: 'name', label: 'Raw material', render: m => (q ? RSL.highlight(m.name, q) : RSL.esc(m.name)) + (m.why === 'listed' ? ' <span class="st info">contains a matching CAS</span>' : '') },
        { k: 'type', label: 'Type', render: m => RSL.esc(RSL.typeLabel(m.type) || '—') },
        { k: 'supplier', label: 'Supplier', render: m => RSL.esc(m.supplier || '—') },
        { k: 'cas', label: 'CAS numbers (rows on the lists)', render: m => RSLP.casCell(m, q) },
        { k: 'used', label: 'Used in products', render: m => usedIn(m) }
      ],
      emptyTitle: q ? 'No raw material matches' : 'No raw materials yet',
      emptyText: q ? 'Try a name, supplier or CAS number.' : 'Add one with “+ New raw material”.',
      onRow: openMaterial
    });
  }
  function usedIn(m) {
    const list = RSL.productsUsing(m.id);
    if (!list.length) return '<span class="st pending">Not on a product</span>';
    return list.map(p => '<a class="cat-chip" href="products.html?open=' + encodeURIComponent(p.id) + '" onclick="event.stopPropagation()">' + RSL.esc(p.code) + '</a>').join('');
  }
  const emptyState = (title, text) => el('div', { class: 'empty-state' }, [el('span', { class: 'ic', text: '\u{1F4E6}' }), el('h4', { text: title }), el('p', { text })]);

  /* ---- product drawer ---------------------------------------------------- */
  function openProduct(p) {
    const body = el('div');
    const mats = RSL.materialsOf(p);
    UI.kv(body.appendChild(el('div', { class: 'rsl-kv' })), [
      ['Product ID', RSL.esc(p.code)], ['Product name', RSL.esc(p.name)],
      ['Customer / buyer', RSL.esc(p.customer || '—')], ['Notes', RSL.esc(p.notes || '—')],
      ['Saved', RSL.fmtWhen(p.updatedAt)]
    ]);
    body.appendChild(el('div', { class: 'sub', text: 'Attached raw materials (' + mats.length + ')' }));
    if (!mats.length) body.appendChild(el('div', { class: 'hint', text: 'No raw materials tagged yet.' }));
    mats.forEach(m => body.appendChild(el('div', { class: 'mat-card' }, [
      el('div', { class: 'h' }, [el('b', { text: m.name }), el('span', { class: 'hint', text: m.code + (m.supplier ? ' · ' + m.supplier : '') })]),
      el('div', { html: RSLP.casCell(m) })])));
    if (mats.length) body.appendChild(el('div', { class: 'hint', style: 'margin-top:8px', text: 'The number beside a CAS chip is how many list rows name it. Being listed is not a verdict: the product check comes in a later step.' }));
    UI.drawer({ title: p.code + ' — ' + p.name, body, actions: [
      el('button', { class: 'btn', text: 'Close', onclick: UI.closeDrawer }),
      el('button', { class: 'btn danger', text: 'Delete', onclick: () => { if (confirm('Delete product ' + p.code + '? Its raw materials stay.')) { RSL.deleteProduct(p.id); UI.closeDrawer(); RSL.toast('Product deleted'); draw(); } } }),
      el('span', { class: 'spacer', style: 'flex:1' }),
      el('a', { class: 'btn', href: 'report.html?q=' + encodeURIComponent(p.code), text: 'Report' }),
      el('a', { class: 'btn primary', href: 'product-form.html?id=' + encodeURIComponent(p.id), text: 'Edit product' })
    ] });
  }

  /* ---- raw-material drawer ----------------------------------------------- */
  function openMaterial(row) {
    const m = RSL.material(row.id);
    const body = el('div');
    const used = RSL.productsUsing(m.id);
    UI.kv(body.appendChild(el('div', { class: 'rsl-kv' })), [
      ['Code', RSL.esc(m.code)], ['Type', RSL.esc(RSL.typeLabel(m.type) || '—')], ['Supplier', RSL.esc(m.supplier || '—')],
      ['CAS numbers', RSLP.casCell(m)], ['Notes', RSL.esc(m.notes || '—')],
      ['Used in', used.length ? used.map(p => '<a href="products.html?open=' + encodeURIComponent(p.id) + '">' + RSL.esc(p.code + ' — ' + p.name) + '</a>').join('<br>') : 'No product yet']
    ]);
    UI.drawer({ title: m.name, body, actions: [
      el('button', { class: 'btn', text: 'Close', onclick: UI.closeDrawer }),
      el('button', { class: 'btn danger', text: 'Delete', onclick: () => {
        const msg = used.length ? 'Delete ' + m.name + '? It is removed from ' + used.length + ' product' + (used.length > 1 ? 's' : '') + '.' : 'Delete ' + m.name + '?';
        if (confirm(msg)) { RSL.deleteMaterial(m.id); UI.closeDrawer(); RSL.toast('Raw material deleted'); draw(); } } }),
      el('span', { class: 'spacer', style: 'flex:1' }),
      el('button', { class: 'btn primary', text: 'Edit', onclick: () => RSLP.materialForm(m, draw) })
    ] });
  }

  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 120); });
  $('#btnMat').addEventListener('click', () => RSLP.materialForm(null, draw));
  draw();
  const toOpen = RSL.param('open') && RSL.product(RSL.param('open'));
  if (toOpen) openProduct(toOpen);
})();

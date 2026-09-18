/* ==========================================================================
   categories-app.js — register of substance-list categories.
   Reads RSL store; every action links to the builder / entry / data screens.
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL', links: [{ href: 'index.html', text: '← All screens' }] });

  function draw() {
    const cats = RSL.categories();
    const st = RSL.stats();
    UI.kpis('#kpis', [
      { label: 'Categories (lists)', value: String(st.categories), accent: true },
      { label: 'Substance rows',     value: String(st.entries) },
      { label: 'Section titles',     value: String(st.sections) },
      { label: 'Searchable by CAS',  value: cats.filter(c => c.columns.some(x => x.role === 'cas')).length + ' of ' + cats.length,
        delta: 'categories with a CAS column', dir: '' }
    ]);

    const rows = cats.map(c => {
      const ents = RSL.entries(c.id);
      const upd = ents.reduce((m, e) => e.updatedAt > m ? e.updatedAt : m, c.updatedAt || '');
      return { id: c.id, name: c.name, source: (c.source || '') + (c.version ? ' · ' + c.version : ''),
               cols: c.columns.length, sections: RSL.sections(c.id).length, rows: ents.length, updated: upd, cat: c };
    });

    UI.table('#list', {
      columns: [
        { k: 'name', label: 'Category', render: r => '<span class="rowlink">' + RSL.esc(r.name) + '</span><div class="hint">' + RSL.esc(r.source) + '</div>' },
        { k: 'cols', label: 'Columns', render: r => r.cat.columns.map(c =>
            '<span class="cat-chip ' + (c.role || '') + '" title="' + RSL.esc(c.type + (c.role ? ' · ' + c.role : '')) + '">' + RSL.esc(c.label.length > 28 ? c.label.slice(0, 26) + '…' : c.label) + '</span>').join('') },
        { k: 'sections', label: 'Sections', num: true },
        { k: 'rows', label: 'Rows', num: true },
        { k: 'updated', label: 'Last updated', render: r => RSL.fmtWhen(r.updated) },
        { k: 'act', label: '', render: r =>
            '<div class="row-actions">' +
            '<a class="btn sm primary" href="entry.html?cat=' + r.id + '" onclick="event.stopPropagation()">+ Add row</a>' +
            '<a class="btn sm" href="data.html?cat=' + r.id + '" onclick="event.stopPropagation()">Data table</a>' +
            '<a class="btn sm" href="category-form.html?id=' + r.id + '" onclick="event.stopPropagation()">Edit columns</a>' +
            '<a class="btn sm" href="category-form.html?copy=' + r.id + '" onclick="event.stopPropagation()" title="New category starting from these columns">Copy</a>' +
            '<button class="btn sm danger" type="button" data-del="' + r.id + '">Delete</button>' +
            '</div>' }
      ],
      rows, sortable: false, pageSize: 25,
      searchPlaceholder: 'Filter categories…',
      emptyTitle: 'No categories yet', emptyText: 'Create the first one with “+ New category”.',
      onRow: r => openDrawer(r.cat)
    });

    UI.$$('button[data-del]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const c = RSL.category(b.dataset.del); const n = RSL.entries(c.id).length;
      const msg = n ? 'Delete “' + c.name + '” AND its ' + n + ' row' + (n > 1 ? 's' : '') + '? This cannot be undone.'
                    : 'Delete the empty category “' + c.name + '”?';
      if (confirm(msg)) { RSL.deleteCategory(c.id); RSL.toast('Category deleted'); draw(); }
    }));
  }

  function openDrawer(c) {
    const body = el('div');
    const kv = body.appendChild(el('div', { class: 'rsl-kv' }));
    const pc = RSL.primaryCols(c);
    UI.kv(kv, [
      ['Source document', RSL.esc(c.source || '—') + (c.version ? ' <span class="st info">' + RSL.esc(c.version) + '</span>' : '')],
      ['Description', RSL.esc(c.description || '—')],
      ['Section title', c.hasSections ? RSL.esc(c.sectionLabel || 'Section') : '<span class="hint">rows are not grouped</span>'],
      ['CAS column', pc.cas ? RSL.esc(pc.cas.label) : '<span class="st pending">none — CAS search disabled</span>'],
      ['Name column', pc.name ? RSL.esc(pc.name.label) : '<span class="st rejected">none</span>'],
      ['Rows', String(RSL.entries(c.id).length)],
      ['Sections', RSL.sections(c.id).map(RSL.esc).join('<br>') || '—']
    ]);
    body.appendChild(el('div', { class: 'sub', text: 'Column layout preview' }));
    const pv = body.appendChild(el('div'));
    RSL.renderTable(pv, c, [], { emptyTitle: 'Header only', emptyText: 'This is how the data table for this category reads.' });
    UI.drawer({
      title: c.name, body,
      actions: [
        el('button', { class: 'btn', text: 'Close', onclick: UI.closeDrawer }),
        el('a', { class: 'btn', href: 'category-form.html?id=' + c.id, text: 'Edit columns' }),
        el('a', { class: 'btn', href: 'data.html?cat=' + c.id, text: 'Data table' }),
        el('a', { class: 'btn primary', href: 'entry.html?cat=' + c.id, text: '+ Add row' })
      ]
    });
  }

  draw();
})();

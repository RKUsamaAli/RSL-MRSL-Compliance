/* ==========================================================================
   category-form-app.js — category builder (create / edit / copy).
   ?id=<cat>    edit an existing category (keys of existing columns are kept)
   ?copy=<cat>  new category starting from another one's columns
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL', links: [{ href: 'index.html', text: '← All screens' }, { href: 'categories.html', text: 'Categories' }] });

  const editId = RSL.param('id');
  const copyId = RSL.param('copy');
  const base = editId ? RSL.category(editId) : (copyId ? RSL.category(copyId) : null);
  const isEdit = !!(editId && base);
  const usedRows = isEdit ? RSL.entries(base.id).length : 0;

  /* working copy of the column list — the payload spec */
  let cols = base ? JSON.parse(JSON.stringify(base.columns)) : [
    { key: 'cas',  label: 'CAS Number',    type: 'multiline', role: 'cas',  width: 'sm' },
    { key: 'name', label: 'Chemical Name', type: 'multiline', role: 'name', width: 'md', required: true }
  ];
  if (copyId && !isEdit) cols.forEach(c => { c.key = RSL.slug(c.label); });

  /* ---- header ----------------------------------------------------------- */
  UI.recordHeader('#recordHeader', {
    title: isEdit ? base.name : (copyId && base ? 'Copy of ' + base.name : 'New substance-list category'),
    badges: [{ t: isEdit ? base.id : 'new', c: 'mr' }],
    status: isEdit ? 'Editing' : 'Draft', statusClass: isEdit ? 'info' : 'draft',
    chips: isEdit ? [['\u{1F4C4}', (base.source || '—') + (base.version ? ' · ' + base.version : '')], ['\u{1F4CB}', usedRows + ' row' + (usedRows === 1 ? '' : 's') + ' already entered']] : [],
    meta: isEdit && usedRows ? '<span class="st pending">Existing rows keep their data — renaming a heading is safe, deleting a column hides its data</span>' : ''
  });
  $('#pageTitle').textContent = isEdit ? 'Edit category columns' : 'New category';

  /* ---- details ---------------------------------------------------------- */
  if (base) {
    $('#fName').value = isEdit ? base.name : 'Copy of ' + base.name;
    $('#fSource').value = base.source || ''; $('#fVersion').value = base.version || '';
    $('#fHasSections').value = base.hasSections === false ? 'no' : 'yes';
    $('#fSectionLabel').value = base.sectionLabel || ''; $('#fDesc').value = base.description || '';
  }
  function syncKey() { $('#fKey').value = isEdit ? base.id : RSL.slug($('#fName').value); }
  $('#fName').addEventListener('input', syncKey); syncKey();
  $('#fHasSections').addEventListener('change', () => { $('#fSectionLabel').disabled = $('#fHasSections').value === 'no'; });
  $('#fHasSections').dispatchEvent(new Event('change'));

  /* ---- quick start ------------------------------------------------------ */
  RSL.categories().filter(c => !isEdit || c.id !== base.id).forEach(c =>
    $('#fCopyFrom').appendChild(el('option', { value: c.id, text: c.name })));
  Object.keys(CFG.columnPresets).forEach(k =>
    $('#fPreset').appendChild(el('option', { value: k, text: CFG.columnPresets[k].t })));
  const guessRole = label => /\bcas\b/i.test(label) ? 'cas' : /\bec\s*(no|number)\b/i.test(label) ? 'ec'
    : /(chemical name|substance name|^substance$|^name$|chemical)/i.test(label) ? 'name' : '';
  function replaceCols(list, why) {
    if (cols.length && !confirm('Replace the current ' + cols.length + ' column(s) with ' + list.length + ' from ' + why + '?')) return false;
    cols = list; drawCols(); return true;
  }
  $('#fCopyFrom').addEventListener('change', function () {
    const c = RSL.category(this.value); if (!c) return;
    replaceCols(JSON.parse(JSON.stringify(c.columns)).map(x => { x.key = RSL.slug(x.label); return x; }), '“' + c.name + '”');
    this.value = '';
  });
  $('#fPreset').addEventListener('change', function () {
    const p = CFG.columnPresets[this.value]; if (!p) return;
    replaceCols(p.columns.map(x => Object.assign({ key: RSL.slug(x.label) }, x)), 'the template');
    this.value = '';
  });
  $('#fPaste').addEventListener('change', function () {
    const parts = this.value.split(/\t|,|\|/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) { RSL.toast('Paste at least two headings separated by tabs or commas', 'warn'); return; }
    replaceCols(parts.map(label => ({ key: RSL.slug(label), label, type: label.length > 24 ? 'multiline' : 'text',
      role: guessRole(label), width: label.length > 40 ? 'lg' : label.length > 16 ? 'md' : 'sm', required: guessRole(label) === 'name' })), 'the pasted header row');
    this.value = '';
  });

  /* ---- column builder --------------------------------------------------- */
  const opt = (list, v) => list.map(o => el('option', { value: o.v, text: o.t, selected: o.v === (v || '') ? '' : null }));
  function drawCols() {
    const host = $('#cols'); host.innerHTML = '';
    cols.forEach((c, i) => {
      const row = el('div', { class: 'colb-row role-' + (c.role || 'none') });
      row.appendChild(el('div', { class: 'n', text: i + 1 }));
      const lab = el('input', { type: 'text', value: c.label || '', placeholder: 'Heading' });
      lab.addEventListener('input', () => { c.label = lab.value; if (!c._keyLocked) c.key = RSL.slug(c.label); preview(); });
      row.appendChild(lab);
      const ty = el('select', {}, opt(CFG.columnTypes, c.type)); ty.addEventListener('change', () => { c.type = ty.value; preview(); }); row.appendChild(ty);
      const ro = el('select', {}, opt(CFG.columnRoles, c.role)); ro.addEventListener('change', () => { c.role = ro.value; drawCols(); }); row.appendChild(ro);
      const gr = el('input', { type: 'text', value: c.group || '', placeholder: 'e.g. Wastewater' }); gr.addEventListener('input', () => { c.group = gr.value.trim(); preview(); }); row.appendChild(gr);
      const wd = el('select', {}, opt(CFG.widths, c.width || 'md')); wd.addEventListener('change', () => { c.width = wd.value; preview(); }); row.appendChild(wd);
      const rq = el('input', { type: 'checkbox', checked: c.required ? '' : null, title: 'Row cannot be saved without this' }); rq.addEventListener('change', () => { c.required = rq.checked; }); row.appendChild(rq);
      const mv = el('div', { class: 'mv' }, [
        el('span', { class: 'icon-btn', text: '↑', title: 'Move up', onclick: () => { if (i > 0) { cols.splice(i - 1, 0, cols.splice(i, 1)[0]); drawCols(); } } }),
        el('span', { class: 'icon-btn', text: '↓', title: 'Move down', onclick: () => { if (i < cols.length - 1) { cols.splice(i + 1, 0, cols.splice(i, 1)[0]); drawCols(); } } }),
        el('span', { class: 'icon-btn del', text: '✕', title: 'Remove column', onclick: () => {
          if (isEdit && usedRows && !confirm('Remove “' + c.label + '”? Data already entered in this column will no longer be shown.')) return;
          cols.splice(i, 1); drawCols(); } })
      ]);
      row.appendChild(mv);
      host.appendChild(row);
    });
    /* existing categories: keep the original keys stable even if headings are renamed */
    if (isEdit) cols.forEach(c => { c._keyLocked = !!c.key; });
    preview();
  }
  $('#btnAddCol').addEventListener('click', () => {
    cols.push({ key: 'col-' + (cols.length + 1), label: '', type: 'text', role: '', width: 'md' });
    drawCols(); const ins = UI.$$('#cols .colb-row input[type=text]'); if (ins.length) ins[ins.length - 2].focus();
  });

  function currentCat() {
    return {
      id: isEdit ? base.id : RSL.slug($('#fName').value) || RSL.newId('cat'),
      name: $('#fName').value.trim(), source: $('#fSource').value.trim(), version: $('#fVersion').value.trim(),
      description: $('#fDesc').value.trim(),
      hasSections: $('#fHasSections').value === 'yes', sectionLabel: $('#fSectionLabel').value.trim() || 'Section',
      columns: cols.filter(c => c.label).map(c => ({ key: c.key || RSL.slug(c.label), label: c.label.trim(), type: c.type || 'text',
        role: c.role || '', group: c.group || '', width: c.width || 'md', required: !!c.required })),
      createdAt: base && isEdit ? base.createdAt : undefined
    };
  }
  function preview() {
    const c = currentCat();
    if (!c.columns.length) { $('#preview').innerHTML = '<div class="grid-empty"><b>No columns yet</b>Add at least a CAS column and a name column.</div>'; return; }
    RSL.renderTable('#preview', c, [], { emptyTitle: 'Header only', emptyText: 'Rows appear here once entered.' });
  }

  /* ---- validation + save ------------------------------------------------ */
  function issues() {
    const out = []; const c = currentCat();
    if (!c.name) out.push({ sec: '1', msg: 'Category name is required', el: $('#fName') });
    if (!isEdit && RSL.category(c.id)) out.push({ sec: '1', msg: 'A category with the key “' + c.id + '” already exists — change the name', el: $('#fName') });
    if (!c.columns.length) out.push({ sec: '2', msg: 'Add at least one column', el: $('#cols') });
    const names = c.columns.filter(x => x.role === 'name'), cas = c.columns.filter(x => x.role === 'cas');
    if (names.length !== 1) out.push({ sec: '2', msg: 'Exactly one column must have the role “Chemical / substance name” (found ' + names.length + ')', el: $('#cols') });
    if (cas.length > 1) out.push({ sec: '2', msg: 'Only one column can be the CAS number column (found ' + cas.length + ')', el: $('#cols') });
    const labels = c.columns.map(x => x.label.toLowerCase());
    labels.forEach((l, i) => { if (labels.indexOf(l) !== i) out.push({ sec: '2', msg: 'Duplicate heading “' + c.columns[i].label + '”', el: $('#cols') }); });
    const keys = c.columns.map(x => x.key);
    keys.forEach((k, i) => { if (keys.indexOf(k) !== i) c.columns[i].key = k + '-' + (i + 1); });
    cols.filter(x => !x.label).length && out.push({ sec: '2', msg: (cols.filter(x => !x.label).length) + ' column row(s) have no heading — fill or remove them', el: $('#cols') });
    return out;
  }
  $('#btnSave').addEventListener('click', () => {
    const list = issues();
    if (list.length) { UI.showIssues(list); RSL.toast('Please fix the highlighted items', 'warn'); return; }
    const c = currentCat();
    const cas = c.columns.some(x => x.role === 'cas');
    if (!cas && !confirm('No column is marked as the CAS number. Search by CAS will not work for this category. Save anyway?')) return;
    RSL.saveCategory(c);
    location.href = 'categories.html?saved=' + encodeURIComponent(c.id);
  });

  UI.changeNotes('#btnNotes');
  drawCols();
})();

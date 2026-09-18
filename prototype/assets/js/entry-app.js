/* ==========================================================================
   entry-app.js — one row at a time, against the selected category's columns.
   ?cat=<id>   pre-select a category      ?id=<entry>  edit an existing row
   The form is generated from cat.columns; nothing here knows the headings.
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL', links: [{ href: 'index.html', text: '← All screens' }, { href: 'categories.html', text: 'Categories' }] });

  const cats = RSL.categories();
  const editing = RSL.param('id') ? RSL.entry(RSL.param('id')) : null;
  let cat = editing ? RSL.category(editing.cat) : (RSL.category(RSL.param('cat')) || cats[0] || null);
  let values = {};   /* live payload — mirrors UI.store */
  let sectionKeep = editing ? editing.section : (RSL.param('section') || '');

  /* ---- header ----------------------------------------------------------- */
  function header() {
    const n = cat ? RSL.entries(cat.id).length : 0;
    $('#recordHeader').innerHTML = '';
    UI.recordHeader('#recordHeader', {
      title: cat ? cat.name : 'No category selected',
      badges: cat ? [{ t: cat.id, c: 'mr' }] : [],
      status: editing ? 'Editing row' : 'New row', statusClass: editing ? 'info' : 'draft',
      chips: cat ? [['\u{1F4C4}', (cat.source || '—') + (cat.version ? ' · ' + cat.version : '')],
                    ['\u{1F4CB}', n + ' row' + (n === 1 ? '' : 's') + ' so far'],
                    ['\u{1F5C2}', RSL.sections(cat.id).length + ' section title' + (RSL.sections(cat.id).length === 1 ? '' : 's')]] : [],
      meta: cat ? 'Primary search columns: <b>' + RSL.esc((RSL.primaryCols(cat).cas || {}).label || 'no CAS column') + '</b> · <b>' + RSL.esc((RSL.primaryCols(cat).name || {}).label || '?') + '</b>' : ''
    });
    $('#pageTitle').textContent = editing ? 'Edit substance row' : 'Add substance row';
    $('#lnkTable').href = 'data.html' + (cat ? '?cat=' + cat.id : '');
    $('#btnCancel').style.display = editing ? '' : 'none';
    if (editing) { $('#btnCancel').href = 'data.html?cat=' + cat.id; $('#btnSaveNext').textContent = 'Save changes'; }
  }

  /* ---- category picker -------------------------------------------------- */
  const sel = $('#fCat');
  cats.forEach(c => sel.appendChild(el('option', { value: c.id, text: c.name })));
  if (!cats.length) { $('#noCats').style.display = ''; $('#sec-2').style.display = 'none'; $('#sec-3').style.display = 'none'; UI.$$('.actionbar button').forEach(b => b.disabled = true); }
  if (cat) sel.value = cat.id;
  if (editing) sel.disabled = true;
  sel.addEventListener('change', () => { cat = RSL.category(sel.value); values = {}; sectionKeep = ''; build(); });

  /* ---- form builder ----------------------------------------------------- */
  function field(c) {
    const f = el('div', { class: 'field' + (c.type === 'multiline' ? ' span2' : '') });
    const lab = el('label', { class: c.required ? 'req' : '', text: c.label });
    if (c.group) lab.appendChild(el('span', { class: 'hint', text: '— ' + c.group }));
    if (c.role === 'cas') lab.appendChild(el('span', { class: 'hint', text: '— one CAS number per line; free text allowed' }));
    if (c.role === 'name') lab.appendChild(el('span', { class: 'hint', text: '— primary search field' }));
    f.appendChild(lab);
    let input;
    const cur = values[c.key] === undefined ? '' : values[c.key];
    if (c.type === 'flag') {
      input = el('select', {}, [el('option', { value: '', text: '— not marked —' }), el('option', { value: 'yes', text: 'X  (yes)' }), el('option', { value: 'no', text: 'No' })]);
      input.value = cur;
    } else if (c.type === 'multiline' || c.role === 'cas') {
      input = el('textarea', { rows: c.role === 'cas' ? 3 : (c.width === 'lg' ? 4 : 3) }); input.value = cur;
    } else {
      input = el('input', { type: c.type === 'number' ? 'number' : 'text', step: c.type === 'number' ? 'any' : null }); input.value = cur;
    }
    input.dataset.key = c.key; if (c.required) input.dataset.required = '1';
    input.addEventListener('input', () => { values[c.key] = input.value; UI.store.dirty = true; if (c.role === 'cas') casFeedback(c, input); f.classList.remove('has-error'); });
    input.addEventListener('change', () => { values[c.key] = input.value; });
    f.appendChild(input);
    f.appendChild(el('span', { class: 'err-msg', text: 'Required' }));
    if (c.role === 'cas') {
      f.appendChild(el('div', { class: 'cas-check', id: 'casCheck' }));
      f.appendChild(el('div', { class: 'cas-legend', html: '<span><span class="cas valid">1234-56-7</span> check digit OK</span><span><span class="cas checksum">1234-56-8</span> check digit wrong — saved anyway, please verify</span><span><span class="cas text">Various</span> free text</span>' }));
      setTimeout(() => casFeedback(c, input), 0);
    }
    return f;
  }

  function casFeedback(c, input) {
    const host = $('#casCheck'); if (!host) return;
    host.innerHTML = '';
    const list = RSL.casList(input.value);
    list.forEach(x => host.appendChild(el('span', { class: 'cas ' + RSL.casStatus(x), text: x })));
    /* duplicate warning — same CAS already in this category */
    const w = $('#dupWarn'); w.style.display = 'none'; w.innerHTML = '';
    if (!CFG.settings.duplicateCasWarning || !cat) return;
    const mine = list.filter(x => RSL.casStatus(x) !== 'text').map(x => x.replace(/\s+/g, ''));
    if (!mine.length) return;
    const dups = RSL.entries(cat.id).filter(e => (!editing || e.id !== editing.id) &&
      RSL.casList(e.values[c.key]).some(y => mine.includes(y.replace(/\s+/g, ''))));
    if (dups.length) {
      w.style.display = '';
      w.innerHTML = '<b>Already in this category:</b> the same CAS number appears on ' + dups.length + ' existing row' + (dups.length > 1 ? 's' : '') + '. You can still save — this is a warning, not a block.<ul>' +
        dups.map(e => '<li><a href="entry.html?id=' + e.id + '">' + RSL.esc(RSL.entryTitle(cat, e)) + '</a> <span class="hint">— ' + RSL.esc(e.section || '') + '</span></li>').join('') + '</ul>';
    }
  }

  function build() {
    header();
    if (!cat) return;
    $('#catInfo').innerHTML = RSL.esc(cat.description || '') ;
    $('#colCount').textContent = cat.columns.length + ' columns';
    const host = $('#fields'); host.innerHTML = '';
    if (editing && !Object.keys(values).length) values = JSON.parse(JSON.stringify(editing.values));

    /* section title */
    if (cat.hasSections !== false) {
      const f = el('div', { class: 'field span2' });
      f.appendChild(el('label', { class: CFG.settings.requireSectionTitle ? 'req' : '', text: cat.sectionLabel || 'Section' },
        [el('span', { class: 'hint', text: '— the heading printed above this row in the document; pick an existing one or type a new one' })]));
      const dl = el('datalist', { id: 'dlSections' }); RSL.sections(cat.id).forEach(s => dl.appendChild(el('option', { value: s })));
      const inp = el('input', { type: 'text', id: 'fSection', list: 'dlSections', placeholder: RSL.sections(cat.id)[0] ? 'e.g. ' + RSL.sections(cat.id)[0] : 'e.g. AP and APEO', value: sectionKeep });
      if (CFG.settings.requireSectionTitle) inp.dataset.required = '1';
      inp.addEventListener('input', () => { sectionKeep = inp.value; f.classList.remove('has-error'); });
      f.appendChild(inp); f.appendChild(dl); f.appendChild(el('span', { class: 'err-msg', text: 'Required' }));
      const chips = el('div', { class: 'chipset', style: 'margin-top:6px' });
      RSL.sections(cat.id).slice(0, 8).forEach(s => chips.appendChild(el('span', { class: 'pill' + (s === sectionKeep ? ' on' : ''), text: s, onclick: () => { inp.value = s; sectionKeep = s; UI.$$('.pill', chips).forEach(p => p.classList.toggle('on', p.textContent === s)); } })));
      if (RSL.sections(cat.id).length) f.appendChild(chips);
      host.appendChild(f);
    }
    /* primary columns first, in schema order otherwise */
    cat.columns.forEach(c => host.appendChild(field(c)));
    recent();
  }

  /* ---- recent rows ------------------------------------------------------ */
  function recent() {
    const rows = RSL.entries(cat.id).slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 8);
    $('#recentCount').textContent = RSL.entries(cat.id).length + ' total';
    const pc = RSL.primaryCols(cat);
    UI.table('#recent', {
      search: false, sortable: false, pageSize: 8,
      columns: [
        { k: 'name', label: (pc.name || {}).label || 'Name', render: r => '<span class="rowlink">' + RSL.esc(RSL.entryTitle(cat, r)) + '</span>' },
        { k: 'cas', label: (pc.cas || {}).label || 'CAS', render: r => pc.cas ? RSL.cellHtml(pc.cas, r.values[pc.cas.key]) : '—' },
        { k: 'section', label: cat.sectionLabel || 'Section', render: r => RSL.esc(r.section || '—') },
        { k: 'updatedAt', label: 'Saved', render: r => RSL.fmtWhen(r.updatedAt) + (r.sample ? ' <span class="st draft">sample</span>' : '') },
        { k: 'a', label: '', render: r => '<a class="btn sm" href="entry.html?id=' + r.id + '" onclick="event.stopPropagation()">Edit</a> <button class="btn sm danger" data-del="' + r.id + '">Delete</button>' }
      ],
      rows, emptyTitle: 'No rows yet', emptyText: 'The first row you save appears here.',
      onRow: r => location.href = 'data.html?cat=' + cat.id + '&q=' + encodeURIComponent(RSL.entryTitle(cat, r).split(' ')[0])
    });
    UI.$$('#recent button[data-del]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      if (confirm('Delete this row?')) { RSL.deleteEntry(b.dataset.del); RSL.toast('Row deleted'); build(); }
    }));
  }

  /* ---- save ------------------------------------------------------------- */
  function collect() {
    const issues = [];
    UI.$$('#fields [data-required]').forEach(i => {
      if (!String(i.value || '').trim()) { i.closest('.field').classList.add('has-error'); issues.push({ sec: '2', msg: i.closest('.field').querySelector('label').firstChild.textContent + ' is required', el: i }); }
    });
    const pc = RSL.primaryCols(cat);
    const hasCas = pc.cas && String(values[pc.cas.key] || '').trim();
    const hasName = pc.name && String(values[pc.name.key] || '').trim();
    if (!hasCas && !hasName) issues.push({ sec: '2', msg: 'Enter at least a CAS number or a chemical name — otherwise the row can never be found', el: $('#fields') });
    return issues;
  }
  function save(next) {
    const issues = collect();
    if (issues.length) { UI.showIssues(issues); RSL.toast('Please complete the highlighted fields', 'warn'); return; }
    UI.showIssues([]);
    const e = editing || { id: null, cat: cat.id };
    e.section = ($('#fSection') || {}).value || ''; e.values = JSON.parse(JSON.stringify(values)); delete e.sample;
    RSL.saveEntry(e);
    UI.store.dirty = false;
    if (!next) { location.href = 'data.html?cat=' + cat.id + '&q=' + encodeURIComponent(RSL.entryTitle(cat, e).split(/\s+/)[0]); return; }
    if (editing) { location.href = 'data.html?cat=' + cat.id; return; }
    RSL.toast('Saved: ' + RSL.entryTitle(cat, e) + ' — add the next row', 'ok');
    $('#saveState').textContent = 'Last saved ' + RSL.fmtWhen(e.updatedAt) + ' · ' + RSL.entryTitle(cat, e);
    values = {}; build();
    const first = UI.$$('#fields textarea, #fields input:not(#fSection), #fields select').find(i => i.dataset.key);
    if (first) first.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#btnSaveNext').addEventListener('click', () => save(true));
  $('#btnSaveView').addEventListener('click', () => save(false));
  window.addEventListener('keydown', ev => { if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') save(true); });

  UI.changeNotes('#btnNotes');
  build();
})();

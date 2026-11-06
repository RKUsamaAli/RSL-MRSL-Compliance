/* ==========================================================================
   rsl-products.js — product / raw-material pieces shared by the screens:
   the attached-materials block, the search result block, the raw-material
   form. Store and search rules live in rsl-common.js.
   ========================================================================== */
window.RSLP = (function () {
  const { el } = UI;
  const esc = s => RSL.esc(s);

  /* CAS chips of a raw material; each links to the search and says how many
     list rows name that number. */
  function casCell(m, q) {
    const list = RSL.casList(m.cas);
    if (!list.length) return '<span class="muted">None declared</span>';
    return list.map(c => {
      const n = RSL.listHits(c).length, st = RSL.casStatus(c);
      return '<a class="cas-link" href="data.html?q=' + encodeURIComponent(c) + '" onclick="event.stopPropagation()" title="' +
        (n ? 'Open the ' + n + ' list row' + (n === 1 ? '' : 's') + ' naming this number' : 'Not on any loaded list') + '">' +
        '<span class="cas ' + st + '">' + (q ? RSL.highlight(c, q) : esc(c)) + '</span>' +
        (n ? '<span class="hit-count">' + n + '</span>' : '') + '</a>';
    }).join('');
  }

  /* Table of the raw materials attached to a product. why[id] marks matches. */
  function materialsTable(mats, opts) {
    opts = opts || {};
    const q = opts.q || '';
    if (!mats.length) return el('div', { class: 'hint', text: 'No raw materials tagged yet.' });
    const t = el('table', { class: 'ltable att-table' });
    t.appendChild(el('thead', {}, [el('tr', {}, ['Code', 'Raw material', 'Type', 'Supplier', 'CAS numbers (rows on the lists)'].map(h => el('th', { text: h })))]));
    const tb = t.appendChild(el('tbody'));
    mats.forEach(x => {
      const m = x.m || x;
      const tr = el('tr', { class: x.why ? 'hit' : '' });
      tr.appendChild(el('td', { html: q ? RSL.highlight(m.code, q) : esc(m.code) }));
      tr.appendChild(el('td', { html: (q ? RSL.highlight(m.name, q) : esc(m.name)) + (x.why === 'listed' ? ' <span class="st info">contains a matching CAS</span>' : '') }));
      tr.appendChild(el('td', { text: RSL.typeLabel(m.type) || '—' }));
      tr.appendChild(el('td', { html: m.supplier ? (q ? RSL.highlight(m.supplier, q) : esc(m.supplier)) : '<span class="muted">—</span>' }));
      tr.appendChild(el('td', { html: casCell(m, q) }));
      if (opts.onMaterial) { tr.style.cursor = 'pointer'; tr.addEventListener('click', () => opts.onMaterial(m)); }
      tb.appendChild(tr);
    });
    return el('div', { class: 'ltable-wrap' }, [t]);
  }

  /* One block per product: heading + its attached raw materials. */
  function productBlock(hit, opts) {
    opts = opts || {};
    const p = hit.product, q = opts.q || '';
    const head = el('div', { class: 'pb-head' }, [
      el('a', { class: 'rowlink', href: 'products.html?open=' + encodeURIComponent(p.id), html: (q ? RSL.highlight(p.code, q) : esc(p.code)) + ' — ' + (q ? RSL.highlight(p.name, q) : esc(p.name)) }),
      p.customer ? el('span', { class: 'tag', text: p.customer }) : null,
      el('span', { class: 'hint', text: hit.mats.length + ' raw material' + (hit.mats.length === 1 ? '' : 's') + ' attached' })
    ]);
    return el('div', { class: 'prod-block' }, [head, materialsTable(hit.mats, { q, onMaterial: opts.onMaterial })]);
  }

  /* Raw material add / edit in a drawer. */
  function materialForm(mat, onSaved) {
    const m = mat ? JSON.parse(JSON.stringify(mat)) : { code: RSL.nextMaterialCode(), name: '', type: 'dye', supplier: '', cas: '', notes: '' };
    const body = el('div');
    const field = (label, input, req, hint) => {
      const f = el('div', { class: 'field' }, [el('label', { class: req ? 'req' : '', text: label })]);
      f.appendChild(input);
      if (hint) f.appendChild(hint);
      f.appendChild(el('span', { class: 'err-msg', text: 'Required' }));
      body.appendChild(f); return f;
    };
    const code = el('input', { type: 'text', value: m.code || '' });
    const name = el('input', { type: 'text', value: m.name || '' });
    const type = el('select', {}, CFG.materialTypes.map(t => el('option', { value: t.v, text: t.t })));
    type.value = m.type || 'other';
    const sup = el('input', { type: 'text', value: m.supplier || '' });
    const cas = el('textarea', { rows: 4 }); cas.value = m.cas || '';
    const chk = el('div', { class: 'cas-check' });
    const drawChk = () => { chk.innerHTML = ''; RSL.casList(cas.value).forEach(x => chk.appendChild(el('span', { class: 'cas ' + RSL.casStatus(x), text: x }))); };
    cas.addEventListener('input', drawChk); drawChk();
    const notes = el('textarea', { rows: 2 }); notes.value = m.notes || '';
    const fCode = field('Code', code, true);
    const fName = field('Raw material name', name, true);
    field('Type', type);
    field('Supplier', sup);
    field('CAS numbers', cas, false, chk);
    field('Notes', notes);

    function save() {
      fCode.classList.remove('has-error'); fName.classList.remove('has-error');
      let ok = true;
      if (!code.value.trim()) { fCode.classList.add('has-error'); ok = false; }
      if (!name.value.trim()) { fName.classList.add('has-error'); ok = false; }
      const clash = RSL.materialByCode(code.value);
      if (clash && clash.id !== m.id) { fCode.classList.add('has-error'); fCode.querySelector('.err-msg').textContent = 'Already used by ' + clash.name; ok = false; }
      if (!ok) return;
      const list = RSL.casList(cas.value);
      Object.assign(m, { code: code.value.trim(), name: name.value.trim(), type: type.value, supplier: sup.value.trim(),
        cas: list.every(x => RSL.casStatus(x) !== 'text') ? list.join('\n') : cas.value.trim(), notes: notes.value.trim() });
      const saved = RSL.saveMaterial(m);
      UI.closeDrawer();
      RSL.toast('Saved: ' + saved.name, 'ok');
      if (onSaved) onSaved(saved);
    }
    UI.drawer({ title: mat ? 'Edit raw material' : 'New raw material', body, actions: [
      el('button', { class: 'btn', text: 'Cancel', onclick: UI.closeDrawer }),
      el('span', { class: 'spacer', style: 'flex:1' }),
      el('button', { class: 'btn primary', id: 'btnSaveMat', text: 'Save raw material', onclick: save })
    ] });
    setTimeout(() => name.focus(), 50);
  }

  return { casCell, materialsTable, productBlock, materialForm };
})();

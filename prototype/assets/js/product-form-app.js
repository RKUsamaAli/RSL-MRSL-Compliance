/* ==========================================================================
   product-form-app.js — create / edit a product and tag its raw materials.
   ?id=<product>  edit an existing product
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL' });

  const editing = RSL.param('id') ? RSL.product(RSL.param('id')) : null;
  const tagged = editing ? (editing.materials || []).slice() : [];   /* material ids */
  if (editing) {
    $('#pageTitle').textContent = 'Edit product ' + editing.code;
    $('#fCode').value = editing.code; $('#fName').value = editing.name;
    $('#fCustomer').value = editing.customer || ''; $('#fNotes').value = editing.notes || '';
  }

  function drawTagged() {
    const host = $('#tagged'); host.innerHTML = '';
    const mats = tagged.map(RSL.material).filter(Boolean);
    $('#matCount').textContent = mats.length + ' tagged';
    if (!mats.length) {
      host.appendChild(el('div', { class: 'empty-state' }, [el('span', { class: 'ic', text: '\u{1F9EA}' }), el('h4', { text: 'No raw materials tagged' }), el('p', { text: 'Use “Tag raw materials” to pick from the register, or create a new one.' })]));
      return;
    }
    mats.forEach(m => host.appendChild(el('div', { class: 'mat-card row' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 'h' }, [el('b', { text: m.name }), el('span', { class: 'hint', text: m.code + (m.supplier ? ' · ' + m.supplier : '') })]),
        el('div', { html: RSLP.casCell(m) })]),
      el('button', { class: 'icon-btn del', type: 'button', title: 'Remove tag', text: '✕', onclick: () => { tagged.splice(tagged.indexOf(m.id), 1); drawTagged(); } })
    ])));
  }

  $('#btnTag').addEventListener('click', () => {
    const catalogue = RSL.materials().map(m => ({ id: m.id, label: m.code + ' — ' + m.name, group: RSL.typeLabel(m.type) || 'Other' }));
    UI.openPicker('Tag raw materials', catalogue, tagged.slice(), ids => { tagged.length = 0; ids.forEach(i => tagged.push(i)); drawTagged(); });
  });
  $('#btnNewMat').addEventListener('click', () => RSLP.materialForm(null, m => { tagged.push(m.id); drawTagged(); }));

  $('#btnSave').addEventListener('click', () => {
    const issues = [];
    const code = $('#fCode'), name = $('#fName');
    [code, name].forEach(i => i.closest('.field').classList.remove('has-error'));
    $('#codeErr').textContent = 'Required';
    if (!code.value.trim()) { code.closest('.field').classList.add('has-error'); issues.push({ msg: 'Product ID is required', el: code }); }
    const clash = code.value.trim() && RSL.productByCode(code.value);
    if (clash && (!editing || clash.id !== editing.id)) {
      code.closest('.field').classList.add('has-error'); $('#codeErr').textContent = 'Already used by ' + clash.name;
      issues.push({ msg: 'Product ID ' + code.value.trim() + ' is already used', el: code });
    }
    if (!name.value.trim()) { name.closest('.field').classList.add('has-error'); issues.push({ msg: 'Product name is required', el: name }); }
    UI.showIssues(issues);
    if (issues.length) return;
    const p = editing ? JSON.parse(JSON.stringify(editing)) : { id: null };
    Object.assign(p, { code: code.value.trim(), name: name.value.trim(), customer: $('#fCustomer').value.trim(), notes: $('#fNotes').value.trim(), materials: tagged.slice() });
    const saved = RSL.saveProduct(p);
    location.href = 'products.html?open=' + encodeURIComponent(saved.id);
  });

  drawTagged();
})();

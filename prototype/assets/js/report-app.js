/* ==========================================================================
   report-app.js — Product name | Raw materials | CAS #, in the client's layout:
   the product cell spans its raw materials, one CAS number on each row.
   A raw material with several CAS numbers spans those rows the same way.
   ?q=<text>  limit the report; the search rules are those of products.html
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL' });
  const HEADS = ['Product Name', 'Raw materials', 'CAS #'];

  if (RSL.param('q')) $('#q').value = RSL.param('q');

  /* The one model behind the table, the print and the Excel file.
     Every row of a product is counted so the three stay identical. */
  function model(q) {
    return RSL.searchProducts(q).products.map(h => {
      const mats = h.mats.map(x => ({ name: x.m.name, cas: RSL.casList(x.m.cas) }));
      return { name: h.product.name || h.product.code, mats,
               span: mats.reduce((n, m) => n + Math.max(m.cas.length, 1), 0) || 1 };
    });
  }

  /* ---- on screen and in print -------------------------------------------- */
  function draw() {
    const q = $('#q').value.trim(), data = model(q), host = $('#report');
    const bad = [];
    host.innerHTML = '';
    $('#repCount').textContent = data.length + ' product' + (data.length === 1 ? '' : 's');
    $('#repPrinted').textContent = 'Printed ' + UI.fmtDate(new Date().toISOString());
    $('#btnExcel').disabled = $('#btnPrint').disabled = !data.length;
    if (!data.length) {
      host.appendChild(el('div', { class: 'empty-state' }, [el('span', { class: 'ic', text: '\u{1F4C4}' }),
        el('h4', { text: q ? 'No product matches “' + q + '”' : 'No products yet' }),
        el('p', { text: q ? 'Try a product, raw material, supplier or CAS number.' : 'Products appear here once they are created or imported.' })]));
    } else {
      const t = el('table', { class: 'rep-table' });
      t.appendChild(el('thead', {}, [el('tr', {}, HEADS.map(h => el('th', { text: h })))]));
      data.forEach(p => t.appendChild(productRows(p, bad)));
      host.appendChild(t);
    }
    const box = $('#repCheck');
    box.hidden = !bad.length;
    box.textContent = bad.length ? 'Check before sending: ' + bad.join('; ') + '. The entries are shown as they were saved. This note does not print.' : '';
  }
  function productRows(p, bad) {
    const tb = el('tbody');
    const cell = el('td', { class: 'rp', rowspan: p.span, text: p.name });
    if (!p.mats.length) {
      tb.appendChild(el('tr', {}, [cell, el('td', { class: 'none', text: 'No raw materials tagged' }), el('td', { class: 'none', text: '—' })]));
      return tb;
    }
    p.mats.forEach((m, mi) => {
      const rows = m.cas.length ? m.cas : [''];
      rows.forEach((c, ci) => {
        const tr = tb.appendChild(el('tr'));
        if (!mi && !ci) tr.appendChild(cell);
        if (!ci) tr.appendChild(el('td', { rowspan: rows.length, text: m.name }));
        const ok = !c || RSL.casStatus(c) === 'valid';
        if (!ok) bad.push(c + ' (' + m.name + ') is not a valid CAS number');
        tr.appendChild(el('td', { class: ok ? (c ? '' : 'none') : 'flag', title: ok ? null : 'Not a valid CAS number', text: c || '—' }));
      });
    });
    return tb;
  }

  /* ---- Excel: same rows, with the same two kinds of merged cell ----------- */
  function workbook(data) {
    const blank = s => ({ v: null, s });
    const rows = [HEADS.map(v => ({ v, s: 'repHead' }))], merges = [];
    const merge = (col, from, count) => { if (count > 1) merges.push(col + from + ':' + col + (from + count - 1)); };
    data.forEach(p => {
      merge('A', rows.length + 1, p.span);
      const lines = [];
      if (!p.mats.length) lines.push(['No raw materials tagged', '—', 1]);
      p.mats.forEach(m => (m.cas.length ? m.cas : ['—']).forEach((c, ci, all) => lines.push([ci ? null : m.name, c, ci ? 0 : all.length])));
      lines.forEach((l, i) => {
        if (l[2]) merge('B', rows.length + 1, l[2]);
        rows.push([i ? blank('repProduct') : { v: p.name, s: 'repProduct' }, l[0] === null ? blank('repCell') : { v: l[0], s: 'repCell' }, { v: l[1], s: 'repCell' }]);
      });
    });
    return XLSXLite.write({ sheets: [{ name: 'Product report', active: true, freeze: 1, merges, rows, cols: [{ w: 30 }, { w: 36 }, { w: 18 }] }] });
  }

  $('#btnExcel').addEventListener('click', () => {
    RSL.downloadBytes('Product-report.xlsx', workbook(model($('#q').value.trim())), XLSXLite.MIME);
    RSL.toast('Product-report.xlsx downloaded', 'ok');
  });
  $('#btnPrint').addEventListener('click', () => window.print());
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 120); });
  draw();
})();

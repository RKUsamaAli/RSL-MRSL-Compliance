/* ==========================================================================
   import-app.js — template download, upload preview, version history.
   ?ds=<category id | products>  pre-select the data set
   All rules live in rsl-excel.js and the RSL store; this file only draws.
   ========================================================================== */
(function () {
  const { $, el } = UI;
  RSL.shell({ active: 'RSL' });

  const sets = RSL.datasets();
  sets.forEach(d => $('#fDs').appendChild(el('option', { value: d.id, text: d.name })));
  let ds = sets.some(d => d.id === RSL.param('ds')) ? RSL.param('ds') : sets[0].id;
  $('#fDs').value = ds;

  let wb = null, fileName = '', plan = null;
  const defaultMode = () => ds === RSL.PRODUCTS ? CFG.settings.importDefaultModeProducts : CFG.settings.importDefaultMode;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const modeOf = v => CFG.versionModes.find(m => m.v === v) || { t: v, c: 'draft' };

  /* ---- data-set header --------------------------------------------------- */
  function drawHead() {
    const cur = RSL.currentVersion(ds);
    const cat = ds === RSL.PRODUCTS ? null : RSL.category(ds);
    $('#dsInfo').textContent = cat ? (cat.source || '') + (cat.version ? ' · ' + cat.version : '') : 'One Excel row per product × raw material';
    UI.kpis('#kpis', [
      { label: 'Current version', value: 'v' + cur.n, accent: true, delta: modeOf(cur.mode).t },
      { label: 'Content', value: RSL.snapRows(ds, RSL.snapshot(ds)).replace(' · ', ', ') },
      { label: 'Versions kept', value: String(RSL.versions(ds).length) },
      { label: 'Last change', value: RSL.fmtWhen(cur.at) }
    ]);
    $('#fLabel').closest('.field').style.display = cat ? '' : 'none';
  }

  /* ---- preview ----------------------------------------------------------- */
  function clearUpload() {
    wb = null; plan = null; fileName = '';
    $('#fFile').value = ''; $('#preview').style.display = 'none'; $('#fatal').style.display = 'none';
    $('#fLabel').value = ''; $('#fNote').value = '';
  }
  function fatal(msg, other) {
    const box = $('#fatal'); box.style.display = ''; box.innerHTML = '';
    box.appendChild(el('b', { text: 'This file cannot be imported. ' }));
    box.appendChild(document.createTextNode(msg));
    if (other) box.appendChild(el('div', { style: 'margin-top:8px' }, [el('button', { class: 'btn sm', type: 'button', text: 'Switch to “' + RSL.datasetName(other) + '”',
      onclick: () => { const keep = wb, name = fileName; ds = other; $('#fDs').value = other; refresh(); wb = keep; fileName = name; setMode(defaultMode()); analyse(); } })]));
    $('#preview').style.display = 'none';
  }
  const setMode = m => { UI.$$('input[name=mode]').forEach(r => { r.checked = r.value === m; }); };
  const getMode = () => (UI.$$('input[name=mode]').find(r => r.checked) || {}).value || defaultMode();

  function analyse() {
    if (!wb) return;
    $('#fatal').style.display = 'none';
    plan = RSLX.analyse(ds, wb, { mode: getMode(), sheet: $('#fSheet').value || null });
    if (plan.fatal) { fatal(plan.fatal, plan.otherDs); return; }
    $('#preview').style.display = '';
    $('#pvFile').textContent = fileName;
    $('#pvWhere').textContent = 'Sheet “' + plan.sheet + '”, headings on row ' + plan.headerRow + ', ' + plan.columnsFound.length + ' columns recognised' +
      (plan.columnsMissing.length ? '. Not in the file, left as they are: ' + plan.columnsMissing.slice(0, 5).join(', ') + (plan.columnsMissing.length > 5 ? '…' : '') : '');
    const sel = $('#fSheet');
    if (!sel.options.length) plan.sheetNames.forEach(n => sel.appendChild(el('option', { value: n, text: n })));
    sel.value = plan.sheet;
    $('#sheetWrap').style.display = plan.sheetNames.length > 1 ? '' : 'none';

    const d = plan.diff;
    UI.kpis('#pvKpis', [
      { label: 'Rows read', value: plan.rowsRead.toLocaleString(), delta: plan.truncated ? 'first ' + plan.truncated.kept.toLocaleString() + ' used' : '' },
      { label: 'New', value: String(d.added.length), accent: true },
      { label: 'Changed', value: String(d.updated.length) },
      { label: 'Removed', value: String(d.removed.length), dir: d.removed.length ? 'dn' : '' },
      { label: 'Unchanged', value: String(d.unchanged) },
      { label: 'Errors', value: String(plan.errors), dir: plan.errors ? 'dn' : '', delta: plan.warnings ? plural(plan.warnings, 'warning') : '' }
    ]);
    const rem = $('#pvRemove');
    rem.style.display = d.removed.length ? '' : 'none';
    rem.innerHTML = d.removed.length ? '<b>' + plural(d.removed.length, 'record') + ' will be removed</b> because ' + (d.removed.length === 1 ? 'it is' : 'they are') + ' not in this file. If the file holds only part of the data, choose “Add &amp; update only”. Removed records stay in the previous version.' : '';
    drawIssues(); drawChanges();

    const none = d.total === 0;
    $('#btnImport').disabled = plan.blocked || none;
    $('#btnImport').textContent = 'Import as version ' + (RSL.currentVersion(ds).n + (RSL.hasManualEdits(ds) ? 2 : 1));
    $('#pvBlocked').textContent = plan.blocked ? 'Correct the errors in the file and upload it again. Nothing has been saved.'
      : none ? 'The file matches the list exactly, so there is nothing to import.'
      : plan.errors ? plural(plan.badRows, 'row') + ' with errors will be left out.' : '';
  }

  function drawIssues() {
    const host = $('#pvIssues'); host.innerHTML = '';
    if (!plan.issues.length) return;
    const list = plan.issues.slice().sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1));
    const t = el('div', { class: 'issue-list' });
    list.slice(0, 200).forEach(i => t.appendChild(el('div', { class: 'issue ' + i.level }, [
      el('span', { class: 'st ' + (i.level === 'error' ? 'rejected' : 'pending'), text: i.level === 'error' ? 'Error' : 'Warning' }),
      el('span', { class: 'at', text: i.row ? 'Row ' + i.row : 'File' }),
      el('span', { text: i.msg })])));
    if (list.length > 200) t.appendChild(el('div', { class: 'hint', text: '…and ' + (list.length - 200) + ' more' }));
    host.appendChild(el('div', { class: 'sub', text: 'What we found in the file' }));
    host.appendChild(t);
  }
  function changesBlock(host, d, words) {
    const say = Object.assign({ add: 'New', del: 'Removed' }, words);
    host.innerHTML = '';
    if (!d.total) { host.appendChild(el('div', { class: 'hint', text: 'No differences in the records.' })); return; }
    const LIMIT = 60; let shown = 0;
    const box = el('div', { class: 'chg-list' });
    const line = (cls, tag, r, body) => {
      if (shown++ >= LIMIT) return;
      box.appendChild(el('div', { class: 'chg ' + cls }, [
        el('div', { class: 'h' }, [el('span', { class: 'mk', text: tag }), el('b', { text: r.title }), r.kind !== 'Row' ? el('span', { class: 'hint', text: r.kind }) : null]),
        body || null]));
    };
    d.added.forEach(r => line('add', say.add, r));
    d.updated.forEach(r => {
      const b = el('div', { class: 'fields' });
      r.changes.slice(0, 6).forEach(c => b.appendChild(el('div', {}, [
        el('span', { class: 'hint', text: c.label + ': ' }),
        el('s', { text: c.from || '(empty)' }), document.createTextNode(' → '), el('span', { text: c.to || '(empty)' })])));
      line('upd', 'Changed', r, b);
    });
    d.removed.forEach(r => line('del', say.del, r));
    host.appendChild(box);
    if (shown > LIMIT) host.appendChild(el('div', { class: 'hint', style: 'margin-top:6px', text: 'First ' + LIMIT + ' of ' + d.total + ' changes shown.' }));
  }
  function drawChanges() {
    const host = $('#pvChanges'); host.innerHTML = '';
    host.appendChild(el('div', { class: 'sub', text: 'What will change' }));
    const box = host.appendChild(el('div'));
    changesBlock(box, plan.diff);
  }

  async function takeFile(f) {
    if (!f) return;
    clearUpload(); fileName = f.name;
    $('#fSheet').innerHTML = '';
    setMode(defaultMode());
    try { wb = await RSLX.parseFile(f); fileName = f.name; analyse(); }
    catch (e) { fatal(e.message || 'The file could not be read.'); }
  }

  function doImport() {
    if (!plan || plan.blocked) return;
    const r = RSLX.apply(ds, plan, { file: fileName, label: $('#fLabel').value.trim(), note: $('#fNote').value.trim() });
    if (!r.ok) { fatal('The browser has no room left for this version, so nothing was changed. Use “Reset demo data” on the Home page, or import a smaller file. The real system has no such limit.'); return; }
    RSL.toast('Imported as version ' + r.result.n, 'ok');
    clearUpload(); refresh();
  }

  /* ---- version history --------------------------------------------------- */
  function drawVersions() {
    const list = RSL.versions(ds).reverse();
    const cur = RSL.currentVersion(ds);
    $('#verCount').textContent = plural(list.length, 'version');
    const manual = RSL.hasManualEdits(ds);
    const note = $('#manualNote'); note.style.display = manual ? '' : 'none'; note.innerHTML = '';
    if (manual) {
      note.appendChild(document.createTextNode('The data has row-by-row edits since version ' + cur.n + '. They are saved automatically before the next import or revert. '));
      note.appendChild(el('button', { class: 'btn sm', type: 'button', text: 'Save them as a version now', onclick: () => { RSL.captureManual(ds); RSL.persist(); refresh(); } }));
    }
    UI.table('#versions', {
      search: false, sortable: false, pageSize: 12, rows: list,
      columns: [
        { k: 'n', label: 'Version', render: v => '<b>v' + v.n + '</b>' + (v.n === cur.n ? ' <span class="st posted">Current</span>' : '') },
        { k: 'at', label: 'When', render: v => RSL.fmtWhen(v.at) + '<div class="hint">' + RSL.esc(v.by) + '</div>' },
        { k: 'mode', label: 'How', render: v => '<span class="st ' + modeOf(v.mode).c + '">' + RSL.esc(modeOf(v.mode).t) + '</span>' },
        { k: 'file', label: 'File / note', render: v => [v.label ? '<b>' + RSL.esc(v.label) + '</b>' : '', v.file ? RSL.esc(v.file) : '', v.note ? '<span class="hint">' + RSL.esc(v.note) + '</span>' : ''].filter(Boolean).join('<br>') || '<span class="muted">—</span>' },
        { k: 'rows', label: 'Content', render: v => RSL.esc(v.rows) },
        { k: 'chg', label: 'Changes', render: v => v.n === list[list.length - 1].n ? '<span class="muted">—</span>' :
            '<span class="dlt add">+' + v.added + '</span> <span class="dlt upd">~' + v.updated + '</span> <span class="dlt del">−' + v.removed + '</span>' },
        { k: 'a', label: '', render: v => '<div class="row-actions">' +
            '<button class="btn sm" type="button" data-dl="' + v.n + '">&#11015; Excel</button>' +
            (v.n === cur.n ? '' : '<button class="btn sm" type="button" data-rev="' + v.n + '">Revert</button>') + '</div>' }
      ],
      onRow: v => openVersion(v.n, false)
    });
    UI.$$('#versions button[data-dl]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); RSL.toast(RSLX.downloadVersion(ds, Number(b.dataset.dl)) + ' downloaded', 'ok'); }));
    UI.$$('#versions button[data-rev]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); openVersion(Number(b.dataset.rev), true); }));
  }

  /* Drawer. revertMode shows what reverting would do; otherwise what the
     version changed compared with the one chosen in the drop-down. */
  function openVersion(n, revertMode) {
    const v = RSL.version(ds, n);
    const all = RSL.versions(ds), cur = RSL.currentVersion(ds);
    const body = el('div');
    const kv = body.appendChild(el('div', { class: 'rsl-kv' }));
    UI.kv(kv, [
      ['How', '<span class="st ' + modeOf(v.mode).c + '">' + RSL.esc(modeOf(v.mode).t) + '</span>'],
      ['When', RSL.fmtWhen(v.at) + ' · ' + RSL.esc(v.by)],
      ['File', RSL.esc(v.file || '—')],
      ['Edition', RSL.esc(v.label || '—')],
      ['Note', RSL.esc(v.note || '—')],
      ['Content', RSL.esc(v.rows)]
    ]);
    const live = RSL.snapshot(ds);
    if (revertMode) {
      const d = RSL.diff(ds, live, v.snap);
      body.appendChild(el('div', { class: 'callout', html: 'Reverting restores the content of <b>version ' + n + '</b> as a new version. Nothing is deleted: version ' + cur.n + ' stays in the history, so you can return to it.' }));
      body.appendChild(el('div', { class: 'sub', text: 'What reverting will change' }));
      changesBlock(body.appendChild(el('div')), d, { add: 'Restored' });
    } else {
      const f = el('div', { class: 'field' }, [el('label', { text: 'Compare with' })]);
      const sel = el('select', {}, all.filter(x => x.n !== n).reverse().map(x => el('option', { value: x.n, text: 'Version ' + x.n + (x.n === cur.n ? ' (current)' : '') })));
      const prev = all.filter(x => x.n < n).pop();
      if (prev) sel.value = prev.n;
      f.appendChild(sel);
      const out = el('div');
      const draw = () => {
        const other = RSL.version(ds, Number(sel.value));
        if (other) changesBlock(out, other.n < n ? RSL.diff(ds, other.snap, v.snap) : RSL.diff(ds, v.snap, other.snap));
      };
      sel.addEventListener('change', draw);
      if (all.length > 1) { body.appendChild(f); body.appendChild(out); draw(); }
    }
    const actions = [el('button', { class: 'btn', text: 'Close', onclick: UI.closeDrawer }),
      el('button', { class: 'btn', text: '⬇ Excel', onclick: () => { RSL.toast(RSLX.downloadVersion(ds, n) + ' downloaded', 'ok'); } }),
      el('span', { class: 'spacer', style: 'flex:1' })];
    if (n !== cur.n) actions.push(revertMode
      ? el('button', { class: 'btn primary', id: 'btnConfirmRevert', text: 'Revert to version ' + n, onclick: () => doRevert(n) })
      : el('button', { class: 'btn', text: 'Revert…', onclick: () => openVersion(n, true) }));
    UI.drawer({ title: 'Version ' + n + ' — ' + RSL.datasetName(ds), body, actions });
  }
  function doRevert(n) {
    const r = RSL.revert(ds, n);
    UI.closeDrawer();
    if (!r.ok) { RSL.toast('The browser has no room left: nothing was changed', 'warn'); return; }
    RSL.toast('Reverted: version ' + r.result.n + ' holds the content of version ' + n, 'ok');
    refresh();
  }

  /* ---- wiring ------------------------------------------------------------ */
  function refresh() { drawHead(); drawVersions(); }
  $('#fDs').addEventListener('change', () => { ds = $('#fDs').value; clearUpload(); refresh(); });
  $('#btnBlank').addEventListener('click', () => { RSL.toast(RSLX.template(ds, 'blank') + ' downloaded', 'ok'); refresh(); });
  $('#btnData').addEventListener('click', () => { RSL.toast(RSLX.template(ds, 'data') + ' downloaded', 'ok'); refresh(); });
  $('#fFile').addEventListener('change', ev => takeFile(ev.target.files[0]));
  const drop = $('#drop');
  ['dragover', 'dragenter'].forEach(t => drop.addEventListener(t, ev => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', ev => takeFile(ev.dataTransfer.files[0]));
  UI.$$('input[name=mode]').forEach(r => r.addEventListener('change', analyse));
  $('#fSheet').addEventListener('change', analyse);
  $('#btnImport').addEventListener('click', doImport);
  $('#btnCancel').addEventListener('click', clearUpload);
  setMode(defaultMode());
  refresh();
})();

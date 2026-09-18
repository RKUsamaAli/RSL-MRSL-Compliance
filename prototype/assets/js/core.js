/* ==========================================================================
   PROTOTYPE KIT — core.js
   --------------------------------------------------------------------------
   Domain-neutral widget library for clickable client-approval prototypes.
   No framework, no build step, no dependencies. Loads after config.js and
   demo-data.js, exposes one global: UI.

   Every widget takes its OPTIONS from window.CFG, never from hard-coded
   markup, so an approved prototype converts 1:1 into a form schema.

     <script src="assets/js/config.js"></script>
     <script src="assets/js/demo-data.js"></script>
     <script src="assets/js/core.js"></script>
     <script src="assets/js/<module>-app.js"></script>
   ========================================================================== */
window.UI = (function () {
  const CFG  = window.CFG  || {};
  const DEMO = window.DEMO || {};

  /* ---------- DOM helpers ------------------------------------------------- */
  const $  = (s, r) => (typeof s === 'string' ? (r || document).querySelector(s) : s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }
  const mount = (m, node) => { const h = $(m); if (h) { h.innerHTML = ''; h.appendChild(node); } return h; };

  /* ---------- tiny pub/sub — lets one section react to another ------------- */
  const bus = (function () {
    const map = {};
    return {
      on:  (k, fn) => { (map[k] = map[k] || []).push(fn); },
      emit:(k, v)  => { (map[k] || []).forEach(fn => fn(v)); }
    };
  })();

  /* ---------- prototype state — one object, inspectable in the console -----
     Open devtools during the client call and `UI.store` shows exactly what
     the form captured. That object is the payload spec for implementation. */
  const store = { fields: {}, selected: {}, grid: {}, lists: {}, dirty: false };

  /* ---------- formatting -------------------------------------------------- */
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.getDate().toString().padStart(2, '0') + '-' +
           ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + '-' +
           d.getFullYear();
  }
  /* PKR with thousands separators — the client reads totals, not code. */
  function money(n, dec) {
    const v = Number(n || 0);
    return v.toLocaleString('en-PK', { minimumFractionDigits: dec === undefined ? 2 : dec,
                                       maximumFractionDigits: dec === undefined ? 2 : dec });
  }
  function ageFromDob(dob) {
    const d = new Date(dob), n = new Date();
    let months = (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
    if (n.getDate() < d.getDate()) months--;
    return { months, years: Math.floor(months / 12), label: Math.floor(months / 12) + 'y ' + (months % 12) + 'm' };
  }
  let seq = 0; const uid = p => (p || 'id') + '-' + (++seq);

  /* ==========================================================================
     1. SHELL — module rail + app bar
     Mirrors the live product chrome so the prototype reads as part of the
     product, not a separate mock-up. Modules come from CFG.modules if the
     project defines its own set.
     ========================================================================== */
  const DEFAULT_MODULES = [
    ['\u{1F3E0}', '', 'home'], ['⭐', '', 'fav'], ['\u{1F6E1}', 'IAM'], ['\u{1F3E2}', 'ORG'],
    ['\u{1F9FE}', 'FAS'], ['\u{1F4E6}', 'IMS'], ['\u{1F6D2}', 'PMS'], ['\u{1F4CA}', 'SMS'],
    ['\u{1F465}', 'HRM'], ['\u{1F5C2}', 'AMS'], ['\u{1F4B3}', 'PAY'], ['\u{1F4B0}', 'BMS'],
    ['\u{1F3E5}', 'OPD'], ['\u{1F52C}', 'LAB'], ['\u{1F4F7}', 'RAD'], ['\u{1F9D1}', 'PRMS'],
    ['\u{1F9BF}', 'REH']
  ];
  function shell(opts) {
    opts = opts || {};
    const mods = CFG.modules || DEFAULT_MODULES;
    const side = el('nav', { class: 'side' });
    mods.forEach(m => {
      const a = el('a', { href: opts.home || 'index.html', title: m[1] || m[2],
                          class: m[1] === opts.active ? 'on' : '' });
      a.appendChild(el('span', { class: 'ico', text: m[0] }));
      if (m[1]) a.appendChild(el('span', { text: m[1] }));
      side.appendChild(a);
      if (m[2] === 'fav') side.appendChild(el('div', { class: 'sep' }));
    });

    const bar = el('div', { class: 'appbar' });
    bar.appendChild(el('span', { class: 'brand', text: opts.brand || CFG.brand || 'Compliance' }));
    bar.appendChild(el('span', { class: 'spacer' }));
    (opts.links || []).forEach(l =>
      bar.appendChild(el('a', { class: 'lnk' + (l.solid ? ' solid' : ''), href: l.href, text: l.text })));
    bar.appendChild(el('span', { class: 'goto', html: 'Go to… <kbd>⌘K</kbd>' }));
    bar.appendChild(el('span', { class: 'company',
      html: '<i>Company</i>' + (opts.company || CFG.company || 'Demo Hospital') }));
    bar.appendChild(el('span', { class: 'icobtn', text: '\u{1F319}' }));
    bar.appendChild(el('span', { class: 'usr', text: opts.user || CFG.user || 'Mr. Administrator' }));

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.insertBefore(side, document.body.firstChild);
  }

  /* ==========================================================================
     2. RECORD HEADER — identity that is captured once and never re-typed
     Works for a patient, an employee, a supplier, a production order.
       UI.recordHeader('#hdr', {
         title:'Ayaan Khan', badges:[{t:'MRN-2026-04871',c:'mr'}],
         chips:[['\u{1F382}','6y 2m'],['\u{1F4DE}','0300-1234567']],
         meta:'Referred by <b>Dr Raza</b>', actions:[btn], status:'Draft' })
     ========================================================================== */
  function recordHeader(m, spec) {
    const host = $(m); if (!host) return;
    spec = spec || {};
    const card = el('div', { class: 'pcard' });

    const r1 = el('div', { class: 'prow1' }, [ el('span', { class: 'pname', text: spec.title || '' }) ]);
    (spec.badges || []).forEach(b => r1.appendChild(el('span', { class: 'badge ' + (b.c || 'mr'), text: b.t })));
    if (spec.status) r1.appendChild(el('span', { class: 'st ' + (spec.statusClass || 'draft'), id: 'statusPill', text: spec.status }));
    if (spec.meta) r1.appendChild(el('div', { class: 'pmeta', html: spec.meta }));
    card.appendChild(r1);

    if (spec.chips && spec.chips.length) {
      const r2 = el('div', { class: 'prow2' });
      spec.chips.forEach(c => r2.appendChild(el('span', { class: 'pchip',
        html: '<span class="ic">' + c[0] + '</span>' + c[1] })));
      card.appendChild(r2);
    }
    if (spec.actions && spec.actions.length) {
      const r3 = el('div', { class: 'prow3' });
      spec.actions.forEach(a => r3.appendChild(a));
      card.appendChild(r3);
    }
    host.innerHTML = ''; host.appendChild(card);
    return card;
  }

  /* ==========================================================================
     3. PILLS — multi-select (or single) chips with an exclusive option
     `exclusive:true` on an option means "None / Not applicable": choosing it
     clears the rest, choosing any sibling clears it. Every real-world option
     list has one, and a checkbox column without it produces ambiguous data —
     you cannot tell "none" from "not asked".
       UI.pills('#precautions', CFG.precautions, 'precautions')
     ========================================================================== */
  function pills(m, list, name, opts) {
    opts = opts || {};
    const host = $(m); if (!host) return;
    host.classList.add('pills'); host.dataset.name = name; host.innerHTML = '';

    list.forEach(o => {
      const lab = el('label', { class: 'pill' + (o.exclusive ? ' exclusive' : '') + (o.danger ? ' danger' : ''),
                                'data-v': o.v, title: o.exclusive ? 'Selecting this clears all other options' : '' });
      const inp = el('input', { type: opts.single ? 'radio' : 'checkbox', name: name, value: o.v });
      lab.appendChild(inp);
      lab.appendChild(el('span', { class: 'tick', text: '✓' }));
      lab.appendChild(el('span', { text: o.t }));
      inp.addEventListener('change', () => {
        if (inp.checked && o.exclusive) {
          list.filter(x => x.v !== o.v).forEach(x => {
            const ex = $('input[value="' + x.v + '"]', host);
            if (ex) { ex.checked = false; ex.closest('.pill').classList.remove('on'); }
          });
        } else if (inp.checked) {
          list.filter(x => x.exclusive).forEach(x => {
            const ex = $('input[value="' + x.v + '"]', host);
            if (ex) { ex.checked = false; ex.closest('.pill').classList.remove('on'); }
          });
        }
        $$('.pill', host).forEach(p => p.classList.toggle('on', $('input', p).checked));
        host.classList.remove('invalid');
        store.dirty = true;
        syncReveals();
        bus.emit('pills:' + name, getPills(host));
        if (opts.onChange) opts.onChange(getPills(host));
      });
      host.appendChild(lab);
    });

    /* An option flagged `detail:true` opens its own "please specify" box —
       "Other" on its own is never an answer. */
    const detailWrap = el('div', { class: 'pill-details', style: 'margin-top:9px;display:grid;gap:8px' });
    list.filter(o => o.detail).forEach(o => {
      detailWrap.appendChild(el('div', { class: 'field', style: 'display:none', 'data-for': o.v }, [
        el('label', { class: 'req', text: o.t + ' — please specify' }),
        el('input', { type: 'text', 'data-detail': name + '.' + o.v, placeholder: o.placeholder || '' })
      ]));
    });
    if (detailWrap.children.length) host.parentNode.insertBefore(detailWrap, host.nextSibling);

    function syncReveals() {
      const on = getPills(host);
      $$('[data-for]', detailWrap).forEach(f => { f.style.display = on.includes(f.dataset.for) ? '' : 'none'; });
      /* An option may reveal any element by id: { reveals:'nicuDaysBox' } */
      list.filter(o => o.reveals).forEach(o => {
        const t = document.getElementById(o.reveals);
        if (t) t.style.display = on.includes(o.v) ? '' : 'none';
      });
    }
    syncReveals();
    return host;
  }
  const getPills = h => $$('.pill input:checked', $(h)).map(i => i.value);
  const setPills = (h, vals) => {
    $$('.pill', $(h)).forEach(p => {
      const on = vals.includes(p.dataset.v);
      $('input', p).checked = on; p.classList.toggle('on', on);
    });
  };

  /* ==========================================================================
     4. SUFFIX INPUT — a number with its unit inside the box (kg, mo, %, PKR)
     ========================================================================== */
  function suffixInput(suffix, attrs) {
    const w = el('div', { class: 'suffix-input' });
    w.appendChild(el('input', Object.assign({ type: 'number' }, attrs || {})));
    if (suffix) w.appendChild(el('span', { class: 'sfx', text: suffix }));
    return w;
  }

  /* ==========================================================================
     5. CHIPSET — add/remove free items (allergies, tags, secondary diagnoses)
       UI.chipset('#tags', store.lists.tags = [], { placeholder:'Add a tag…' })
     ========================================================================== */
  function chipset(m, arr, opts) {
    opts = opts || {};
    const host = $(m); if (!host) return;
    host.classList.add('chipset');
    function draw() {
      host.innerHTML = '';
      arr.forEach((v, i) => host.appendChild(el('span', { class: 'dchip' + (v.sev ? ' sev-' + v.sev : '') }, [
        el('span', { text: v.label || v }),
        el('span', { class: 'x', text: '×', onclick: () => { arr.splice(i, 1); store.dirty = true; draw(); } })
      ])));
      const inp = el('input', { type: 'text', placeholder: opts.placeholder || 'Add…' });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && inp.value.trim()) {
          arr.push(opts.map ? opts.map(inp.value.trim()) : inp.value.trim());
          store.dirty = true; draw();
          const n = $('input', host); if (n) n.focus();
        }
      });
      host.appendChild(inp);
    }
    draw();
    return { redraw: draw };
  }

  /* ==========================================================================
     6. REPEATER — an editable row table (goals, line items, family members)
       UI.repeater('#items', [
         {k:'product', label:'Product', w:'2fr'},
         {k:'qty', label:'Qty', type:'number', w:'90px'},
         {k:'rate', label:'Rate', type:'number', w:'110px'}
       ], store.lists.items = [], { addLabel:'+ Add line', onChange: recalc })
     ========================================================================== */
  function repeater(m, cols, arr, opts) {
    opts = opts || {};
    const host = $(m); if (!host) return;
    const gt = cols.map(c => c.w || '1fr').join(' ') + ' 34px';
    function draw() {
      host.innerHTML = '';
      const head = el('div', { class: 'rep-row head', style: 'grid-template-columns:' + gt });
      cols.forEach(c => head.appendChild(el('div', { text: c.label })));
      head.appendChild(el('div'));
      host.appendChild(head);

      arr.forEach((row, i) => {
        const r = el('div', { class: 'rep-row', style: 'grid-template-columns:' + gt });
        cols.forEach(c => {
          let f;
          if (c.options) {
            f = el('select');
            (c.options || []).forEach(o => f.appendChild(el('option', { value: o.v !== undefined ? o.v : o, text: o.t || o })));
            f.value = row[c.k] || '';
          } else {
            f = el('input', { type: c.type || 'text', placeholder: c.placeholder || '', value: row[c.k] || '' });
          }
          f.addEventListener('input', () => { row[c.k] = f.value; store.dirty = true; if (opts.onChange) opts.onChange(arr); });
          f.addEventListener('change', () => { row[c.k] = f.value; store.dirty = true; if (opts.onChange) opts.onChange(arr); });
          r.appendChild(f);
        });
        r.appendChild(el('span', { class: 'icon-btn del', text: '✕', title: 'Remove this row',
          onclick: () => { arr.splice(i, 1); store.dirty = true; draw(); if (opts.onChange) opts.onChange(arr); } }));
        host.appendChild(r);
      });

      host.appendChild(el('button', { class: 'btn sm', type: 'button', text: opts.addLabel || '+ Add row',
        style: 'margin-top:8px',
        onclick: () => { arr.push({}); draw(); const ins = $$('.rep-row:not(.head) input', host); if (ins.length) ins[ins.length - cols.length].focus(); } }));
    }
    draw();
    return { redraw: draw };
  }

  /* ==========================================================================
     7. PICKER MODAL — searchable, grouped multi-select over a catalogue
     Use whenever the list is longer than ~15 options. The client sees the
     real catalogue size; you see which groups they actually use.
       UI.openPicker('Select muscle groups', CFG.muscles, selectedIds, ids => {…})
     Catalogue item shape: { id, label, group }
     ========================================================================== */
  let modalEl = null;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = el('div', { class: 'modal-back' }, [
      el('div', { class: 'modal' }, [
        el('header', {}, [ el('h3', { id: 'pkTitle', text: 'Select items' }),
                           el('span', { class: 'close', text: '×', onclick: closeModal }) ]),
        el('div', { class: 'mbody' }, [
          el('div', { class: 'search-box' }, [ el('input', { type: 'text', id: 'pkSearch', placeholder: 'Search…' }) ]),
          el('div', { id: 'pkBody' })
        ]),
        el('footer', {}, [ el('span', { id: 'pkCount', class: 'save-state' }),
                           el('span', { class: 'spacer' }),
                           el('button', { class: 'btn', text: 'Cancel', onclick: closeModal }),
                           el('button', { class: 'btn primary', id: 'pkApply', text: 'Apply selection' }) ])
      ])
    ]);
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
    return modalEl;
  }
  function closeModal() { if (modalEl) modalEl.classList.remove('open'); }

  function openPicker(title, catalogue, selectedIds, onApply) {
    ensureModal();
    $('#pkTitle').textContent = title;
    const body = $('#pkBody'); body.innerHTML = '';
    const chosen = new Set(selectedIds || []);
    const groups = [];
    catalogue.forEach(i => { const g = i.group || 'All'; if (!groups.includes(g)) groups.push(g); });

    groups.forEach(g => {
      const items = catalogue.filter(i => (i.group || 'All') === g);
      const grp = el('div', { class: 'cat-group', 'data-region': g });
      const all = el('span', { class: 'all', text: 'select all' });
      grp.appendChild(el('h5', {}, [ el('span', { text: g }), all ]));
      const listEl = el('div', { class: 'cat-list' });
      items.forEach(it => {
        const lab = el('label', { class: 'cat-item' + (chosen.has(it.id) ? ' sel' : ''),
                                  'data-id': it.id, 'data-label': it.label.toLowerCase() });
        const cb = el('input', { type: 'checkbox' });
        cb.checked = chosen.has(it.id);
        cb.addEventListener('change', () => {
          cb.checked ? chosen.add(it.id) : chosen.delete(it.id);
          lab.classList.toggle('sel', cb.checked); updCount();
        });
        lab.appendChild(cb); lab.appendChild(el('span', { text: it.label }));
        listEl.appendChild(lab);
      });
      all.addEventListener('click', () => {
        const anyOff = items.some(i => !chosen.has(i.id));
        items.forEach(i => anyOff ? chosen.add(i.id) : chosen.delete(i.id));
        $$('.cat-item', listEl).forEach(l => {
          const on = chosen.has(l.dataset.id);
          $('input', l).checked = on; l.classList.toggle('sel', on);
        });
        updCount();
      });
      grp.appendChild(listEl); body.appendChild(grp);
    });

    function updCount() { $('#pkCount').textContent = chosen.size + ' selected'; }
    updCount();

    const search = $('#pkSearch'); search.value = '';
    search.oninput = e => {
      const q = e.target.value.toLowerCase().trim();
      $$('.cat-item', body).forEach(l => { l.style.display = !q || l.dataset.label.includes(q) ? '' : 'none'; });
      $$('.cat-group', body).forEach(g => {
        g.style.display = $$('.cat-item', g).some(l => l.style.display !== 'none') ? '' : 'none';
      });
    };
    $('#pkApply').onclick = () => {
      onApply(catalogue.filter(i => chosen.has(i.id)).map(i => i.id));
      closeModal();
    };
    modalEl.classList.add('open');
    setTimeout(() => search.focus(), 40);
  }

  /* ==========================================================================
     8. MATRIX — "pick your rows, then measure them"
     The single most reusable clinical/ERP pattern: the user selects the items
     they actually assessed from a catalogue, and only those become rows.
     Never render a 60-row table and ask the user to skip 50.
       UI.matrix({
         mount:'#grid-tone', key:'tone', catalogue:CFG.muscles,
         columns:[{key:'l',label:'Left',type:'select',options:CFG.scales.mas.options},
                  {key:'r',label:'Right',type:'select',options:CFG.scales.mas.options},
                  {key:'note',label:'Notes',type:'text',optional:true}],
         presets:{ 'CP baseline':['elb-flex','knee-ext'] },
         allowNT:true })
     Cell state: { v:'2' } or { nt:true, reason:'Pain' }
     ========================================================================== */
  function matrix(spec) {
    const host = $(spec.mount); if (!host) return;
    const key = spec.key;
    store.selected[key] = store.selected[key] || [];
    store.grid[key]     = store.grid[key]     || {};

    const bar = el('div', { class: 'picker-bar' });
    const count = el('span', { class: 'count', text: '0 selected' });
    bar.appendChild(el('button', { class: 'btn sm primary', type: 'button', text: spec.pickLabel || 'Select items…',
      onclick: () => openPicker(spec.pickTitle || spec.pickLabel || 'Select items', spec.catalogue,
        store.selected[key], ids => { store.selected[key] = ids; store.dirty = true; render(); }) }));
    bar.appendChild(count);
    if (spec.presets) {
      const pw = el('span', { class: 'presets' });
      Object.keys(spec.presets).forEach(p => pw.appendChild(el('button', {
        class: 'preset-btn', type: 'button', text: p,
        title: 'Load the usual set for ' + p + ' — you can still add or remove rows',
        onclick: () => {
          store.selected[key] = Array.from(new Set(store.selected[key].concat(spec.presets[p])));
          store.dirty = true; render();
        } })));
      bar.appendChild(pw);
    }
    host.appendChild(bar);

    if (spec.allowNT) host.appendChild(el('div', { class: 'grid-legend' }, [
      el('span', { html: '<b class="lg-nt">NT</b> <b>Not Tested</b> — press it in any cell when the value could not be captured, then give a reason. A cell is complete with <b>either</b> a value <b>or</b> NT + reason.' }),
      el('span', { html: '<b class="lg-icon">⊘</b> mark the whole row Not Tested' }),
      el('span', { html: '<b class="lg-icon">✕</b> remove the row' })
    ]));

    const body = el('div'); host.appendChild(body);

    const cellOf = (id, col) => {
      store.grid[key][id] = store.grid[key][id] || {};
      store.grid[key][id][col] = store.grid[key][id][col] || {};
      return store.grid[key][id][col];
    };

    function cell(item, col) {
      const st = cellOf(item.id, col.key);
      const c = el('div', { class: 'mcell' + (st.nt ? ' nt' : ''), 'data-item': item.id, 'data-col': col.key });
      let input;
      if (col.type === 'select') {
        input = el('select');
        input.appendChild(el('option', { value: '', text: '—' }));
        (col.options || []).forEach(o => input.appendChild(el('option', { value: o.v !== undefined ? o.v : o, text: o.t || o })));
        input.value = st.v || '';
      } else if (col.type === 'number') {
        const si = suffixInput(col.suffix, { min: col.min, max: col.max, placeholder: '—', value: st.v || '' });
        input = $('input', si); c.appendChild(si);
      } else {
        input = el('input', { type: 'text', placeholder: col.placeholder || '', value: st.v || '' });
      }
      input.addEventListener('input',  () => { st.v = input.value; st.nt = false; store.dirty = true; c.classList.remove('nt'); paint(); });
      input.addEventListener('change', () => { st.v = input.value; st.nt = false; store.dirty = true; c.classList.remove('nt'); paint(); });
      if (!c.contains(input)) c.appendChild(input);

      if (spec.allowNT && !col.optional) {
        const nt = el('button', { class: 'nt-btn' + (st.nt ? ' on' : ''), type: 'button', text: 'NT',
          title: 'Not tested — records why the value is missing instead of leaving a blank' });
        const reason = el('select', { class: 'nt-reason' + (st.nt && !st.reason ? ' needs-reason' : ''),
                                      style: st.nt ? '' : 'display:none' });
        reason.appendChild(el('option', { value: '', text: 'Reason…' }));
        (spec.ntReasons || CFG.ntReasons || ['Pain', 'Patient declined', 'Contracture', 'Equipment unavailable', 'Not applicable'])
          .forEach(r => reason.appendChild(el('option', { value: r, text: r })));
        reason.value = st.reason || '';
        reason.addEventListener('change', () => {
          st.reason = reason.value; store.dirty = true;
          reason.classList.toggle('needs-reason', !reason.value); paint();
        });
        nt.addEventListener('click', () => {
          st.nt = !st.nt; store.dirty = true;
          if (st.nt) { st.v = ''; input.value = ''; }
          nt.classList.toggle('on', st.nt);
          c.classList.toggle('nt', st.nt);
          reason.style.display = st.nt ? '' : 'none';
          reason.classList.toggle('needs-reason', st.nt && !reason.value);
          paint();
        });
        c.appendChild(nt); c.appendChild(reason);
      }
      return c;
    }

    function render() {
      body.innerHTML = '';
      const rows = spec.catalogue.filter(i => store.selected[key].includes(i.id));
      count.textContent = rows.length + ' selected';
      if (!rows.length) {
        body.appendChild(el('div', { class: 'grid-empty',
          text: spec.emptyText || 'Nothing selected yet — press the button above and choose what you assessed.' }));
        paint(); return;
      }
      const wrap = el('div', { class: 'grid-wrap' });
      const t = el('table', { class: 'dgrid' });
      const thead = el('thead'), hr = el('tr');
      hr.appendChild(el('th', { text: spec.rowLabel || 'Item' }));
      spec.columns.forEach(col => hr.appendChild(el('th', { text: col.label + (col.optional ? '' : ' *') })));
      hr.appendChild(el('th', { text: '' }));
      thead.appendChild(hr); t.appendChild(thead);

      const tb = el('tbody');
      let lastGroup = null;
      rows.forEach(item => {
        if (item.group && item.group !== lastGroup) {
          lastGroup = item.group;
          const gr = el('tr', { class: 'grp' });
          gr.appendChild(el('td', { colspan: spec.columns.length + 2, text: item.group }));
          tb.appendChild(gr);
        }
        const tr = el('tr');
        tr.appendChild(el('td', { class: 'rowname', text: item.label }));
        spec.columns.forEach(col => { const td = el('td'); td.appendChild(cell(item, col)); tr.appendChild(td); });
        const tools = el('td', { class: 'row-tools' });
        if (spec.allowNT) tools.appendChild(el('span', { class: 'icon-btn', text: '⊘', title: 'Mark the whole row Not Tested',
          onclick: () => {
            spec.columns.filter(c2 => !c2.optional).forEach(c2 => { const st = cellOf(item.id, c2.key); st.nt = true; st.v = ''; });
            store.dirty = true; render();
          } }));
        tools.appendChild(el('span', { class: 'icon-btn del', text: '✕', title: 'Remove this row',
          onclick: () => {
            store.selected[key] = store.selected[key].filter(x => x !== item.id);
            delete store.grid[key][item.id]; store.dirty = true; render();
          } }));
        tr.appendChild(tools);
        tb.appendChild(tr);
      });
      t.appendChild(tb); wrap.appendChild(t); body.appendChild(wrap);
      paint();
    }
    function paint() { if (spec.onChange) spec.onChange(store.grid[key], store.selected[key]); }

    render();
    return { render, issues: () => matrixIssues(spec) };
  }

  /* Rows whose required cells are neither filled nor explained. Feed into validate(). */
  function matrixIssues(spec) {
    const key = spec.key, out = [];
    spec.catalogue.filter(i => (store.selected[key] || []).includes(i.id)).forEach(item => {
      spec.columns.filter(c => !c.optional).forEach(col => {
        const st = ((store.grid[key] || {})[item.id] || {})[col.key] || {};
        if (st.nt && !st.reason) out.push(item.label + ' — ' + col.label + ': "Not tested" needs a reason');
        else if (!st.nt && (st.v === '' || st.v === undefined)) out.push(item.label + ' — ' + col.label + ' is empty');
      });
    });
    return out;
  }

  /* ==========================================================================
     9. LISTING TABLE — search, sort, group, totals, paging
     For report and list screens (Sale Register, Employee List, Stock Ledger).
       UI.table('#list', {
         columns:[{k:'no',label:'Voucher #'},
                  {k:'date',label:'Date',fmt:UI.fmtDate},
                  {k:'party',label:'Customer'},
                  {k:'net',label:'Net',num:true,fmt:UI.money,total:true},
                  {k:'status',label:'Status',render:r=>'<span class="st '+r.status+'">'+r.status+'</span>'}],
         rows: DEMO.sales, pageSize:12, onRow: r => openDrawer(r) })
     ========================================================================== */
  function table(m, spec) {
    const host = $(m); if (!host) return;
    let q = '', sortK = spec.sort || null, sortDir = 1, page = 1;
    const size = spec.pageSize || 15;

    function data() {
      let rows = spec.rows.slice();
      if (q) {
        const t = q.toLowerCase();
        rows = rows.filter(r => spec.columns.some(c => String(r[c.k] === undefined ? '' : r[c.k]).toLowerCase().includes(t)));
      }
      if (sortK) {
        const col = spec.columns.find(c => c.k === sortK);
        rows.sort((a, b) => {
          const x = a[sortK], y = b[sortK];
          const n = col && col.num ? (Number(x) - Number(y)) : String(x).localeCompare(String(y));
          return n * sortDir;
        });
      }
      return rows;
    }

    function draw() {
      host.innerHTML = '';
      const rows = data();
      const pages = Math.max(1, Math.ceil(rows.length / size));
      if (page > pages) page = pages;
      const slice = rows.slice((page - 1) * size, page * size);

      if (spec.search !== false) {
        const fb = el('div', { class: 'filterbar' });
        const sw = el('div', { class: 'searchw field' });
        const si = el('input', { type: 'text', placeholder: spec.searchPlaceholder || 'Search…', value: q });
        si.addEventListener('input', () => { q = si.value; page = 1; draw(); setTimeout(() => $('.searchw input', host).focus(), 0); });
        sw.appendChild(si); fb.appendChild(sw);
        fb.appendChild(el('span', { class: 'spacer' }));
        (spec.actions || []).forEach(a => fb.appendChild(a));
        host.appendChild(fb);
      }

      const wrap = el('div', { class: 'ltable-wrap' });
      const t = el('table', { class: 'ltable' });
      const hr = el('tr');
      spec.columns.forEach(c => {
        const th = el('th', { class: c.num ? 'num' : '', text: c.label,
          style: spec.sortable === false ? '' : 'cursor:pointer' });
        if (c.k === sortK) th.textContent = c.label + (sortDir > 0 ? ' ▲' : ' ▼');
        if (spec.sortable !== false) th.addEventListener('click', () => {
          sortDir = sortK === c.k ? -sortDir : 1; sortK = c.k; draw();
        });
        hr.appendChild(th);
      });
      t.appendChild(el('thead', {}, [ hr ]));

      const tb = el('tbody');
      if (!slice.length) {
        tb.appendChild(el('tr', {}, [ el('td', { colspan: spec.columns.length }, [
          el('div', { class: 'empty-state' }, [
            el('span', { class: 'ic', text: '\u{1F4ED}' }),
            el('h4', { text: spec.emptyTitle || 'Nothing to show' }),
            el('p', { text: spec.emptyText || 'No records match the current filters.' })
          ]) ]) ]));
      }
      slice.forEach(r => {
        const tr = el('tr');
        spec.columns.forEach(c => {
          const td = el('td', { class: (c.num ? 'num ' : '') + (c.cls || '') });
          if (c.render) td.innerHTML = c.render(r);
          else td.textContent = c.fmt ? c.fmt(r[c.k]) : (r[c.k] === undefined || r[c.k] === null ? '—' : r[c.k]);
          tr.appendChild(td);
        });
        if (spec.onRow) { tr.style.cursor = 'pointer'; tr.addEventListener('click', () => spec.onRow(r)); }
        tb.appendChild(tr);
      });
      t.appendChild(tb);

      if (spec.columns.some(c => c.total)) {
        const fr = el('tr');
        spec.columns.forEach((c, i) => {
          if (c.total) {
            const sum = rows.reduce((a, r) => a + Number(r[c.k] || 0), 0);
            fr.appendChild(el('td', { class: 'num', text: (c.fmt || money)(sum) }));
          } else fr.appendChild(el('td', { text: i === 0 ? 'Total — ' + rows.length + ' rows' : '' }));
        });
        t.appendChild(el('tfoot', {}, [ fr ]));
      }
      wrap.appendChild(t); host.appendChild(wrap);

      if (pages > 1) {
        const pg = el('div', { class: 'pager' });
        pg.appendChild(el('span', { text: 'Showing ' + ((page - 1) * size + 1) + '–' +
          Math.min(page * size, rows.length) + ' of ' + rows.length }));
        pg.appendChild(el('span', { class: 'spacer' }));
        pg.appendChild(el('button', { text: '‹', disabled: page === 1 ? '' : null, onclick: () => { page--; draw(); } }));
        for (let i = 1; i <= pages && i <= 9; i++)
          pg.appendChild(el('button', { class: i === page ? 'on' : '', text: i, onclick: () => { page = i; draw(); } }));
        pg.appendChild(el('button', { text: '›', disabled: page === pages ? '' : null, onclick: () => { page++; draw(); } }));
        host.appendChild(pg);
      }
    }
    draw();
    return { redraw: draw, setRows: r => { spec.rows = r; page = 1; draw(); } };
  }

  /* ==========================================================================
     10. KPI TILES + TABS + DRAWER
     ========================================================================== */
  function kpis(m, list) {
    const host = $(m); if (!host) return;
    host.classList.add('kpi-row'); host.innerHTML = '';
    list.forEach(k => host.appendChild(el('div', { class: 'kpi' + (k.accent ? ' accent' : '') }, [
      el('div', { class: 'k', text: k.label }),
      el('div', { class: 'v', text: k.value }),
      k.delta ? el('div', { class: 'd ' + (k.dir || ''), text: k.delta }) : null
    ])));
  }

  /* Wires .tabs buttons (data-pane) to .tabpane sections. */
  function tabs(m) {
    const host = $(m); if (!host) return;
    const btns = $$('button', host);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.toggle('on', x === b));
      $$('.tabpane').forEach(p => p.classList.toggle('on', p.id === b.dataset.pane));
    }));
    if (btns.length && !btns.some(b => b.classList.contains('on'))) btns[0].click();
  }

  let drawerEl = null;
  function drawer(spec) {
    if (!drawerEl) {
      const back = el('div', { class: 'drawer-back', onclick: () => closeDrawer() });
      drawerEl = el('aside', { class: 'drawer' }, [
        el('header', {}, [ el('h3', { id: 'drTitle' }), el('span', { class: 'close', text: '×', onclick: () => closeDrawer() }) ]),
        el('div', { class: 'dbody', id: 'drBody' }),
        el('footer', { id: 'drFoot' })
      ]);
      document.body.appendChild(back); document.body.appendChild(drawerEl);
      drawerEl.back = back;
    }
    $('#drTitle').textContent = spec.title || '';
    const b = $('#drBody'); b.innerHTML = '';
    if (typeof spec.body === 'string') b.innerHTML = spec.body; else if (spec.body) b.appendChild(spec.body);
    const f = $('#drFoot'); f.innerHTML = '';
    (spec.actions || []).forEach(a => f.appendChild(a));
    drawerEl.back.classList.add('open'); drawerEl.classList.add('open');
  }
  function closeDrawer() { if (drawerEl) { drawerEl.classList.remove('open'); drawerEl.back.classList.remove('open'); } }

  /* ==========================================================================
     11. KEY/VALUE + REFERENCE TABLE + CALLOUT helpers
     ========================================================================== */
  function kv(m, pairs) {
    const host = $(m); if (!host) return;
    host.classList.add('kv'); host.innerHTML = '';
    pairs.forEach(p => { host.appendChild(el('div', { text: p[0] })); host.appendChild(el('div', { html: p[1] })); });
  }
  /* The scoring key printed next to a scale — the client checks the wording
     against their paper form, which is where most round-2 corrections come from. */
  function refTable(m, scale) {
    const host = $(m); if (!host || !scale) return;
    const d = el('details', { class: 'ref' }, [ el('summary', { text: scale.name + ' — scoring key' }) ]);
    const t = el('table');
    (scale.rows || []).forEach(r => t.appendChild(el('tr', {}, [ el('td', { text: r[0] }), el('td', { text: r[1] }) ])));
    d.appendChild(t); host.appendChild(d);
  }

  /* ==========================================================================
     12. SECTION TOGGLE — one scrolling page, every card open, hide what you
     do not use. Built automatically from <section class="card" data-num
     data-title>. Requires markup:
       <div class="sec-toggle" id="secToggle">
         <button class="tbtn" id="secToggleBtn">Toggle Sections</button>
         <div class="sec-menu" id="secMenu"></div></div>
     ========================================================================== */
  let SECTIONS = [];
  function sectionToggle() {
    SECTIONS = $$('section.card').map(c => ({
      id: c.id, num: c.dataset.num, title: c.dataset.title, elm: c,
      draft: /draft/i.test((c.querySelector('.ch .tag') || {}).textContent || '')
    }));
    const menu = $('#secMenu'); if (!menu) return SECTIONS;
    menu.innerHTML = '';
    menu.appendChild(el('div', { class: 'mhead' }, [
      el('span', { text: 'Sections on this page' }),
      el('a', { text: 'Show all', onclick: () => setAll(true) }),
      el('a', { text: 'Hide all', onclick: () => setAll(false) })
    ]));
    SECTIONS.forEach(sec => {
      const row = el('div', { class: 'sec-item' + (sec.draft ? ' is-draft' : '') + (sec.elm.dataset.hidden ? ' is-off' : ''),
                              'data-sec': sec.num });
      const cb = el('input', { type: 'checkbox' });
      cb.checked = !sec.elm.dataset.hidden;
      if (sec.elm.dataset.hidden) sec.elm.classList.add('hidden');
      cb.addEventListener('change', () => sec.elm.classList.toggle('hidden', !cb.checked));
      sec.cb = cb; row.appendChild(cb);
      row.appendChild(el('span', { class: 'jump',
        onclick: () => { cb.checked = true; sec.elm.classList.remove('hidden'); jump(sec.elm); } }, [
        el('span', { class: 'n', text: sec.num }), el('span', { class: 't', text: sec.title })
      ]));
      menu.appendChild(row);
    });
    const toggle = $('#secToggle');
    $('#secToggleBtn').addEventListener('click', e => { e.stopPropagation(); toggle.classList.toggle('open'); });
    document.addEventListener('click', e => { if (!toggle.contains(e.target)) toggle.classList.remove('open'); });
    return SECTIONS;
  }
  function setAll(on) { SECTIONS.forEach(s => { s.cb.checked = on; s.elm.classList.toggle('hidden', !on); }); }
  function jump(target) {
    const top = target.getBoundingClientRect().top + window.pageYOffset - 118;
    window.scrollTo({ top, behavior: 'smooth' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 900);
  }

  /* ==========================================================================
     13. VALIDATION — every [data-required] field in a visible card, plus
     whatever extra rules the module passes in. Hidden cards are skipped: a
     section the user switched off cannot block the save.
       UI.completeOn('#btnComplete', { extra: () => [{sec:'4', msg:'…', el:$('#goals')}] })
     ========================================================================== */
  function validate(extra) {
    const issues = [];
    $$('[data-required]').forEach(f => {
      const host = f.closest('section.card');
      if (host && host.classList.contains('hidden')) return;
      const ok = f.value && f.value.trim();
      const field = f.closest('.field');
      f.classList.toggle('invalid', !ok);
      if (field) field.classList.toggle('has-error', !ok);
      if (!ok) issues.push({
        sec: host ? host.dataset.num : '',
        msg: ((field && field.querySelector('label') ? field.querySelector('label').textContent : 'Field')
               .replace('*', '').trim()) + ' is required',
        el: f
      });
    });
    if (extra) (extra() || []).forEach(i => issues.push(i));
    return issues;
  }

  function showIssues(issues) {
    const box = $('#vsummary'); if (!box) return;
    if (!issues.length) { box.classList.remove('show'); box.innerHTML = ''; return; }
    box.classList.add('show'); box.innerHTML = '';
    box.appendChild(el('h4', { text: issues.length + ' item' + (issues.length > 1 ? 's' : '') + ' still outstanding' }));
    const ul = el('ul');
    issues.slice(0, 40).forEach(i => {
      const a = el('a', { text: (i.sec ? 'Section ' + i.sec + ' — ' : '') + i.msg });
      a.addEventListener('click', () => {
        const sec = SECTIONS.find(x => x.num === i.sec);
        if (sec) { sec.cb.checked = true; sec.elm.classList.remove('hidden'); }
        if (i.el && i.el.scrollIntoView) i.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        else if (sec) jump(sec.elm);
        if (i.el && i.el.focus) setTimeout(() => i.el.focus(), 260);
      });
      ul.appendChild(el('li', {}, [ a ]));
    });
    if (issues.length > 40) ul.appendChild(el('li', { class: 'hint', text: '…and ' + (issues.length - 40) + ' more' }));
    box.appendChild(ul);
    $$('.sec-item').forEach(r => r.classList.toggle('state-error', issues.some(i => i.sec === r.dataset.sec)));
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* Wire the Complete/Save button: validate, or lock the form and stamp the status. */
  function completeOn(sel, opts) {
    opts = opts || {};
    $$(sel).forEach(b => b.addEventListener('click', () => {
      const issues = validate(opts.extra);
      if (issues.length) { showIssues(issues); return; }
      showIssues([]);
      const pill = $('#statusPill');
      if (pill) { pill.textContent = opts.signedLabel || 'Signed'; pill.className = 'st approved'; }
      lockForm(opts);
      if (opts.onComplete) opts.onComplete();
    }));
  }

  /* Signed record = read-only record. Showing that in the prototype is how the
     client discovers they wanted an amendment workflow, before you build one. */
  function lockForm(opts) {
    opts = opts || {};
    $$('input,select,textarea,button').forEach(f => {
      if (f.closest('.appbar') || f.closest('.sec-toggle') || f.closest('.actionbar') || f.id === 'btnNotes') return;
      f.disabled = true;
    });
    document.body.classList.add('form-locked');
    const bar = el('div', { class: 'lock-banner', html:
      '<b>Signed and locked.</b> This record can no longer be edited. Corrections are made by a dated ' +
      (opts.noun || 'amendment') + ' that supersedes it — the original stays readable.' });
    const first = $('section.card');
    if (first) first.parentNode.insertBefore(bar, first);
    bar.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ==========================================================================
     14. AUTOSAVE CHIP + CHANGE NOTES
     ========================================================================== */
  function autosave(sel) {
    const chip = $(sel || '#saveState'); if (!chip) return;
    let t = null;
    document.addEventListener('input', () => {
      store.dirty = true;
      chip.textContent = 'Unsaved changes…';
      clearTimeout(t);
      t = setTimeout(() => {
        store.dirty = false;
        chip.textContent = 'Draft saved — ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }, 1200);
    });
    window.addEventListener('beforeunload', e => { if (store.dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  /* Hidden by default. Press once and every deviation from what the client
     asked for is explained on the card it applies to. */
  function changeNotes(sel) {
    const btn = $(sel || '#btnNotes'); if (!btn) return;
    document.body.classList.add('hide-notes');
    const n = $$('details.change-note').length;
    const cnt = $('#notesCount'); if (cnt) cnt.textContent = n ? '(' + n + ')' : '';
    btn.addEventListener('click', () => {
      const showing = document.body.classList.toggle('hide-notes') === false;
      btn.classList.toggle('on', showing);
      btn.setAttribute('aria-pressed', showing);
      btn.innerHTML = (showing ? '● Hide change notes ' : '● Show change notes ') +
        '<span class="cnt" id="notesCount">' + (n ? '(' + n + ')' : '') + '</span>';
    });
  }

  /* ==========================================================================
     15. PRINT — whole record, or one section
     ========================================================================== */
  function printSection(sectionEl) {
    document.body.classList.add('print-section');
    sectionEl.classList.add('print-target');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-section');
      sectionEl.classList.remove('print-target');
    }, 400);
  }
  function sectionPrintButtons() {
    $$('section.card').forEach(c => {
      const ch = c.querySelector('.ch'); if (!ch) return;
      ch.appendChild(el('span', { class: 'secprint icon-btn', text: '⎙',
        title: 'Print only this section', onclick: () => printSection(c) }));
    });
  }

  return {
    $, $$, el, mount, bus, store, CFG, DEMO,
    fmtDate, money, ageFromDob, uid,
    shell, recordHeader,
    pills, getPills, setPills, suffixInput, chipset, repeater,
    openPicker, closeModal, matrix, matrixIssues,
    table, kpis, tabs, drawer, closeDrawer, kv, refTable,
    sectionToggle, jump, validate, showIssues, completeOn, lockForm,
    autosave, changeNotes, printSection, sectionPrintButtons
  };
})();

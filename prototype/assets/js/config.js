/* ==========================================================================
   config.js — SINGLE SOURCE OF TRUTH for the RSL / MRSL prototype.

   A "category" is one restricted-substance list (a document such as the
   AAFA RSL, the OEKO-TEX STeP standard, the EU POPs regulation). Every
   category carries its OWN column schema, because every document lays its
   table out differently. Rows are entered against a category and inherit
   its columns; the data table and the search read the same schema.

   At implementation time:
     • seedCategories  → the category + column_definition tables
     • columnTypes / columnRoles / widths → enumerations
     • settings        → module settings
   Option keys (v:/id:/key:) are lowercase-kebab and stable across rounds.
   ========================================================================== */
window.CFG = (function () {

  /* ---- Shell ------------------------------------------------------------- */
  const brand   = 'RSL Compliance';
  const company = 'Demo Textile Mills (Pvt) Ltd';
  const user    = 'Compliance Officer';
  /* [icon, CODE, 'home'|'fav'] — CODE '' hides the label */
  const modules = [
    ['\u{1F3E0}', '', 'home'], ['\u2B50', '', 'fav'],
    ['\u{1F4CB}', 'RSL'],   // Restricted substance lists (this prototype)
    ['\u{1F9EA}', 'TEST'],  // Lab test reports (future)
    ['\u{1F4E6}', 'PROD'],  // Products / articles (future)
    ['\u{1F3ED}', 'SUPP'],  // Suppliers (future)
    ['\u{1F4CA}', 'RPT']    // Reports (future)
  ];

  /* ---- Deployment settings ---------------------------------------------- */
  const settings = {
    casChecksumWarning: true,   // warn (never block) when a CAS number fails its check digit
    duplicateCasWarning: true,  // warn when the same CAS already exists in the category
    requireSectionTitle: false, // true = every row must carry a section / group title
    searchMode: 'primary'       // 'primary' = CAS + name columns only | 'all' = every column
  };

  /* ---- Column types ------------------------------------------------------ */
  const columnTypes = [
    { v: 'text',      t: 'Short text' },
    { v: 'multiline', t: 'Long text (multi-line)' },
    { v: 'number',    t: 'Number' },
    { v: 'flag',      t: 'Yes / No flag (shown as X)' }
  ];

  /* ---- Column roles — what makes a column searchable as a PRIMARY key ---- */
  const columnRoles = [
    { v: '',     t: 'Ordinary column' },
    { v: 'cas',  t: 'CAS number (primary search)' },
    { v: 'name', t: 'Chemical / substance name (primary search)' },
    { v: 'ec',   t: 'EC number (secondary search)' }
  ];

  /* ---- Column widths ----------------------------------------------------- */
  const widths = [
    { v: 'sm', t: 'Narrow',  px: 120 },
    { v: 'md', t: 'Normal',  px: 180 },
    { v: 'lg', t: 'Wide',    px: 280 }
  ];

  /* ---- Filter operators (advanced search) -------------------------------- */
  const filterOps = [
    { v: 'contains',  t: 'contains' },
    { v: 'equals',    t: 'equals' },
    { v: 'starts',    t: 'starts with' },
    { v: 'empty',     t: 'is empty' },
    { v: 'notempty',  t: 'is not empty' }
  ];

  /* ---- Seed categories — the three lists supplied by the client ----------
     Column shape: { key, label, type, role, group, width, required }
     `group` puts a spanning header band over neighbouring columns
     (OEKO-TEX: "Wastewater" over Limit + Reporting Limit).                  */
  const seedCategories = [
    {
      id: 'aafa-rsl',
      name: 'AAFA Restricted Substance List (RSL)',
      source: 'AAFA RSL',
      version: 'Release 26',
      description: 'American Apparel & Footwear Association RSL. Each table in the document (e.g. "AP and APEO") becomes a substance group; each printed row becomes one record.',
      hasSections: true,
      sectionLabel: 'Substance group (table title)',
      columns: [
        { key: 'cas',        label: 'CAS Number',                                                        type: 'multiline', role: 'cas',  width: 'sm' },
        { key: 'name',       label: 'Chemical Name',                                                     type: 'multiline', role: 'name', width: 'md', required: true },
        { key: 'limit',      label: 'Restriction / Maximum Limit on Final Product or Tested Component', type: 'multiline', width: 'lg' },
        { key: 'country',    label: 'Country',                                                           type: 'text',      width: 'sm' },
        { key: 'regulation', label: 'Regulation',                                                        type: 'multiline', width: 'lg' },
        { key: 'method',     label: 'Test Method',                                                       type: 'multiline', width: 'md' },
        { key: 'others',     label: 'Other Countries, U.S. States that also Regulate this Substance',   type: 'multiline', width: 'md' },
        { key: 'comments',   label: 'Comments',                                                          type: 'multiline', width: 'lg' }
      ]
    },
    {
      id: 'oekotex-step',
      name: 'OEKO-TEX\u00AE STeP Standard \u2014 MRSL, Wastewater & Sludge limits',
      source: 'OEKO-TEX\u00AE STeP',
      version: '2026',
      description: 'Manufacturing RSL with wastewater and sludge limit values. Numbered class headings (e.g. "1. Alkylphenols (AP\u2019s) / Alkylphenolethoxylates (APEO\u2019s)") become the section title.',
      hasSections: true,
      sectionLabel: 'Substance class (numbered heading)',
      columns: [
        { key: 'substance', label: 'Substance',                type: 'multiline', role: 'name', width: 'lg', required: true },
        { key: 'cas',       label: 'CAS No.',                  type: 'multiline', role: 'cas',  width: 'sm' },
        { key: 'mrsl',      label: 'MRSL',                     type: 'flag',      width: 'sm' },
        { key: 'ww_limit',  label: 'Limit Values [\u00B5g/l]',     type: 'text', group: 'Wastewater', width: 'sm' },
        { key: 'ww_rl',     label: 'Reporting Limit [\u00B5g/l]',  type: 'text', group: 'Wastewater', width: 'sm' },
        { key: 'sl_limit',  label: 'Limit Values [mg/kg]',     type: 'text', group: 'Sludge',     width: 'sm' },
        { key: 'sl_rl',     label: 'Reporting Limit [mg/kg]',  type: 'text', group: 'Sludge',     width: 'sm' }
      ]
    },
    {
      id: 'pops-celex',
      name: 'POPs Regulation (EU) 2019/1021 \u2014 CELEX Annex I',
      source: 'CELEX 32019R1021',
      version: 'Consolidated',
      description: 'Persistent Organic Pollutants listed in Annex I of the EU POPs Regulation, with the specific exemptions text.',
      hasSections: true,
      sectionLabel: 'Annex part',
      columns: [
        { key: 'substance', label: 'Substance',                                                  type: 'multiline', role: 'name', width: 'md', required: true },
        { key: 'cas',       label: 'CAS No',                                                     type: 'multiline', role: 'cas',  width: 'sm' },
        { key: 'ec',        label: 'EC No',                                                      type: 'multiline', role: 'ec',   width: 'sm' },
        { key: 'exemption', label: 'Specific exemption on intermediate use or other specification', type: 'multiline', width: 'lg' }
      ]
    }
  ];

  /* ---- Column templates offered when building a new category ------------ */
  const columnPresets = {
    'rsl-basic': {
      t: 'Basic RSL (CAS, name, limit, regulation)',
      columns: [
        { label: 'CAS Number', type: 'multiline', role: 'cas', width: 'sm' },
        { label: 'Chemical Name', type: 'multiline', role: 'name', width: 'md', required: true },
        { label: 'Limit', type: 'multiline', width: 'md' },
        { label: 'Regulation', type: 'multiline', width: 'md' },
        { label: 'Comments', type: 'multiline', width: 'lg' }
      ]
    }
  };

  return { brand, company, user, modules, settings, columnTypes, columnRoles, widths,
           filterOps, seedCategories, columnPresets };
})();

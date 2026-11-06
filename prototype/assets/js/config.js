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
     • materialTypes / productTemplate → raw-material enumeration and the
       product import layout (round 2)
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
    ['\u{1F4E6}', 'PROD'],  // Products + raw materials (round 2)
    ['\u{1F3ED}', 'SUPP'],  // Suppliers (future)
    ['\u{1F4CA}', 'RPT']    // Reports (future)
  ];

  /* ---- Deployment settings ---------------------------------------------- */
  const settings = {
    casChecksumWarning: true,   // warn (never block) when a CAS number fails its check digit
    duplicateCasWarning: true,  // warn when the same CAS already exists in the category
    requireSectionTitle: false, // true = every row must carry a section / group title
    searchMode: 'primary',      // 'primary' = CAS + name columns only | 'all' = every column

    /* ---- round 2: Excel import, versions, products ---- */
    importDefaultMode: 'replace', // 'replace' = the file is the complete new list | 'merge' = add & update only
    importDefaultModeProducts: 'merge', // products grow over time, so a partial file must not remove the others
    importBadRows: 'block',       // 'block' = no import until every row is valid | 'skip' = import the valid rows, leave the rest out
    importRowLimit: 1000,         // PROTOTYPE ONLY — data lives in the browser; the real system has no row limit
    searchShowsProducts: true     // the substance search also lists matching products / raw materials
  };

  /* ---- Raw-material types (round 2) -------------------------------------- */
  const materialTypes = [
    { v: 'dye',       t: 'Dye / pigment' },
    { v: 'auxiliary', t: 'Auxiliary / surfactant' },
    { v: 'finish',    t: 'Finishing chemical' },
    { v: 'print',     t: 'Print paste / ink' },
    { v: 'fabric',    t: 'Fabric / yarn' },
    { v: 'trim',      t: 'Trim / accessory' },
    { v: 'other',     t: 'Other' }
  ];

  /* ---- How a version came to exist (version history) --------------------- */
  const versionModes = [
    { v: 'initial',        t: 'Starting data',  c: 'draft' },
    { v: 'import-replace', t: 'Excel import — replaced', c: 'approved' },
    { v: 'import-merge',   t: 'Excel import — added & updated', c: 'approved' },
    { v: 'manual',         t: 'Manual edits',   c: 'pending' },
    { v: 'revert',         t: 'Reverted',       c: 'info' }
  ];

  /* ---- Product import layout (round 2) ------------------------------------
     One Excel row per product x raw material. The headings and their aliases
     follow the "Product_Input" sheet of the CAS Screening Hub workbook, so
     that sheet uploads as it is ("Component / material" = raw material; one
     row per CAS number is merged into one raw material).                    */
  const productTemplate = [
    { key: 'product_code',  label: 'Product ID', width: 18, aliases: ['Product code', 'Product no'],
      example: 'EXAMPLE', help: 'Your article / style number. Repeat it on every row of the same product. Empty = a raw material that is not on any product yet.' },
    { key: 'product_name',  label: 'Product name', width: 36, aliases: ['Product', 'Article name'],
      example: 'Example product \u2014 delete this row', help: 'Needed once per product; later rows of the same product may leave it empty.' },
    { key: 'customer',      label: 'Customer / buyer', width: 22, aliases: ['Customer', 'Buyer', 'Brand'],
      example: 'Demo Brand', help: 'Optional. The buyer whose requirements the product must meet.' },
    { key: 'material_name', label: 'Raw material', width: 36, aliases: ['Component / material', 'Component', 'Material', 'Raw material name'],
      example: 'Example dye', help: 'The raw material tagged to the product. A material that does not exist yet is created.' },
    { key: 'material_code', label: 'Raw material code', width: 18, aliases: ['Material code'],
      example: '', help: 'Optional. Leave empty and the system gives a new raw material the next RM number.' },
    { key: 'material_type', label: 'Material type', width: 22, aliases: ['Type'], options: 'materialTypes',
      example: 'Dye / pigment', help: 'Optional. Pick from the drop-down list.' },
    { key: 'supplier',      label: 'Supplier', width: 26, aliases: ['Vendor'],
      example: 'Example Chemicals Ltd', help: 'Optional. Who supplies the raw material.' },
    { key: 'cas',           label: 'CAS Number', role: 'cas', width: 20, aliases: ['CAS No', 'CAS No.', 'CAS', 'CAS numbers'],
      example: '50-00-0', help: 'CAS numbers contained in the raw material: several in one cell (one per line) or one row per CAS number \u2014 both work.' }
  ];

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
    },
    /* Round 2 — the "Master_Database" sheet of the CAS Screening Hub workbook,
       as one more category. Column headings are the workbook's own, so the
       workbook itself can be uploaded on the Excel import screen.           */
    {
      id: 'cas-screening-master',
      addedIn: 2,
      name: 'CAS Screening Hub \u2014 master database',
      source: 'CAS Screening Hub workbook',
      version: 'v1.0',
      description: 'One row per CAS number \u00D7 standard, as laid out on the Master_Database sheet of the workbook you supplied. The 29 rows loaded here are a sample extract of its 22,822.',
      hasSections: true,
      sectionLabel: 'Library',
      sectionAliases: ['Category'],
      rowKey: 'record_id',   // the workbook's own unique id: re-imports match rows on it
      columns: [
        { key: 'record_id',    label: 'Record ID',                    type: 'text',      width: 'sm' },
        { key: 'cas',          label: 'CAS Number',                   type: 'multiline', role: 'cas',  width: 'sm' },
        { key: 'substance',    label: 'Substance / Group',            type: 'multiline', role: 'name', width: 'md', required: true },
        { key: 'std_id',       label: 'Standard ID',                  type: 'text',      width: 'sm' },
        { key: 'std_name',     label: 'Standard Name',                type: 'multiline', width: 'md' },
        { key: 'issuer',       label: 'Issuer',                       type: 'text',      width: 'sm' },
        { key: 'std_type',     label: 'Standard Type',                type: 'text',      width: 'sm' },
        { key: 'version',      label: 'Version / Year',               type: 'text',      width: 'sm' },
        { key: 'region',       label: 'Region',                       type: 'text',      width: 'sm' },
        { key: 'status',       label: 'Status',                       type: 'text',      width: 'sm' },
        { key: 'limit_stated', label: 'Limit (as stated in source)',  type: 'text',      width: 'sm' },
        { key: 'limit_ppm',    label: 'Limit (ppm)',                  type: 'number',    width: 'sm' },
        { key: 'extract',      label: 'Requirement / source extract', type: 'multiline', width: 'lg' },
        { key: 'source_doc',   label: 'Source document',              type: 'multiline', width: 'md' },
        { key: 'confidence',   label: 'Confidence',                   type: 'text',      width: 'sm' }
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
           filterOps, seedCategories, columnPresets, materialTypes, versionModes, productTemplate };
})();

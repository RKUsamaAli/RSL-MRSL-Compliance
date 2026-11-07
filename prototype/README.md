# RSL / MRSL Compliance — clickable prototype (round 3)

Open `index.html` in any browser. No server, no build, no dependencies. Rows you add are kept in
the browser's local storage so they survive moving between pages; **Reset demo data** on the
landing page restores the original content.

## Screens

| File | What it is |
|---|---|
| `index.html` | Landing page: journey, what is built, open questions, "try these" |
| `categories.html` | Register of substance-list categories (one per source document) |
| `category-form.html` | Category builder: name, document, column list with type / role / band / width, live header preview |
| `entry.html` | Add or edit one row against the selected category's columns |
| `data.html` | Search (CAS number / chemical name, any column, column filters) + per-category data tables + CSV export |
| `products.html` | Round 2: product and raw-material registers with one search; each product lists its attached raw materials |
| `product-form.html` | Round 2: create or edit a product and tag raw materials |
| `report.html` | Round 3: product report (Product Name, Raw materials, CAS #) with print and Excel download |
| `import.html` | Round 2: template download, upload preview, import, version history, compare, revert |
| `change-notes.html` | Every deviation from the source documents, with the reason |
| `docs/rsl-prototype.plan.yaml` | Staged plan, challenges to the brief, open questions |

## Demo script

### A. Search (data.html)

| Do this | It shows |
|---|---|
| Open `data.html` | All three categories, each as its own table with its own headings; OEKO-TEX has the two-row Wastewater / Sludge header; section bands ("AP and APEO", "1. Alkylphenols…", "Part A") |
| Type `nonyl` | Matches in all three lists; matched text is highlighted; the KPI strip shows matches vs. rows in scope |
| Type `11066492` (no dashes) | Finds OEKO-TEX Nonylphenol via CAS 11066-49-2 inside a six-number cell; KPI notes "CAS query — dashes ignored" |
| Type `104-40-5` | Same row, matched on a number from the middle of the cell |
| Type `REACH` | Nothing in primary mode; switch **Match against** to *Any column* → AAFA rows hit on Regulation / Comments |
| Set **Search in** to AAFA, click **+ Add column filter**, choose *Country*, contains `China` | Only the third AAFA row remains |
| Click any row | Right-hand drawer with every column of that row, in that category's wording; Edit / Delete |
| Click **Export CSV** | One CSV per category shown, with the category's headings (band prefixed, e.g. "Wastewater — Limit Values") |

### B. Add rows (entry.html)

| Do this | It shows |
|---|---|
| Open `entry.html?cat=oekotex-step` | Form generated from the OEKO-TEX columns; existing section title offered as a chip |
| Type `1234-56-8` in CAS No. | Amber chip: check digit does not match (1234-56-7 would be green) |
| Add a line `11066-49-2` | Duplicate warning names the existing Nonylphenol row (a warning, not a block) |
| Click **Save & add another** with nothing filled | Validation summary lists what is missing and jumps to the field |
| Fill Substance = `Octylphenol`, CAS `140-66-9`, MRSL = X, save & add another | Toast confirms; the form clears but keeps the section title; the row appears in "Recently added" |
| Switch the category dropdown to AAFA | The form re-renders with the eight AAFA columns |
| Press ⌘/Ctrl + Enter | Same as Save & add another |

### C. Categories (categories.html, category-form.html)

| Do this | It shows |
|---|---|
| Open `categories.html`, click a category name | Drawer with primary-column summary and a header-only preview of its table |
| Click **+ New category**, paste `CAS Number, Substance, EC No, Limit` into "paste the header row" | Four columns generated; CAS and name roles guessed; live preview header below |
| Set the band `Limits` on two columns | Preview shows the spanning band |
| Save with two columns marked as "name" | Validation refuses: exactly one name column |
| Edit OEKO-TEX, rename "MRSL" to "MRSL listed", save, open the data table | Heading changed, values intact, search unchanged |
| Copy a category | New category pre-filled with the same columns |

### D. Products and raw materials (products.html, product-form.html)

| Do this | It shows |
|---|---|
| Open `products.html`, type `PROD-TEST-001` | The product with its four attached raw materials, supplier and CAS numbers |
| Type `formaldehyde` | The same product, found through RM-003 which only states CAS 50-00-0 |
| Type `WA-200`, open the **Raw materials** tab | The raw material and the product chips that use it |
| On `data.html`, search `PROD-TEST-001` | The same attached list appears above the substance lists |
| Click **+ New product**, tag two raw materials, add a new one, save | The product opens with all three attached; the new one got the next RM number |
| Save another product with the same Product ID | Validation refuses the duplicate |
| Open `report.html`, type `WA-200`, click **Print** or **Excel** | Products using that raw material, each listing all its raw materials and CAS numbers; the product cell is merged |

### E. Excel import and versions (import.html)

| Do this | It shows |
|---|---|
| Choose OEKO-TEX, click **Blank template** | A real .xlsx: Data sheet, yellow example row, drop-down on MRSL, How to fill sheet |
| Fill two rows, upload | Preview: 2 new, 1 removed; the example row is ignored |
| Type `maybe` in the MRSL column, upload | The error names the Excel row; Import is disabled |
| Upload the good file, name it `2027`, import | Version 2 appears; the category shows edition 2027; the new rows are searchable |
| Click **Revert** on version 1 | The drawer shows what changes; confirming creates version 3 with the original row |
| Revert to version 2 | The revert itself is undone; history keeps every step |
| Edit a row on `entry.html`, return here | A note offers to save the edits; they become a Manual edits version before any import |
| Download **Current data**, change a cell, upload | Only that row shows as changed, old value struck through |
| Upload a file from another list | Refused, with a button to switch to the right list |
| Choose CAS Screening Hub, upload the workbook | Master_Database is found by itself; 22,822 rows read, first 1,000 used (browser limit) |
| Choose Products & raw materials, upload the workbook | Product_Input is found; calculated columns are ignored; "Dyed fabric" becomes a raw material |

## What we are still waiting on

| Decision | Where it lands |
|---|---|
| Is a row without a section title allowed? | `CFG.settings.requireSectionTitle` |
| Default search: primary columns or any column? | `CFG.settings.searchMode` |
| Numeric comparison of limit values for the future product check | column `type` of the limit columns (`text` today) |
| Who may change a category's columns once rows exist | permissions — not in this round |
| Real POPs rows to replace the striped samples | `demo-data.js` → data entry |
| One bad row: stop the import, or import the good rows? | `CFG.settings.importBadRows` |
| Default import: replace or add & update? | `CFG.settings.importDefaultMode`, `importDefaultModeProducts` |
| Are CAS numbers held per raw material only, or per product + component too? | product data model |
| Real product and raw-material data | `demo-data.js`, or upload through `import.html` |

## Hand-off after approval

`config.js` → category / column definition tables and enumerations (column types, roles, widths,
filter operators, material types, version modes, product import layout). `rsl-excel.js` → server-side
template and import rules. `xlsx-lite.js` is a stand-in for a server spreadsheet library. `RSL` store API in `rsl-common.js` → the REST surface (categories, entries,
sections, products, materials, versions). Search rules (`matchEntry`, `applyFilters`, CAS normalisation and checksum) → server-side
search. `change-notes.html` + the plan yaml → requirement history.

# RSL / MRSL Compliance — clickable prototype (round 1)

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

## What we are still waiting on

| Decision | Where it lands |
|---|---|
| Is a row without a section title allowed? | `CFG.settings.requireSectionTitle` |
| Default search: primary columns or any column? | `CFG.settings.searchMode` |
| Numeric comparison of limit values for the future product check | column `type` of the limit columns (`text` today) |
| Who may change a category's columns once rows exist | permissions — not in this round |
| Real POPs rows to replace the striped samples | `demo-data.js` → data entry |

## Hand-off after approval

`config.js` → category / column definition tables and enumerations (column types, roles, widths,
filter operators). `RSL` store API in `rsl-common.js` → the REST surface (categories, entries,
sections). Search rules (`matchEntry`, `applyFilters`, CAS normalisation and checksum) → server-side
search. `change-notes.html` + the plan yaml → requirement history.

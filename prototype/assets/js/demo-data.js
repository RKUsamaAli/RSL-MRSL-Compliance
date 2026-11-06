/* ==========================================================================
   demo-data.js — seed rows for the prototype.
   The AAFA and OEKO-TEX rows are transcribed from the two page images the
   client supplied. The POPs rows are ILLUSTRATIVE samples (real substance
   names and CAS numbers, exemption text paraphrased) so the third category
   is not empty during review — they are tagged `sample:true` and must be
   replaced by the client's own transcription.
   Entry shape: { id, cat, section, values:{colKey: value}, sample?, createdAt }
   Multi-value cells (several CAS numbers) are ONE PER LINE.

   Round 2 adds:
     • 29 rows copied from the Master_Database sheet of the CAS Screening Hub
       workbook the client supplied (category `cas-screening-master`)
     • raw materials and products — SYNTHETIC. Product PROD-TEST-001 carries
       the name used in the workbook's Product_Input sheet; every other name,
       supplier and customer is invented. CAS numbers are real so the
       cross-check against the lists has something to find.
   Material shape: { id, code, name, type, supplier, cas (one per line), notes }
   Product shape:  { id, code, name, customer, notes, materials:[material id] }
   ========================================================================== */
window.DEMO = {
  entries: [
    /* ---------- AAFA RSL — table "AP and APEO" ---------- */
    {
      id: 'e-aafa-1', cat: 'aafa-rsl', section: 'AP and APEO', createdAt: '2026-09-15T09:00:00Z',
      values: {
        cas: 'All CAS of isomers of NP',
        name: 'Nonylphenol\nC6H4(OH)C9H19',
        limit: 'Taiwan - sum of NP and NPEO <1000 ppm;\n\nSouth Korea - sum of NP and NPEO <100 ppm for children <13 years old\n\nEU, Switzerland, Turkey - NPEO < 100 ppm (textile articles intended to be washed);',
        country: 'Taiwan, South Korea',
        regulation: 'Taiwan CNS 15290 (for all textile products)\n\nKorea KC Mark',
        method: 'EN ISO 21084:2019',
        others: '',
        comments: 'Nonylphenol is included in the REACH Candidate list.\n\nIt is also included in annex XVII entry 46 for substances and mixtures (textiles and leather processing). Not for articles.'
      }
    },
    {
      id: 'e-aafa-2', cat: 'aafa-rsl', section: 'AP and APEO', createdAt: '2026-09-15T09:05:00Z',
      values: {
        cas: 'All CAS of isomers of NPEO',
        name: 'Nonylphenol ethoxylates\n(C2H4O)nC15H24O',
        limit: 'Taiwan - sum of NP and NPEO <1000 ppm;\n\nSouth Korea - sum of NP and NPEO <100 ppm for children <13 years old\n\nEU, Switzerland, Turkey - NPEO < 100 ppm (textile articles intended to be washed);',
        country: 'Taiwan, South Korea, EU',
        regulation: 'European Union REACH Regulation (EC) No 1907/2006 Annex XVII entry 46a and European Union REACH Regulation (EC) no. 1907/2006 Candidate List',
        method: 'BS EN ISO 18254-1:2016 Textiles - Methods for the Detection and Determination of alkyl phenol ethoxylates APEOS\n\nBS EN 18218-1:2023 Leather - Determination of ethoxylated alkylphenols (APEO)',
        others: '',
        comments: 'REACH Annex XVII entry 46a is applicable to textile articles which can reasonably be expected to be washed in water. Second hand textile articles or articles made of 100% recycled content are exempt'
      }
    },
    {
      id: 'e-aafa-3', cat: 'aafa-rsl', section: 'AP and APEO', createdAt: '2026-09-15T09:10:00Z',
      values: {
        cas: 'All CAS of isomers of NP, OP, NPEO, OPEO',
        name: 'Nonylphenol (NP)\nOctylphenol (OP)\nNonylphenol Ethoxylates (NPEO)\nOctylphenol Ethoxylates (OPEO)',
        limit: 'NP, OP: <10 mg/kg (sum) (10 ppm)\nNP, OP, NPEO, OPEO: <100 mg/kg (sum) (100 ppm)',
        country: 'China',
        regulation: 'GB/T 14272-2021 (Down Garment)\n\nFZ/T 73005-2021 (Low Wool Content and Wool-Like Knitting Goods)\n\nFZ/T 73018-2021 (Wool Knitting Goods)',
        method: 'Textile: GB/T 23322\n\nDown: GB/T 14272-2021 Clause 5.6.2',
        others: 'China: FZ/T 73009-2021 (Cashmere Knitting Goods)',
        comments: 'Updated China Product Standards to 2021 version in which AP (NP, OP) and APEO (NPEO, OPEO) are added.\n\nNew proposal: Morocco: Legislation 00.9.0000 Textile and leather materials in textile articles. Limit: 100 ppm sum of NPEO and OPEO'
      }
    },

    /* ---------- OEKO-TEX STeP — class 1 ---------- */
    {
      id: 'e-step-1', cat: 'oekotex-step', section: '1. Alkylphenols (AP’s) / Alkylphenolethoxylates (APEO’s)', createdAt: '2026-09-15T10:00:00Z',
      values: {
        substance: 'Nonylphenol (n-nonyl and iso-nonyl)',
        cas: 'Various\n11066-49-2\n25154-52-3\n104-40-5\n90481-04-2\n84852-15-3',
        mrsl: 'yes',
        ww_limit: '5',
        ww_rl: '1',
        sl_limit: 'testing required',
        sl_rl: '0.4'
      }
    },

    /* ---------- POPs CELEX — illustrative samples ---------- */
    {
      id: 'e-pops-1', cat: 'pops-celex', section: 'Part A', sample: true, createdAt: '2026-09-15T11:00:00Z',
      values: {
        substance: 'Tetrabromodiphenyl ether\nC12H6Br4O',
        cas: '40088-47-9',
        ec: '254-787-2',
        exemption: 'SAMPLE TEXT (paraphrased) — Placing on the market and use of articles containing the substance in concentrations below 10 mg/kg (0,001 % by weight) is allowed; sum of tetra-, penta-, hexa-, hepta- and decaBDE limited to 500 mg/kg in mixtures and articles.'
      }
    },
    {
      id: 'e-pops-2', cat: 'pops-celex', section: 'Part A', sample: true, createdAt: '2026-09-15T11:05:00Z',
      values: {
        substance: 'Perfluorooctane sulfonic acid and its derivatives (PFOS)\nC8F17SO2X',
        cas: '1763-23-1\n2795-39-3\n29457-72-5\n29081-56-9\n70225-14-8\n56773-42-3\n251099-16-8\n4151-50-2\n31506-32-8\n1691-99-2\n24448-09-7\n307-35-7',
        ec: '217-179-8\n220-527-1\n249-644-6\n249-415-0\n274-460-8\n260-375-3\n223-980-3\n250-665-8\n216-887-4\n246-262-1\n206-200-6',
        exemption: 'SAMPLE TEXT (paraphrased) — Concentrations equal to or below 10 mg/kg (0,001 % by weight) in substances or mixtures are tolerated; specific exemption for mist suppressants in non-decorative hard chromium (VI) plating in closed loop systems.'
      }
    },
    {
      id: 'e-pops-3', cat: 'pops-celex', section: 'Part A', sample: true, createdAt: '2026-09-15T11:10:00Z',
      values: {
        substance: 'Alkanes C10-C13, chloro (short-chain chlorinated paraffins) (SCCPs)',
        cas: '85535-84-8',
        ec: '287-476-5',
        exemption: 'SAMPLE TEXT (paraphrased) — Production, placing on the market and use of substances or mixtures containing SCCPs below 1 % by weight, or articles containing SCCPs below 0,15 % by weight, is allowed.'
      }
    },
    {
      id: 'e-pops-4', cat: 'pops-celex', section: 'Part B', sample: true, createdAt: '2026-09-15T11:15:00Z',
      values: {
        substance: 'Hexabromocyclododecane (HBCDD)',
        cas: '25637-99-4\n3194-55-6\n134237-50-6\n134237-51-7\n134237-52-8',
        ec: '247-148-4\n221-695-9',
        exemption: 'SAMPLE TEXT (paraphrased) — Concentrations equal to or below 100 mg/kg (0,01 % by weight) tolerated in substances, mixtures, articles or as constituents of flame-retarded articles.'
      }
    },

    /* ---------- CAS Screening Hub — Master_Database, sample extract ---------- */
    { id: "e-hub-04670", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-04670","cas":"117-81-7","substance":"Bis(2-ethylhexyl) Phthalate (DEHP)","std_id":"STD-016","std_name":"Fast Retailing Product Restricted Substances List (PRSL)","issuer":"Fast Retailing","std_type":"Brand RSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"50 mg/kg","limit_ppm":"50","extract":"Bis(2-ethylhexyl) Phthalate (DEHP) 117-81-7 50 mg/kg yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _  Product Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-05199", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05199","cas":"117-81-7","substance":"Bis(2-ethylhexyl) Phthalate (DEHP)","std_id":"STD-017","std_name":"Fast Retailing Manufacturing Restricted Substances List (MRSL)","issuer":"Fast Retailing","std_type":"Brand MRSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"250 mg/kg","limit_ppm":"250","extract":"Bis(2-ethylhexyl) Phthalate (DEHP) 117-81-7 No intentional use Sum: 250 mg/kg yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _ Manufacturing Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-05619", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05619","cas":"117-81-7","substance":"Di(2-ethylhexyl)-phthalate (DEHP)","std_id":"STD-018","std_name":"Gymshark RSL & Test Matrix V1","issuer":"Gymshark","std_type":"Brand RSL","version":"2025","region":"Global","status":"Reportable / Listed","limit_stated":"","limit_ppm":"","extract":"117-81-7 | Di(2-ethylhexyl)-phthalate (DEHP) || di (2-ethylhexyl) phthalate (SVHC Authorisation List - sunset date 21/02/2015) | 204-211-0 | 117-81-7 | DEHP","source_doc":"Customer RSL MRSL / 2025 _ Gymshark RSL Testing 2025 V1","confidence":"High"} },
    { id: "e-hub-11791", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-11791","cas":"117-81-7","substance":"Di(ethylhexyl) phthalate (DEHP)","std_id":"STD-029","std_name":"New Balance Restricted Substances Manual (RSM)","issuer":"New Balance","std_type":"Brand RSL","version":"2026","region":"Global","status":"Numeric limit","limit_stated":"1000 mg/kg; 100 mg/kg","limit_ppm":"100","extract":"117-81-7 Di(ethylhexyl) phthalate (DEHP) || 117-81-7 Bis-(2-ethylhexyl)phthalate (DEHP) 1000 mg/kg 100 mg/kg","source_doc":"Customer RSL MRSL / 2026 _ New Balance _ NB_RSM_2026","confidence":"High"} },
    { id: "e-hub-13369", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-13369","cas":"117-81-7","substance":"Phthalates Di(2-ethylhexyl)-phthalate (DEHP)","std_id":"STD-035","std_name":"YONEX Restricted Chemical Substances Detailed List (EN)","issuer":"YONEX","std_type":"Brand RSL","version":"2024","region":"Japan","status":"Numeric limit","limit_stated":"500 ppm","limit_ppm":"500","extract":"Phthalates Di(2-ethylhexyl)-phthalate (DEHP) 117-81-7 500 ppm each EU REACH Regulation (Annex XIV・XVII) 、 〇","source_doc":"Customer RSL MRSL / Yonex / 2. Yonex制限化学物質詳細リスト_英語版_240930 ","confidence":"High"} },
    { id: "e-hub-04756", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-04756","cas":"1763-23-1","substance":"Perfluoroctane sulfonate (PFOS) and its salts","std_id":"STD-016","std_name":"Fast Retailing Product Restricted Substances List (PRSL)","issuer":"Fast Retailing","std_type":"Brand RSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"0.01 mg/kg","limit_ppm":"0.01","extract":"Perfluoroctane sulfonate (PFOS) and its salts 1763-23-1 0.01 mg/kg 1:2022 & 17681-2:2022 for all yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _  Product Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-05267", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05267","cas":"1763-23-1","substance":"Perfluoroctane sulfonate (PFOS)","std_id":"STD-017","std_name":"Fast Retailing Manufacturing Restricted Substances List (MRSL)","issuer":"Fast Retailing","std_type":"Brand MRSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"2 mg/kg","limit_ppm":"2","extract":"Perfluoroctane sulfonate (PFOS) 1763-23-1 No intentional use 2 mg/kg yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _ Manufacturing Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-08832", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-08832","cas":"25637-99-4","substance":"HBCDD","std_id":"STD-025","std_name":"Gerber Childrenswear RSL 2026","issuer":"Gerber","std_type":"Brand RSL","version":"2026","region":"USA","status":"Numeric limit","limit_stated":"50 ppm; 75 ppm; 1000 ppm","limit_ppm":"50","extract":"Hexabromocyclododecane and all main diastereomeres identified (alpha-, beta-, gamma-) | HBCDD | 3194-55-6,\n134237-50-6,\n134237-51-7,\n134237-52-8,\n25637-99-4, et. al. | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 50 | 75 | 10 || Flame Retardants | 25637-99-4, 3194-55-6, 134237-50-6,\n134237-51-7 , 134237-","source_doc":"Customer RSL MRSL / 2026 _ Gerber_RSL 2026","confidence":"Verify – several limits in source"} },
    { id: "e-hub-04863", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-04863","cas":"335-67-1","substance":"Perfluorooctanoic acid (PFOA) and its salts","std_id":"STD-016","std_name":"Fast Retailing Product Restricted Substances List (PRSL)","issuer":"Fast Retailing","std_type":"Brand RSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"0.01 mg/kg","limit_ppm":"0.01","extract":"Perfluorooctanoic acid (PFOA) and its salts 335-67-1 0.01 mg/kg 1:2022 & 17681-2:2022 for all yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _  Product Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-05345", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05345","cas":"335-67-1","substance":"Perfluorooctanoic acid (PFOA) and its salts","std_id":"STD-017","std_name":"Fast Retailing Manufacturing Restricted Substances List (MRSL)","issuer":"Fast Retailing","std_type":"Brand MRSL","version":"2025","region":"Global","status":"Banned / Prohibited","limit_stated":"","limit_ppm":"","extract":"Perfluorooctanoic acid (PFOA) and its salts 335-67-1 No intentional use PFOA-related substances = 1 yes || Perfluorooctanoic acid (PFOA) and its salts 335-67-1 No intentional use PFOA-related substances = 1 yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _ Manufacturing Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-05846", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05846","cas":"335-67-1","substance":"Perfluorooctanoic acid (PFOA)","std_id":"STD-018","std_name":"Gymshark RSL & Test Matrix V1","issuer":"Gymshark","std_type":"Brand RSL","version":"2025","region":"Global","status":"Reportable / Listed","limit_stated":"","limit_ppm":"","extract":"335-67-1 | Perfluorooctanoic acid (PFOA) || PFOA - Perfluorooctanoic acid; Pentadecafluorooctanoic acid (SVHC) | 206-397-9 | 335-67-1","source_doc":"Customer RSL MRSL / 2025 _ Gymshark RSL Testing 2025 V1","confidence":"High"} },
    { id: "e-hub-01536", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-01536","cas":"50-00-0","substance":"Formaldehyde","std_id":"STD-007","std_name":"UNIQLO / Fast Retailing Chemical Management Standards","issuer":"UNIQLO","std_type":"Brand RSL/MRSL","version":"2024","region":"Global","status":"Numeric limit","limit_stated":"50 ppm; 5 mg/kg","limit_ppm":"5","extract":"Formaldehyde 50-00-0 inner, kid's: 50ppm || Formaldehyde 50-00-0 5 mg/kg yes","source_doc":"Customer RSL MRSL / 2024 - UniQlo _ Chemical Management Standards20240531_ENG","confidence":"High"} },
    { id: "e-hub-02030", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-02030","cas":"50-00-0","substance":"Formaldehyde","std_id":"STD-008","std_name":"ALDI Restricted Substances List","issuer":"ALDI","std_type":"Retailer RSL","version":"2024","region":"EU","status":"Numeric limit","limit_stated":"50 mg/kg","limit_ppm":"50","extract":"Formaldehyde 50-00-0 50 mg/kg (adults, skin contact) EN ISO 17266-2:2019 with textile, leather, artificial leather, natural materials (main materials) Natural Leather & fur skin","source_doc":"Customer RSL MRSL / 2024 _ ALDI_RSL_Apr_2024","confidence":"High"} },
    { id: "e-hub-02526", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-02526","cas":"50-00-0","substance":"Formaldehyde","std_id":"STD-009","std_name":"HEMA RSL 5.0 (GOTS) – Textile Products","issuer":"HEMA","std_type":"Retailer RSL","version":"2024","region":"EU","status":"Numeric limit","limit_stated":"16 mg/kg","limit_ppm":"16","extract":"Formaldehyde 50-00-0 EN ISO 17226-2:2019 with < 16 mg/kg","source_doc":"Customer RSL MRSL / 2024 _ HEMA RSL 5.0 GOTS 2024 - applicable for textile products","confidence":"High"} },
    { id: "e-hub-03551", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-03551","cas":"50-00-0","substance":"Formaldehyde - Content","std_id":"STD-013","std_name":"Decathlon MRSL (Annex C, v15)","issuer":"Decathlon","std_type":"Brand MRSL","version":"2025 v15","region":"Global","status":"Numeric limit","limit_stated":"5000 ppm","limit_ppm":"5000","extract":"Formaldehyde - Content 50-00-0 5000 ppm Several DS0417","source_doc":"Customer RSL MRSL / 2025 _ Annex C - Decathlon MRSL version 15","confidence":"High"} },
    { id: "e-hub-03953", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-03953","cas":"50-00-0","substance":"Formaldehyde","std_id":"STD-014","std_name":"Decathlon Product RSL (Annex D, v15)","issuer":"Decathlon","std_type":"Brand RSL","version":"2025 v15","region":"Global","status":"Numeric limit","limit_stated":"16 ppm","limit_ppm":"16","extract":"Formaldehyde 50-00-0 Indonesia Ministerial Regulation No. 18 limits Formaldehyde to “not detectedˮ (16","source_doc":"Customer RSL MRSL / 2025 _ Annex D - Decathlon PRSL version 15","confidence":"High"} },
    { id: "e-hub-04905", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-04905","cas":"50-00-0","substance":"Formaldehyde","std_id":"STD-016","std_name":"Fast Retailing Product Restricted Substances List (PRSL)","issuer":"Fast Retailing","std_type":"Brand RSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"5 mg/kg","limit_ppm":"5","extract":"Formaldehyde 50-00-0 5 mg/kg yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _  Product Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-02105", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-02105","cas":"7440-43-9","substance":"Cadmium(Cd)","std_id":"STD-008","std_name":"ALDI Restricted Substances List","issuer":"ALDI","std_type":"Retailer RSL","version":"2024","region":"EU","status":"Numeric limit","limit_stated":"0.1 mg/kg","limit_ppm":"0.1","extract":"Cadmium(Cd) 7440-43-9 DIN EN 16711-1:2016 Polymers, coatings, prints, artificial leather, metals || Cadmium (Cd) 7440-43-9 0,1 mg/kg 0,1 mg/kg","source_doc":"Customer RSL MRSL / 2024 _ ALDI_RSL_Apr_2024","confidence":"High"} },
    { id: "e-hub-04084", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-04084","cas":"7440-43-9","substance":"Cadmium (Cd)","std_id":"STD-014","std_name":"Decathlon Product RSL (Annex D, v15)","issuer":"Decathlon","std_type":"Brand RSL","version":"2025 v15","region":"Global","status":"Numeric limit","limit_stated":"40 ppm","limit_ppm":"40","extract":"Cadmium (Cd) 7440-43-9","source_doc":"Customer RSL MRSL / 2025 _ Annex D - Decathlon PRSL version 15","confidence":"High"} },
    { id: "e-hub-05462", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05462","cas":"7440-43-9","substance":"Total Cadmium, Cd","std_id":"STD-017","std_name":"Fast Retailing Manufacturing Restricted Substances List (MRSL)","issuer":"Fast Retailing","std_type":"Brand MRSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"50 mg/kg","limit_ppm":"50","extract":"Total Cadmium, Cd 7440-43-9 No intentional use yes","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _ Manufacturing Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-06050", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-06050","cas":"7440-43-9","substance":"Cadmium (Cd)","std_id":"STD-018","std_name":"Gymshark RSL & Test Matrix V1","issuer":"Gymshark","std_type":"Brand RSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"75 ppm","limit_ppm":"75","extract":"7440-43-9 | Cadmium (Cd) || 7440-43-9 | Cadmium (Cd)","source_doc":"Customer RSL MRSL / 2025 _ Gymshark RSL Testing 2025 V1","confidence":"High"} },
    { id: "e-hub-03214", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-03214","cas":"84852-15-3","substance":"Phenol, 4-nonyl-, branched","std_id":"STD-010","std_name":"Primark RSL V1.2","issuer":"Primark","std_type":"Retailer RSL","version":"2024","region":"EU/UK","status":"Listed","limit_stated":"","limit_ppm":"","extract":"84852-15-3 Phenol, 4-nonyl-, branched 68412-54-4 Poly (oxy-1,2-ethanediyl), alpha-(nonylphenyl)-omega-hydroxy-, branched","source_doc":"Customer RSL MRSL / 2024 _ Primark_s RSL 2024 V1.2","confidence":"Medium"} },
    { id: "e-hub-05091", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-05091","cas":"84852-15-3","substance":"Nonylphenol (NP) Leather: Sum of AP (except BP): 20 HP, BP, : 3 AP yes","std_id":"STD-016","std_name":"Fast Retailing Product Restricted Substances List (PRSL)","issuer":"Fast Retailing","std_type":"Brand RSL","version":"2025","region":"Global","status":"Numeric limit","limit_stated":"3 mg/kg","limit_ppm":"3","extract":"5 84852-15-3","source_doc":"Customer RSL MRSL / 2025 _ Fast Retailing _  Product Restricted Substances List (2025 ver.)_final","confidence":"High"} },
    { id: "e-hub-04141", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-04141","cas":"85535-84-8","substance":"(SCCPs) (C10-C13)","std_id":"STD-014","std_name":"Decathlon Product RSL (Annex D, v15)","issuer":"Decathlon","std_type":"Brand RSL","version":"2025 v15","region":"Global","status":"Numeric limit","limit_stated":"1000 ppm","limit_ppm":"1000","extract":"(SCCPs) (C10-C13) 85535-84-8 1000 ppm","source_doc":"Customer RSL MRSL / 2025 _ Annex D - Decathlon PRSL version 15","confidence":"High"} },
    { id: "e-hub-06126", cat: 'cas-screening-master', section: "Customer RSL/MRSL", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-06126","cas":"85535-84-8","substance":"Short-chain Chlorinated Paraffins (SCCPs) (C10-C13)","std_id":"STD-018","std_name":"Gymshark RSL & Test Matrix V1","issuer":"Gymshark","std_type":"Brand RSL","version":"2025","region":"Global","status":"Reportable / Listed","limit_stated":"","limit_ppm":"","extract":"85535-84-8 | Short-chain Chlorinated Paraffins (SCCPs) (C10-C13) || SCCP - Short chain chlorinated paraffins (C10-13) (SVHC, Flame Retardant, POP Annex A) | 287-476-5 | 85535-84-8","source_doc":"Customer RSL MRSL / 2025 _ Gymshark RSL Testing 2025 V1","confidence":"High"} },
    { id: "e-hub-19155", cat: 'cas-screening-master', section: "International Standard", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-19155","cas":"117-81-7","substance":"Di (ethylhexyl)","std_id":"STD-049","std_name":"ZDHC Manufacturing Restricted Substances List (MRSL) v3.1","issuer":"ZDHC Foundation","std_type":"Industry MRSL","version":"v3.1","region":"Global","status":"Numeric limit","limit_stated":"250 mg/kg","limit_ppm":"250","extract":"Di (ethylhexyl) 117-81-7 Textile No intentional use Sum = 250 mg/kg GC-MS","source_doc":"International Standard RSL-MRSL / ZDHC MRSL _ V3.1","confidence":"High"} },
    { id: "e-hub-19191", cat: 'cas-screening-master', section: "International Standard", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-19191","cas":"13463-67-7","substance":"Titanium Dioxide","std_id":"STD-049","std_name":"ZDHC Manufacturing Restricted Substances List (MRSL) v3.1","issuer":"ZDHC Foundation","std_type":"Industry MRSL","version":"v3.1","region":"Global","status":"Numeric limit","limit_stated":"1 %","limit_ppm":"10000","extract":"Titanium Dioxide 13463-67-7 Textile No intentional use 1% (w/w) of TiO2 For powder mixtures containing","source_doc":"International Standard RSL-MRSL / ZDHC MRSL _ V3.1","confidence":"High"} },
    { id: "e-hub-17460", cat: 'cas-screening-master', section: "International Standard", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-17460","cas":"1763-23-1","substance":"Perfluorooctane","std_id":"STD-044","std_name":"EU POPs Regulation (EU) 2019/1021 – consolidated 17-10-2024","issuer":"EU Commission","std_type":"Regulation","version":"2024-10-17","region":"EU","status":"Numeric limit","limit_stated":"10 mg/kg; 50 mg/kg","limit_ppm":"10","extract":"Perfluorooctane 1763-23-1 217-179-8 1. For the purposes of this entry, point (b) of Article 4(1) shall || Perfluorooctane sulfonic acid and its 1763-23-1 217-179-8 50 mg/kg","source_doc":"International Standard RSL-MRSL / POPS CELEX_02019R1021-20241017_EN_TXT (17-10-2024)","confidence":"High"} },
    { id: "e-hub-17479", cat: 'cas-screening-master', section: "International Standard", createdAt: '2026-11-06T08:00:00Z',
      values: {"record_id":"REC-17479","cas":"335-67-1","substance":"Perfluorooctanoic","std_id":"STD-044","std_name":"EU POPs Regulation (EU) 2019/1021 – consolidated 17-10-2024","issuer":"EU Commission","std_type":"Regulation","version":"2024-10-17","region":"EU","status":"Numeric limit","limit_stated":"1 mg/kg","limit_ppm":"1","extract":"Perfluorooctanoic 335-67-1 206-397-9 1. For the purposes of this entry, point (b) of Article 4(1) shall || Perfluorooctanoic acid (PFOA), its salts 335-67-1 and 206-397-9 1 mg/kg","source_doc":"International Standard RSL-MRSL / POPS CELEX_02019R1021-20241017_EN_TXT (17-10-2024)","confidence":"High"} }
  ],

  /* ---------- Raw materials (synthetic names; real CAS numbers) ---------- */
  materials: [
    { id: 'm-001', code: 'RM-001', name: 'Reactive Black dye RB-5 (liquid)', type: 'dye', supplier: 'ColorChem Demo Supplies',
      cas: '17095-24-8', notes: 'Main shade for black jersey.', createdAt: '2026-11-02T09:00:00Z' },
    { id: 'm-002', code: 'RM-002', name: 'Wetting agent WA-200 (non-ionic surfactant)', type: 'auxiliary', supplier: 'Indus Auxiliaries (Demo)',
      cas: '9016-45-9\n84852-15-3', notes: 'Used in scouring and dyeing baths.', createdAt: '2026-11-02T09:05:00Z' },
    { id: 'm-003', code: 'RM-003', name: 'Easy-care resin finish ER-40', type: 'finish', supplier: 'Indus Auxiliaries (Demo)',
      cas: '50-00-0\n1854-26-8', notes: 'Wrinkle-free finish.', createdAt: '2026-11-02T09:10:00Z' },
    { id: 'm-004', code: 'RM-004', name: 'Plastisol print paste PP-White', type: 'print', supplier: 'PrintWorks Demo Inks',
      cas: '117-81-7\n13463-67-7', notes: 'Chest print.', createdAt: '2026-11-02T09:15:00Z' },
    { id: 'm-005', code: 'RM-005', name: 'Water-repellent finish WR-C8', type: 'finish', supplier: 'Northern Finishes (Demo)',
      cas: '335-67-1\n1763-23-1', notes: 'Durable water repellent for outerwear.', createdAt: '2026-11-02T09:20:00Z' },
    { id: 'm-006', code: 'RM-006', name: 'Cotton jersey fabric 160 gsm (greige)', type: 'fabric', supplier: 'Demo Spinning & Knitting',
      cas: '', notes: 'No chemical composition declared.', createdAt: '2026-11-02T09:25:00Z' },
    { id: 'm-007', code: 'RM-007', name: 'Flame-retardant back-coating FR-HB', type: 'finish', supplier: 'Northern Finishes (Demo)',
      cas: '25637-99-4', notes: '', createdAt: '2026-11-02T09:30:00Z' },
    { id: 'm-008', code: 'RM-008', name: 'Polyester woven fabric 75D (PU coated)', type: 'fabric', supplier: 'Demo Weaving Mills',
      cas: '', notes: '', createdAt: '2026-11-02T09:35:00Z' }
  ],

  /* ---------- Products — each tagged with its raw materials ---------- */
  products: [
    { id: 'p-001', code: 'PROD-TEST-001', name: 'Test garment \u2013 cotton jersey tee', customer: 'Demo Brand A',
      notes: 'Product name as used in the CAS Screening Hub workbook.', materials: ['m-006', 'm-001', 'm-002', 'm-003'], createdAt: '2026-11-03T10:00:00Z' },
    { id: 'p-002', code: 'PROD-002', name: 'Kids rain jacket \u2013 PU coated', customer: 'Demo Brand B',
      notes: '', materials: ['m-008', 'm-005', 'm-007', 'm-004'], createdAt: '2026-11-03T10:10:00Z' },
    { id: 'p-003', code: 'PROD-003', name: 'Printed tote bag \u2013 cotton canvas', customer: 'Demo Brand A',
      notes: '', materials: ['m-006', 'm-004'], createdAt: '2026-11-03T10:20:00Z' }
  ]
};

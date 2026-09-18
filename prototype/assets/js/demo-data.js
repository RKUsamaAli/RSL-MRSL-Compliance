/* ==========================================================================
   demo-data.js — seed rows for the prototype.
   The AAFA and OEKO-TEX rows are transcribed from the two page images the
   client supplied. The POPs rows are ILLUSTRATIVE samples (real substance
   names and CAS numbers, exemption text paraphrased) so the third category
   is not empty during review — they are tagged `sample:true` and must be
   replaced by the client's own transcription.
   Entry shape: { id, cat, section, values:{colKey: value}, sample?, createdAt }
   Multi-value cells (several CAS numbers) are ONE PER LINE.
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
    }
  ]
};

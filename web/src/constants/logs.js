import { THEME } from './theme.js';

// ── LIPID PANEL DECISION LIMITS ───────────────────────────────
// AACB harmonised lipid reporting decision limits for adults. These are
// decision limits, not treatment targets and not reference intervals.
export const AACB_LIPID_2018 = {
  name: 'AACB Harmonised Lipid Reporting Recommendations (2018)',
  url: 'https://aacblm.imiscloud.com/common/Uploaded%20files/aacb/guidelines%20and%20position%20statements/guidelines/AACB-endorsed%20Harmonisation%20Guidelines/20180801%20GPS%20Guideline%20for%20harmonisation%20of%20lipid%20reporting.pdf',
};

export const LIPID_REF = [
  {
    marker: 'Total Cholesterol',
    target: '≤ 5.5',
    unit: 'mmol/L',
    color: THEME.accent,
    source: AACB_LIPID_2018,
  },
  {
    marker: 'LDL Cholesterol',
    target: '≤ 3.0',
    unit: 'mmol/L',
    color: THEME.warning,
    source: AACB_LIPID_2018,
  },
  {
    marker: 'HDL Cholesterol (male)',
    target: '≥ 1.0',
    unit: 'mmol/L',
    color: THEME.positive,
    source: AACB_LIPID_2018,
  },
  {
    marker: 'HDL Cholesterol (female)',
    target: '≥ 1.2',
    unit: 'mmol/L',
    color: THEME.positive,
    source: AACB_LIPID_2018,
  },
  {
    marker: 'Triglycerides',
    target: '≤ 2.0',
    unit: 'mmol/L',
    color: THEME.caution,
    source: AACB_LIPID_2018,
  },
];

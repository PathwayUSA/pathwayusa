import { GLOSSARY_TERMS } from '../data/glossaryTerms';

// Maps short forms that actually appear in mission/step copy (e.g. "EAD",
// "I-485") to a glossary term id — the glossary's own `term` field is often
// a longer display name ("Employment Authorization Document (EAD)") that
// wouldn't match real sentences. Kept deliberately narrow: only unambiguous
// codes/phrases, never a bare common word, to avoid false-positive matches.
const ALIASES = [
  ['Adjustment of Status', 'adjustment_of_status'],
  ['Affidavit of Support', 'affidavit_of_support'],
  ['Alien Registration Number', 'a_number'],
  ['A-Number', 'a_number'],
  ['Advance Parole', 'advance_parole'],
  ['Asylum', 'asylum'],
  ['Biometric Services Fee', 'biometric_services_fee'],
  ['Biometrics', 'biometrics'],
  ['Case Status', 'case_status'],
  ['Civil Surgeon', 'civil_surgeon'],
  ['Conditional Green Card', 'conditional_gc'],
  ['Conditional Resident', 'conditional_resident'],
  ['Consular Processing', 'consular_processing'],
  ['DACA', 'daca'],
  ['Deportation', 'deportation'],
  ['DHS', 'dhs'],
  ['EAD', 'ead'],
  ['Employment Authorization Document', 'ead'],
  ['I-94', 'form_i94'],
  ['Green Card', 'green_card'],
  ['I-485', 'i485'],
  ['I-130', 'i130'],
  ['I-140', 'i140'],
  ['I-693', 'i693'],
  ['I-864', 'i864'],
  ['I-751', 'form_i751'],
  ['I-797', 'i797'],
  ['ICE', 'ice'],
  ['Immigration Court', 'immigration_court'],
  ['LPR', 'lpr'],
  ['N-400', 'n400'],
  ['Naturalization', 'naturalization'],
  ['Notice to Appear', 'nta'],
  ['NTA', 'nta'],
  ['Parole', 'parole'],
  ['Permanent Resident', 'permanent_resident'],
  ['Priority Date', 'priority_date'],
  ['Receipt Notice', 'receipt_notice'],
  ['Refugee', 'refugee'],
  ['Removal', 'removal'],
  ['Request for Evidence', 'rfe'],
  ['RFE', 'rfe'],
  ['CBP', 'cbp'],
  ['Travel Document', 'travel_document'],
  ['USCIS', 'uscis'],
  ['Visa Bulletin', 'visa_bulletin'],
  ['Voluntary Departure', 'voluntary_departure'],
  ['Work Permit', 'work_permit'],
  ['Fee Waiver', 'fee_waiver'],
].filter(([, termId]) => GLOSSARY_TERMS.some((t) => t.id === termId));

// Longest alias first so "Advance Parole" matches before the bare "Parole".
const SORTED_ALIASES = [...ALIASES].sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The trailing (?!\.[a-z]) keeps this from matching mid-URL, e.g. the
// "uscis" in "uscis.gov" — \b alone fires right before the dot.
const MATCH_RE = new RegExp(
  `\\b(${SORTED_ALIASES.map(([alias]) => escapeRegExp(alias)).join('|')})\\b(?!\\.[a-z])`,
  'gi'
);

const ALIAS_TO_TERM = new Map(SORTED_ALIASES.map(([alias, termId]) => [alias.toLowerCase(), termId]));

export function getGlossaryTerm(termId) {
  return GLOSSARY_TERMS.find((t) => t.id === termId) ?? null;
}

// Splits `text` into an array of { text, termId? } segments — termId is set
// only on recognized-jargon segments, everything else is plain text.
export function splitWithGlossaryTerms(text) {
  if (!text) return [{ text: '' }];
  const segments = [];
  let lastIndex = 0;
  let match;
  MATCH_RE.lastIndex = 0;
  while ((match = MATCH_RE.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index) });
    const termId = ALIAS_TO_TERM.get(match[0].toLowerCase());
    segments.push({ text: match[0], termId });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}

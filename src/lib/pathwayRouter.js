// ─── Pathway Router ───────────────────────────────────────────────────────────
// Takes user intake data (status + goals) and returns the correct path config.
// All legal content is based on publicly available USCIS information.

export const PATH_IDS = {
  TPS_GREEN_CARD:   'tps_green_card',
  VISA_GREEN_CARD:  'visa_green_card',
  STUDENT_OPTIONS:  'student_options',
  CITIZEN_FAMILY:   'citizen_family',
  GC_CITIZENSHIP:   'gc_citizenship',
  GENERIC:          'generic',
};

const DISCLAIMER = '⚠️ Immigration law is complex and rules change rapidly under current policy. Consult a licensed immigration attorney before filing anything.';

// ─── Path Definitions ─────────────────────────────────────────────────────────

const TPS_GREEN_CARD_PATH = {
  id:       PATH_IDS.TPS_GREEN_CARD,
  title:    'Your Path to a Green Card',
  subtitle: 'Based on your TPS status',
  icon:     'shield-checkmark',
  color:    '#1B6B5A',
  legalBasis: 'TPS does not directly lead to a green card, but TPS holders can adjust status through family sponsorship (Form I-130 + I-485 if entered legally), employment sponsorship (Form I-140 + I-485), or asylum (Form I-589 after 1 year, then I-485). Entry without inspection may require consular processing with potential 10-year bar.',
  disclaimer: DISCLAIMER,
  steps: [
    {
      id: 1,
      title: 'Confirm TPS Status is Current',
      form: 'Form I-821',
      description: 'Make sure your TPS registration or re-registration is current. Check renewal deadlines at uscis.gov and file Form I-821 before your status expires.',
      timeframe: '45–90 days to process',
      important: true,
    },
    {
      id: 2,
      title: 'Determine Your Entry Method',
      form: null,
      description: 'Your ability to adjust status inside the US depends on whether you were inspected and admitted or entered without inspection (EWI). Consult an attorney to evaluate your specific situation.',
      timeframe: 'Immediate',
      important: true,
    },
    {
      id: 3,
      title: 'Identify Your Green Card Category',
      form: null,
      description: 'Three main routes: family-based (if you have a qualifying U.S. citizen or LPR relative), employment-based (if an employer will sponsor you), or asylum (if you fear persecution).',
      timeframe: 'Varies by route',
      important: false,
    },
    {
      id: 4,
      title: 'File Qualifying Petition',
      form: 'I-130 / I-140 / I-589',
      description: 'File Form I-130 for family sponsorship, Form I-140 for employment sponsorship, or Form I-589 for asylum. This establishes your priority date.',
      timeframe: '6 months – 2+ years to adjudicate',
      important: false,
    },
    {
      id: 5,
      title: 'Monitor Priority Date',
      form: null,
      description: 'Check the monthly Visa Bulletin at travel.state.gov. Your priority date must be "current" before you can proceed to adjustment of status.',
      timeframe: 'Monthly check',
      important: false,
    },
    {
      id: 6,
      title: 'File Adjustment of Status or Consular Process',
      form: 'Form I-485',
      description: 'If eligible to adjust inside the US, file Form I-485. If you must consular process, your petition goes to the National Visa Center (NVC) then to a U.S. consulate abroad.',
      timeframe: '8–24 months',
      important: false,
    },
    {
      id: 7,
      title: 'Attend Biometrics Appointment',
      form: 'ASC Appointment',
      description: 'You will be scheduled for fingerprinting, photos, and signature at a USCIS Application Support Center.',
      timeframe: 'Scheduled by USCIS',
      important: false,
    },
    {
      id: 8,
      title: 'Attend Green Card Interview',
      form: null,
      description: 'Attend your interview at a USCIS field office (family-based) or U.S. consulate (consular processing). Bring all original documents.',
      timeframe: 'Scheduled by USCIS',
      important: false,
    },
    {
      id: 9,
      title: 'Receive Green Card Decision',
      form: null,
      description: 'After your interview, USCIS or the consulate will approve, deny, or request more evidence (RFE). If approved, your green card arrives by mail within 2–4 weeks.',
      timeframe: '2–4 weeks after approval',
      important: false,
    },
  ],
};

const VISA_GREEN_CARD_PATH = {
  id:       PATH_IDS.VISA_GREEN_CARD,
  title:    'Your Path to Permanent Residency',
  subtitle: 'Based on your visa status',
  icon:     'card',
  color:    '#1B6B5A',
  legalBasis: 'Visa holders (H-1B, L-1, O-1, etc.) can pursue employment-based green cards through employer sponsorship. Processing times vary significantly by country of birth — Indian and Chinese nationals in EB-2/EB-3 categories face backlogs that can exceed 10 years.',
  disclaimer: DISCLAIMER,
  note: '⏱ Processing times vary significantly by country of birth. India and China EB-2/EB-3 backlogs can exceed 10 years.',
  steps: [
    {
      id: 1,
      title: 'Confirm Current Visa Status and Expiration',
      form: null,
      description: 'Verify your I-94 record at i94.cbp.dhs.gov and confirm your visa stamp and authorized stay period. Know your exact expiration date and any grace periods.',
      timeframe: 'Immediate',
      important: true,
    },
    {
      id: 2,
      title: 'Confirm Employer Sponsorship',
      form: null,
      description: 'Most employment-based green cards require an employer willing to sponsor you. Discuss your green card sponsorship with your current or prospective employer.',
      timeframe: 'Ongoing conversation',
      important: true,
    },
    {
      id: 3,
      title: 'Employer Files PERM Labor Certification',
      form: 'ETA Form 9089',
      description: 'Required for most EB-2 and EB-3 cases. Your employer must demonstrate no qualified U.S. worker is available. This process takes 12–18 months on average.',
      timeframe: '12–18 months',
      important: false,
    },
    {
      id: 4,
      title: 'Employer Files Immigrant Petition',
      form: 'Form I-140',
      description: 'Your employer files Form I-140 to petition for your permanent residence. Premium processing ($2,805) is available for faster adjudication.',
      timeframe: '8 months standard / 15 business days premium',
      important: false,
    },
    {
      id: 5,
      title: 'Check Priority Date in Visa Bulletin',
      form: null,
      description: 'Monitor the monthly Visa Bulletin at travel.state.gov. Once your priority date (I-140 filing date) is current, you can proceed to adjust status.',
      timeframe: 'Monthly check',
      important: false,
    },
    {
      id: 6,
      title: 'File Adjustment of Status',
      form: 'Form I-485',
      description: 'Once your priority date is current, file Form I-485 to adjust to permanent resident status. File together with Forms I-765 (EAD) and I-131 (Advance Parole).',
      timeframe: '8–24 months',
      important: false,
    },
    {
      id: 7,
      title: 'Apply for EAD and Advance Parole',
      form: 'Form I-765 / I-131',
      description: 'While your I-485 is pending, apply for an Employment Authorization Document (EAD) and Advance Parole travel document so you can work and travel internationally without losing your pending case.',
      timeframe: '3–5 months',
      important: false,
    },
    {
      id: 8,
      title: 'Attend Biometrics Appointment',
      form: 'ASC Appointment',
      description: 'Scheduled automatically by USCIS after I-485 filing. Attend at your local Application Support Center.',
      timeframe: 'Scheduled by USCIS',
      important: false,
    },
    {
      id: 9,
      title: 'Attend Green Card Interview',
      form: null,
      description: 'Interview may be waived for some employment-based cases. If required, attend at your local USCIS field office with original documents.',
      timeframe: 'Scheduled by USCIS',
      important: false,
    },
    {
      id: 10,
      title: 'Receive Green Card',
      form: null,
      description: 'Upon approval, your green card arrives by mail. Your initial green card is valid for 10 years (or 2 years if conditional). Set a reminder to file Form I-90 before expiration.',
      timeframe: '2–4 weeks after approval',
      important: false,
    },
  ],
};

const STUDENT_OPTIONS_PATH = {
  id:       PATH_IDS.STUDENT_OPTIONS,
  title:    'Explore Your Options',
  subtitle: "We'll help you stay compliant and plan next steps",
  icon:     'school',
  color:    '#1B6B5A',
  legalBasis: 'F-1 student visa holders have several pathways to work authorization and eventually a green card. OPT and STEM OPT extensions provide temporary work authorization, while H-1B sponsorship is the most common long-term route.',
  disclaimer: DISCLAIMER,
  isCardBased: true,
  steps: [
    {
      id: 1,
      title: 'OPT Work Authorization',
      form: 'Form I-765',
      description: 'Apply before graduation — up to 12 months of work authorization in your field of study. File Form I-765 with your DSO recommendation 90 days before your program end date.',
      timeframe: '3–5 months to process — apply early',
      icon: 'briefcase-outline',
      color: '#1B6B5A',
    },
    {
      id: 2,
      title: 'STEM OPT Extension',
      form: 'Form I-765',
      description: 'STEM majors (Science, Technology, Engineering, Math) can extend OPT by 24 additional months. Apply 90 days before your OPT expiration. Must work for an E-Verify employer.',
      timeframe: 'Apply 90 days before OPT ends',
      icon: 'flask-outline',
      color: '#0F2A3D',
    },
    {
      id: 3,
      title: 'H-1B Lottery',
      form: 'Form I-129',
      description: 'Your employer registers you in the H-1B lottery each March. Only ~28% are selected. The cap is 85,000 per year (65,000 regular + 20,000 U.S. master\'s cap). Start early and have backup plans.',
      timeframe: 'Registration: March · Start date: October 1',
      icon: 'dice-outline',
      color: '#E67E22',
    },
    {
      id: 4,
      title: 'H-1B to Change of Status',
      form: 'Form I-129',
      description: 'If selected in the H-1B lottery, your employer files Form I-129 to petition for your H-1B status. If approved, you change status from F-1/OPT to H-1B on October 1.',
      timeframe: 'April – September',
      icon: 'swap-horizontal-outline',
      color: '#1B6B5A',
    },
    {
      id: 5,
      title: 'Green Card via Employer',
      form: 'PERM + I-140',
      description: 'Once on H-1B, your employer can sponsor an employment-based green card (EB-2 or EB-3). Plan this conversation during your first H-1B term to establish an early priority date.',
      timeframe: '2–5+ years total process',
      icon: 'card-outline',
      color: '#27AE60',
    },
    {
      id: 6,
      title: 'Marriage-Based Green Card',
      form: 'I-130 + I-485',
      description: 'If you marry a U.S. citizen, you qualify for an immediate relative green card — no quota, no waiting for a priority date. This is often faster than the employment route.',
      timeframe: '12–24 months on average',
      icon: 'heart-outline',
      color: '#E74C3C',
    },
  ],
};

const CITIZEN_FAMILY_PATH = {
  id:       PATH_IDS.CITIZEN_FAMILY,
  title:    'Bring Your Family Together',
  subtitle: 'Start the process to sponsor your loved ones',
  icon:     'people',
  color:    '#1B6B5A',
  legalBasis: 'U.S. citizens can petition for immediate relatives (spouses, unmarried children under 21, parents) with no waiting period, and for family preference categories with varying wait times based on the Visa Bulletin.',
  disclaimer: DISCLAIMER,
  steps: [
    {
      id: 1,
      title: 'Determine Relationship Category',
      form: null,
      description: 'Immediate relatives (IR) of U.S. citizens — spouses, unmarried children under 21, and parents — have no waiting period. Family preference categories (F2A, F2B, F3, F4) can have waits of years or decades.',
      timeframe: 'Immediate',
      important: true,
    },
    {
      id: 2,
      title: 'File Petition for Alien Relative',
      form: 'Form I-130',
      description: 'File Form I-130 for each family member. You must be a U.S. citizen or LPR (permanent resident). Include proof of your citizenship/residency and your relationship to the beneficiary.',
      timeframe: '12–36 months to adjudicate',
      important: true,
    },
    {
      id: 3,
      title: 'Wait for Priority Date',
      form: null,
      description: 'Immediate relatives have no wait. Family preference beneficiaries must wait for their priority date to become current — check the monthly Visa Bulletin at travel.state.gov.',
      timeframe: 'Immediate relatives: no wait. Family preference: 2–25+ years',
      important: false,
    },
    {
      id: 4,
      title: 'Consular Processing or Adjustment of Status',
      form: 'DS-260 or I-485',
      description: 'If your family member is abroad, they complete consular processing at a U.S. embassy or consulate. If they are already in the US lawfully, they may file Form I-485 to adjust status.',
      timeframe: '6–18 months',
      important: false,
    },
    {
      id: 5,
      title: 'Attend Interview',
      form: null,
      description: 'The beneficiary attends an interview at a USCIS field office (adjustment) or U.S. consulate abroad (consular process). Both petitioner and beneficiary may be interviewed.',
      timeframe: 'Scheduled by USCIS/NVC',
      important: false,
    },
    {
      id: 6,
      title: 'Family Member Receives Green Card',
      form: null,
      description: 'Upon approval, your family member\'s green card arrives by mail (adjustment) or they receive an immigrant visa to enter the US (consular). The green card is valid 10 years for permanent residents.',
      timeframe: '2–4 weeks after approval',
      important: false,
    },
  ],
};

const GC_CITIZENSHIP_PATH = {
  id:       PATH_IDS.GC_CITIZENSHIP,
  title:    'Your Path to Citizenship',
  subtitle: 'Based on your green card status',
  icon:     'ribbon',
  color:    '#1B6B5A',
  legalBasis: 'Lawful permanent residents can apply for naturalization after 5 years of continuous residence (3 years if married to a U.S. citizen). Requirements include physical presence, good moral character, English language ability, and knowledge of U.S. civics.',
  disclaimer: DISCLAIMER,
  steps: [
    {
      id: 1,
      title: 'Meet Eligibility Requirements',
      form: null,
      description: 'You must be 18+, have been a permanent resident for 5 years (or 3 years if married to a U.S. citizen), have continuous residence, and demonstrate good moral character.',
      timeframe: 'Check before filing',
      important: true,
    },
    {
      id: 2,
      title: 'Calculate Physical Presence',
      form: null,
      description: 'You must have been physically present in the US for at least 30 months of the 5-year period (or 18 months of the 3-year period). Trips abroad of 6+ months can break continuous residence.',
      timeframe: 'Review your travel history',
      important: true,
    },
    {
      id: 3,
      title: 'Study for Civics Test',
      form: null,
      description: 'USCIS will ask you up to 10 questions from the official 100 civics questions. You must answer 6 correctly. Use PathwayUSA\'s daily quiz to prepare!',
      timeframe: 'Most people study 2–3 months',
      important: false,
    },
    {
      id: 4,
      title: 'Gather Required Documents',
      form: null,
      description: 'Collect: green card, tax returns (last 5 years), travel history, any court records, proof of selective service registration (men 18–31), and proof of marital status.',
      timeframe: 'Before filing',
      important: false,
    },
    {
      id: 5,
      title: 'File Application for Naturalization',
      form: 'Form N-400',
      description: 'File Form N-400 online at my.uscis.gov or by mail. Filing fee: $760 (online) or $710 (paper) plus $85 biometrics for most applicants. Fee waivers available.',
      timeframe: 'Processing: 8–24 months',
      important: false,
    },
    {
      id: 6,
      title: 'Attend Biometrics Appointment',
      form: 'ASC Appointment',
      description: 'After filing, you receive a biometrics appointment at a USCIS Application Support Center for fingerprinting, photo, and signature.',
      timeframe: '2–4 months after filing',
      important: false,
    },
    {
      id: 7,
      title: 'Receive Interview Notice',
      form: null,
      description: 'USCIS sends an interview notice to your address on file. You will be tested on English reading, writing, and speaking, and asked civics and background questions.',
      timeframe: '6–18 months after filing',
      important: false,
    },
    {
      id: 8,
      title: 'Pass Civics and English Tests',
      form: null,
      description: 'At the interview: read one sentence in English, write one sentence, answer up to 10 civics questions (need 6 correct). The officer also reviews your N-400 application.',
      timeframe: 'At interview',
      important: false,
    },
    {
      id: 9,
      title: 'Receive Decision',
      form: null,
      description: 'The officer grants, continues (more evidence needed), or denies your application at or shortly after the interview. Most approvals are granted same-day.',
      timeframe: 'At or after interview',
      important: false,
    },
    {
      id: 10,
      title: 'Attend Oath Ceremony',
      form: null,
      description: 'You are scheduled for an Oath of Allegiance ceremony — either same day (administrative oath) or at a later court ceremony. Bring your green card; you surrender it at this appointment.',
      timeframe: '1 day – 6 months after interview',
      important: false,
    },
    {
      id: 11,
      title: 'Receive Certificate of Naturalization',
      form: 'N-560',
      description: 'You are now a U.S. citizen! Apply for a U.S. passport immediately — it is the strongest proof of citizenship. Register to vote. Update your Social Security record.',
      timeframe: 'Same day as oath ceremony',
      important: false,
    },
  ],
};

const GENERIC_PATH = {
  id:       PATH_IDS.GENERIC,
  title:    'Your Immigration Roadmap',
  subtitle: 'Personalized steps for your situation',
  icon:     'map',
  color:    '#1B6B5A',
  legalBasis: 'Every immigration journey is unique. The steps below are general guidance based on common immigration processes.',
  disclaimer: DISCLAIMER,
  steps: [
    {
      id: 1,
      title: 'Consult an Immigration Attorney',
      form: null,
      description: 'Schedule a consultation with a licensed immigration attorney to review your specific situation and identify the best path forward.',
      timeframe: 'Start here',
      important: true,
    },
    {
      id: 2,
      title: 'Gather Your Documents',
      form: null,
      description: 'Collect identity documents (passport, birth certificate), any immigration documents (visas, I-94, green card), and financial records.',
      timeframe: '1–2 weeks',
      important: false,
    },
    {
      id: 3,
      title: 'Check Your Immigration Status',
      form: null,
      description: 'Verify your current immigration status via i94.cbp.dhs.gov and your USCIS online account at my.uscis.gov.',
      timeframe: 'Immediate',
      important: false,
    },
    {
      id: 4,
      title: 'Identify Your Pathway',
      form: null,
      description: 'Based on your status, goals, and family situation, your attorney will identify whether family-based, employment-based, asylum, or another category applies to you.',
      timeframe: 'At consultation',
      important: false,
    },
    {
      id: 5,
      title: 'File Your Application',
      form: null,
      description: 'Your attorney will help you prepare and file the appropriate forms. Ensure all signatures, fees, and supporting documents are included.',
      timeframe: 'Varies by form type',
      important: false,
    },
  ],
};

// ─── Router Function ──────────────────────────────────────────────────────────

/**
 * Returns the best matching pathway config based on immigration status and goals.
 * @param {string} status - immigration_status from intake ('tps', 'visa', 'student', 'green_card', 'citizen', 'other')
 * @param {string[]} goals - array of selected goals from intake
 * @returns {object} pathway config object
 */
export function getPathway(status, goals = []) {
  const goalSet = new Set(goals);

  switch (status) {
    case 'tps':
      return TPS_GREEN_CARD_PATH;

    case 'visa':
      return VISA_GREEN_CARD_PATH;

    case 'student':
      return STUDENT_OPTIONS_PATH;

    case 'citizen':
      if (goalSet.has('family')) return CITIZEN_FAMILY_PATH;
      return CITIZEN_FAMILY_PATH; // default for citizens

    case 'green_card':
      if (goalSet.has('citizenship')) return GC_CITIZENSHIP_PATH;
      if (goalSet.has('family')) return CITIZEN_FAMILY_PATH;
      return GC_CITIZENSHIP_PATH; // default path for GC holders

    case 'other':
    default:
      if (goalSet.has('green_card') || goalSet.has('asylum')) return GENERIC_PATH;
      if (goalSet.has('citizenship')) return GC_CITIZENSHIP_PATH;
      if (goalSet.has('family')) return CITIZEN_FAMILY_PATH;
      return GENERIC_PATH;
  }
}

/**
 * Returns a short human-readable label for a status key.
 */
export function getStatusLabel(status) {
  const labels = {
    citizen:    'U.S. Citizen',
    green_card: 'Green Card Holder',
    tps:        'TPS Holder',
    visa:       'Visa Holder',
    student:    'Student (F-1 / Other)',
    other:      'Other Status',
  };
  return labels[status] ?? status;
}

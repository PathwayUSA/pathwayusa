// Shared immigration roadmap constants used by GuideScreen and LegalPortalScreen.

// ─── Green Card path ──────────────────────────────────────────────────────────

export const GC_STEP_TITLES = {
  gc_1: 'Determine Your Eligibility',
  gc_2: 'Sponsor Files Petition',
  gc_3: 'Wait for Priority Date',
  gc_4: 'File Form I-485',
  gc_5: 'Biometrics Appointment',
  gc_6: 'Medical Examination',
  gc_7: 'USCIS Interview',
  gc_8: 'Receive Green Card Decision',
  gc_9: 'Maintain Your Green Card',
};

export const GC_STEP_DOCS = {
  gc_1: [],
  gc_2: [
    { name: 'Completed Form I-130 or I-140',                              required: true  },
    { name: "Proof of Sponsor's US Citizenship or Permanent Residence",   required: true  },
    { name: 'Proof of Relationship (Marriage or Birth Certificate)',       required: true  },
    { name: 'Passport Photos of Sponsor',                                 required: true  },
    { name: 'Filing Fee Payment Confirmation',                             required: true  },
  ],
  gc_3: [
    { name: 'Birth Certificate with Certified English Translation',       required: true  },
    { name: 'Marriage Certificate with Certified Translation',             required: false },
    { name: 'Police Clearance Certificates (all countries since age 16)', required: true  },
  ],
  gc_4: [
    { name: 'Completed Form I-485',                                       required: true  },
    { name: 'Copy of Passport (all pages)',                               required: true  },
    { name: 'Current Visa or I-94 Arrival Record',                        required: true  },
    { name: 'Two Passport-Style Photos',                                  required: true  },
    { name: 'Birth Certificate with Certified English Translation',       required: true  },
    { name: 'Marriage Certificate with Certified Translation',             required: false },
    { name: 'Divorce Decree (if previously married)',                      required: false },
    { name: 'Police Clearance (every country lived in since age 16)',     required: true  },
    { name: 'Form I-693 Medical Examination (sealed envelope)',           required: true  },
    { name: 'Form I-864 Affidavit of Support from Sponsor',              required: true  },
    { name: 'Copy of Approved I-130 or I-140 Petition',                  required: true  },
    { name: 'Tax Returns – Last 3 Years (Sponsor)',                       required: true  },
    { name: 'Employment Letter or Pay Stubs (Sponsor)',                   required: true  },
    { name: 'Prior Immigration Court Orders (if applicable)',             required: false },
  ],
  gc_5: [
    { name: 'Biometrics Appointment Notice (Form I-797C)',                required: true  },
    { name: 'ASC Visit Receipt or Confirmation',                          required: false },
  ],
  gc_6: [
    { name: 'Copy of Form I-693 (before sealing)',                        required: true  },
    { name: 'Vaccination Records',                                        required: true  },
    { name: 'Medical Records for Any Disclosed Conditions',               required: false },
  ],
  gc_7: [
    { name: 'Interview Appointment Notice',                               required: true  },
    { name: 'Valid Passport',                                             required: true  },
    { name: 'Original Copies of All I-485 Documents',                    required: true  },
    { name: 'Evidence of Relationship (Photos, Joint Statements)',        required: false },
    { name: 'Any New Documents Since Filing',                             required: false },
  ],
  gc_8: [
    { name: 'Copy of USCIS Approval Notice',                              required: true  },
    { name: 'Copy of Green Card – Front',                                 required: true  },
    { name: 'Copy of Green Card – Back',                                  required: true  },
  ],
  gc_9: [],
};

export const GC_STEP_DURATIONS = {
  gc_1: '1–2 days',
  gc_2: '6–12 months processing',
  gc_3: 'Varies by category',
  gc_4: '8–24 months processing',
  gc_5: '~30 minutes',
  gc_6: '1–2 hour exam',
  gc_7: '30–60 minutes',
  gc_8: '2–3 weeks after interview',
  gc_9: 'Ongoing',
};

// ─── Citizenship (Naturalization) path ────────────────────────────────────────

export const CIT_STEP_TITLES = {
  cit_1:  'Confirm You Meet All Requirements',
  cit_2:  'Prepare Your Document Package',
  cit_3:  'File Form N-400',
  cit_4:  'Biometrics Appointment',
  cit_5:  'Background Check',
  cit_6:  'Prepare for the Interview & Test',
  cit_7:  'Naturalization Interview',
  cit_8:  'Receive USCIS Decision',
  cit_9:  'Oath of Allegiance',
  cit_10: 'Next Steps After Citizenship',
};

export const CIT_STEP_DURATIONS = {
  cit_1:  '15 minutes',
  cit_2:  '1–2 weeks',
  cit_3:  '2–4 hours',
  cit_4:  '~30 minutes',
  cit_5:  'Weeks to months',
  cit_6:  '2–6 months of study',
  cit_7:  '30–60 minutes',
  cit_8:  'Same day as interview',
  cit_9:  '1–3 hours',
  cit_10: 'Complete within 90 days',
};

export const CIT_STEP_DOCS = {
  cit_1: [],
  cit_2: [
    { name: 'Permanent Resident Card – Front',                             required: true  },
    { name: 'Permanent Resident Card – Back',                              required: true  },
    { name: 'All Passports – Current and Expired',                         required: true  },
    { name: 'Complete Travel History – Last 5 Years',                      required: true  },
    { name: 'Marriage Certificate (if applicable)',                         required: false },
    { name: 'Divorce Decree (if previously married)',                       required: false },
    { name: 'Legal Name Change Documents (if applicable)',                  required: false },
    { name: 'Criminal or Arrest Records (if any)',                          required: false },
    { name: 'Tax Returns – Last 5 Years',                                   required: true  },
    { name: 'Selective Service Registration (males who registered)',        required: false },
    { name: 'Military Discharge Papers – DD-214 (if applicable)',           required: false },
  ],
  cit_3: [
    { name: 'Completed Form N-400',                                         required: true  },
    { name: 'Two Passport-Style Photos (2×2 in, white background)',         required: true  },
    { name: 'Green Card Copy – Front',                                      required: true  },
    { name: 'Green Card Copy – Back',                                       required: true  },
    { name: 'Marriage Certificate (if applying under 3-year rule)',         required: false },
    { name: 'Military Discharge Papers – DD-214 (if applicable)',           required: false },
    { name: 'Filing Fee Payment Confirmation ($725)',                       required: true  },
    { name: 'Form I-797 Receipt Notice (upload when received)',             required: true  },
  ],
  cit_4: [
    { name: 'Biometrics Appointment Notice (Form I-797C)',                  required: true  },
  ],
  cit_5: [],
  cit_6: [
    { name: 'Interview Appointment Notice',                                 required: true  },
    { name: 'Valid Passport or Travel Document',                            required: true  },
    { name: 'Permanent Resident Card',                                      required: true  },
    { name: 'State-Issued ID or Driver\'s License',                         required: true  },
    { name: 'Original N-400 Supporting Documents',                          required: true  },
    { name: 'Marriage Certificate Originals (if applicable)',               required: false },
    { name: 'Tax Returns – Last 5 Years',                                   required: true  },
    { name: 'Evidence of Any Legal Name Change',                            required: false },
  ],
  cit_7: [
    { name: 'Copy of Interview Notice',                                     required: true  },
    { name: 'Any Notices or Documents Received at Interview',               required: false },
  ],
  cit_8: [
    { name: 'Copy of USCIS Decision Notice',                                required: true  },
  ],
  cit_9: [
    { name: 'Form N-445 Oath Ceremony Notice',                              required: true  },
    { name: 'Certificate of Naturalization (upload after ceremony)',        required: true  },
  ],
  cit_10: [
    { name: 'Copy of US Passport (when received)',                          required: false },
  ],
};

// ─── Backward-compat (legacy step IDs '1'–'7') ───────────────────────────────

export const STEP_REQUIRED_DOCS = {
  '1': [],
  '2': [
    { name: 'Permanent Resident Card (front)', required: true },
    { name: 'Permanent Resident Card (back)',  required: true },
    { name: 'Passport or Government Photo ID', required: true },
    { name: 'Tax Return – Most Recent Year',   required: true },
    { name: 'Tax Returns – Prior 4 Years',     required: true },
    { name: 'Complete Travel History List',    required: true },
  ],
  '3': [
    { name: 'Completed Form N-400',              required: true  },
    { name: 'Green Card Copy (front)',            required: true  },
    { name: 'Green Card Copy (back)',             required: true  },
    { name: 'Passport Photos (2)',               required: true  },
    { name: 'Tax Returns (last 5 years)',         required: true  },
    { name: 'Travel History List',               required: true  },
    { name: 'Evidence of Continuous Residence',  required: true  },
    { name: 'Criminal Records (if applicable)', required: false },
  ],
  '4': [
    { name: 'Biometrics Appointment Notice',     required: true },
    { name: 'Government-Issued Photo ID',        required: true },
    { name: 'Form N-400 Receipt Notice (I-797)', required: true },
  ],
  '5': [
    { name: 'Copy of Submitted Form N-400', required: true },
  ],
  '6': [
    { name: 'Interview Appointment Notice',          required: true  },
    { name: 'Original Green Card',                   required: true  },
    { name: 'Passport',                              required: true  },
    { name: 'Tax Returns (last 5 years)',            required: true  },
    { name: 'Evidence of Continuous Residence',     required: true  },
    { name: 'Marriage Certificate (if applicable)', required: false },
    { name: 'Any USCIS-Requested Additional Docs',  required: false },
  ],
  '7': [
    { name: 'Oath Ceremony Appointment Notice',       required: true },
    { name: 'Government-Issued Photo ID',             required: true },
    { name: 'Green Card (to surrender at ceremony)',  required: true },
  ],
};

export const STEP_TITLES = {
  '1': 'Determine Eligibility',
  '2': 'Gather Required Documents',
  '3': 'File Form N-400',
  '4': 'Biometrics Appointment',
  '5': 'Interview Preparation',
  '6': 'Citizenship Interview',
  '7': 'Oath of Allegiance',
};

// ─── Universal lookups (handles all step ID formats) ─────────────────────────

export function getStepDocs(stepId) {
  return GC_STEP_DOCS[stepId] ?? CIT_STEP_DOCS[stepId] ?? STEP_REQUIRED_DOCS[stepId] ?? [];
}

export function getStepTitle(stepId) {
  return GC_STEP_TITLES[stepId] ?? CIT_STEP_TITLES[stepId] ?? STEP_TITLES[stepId] ?? `Step ${stepId}`;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function getStatusTheme(status) {
  switch (status) {
    case 'approved':       return { bg: '#e8f5e9', text: '#388e3c', label: 'Approved',       icon: 'checkmark-circle'  };
    case 'needs_revision': return { bg: '#fff3e0', text: '#e65100', label: 'Needs Revision',  icon: 'warning'           };
    case 'uploaded':       return { bg: '#e3f2fd', text: '#1565c0', label: 'Uploaded',        icon: 'cloud-done'        };
    default:               return { bg: '#f5f5f5', text: '#999',    label: 'Not Uploaded',    icon: 'document-outline'  };
  }
}

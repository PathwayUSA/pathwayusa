// ─── Step Mission Data ────────────────────────────────────────────────────────
// Enriched content for each roadmap step across all 6 pathway types.
// Key format: `${pathway.id}_${step.id}` (step.id is the integer from pathwayRouter)

const MISSION_DATA = {

  // ══════════════════════════════════════════════════════════════════════════
  // PATHWAY A — TPS → Green Card  (tps_green_card, 9 steps)
  // ══════════════════════════════════════════════════════════════════════════

  tps_green_card_1: {
    estimatedTime: '1–2 weeks',
    difficulty: 'Easy',
    whyItMatters: 'Your TPS registration must be current before you can pursue a green card. An expired TPS puts you out of lawful status and can disqualify you from adjustment of status later. This step is your foundation.',
    inThisStepYouWill: [
      'Verify your TPS registration is currently active',
      'Find your TPS expiration and renewal deadline',
      'Confirm you have proof of your TPS approval',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'TPS Approval Notice (I-797)' },
      { icon: 'card',          label: 'EAD Card' },
      { icon: 'calendar',      label: 'TPS Expiration Date' },
      { icon: 'globe',         label: 'myUSCIS Account' },
    ],
    microSteps: [
      {
        number: 1,
        title: 'Log in to your myUSCIS Account',
        description: 'Go to my.uscis.gov and sign in. If you do not have an account, create one for free.',
        link: { label: 'my.uscis.gov', url: 'https://my.uscis.gov' },
        tip: 'Use the same email address you used to file your last TPS application.',
      },
      {
        number: 2,
        title: 'Check your TPS Case Status',
        description: 'In your dashboard, find your most recent TPS renewal or initial registration. Look for the case status — it should say "Approved."',
        tip: 'If you see "Pending," your renewal is still being processed. You still have TPS protection during this time.',
      },
      {
        number: 3,
        title: 'Find your EAD Expiration Date',
        description: 'Your Employment Authorization Document (EAD) card shows when your TPS work authorization expires. This is usually the same as your TPS expiration.',
        tip: 'Your EAD expiration date is on the front of the card under "Card Expires."',
      },
      {
        number: 4,
        title: 'Check USCIS for Renewal Deadlines',
        description: 'Go to uscis.gov/tps and find your country\'s current TPS designation period. USCIS announces TPS renewal windows — usually 60 days before expiration.',
        link: { label: 'USCIS TPS Page', url: 'https://www.uscis.gov/humanitarian/temporary-protected-status' },
      },
      {
        number: 5,
        title: 'Save or Screenshot Your Status',
        description: 'Take a screenshot of your current TPS status and save it to a secure folder. You will need this as evidence in later steps.',
        tip: 'Create a dedicated folder on your phone or computer for all immigration documents.',
      },
    ],
    commonIssues: [
      {
        condition: 'Approved',
        icon: 'checkmark-circle',
        color: '#27AE60',
        guidance: "You're good! Your TPS is active. Move on to the next step.",
      },
      {
        condition: 'Pending',
        icon: 'time',
        color: '#F5A623',
        guidance: 'Your renewal application is still processing. You still have TPS protection while it\'s pending — keep the receipt notice as proof.',
      },
      {
        condition: 'Expired / Not Renewed',
        icon: 'alert-circle',
        color: '#E74C3C',
        guidance: 'If your TPS has expired, you must file Form I-821 immediately. File during any announced re-registration window — late registration may require showing good cause.',
        actionLabel: 'View Form I-821 Guide',
        actionUrl: 'https://www.uscis.gov/i-821',
      },
    ],
    documents: [
      { name: 'I-797 TPS Approval Notice', required: true },
      { name: 'EAD Card (I-766)', required: true },
      { name: 'Passport or Government-Issued Photo ID', required: true },
      { name: 'Screenshot of myUSCIS TPS Status', required: false },
    ],
  },

  tps_green_card_2: {
    estimatedTime: '1–3 days',
    difficulty: 'Medium',
    whyItMatters: 'How you entered the US determines which green card process is available to you. Entry with inspection (at a port of entry, shown on your I-94) generally allows adjustment of status inside the US. Entry without inspection (EWI) usually requires leaving the US for consular processing — which may trigger a 10-year bar.',
    inThisStepYouWill: [
      'Check your I-94 arrival record online',
      'Determine if you entered the US lawfully',
      'Understand which green card process applies to you',
    ],
    whatYoullNeed: [
      { icon: 'globe',         label: 'I-94 Record Online' },
      { icon: 'document-text', label: 'Passport (entry stamps)' },
      { icon: 'card',          label: 'Visa (if any)' },
      { icon: 'help-circle',   label: 'Attorney Consultation' },
    ],
    microSteps: [
      {
        number: 1,
        title: 'Look Up Your I-94 Arrival Record',
        description: 'Visit the CBP I-94 website and enter your passport details to retrieve your official I-94 entry record.',
        link: { label: 'I-94 Arrival/Departure Record', url: 'https://i94.cbp.dhs.gov' },
        tip: 'Your I-94 shows the date you entered the US and your authorized admission class.',
      },
      {
        number: 2,
        title: 'Read Your Admission Class',
        description: 'On your I-94, look at the "Class of Admission." If it shows a visa type (B-1, F-1, H-1B, etc.) or "Parole," you were likely inspected at entry.',
        tip: 'If the I-94 shows "EWI" or you have no record, you may have entered without inspection. Consult an attorney immediately.',
      },
      {
        number: 3,
        title: 'Check Your Entry Stamps in Your Passport',
        description: 'Look for a US Customs and Border Protection (CBP) entry stamp in your passport. This is usually an oval or rectangular stamp with a date and port of entry.',
      },
      {
        number: 4,
        title: 'Understand What This Means for Your Case',
        description: 'If you entered legally: You may be able to adjust status inside the US (file I-485). If you entered without inspection: You will likely need consular processing — which involves leaving the US and may trigger bars.',
        tip: 'This is one of the most consequential determinations in your case. If uncertain, consult a licensed immigration attorney before proceeding.',
      },
    ],
    commonIssues: [
      {
        condition: 'Entered Lawfully (I-94 found)',
        icon: 'checkmark-circle',
        color: '#27AE60',
        guidance: 'Great — you have an I-94 record showing lawful entry. You may be eligible for adjustment of status inside the US.',
      },
      {
        condition: 'Entered Without Inspection (No I-94)',
        icon: 'alert-circle',
        color: '#E74C3C',
        guidance: 'Entering without inspection affects your options significantly. Consult an immigration attorney before taking any further steps. Do NOT travel outside the US without advice.',
        actionLabel: 'Find an Attorney',
        actionUrl: null,
      },
      {
        condition: 'Entry Record is Unclear',
        icon: 'help-circle',
        color: '#F5A623',
        guidance: 'If your I-94 is missing or shows conflicting information, file a correction request with CBP or contact an immigration attorney to clarify your record.',
        actionLabel: 'CBP Contact Info',
        actionUrl: 'https://help.cbp.gov',
      },
    ],
    documents: [
      { name: 'I-94 Arrival Record (printed from i94.cbp.dhs.gov)', required: true },
      { name: 'Passport (all pages with stamps)', required: true },
      { name: 'Any prior visas', required: false },
    ],
  },

  tps_green_card_3: {
    estimatedTime: '1 week',
    difficulty: 'Medium',
    whyItMatters: 'Choosing the right green card category is critical — wrong category means wasted time and money. TPS holders can pursue family-based, employment-based, or asylum-based green cards depending on their individual situation.',
    inThisStepYouWill: [
      'Review the three main green card pathways for TPS holders',
      'Identify which category best fits your situation',
      'Consult an attorney to confirm your choice',
    ],
    whatYoullNeed: [
      { icon: 'people',        label: 'Family Info (if family-based)' },
      { icon: 'briefcase',     label: 'Employer Sponsorship Letter (if employment)' },
      { icon: 'shield',        label: 'Asylum Evidence (if applicable)' },
      { icon: 'help-circle',   label: 'Attorney Consultation' },
    ],
    microSteps: [
      { number: 1, title: 'Check if You Have a Qualifying US Citizen or LPR Relative', description: 'US citizens can sponsor immediate relatives (spouse, child under 21, parent) with no waiting period. Green card holders can sponsor spouses and children but with longer waits.', tip: 'Immediate relative of a US citizen is the fastest family-based path.' },
      { number: 2, title: 'Check if an Employer Will Sponsor You', description: 'Employment-based green cards (EB-1, EB-2, EB-3) require a US employer willing to file a petition for you. This typically starts with a PERM Labor Certification.', tip: 'Talk to your employer\'s HR department about sponsorship options.' },
      { number: 3, title: 'Consider Asylum if You Fear Persecution', description: 'If you fear persecution in your home country due to race, religion, nationality, political opinion, or membership in a particular social group, you may be eligible for asylum — which leads to a green card after 1 year.', link: { label: 'Asylum Information — USCIS', url: 'https://www.uscis.gov/humanitarian/refugees-and-asylum/asylum' } },
      { number: 4, title: 'Confirm Your Category with an Attorney', description: 'This is the most important step. An immigration attorney will review your full situation — entry history, family ties, employment history — and tell you definitively which path is available and fastest for you.' },
    ],
    commonIssues: [
      { condition: 'Family-Based Applies', icon: 'people', color: '#27AE60', guidance: 'If you have a qualifying US citizen or LPR relative willing to sponsor you, this is often the most accessible path for TPS holders.' },
      { condition: 'Employment-Based Applies', icon: 'briefcase', color: '#2196F3', guidance: 'If you have an employer sponsor, the employment-based path may be available — but processing times vary significantly by country of birth.' },
      { condition: 'No Clear Category', icon: 'help-circle', color: '#F5A623', guidance: 'If you don\'t have a clear family or employment basis, consult an attorney about asylum, special immigrant categories, or other options.' },
    ],
    documents: [
      { name: 'Proof of Qualifying Relationship (if family-based)', required: false },
      { name: 'Employer Sponsorship Letter (if employment-based)', required: false },
      { name: 'Evidence of persecution (if asylum-based)', required: false },
    ],
  },

  tps_green_card_4: {
    estimatedTime: '6 months – 2+ years',
    difficulty: 'Hard',
    whyItMatters: 'Filing the qualifying petition is the official start of your green card process. The petition establishes your priority date — the date that determines when you can file for permanent residence. Earlier priority dates mean shorter waits.',
    inThisStepYouWill: [
      'Gather all supporting documents for your petition type',
      'Complete and review your petition form carefully',
      'Pay the filing fee and submit to USCIS',
      'Save your receipt notice (I-797)',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'Completed Petition Form (I-130/I-140/I-589)' },
      { icon: 'card',          label: 'Evidence of Relationship or Qualification' },
      { icon: 'cash',          label: 'Filing Fee Payment' },
      { icon: 'document',      label: 'Supporting Documents' },
    ],
    microSteps: [
      { number: 1, title: 'Download the Correct Petition Form', description: 'For family: Form I-130. For employment: Form I-140 (your employer files). For asylum: Form I-589.', link: { label: 'USCIS Forms Page', url: 'https://www.uscis.gov/forms' }, tip: 'Always download forms directly from uscis.gov. Never use third-party form sites.' },
      { number: 2, title: 'Gather Required Supporting Documents', description: 'Family-based: marriage certificate, birth certificates, proof of US citizen/LPR status of petitioner. Employment-based: labor certification (PERM), job offer letter, degree/credential evidence.', tip: 'Foreign documents must be accompanied by certified English translations.' },
      { number: 3, title: 'Complete the Form Accurately', description: 'Fill out every field. Answer all questions truthfully — even about arrests, prior immigration violations, or prior marriages. Do not leave any field blank; write "N/A" if not applicable.' },
      { number: 4, title: 'Pay the Filing Fee', description: 'Check uscis.gov for current fees. I-130 family petition: $675. I-140 employment: $700. I-589 asylum: free. Pay by check, money order, or online.', link: { label: 'USCIS Fee Schedule', url: 'https://www.uscis.gov/forms/filing-fees' } },
      { number: 5, title: 'Submit and Save Your Receipt Notice', description: 'Mail to the correct USCIS lockbox address (on the form instructions) or file online if available. Save the I-797 receipt notice — it proves your priority date and is required for later steps.', tip: 'Use USPS Certified Mail with return receipt so you have proof of delivery.' },
    ],
    commonIssues: [
      { condition: 'Receipt Notice Received', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You\'re on track. Your priority date is the date on your I-797. Now wait for USCIS to process your petition.' },
      { condition: 'Request for Evidence (RFE) Received', icon: 'time', color: '#F5A623', guidance: 'An RFE means USCIS needs more information. You have 87 days to respond. Work with an attorney to prepare a strong response.' },
      { condition: 'Petition Denied', icon: 'alert-circle', color: '#E74C3C', guidance: 'A denial is not the end — you can appeal or refile with additional evidence. Consult an immigration attorney immediately to understand your options.', actionLabel: 'Find an Attorney' },
    ],
    documents: [
      { name: 'Completed Form I-130, I-140, or I-589', required: true },
      { name: 'Proof of US Citizen/LPR Status (for sponsor)', required: true },
      { name: 'Proof of Relationship (birth/marriage certificate)', required: true },
      { name: 'I-797 Receipt Notice (received from USCIS)', required: true },
      { name: 'Filing Fee Confirmation', required: true },
    ],
  },

  tps_green_card_5: {
    estimatedTime: 'Monthly check',
    difficulty: 'Easy',
    whyItMatters: 'You cannot file for your green card until your priority date is "current." The Visa Bulletin, published monthly by the State Department, tells you how long the wait is for your category and country. Missing when your date becomes current means delays.',
    inThisStepYouWill: [
      'Find the monthly Visa Bulletin online',
      'Locate your priority date and category',
      'Compare to the cutoff date in the bulletin',
    ],
    whatYoullNeed: [
      { icon: 'calendar',      label: 'Your Priority Date (from I-797)' },
      { icon: 'document-text', label: 'Your Petition Category (EB-1, F-2A, etc.)' },
      { icon: 'globe',         label: 'Country of Birth' },
      { icon: 'notifications', label: 'Monthly Reminder Set' },
    ],
    microSteps: [
      { number: 1, title: 'Find the Monthly Visa Bulletin', description: 'The Visa Bulletin is published by the US Department of State between the first and tenth of each month.', link: { label: 'Visa Bulletin — travel.state.gov', url: 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html' } },
      { number: 2, title: 'Find Your Category and Country', description: 'Look at the correct table. Table A (Final Action Dates) shows when you can actually file. Table B (Dates for Filing) may allow earlier filing if USCIS says so.', tip: 'Your country is determined by your country of BIRTH — not citizenship or where you currently live.' },
      { number: 3, title: 'Compare Your Priority Date to the Cutoff', description: 'If the Visa Bulletin shows a date LATER than your priority date, your date is current — you can file. If it shows "C," all dates are current. If it shows "U," no visas are available.' },
      { number: 4, title: 'Set a Monthly Reminder', description: 'The Visa Bulletin changes every month. Set a recurring reminder on the 1st of each month to check if your date has advanced.', tip: 'Sign up for email alerts at travel.state.gov to get notified when the bulletin is published.' },
      { number: 5, title: 'Note When Your Date Becomes Current', description: 'When your priority date is current, you have a limited window to file Form I-485. Act quickly — dates can retrogress (move backward) if USCIS overestimates visa availability.' },
    ],
    commonIssues: [
      { condition: 'Date is Current', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Your priority date is current. File Form I-485 (Adjustment of Status) as soon as possible — move to Step 6 now.' },
      { condition: 'Date is Not Current', icon: 'time', color: '#F5A623', guidance: 'You need to wait. Check back every month. In the meantime, use the Pathway app to prepare your I-485 documents so you\'re ready when your date becomes current.' },
      { condition: 'Date Retrogressed', icon: 'alert-circle', color: '#E74C3C', guidance: 'Sometimes dates move backward. If this happens after you\'ve already filed, your case waits but stays in line — you do not need to refile.' },
    ],
    documents: [
      { name: 'I-797 Petition Approval Notice', required: true },
      { name: 'Visa Bulletin screenshot (month when current)', required: false },
    ],
  },

  tps_green_card_6: {
    estimatedTime: '8–24 months',
    difficulty: 'Hard',
    whyItMatters: 'Form I-485 is the application that changes your status from TPS holder to lawful permanent resident. This is the biggest and most document-intensive filing you will make. Mistakes here can delay your case by years.',
    inThisStepYouWill: [
      'Complete Form I-485 (Application to Register Permanent Residence)',
      'File companion forms I-765 (EAD) and I-131 (Advance Parole)',
      'Gather all required supporting documents',
      'Pay the filing fee and submit the complete package',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'Completed I-485 + I-765 + I-131' },
      { icon: 'medical',       label: 'Medical Exam (Form I-693)' },
      { icon: 'document',      label: 'All Supporting Documents' },
      { icon: 'cash',          label: 'Filing Fees ($1,440 total for most)' },
    ],
    microSteps: [
      { number: 1, title: 'Download and Complete Form I-485', description: 'Form I-485 is a comprehensive application covering your immigration history, criminal history, travel history, and more. Answer all questions truthfully.', link: { label: 'Form I-485 — USCIS', url: 'https://www.uscis.gov/i-485' }, tip: 'Complete I-485 online at my.uscis.gov for a $10 discount and built-in error checks.' },
      { number: 2, title: 'Complete Form I-765 (Employment Authorization)', description: 'File I-765 concurrently with I-485 to receive an Employment Authorization Document (EAD) while your green card is pending.', tip: 'Include I-765 in the same envelope as your I-485 — they are processed together.' },
      { number: 3, title: 'Complete Form I-131 (Advance Parole)', description: 'File I-131 to get Advance Parole — a travel document that lets you re-enter the US while your I-485 is pending. DO NOT travel without this document or your case could be abandoned.' },
      { number: 4, title: 'Schedule and Complete Your Medical Exam', description: 'A USCIS-designated civil surgeon must complete Form I-693. Find a civil surgeon at uscis.gov/civil-surgeons. The exam costs $100–$500. The sealed I-693 envelope must be submitted with your I-485.', link: { label: 'Find a Civil Surgeon', url: 'https://www.uscis.gov/civil-surgeons' } },
      { number: 5, title: 'Assemble and Submit Your Package', description: 'Compile all forms, the sealed I-693, supporting documents (birth certificate, passport photos, police clearances, tax returns), and filing fee. Mail to the correct USCIS lockbox — check the I-485 instructions for your address.', tip: 'Make a complete copy of everything you send before mailing. Use Certified Mail and request a delivery receipt.' },
    ],
    commonIssues: [
      { condition: 'Filing Package Returned', icon: 'alert-circle', color: '#E74C3C', guidance: 'USCIS may return your package for incorrect fees, missing signatures, or wrong mailing address. Review the rejection notice carefully, correct all issues, and refile promptly.' },
      { condition: 'Biometrics Appointment Received', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Your case is moving! A biometrics appointment letter means USCIS received your package. Attend the appointment — it\'s mandatory.' },
      { condition: 'Request for Evidence (RFE)', icon: 'time', color: '#F5A623', guidance: 'An RFE asks for additional documents or explanation. Respond within 87 days. Missing the deadline results in a denial.' },
    ],
    documents: [
      { name: 'Completed Form I-485', required: true },
      { name: 'Completed Form I-765', required: true },
      { name: 'Completed Form I-131 (optional but recommended)', required: false },
      { name: 'Form I-693 Medical Exam (sealed by civil surgeon)', required: true },
      { name: 'Copy of I-797 Petition Approval', required: true },
      { name: 'Birth Certificate + Certified Translation', required: true },
      { name: 'Passport-Style Photos (2)', required: true },
      { name: 'Police Clearance Certificates', required: true },
      { name: 'Last 3 Years of Tax Returns', required: true },
      { name: 'TPS Approval Notice', required: true },
    ],
  },

  tps_green_card_7: {
    estimatedTime: '1–2 hours',
    difficulty: 'Easy',
    whyItMatters: 'The biometrics appointment is a required step where USCIS collects your fingerprints, photograph, and signature for identity verification and background checks. Missing it can delay or halt your case.',
    inThisStepYouWill: [
      'Receive and confirm your biometrics appointment notice',
      'Bring the required documents to your Application Support Center (ASC)',
      'Complete fingerprinting, photo, and signature',
    ],
    whatYoullNeed: [
      { icon: 'mail',          label: 'Appointment Notice (I-797C)' },
      { icon: 'card',          label: 'Government-Issued Photo ID' },
      { icon: 'document-text', label: 'TPS EAD Card' },
      { icon: 'map',           label: 'ASC Location (on notice)' },
    ],
    microSteps: [
      { number: 1, title: 'Wait for Your Appointment Notice', description: 'USCIS mails a biometrics appointment notice (Form I-797C) after receiving your I-485. It typically arrives within 2–4 months.', tip: 'Make sure your address is current with USCIS. File Form AR-11 if you have moved.' },
      { number: 2, title: 'Confirm the Appointment Date and Location', description: 'The notice shows the date, time, and address of your assigned Application Support Center (ASC). The ASC handles only biometrics — it is not the same as a USCIS field office.' },
      { number: 3, title: 'Bring Required Documents', description: 'Bring: (1) the appointment notice, (2) a government-issued photo ID (passport, driver\'s license), and (3) your TPS EAD card if you have one.', tip: 'Arrive 15 minutes early. The appointment usually takes 30–60 minutes.' },
      { number: 4, title: 'Complete the Biometrics', description: 'A USCIS officer will take your fingerprints (all 10 fingers), a digital photo, and an electronic signature. This is not an interview — no questions about your case will be asked.' },
    ],
    commonIssues: [
      { condition: 'Appointment Completed', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Great — biometrics are done. Your case continues to process. USCIS uses your fingerprints to run FBI and background checks.' },
      { condition: 'Need to Reschedule', icon: 'time', color: '#F5A623', guidance: 'If you cannot attend, call the USCIS Contact Center (1-800-375-5283) to reschedule. Do not simply not show up — that can delay your case significantly.' },
      { condition: 'Notice Not Received', icon: 'alert-circle', color: '#E74C3C', guidance: 'If 4+ months have passed since you filed and no notice arrived, call the USCIS Contact Center or submit an e-request at egov.uscis.gov to check status.' },
    ],
    documents: [
      { name: 'Biometrics Appointment Notice (I-797C)', required: true },
      { name: 'Government-Issued Photo ID', required: true },
    ],
  },

  tps_green_card_8: {
    estimatedTime: '1 hour',
    difficulty: 'Medium',
    whyItMatters: 'The green card interview (if scheduled) is where a USCIS officer reviews your application in person. They verify your eligibility, check documents, and may ask about your background, relationship, or prior immigration history. Preparation is essential.',
    inThisStepYouWill: [
      'Receive and confirm your interview notice',
      'Gather all original documents (not copies)',
      'Prepare for questions about your application',
      'Attend the interview at your USCIS field office',
    ],
    whatYoullNeed: [
      { icon: 'mail',          label: 'Interview Notice (I-797C)' },
      { icon: 'document-text', label: 'Original I-485 and all supporting documents' },
      { icon: 'document',      label: 'Original civil documents (birth cert, etc.)' },
      { icon: 'card',          label: 'Photo ID and TPS EAD' },
    ],
    microSteps: [
      { number: 1, title: 'Receive and Review the Interview Notice', description: 'USCIS will mail an interview notice 4–6 weeks before your scheduled date. Review the notice carefully — it lists which documents to bring.', tip: 'Some family-based green card interviews may require BOTH the petitioner (sponsor) and the applicant to attend.' },
      { number: 2, title: 'Gather All Original Documents', description: 'Bring originals (not copies) of everything: birth certificate, marriage certificate (if applicable), passport, tax returns, police clearances, and your I-485 filing receipt.', tip: 'Organize your documents in the same order as your I-485 application. Put a sticky note on each section.' },
      { number: 3, title: 'Review Your Application Before the Interview', description: 'Read through your entire I-485 before the interview. Be ready to explain or clarify any answer. The officer will have a copy of your application and may ask about specific responses.' },
      { number: 4, title: 'Attend the Interview', description: 'Arrive at the USCIS field office 30 minutes early. Go through security. Bring a government-issued photo ID. The interview is formal but conversational — answer questions honestly and ask for clarification if you don\'t understand a question.', tip: 'It is OK to say "I don\'t know" or "I don\'t remember" if that\'s true. Never guess or make up an answer.' },
      { number: 5, title: 'Follow Up on Any Requests', description: 'If the officer asks for additional documents at the interview, you usually have 87 days to submit them. Submit promptly to avoid delays.' },
    ],
    commonIssues: [
      { condition: 'Approved at Interview', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Congratulations! The officer approved your application at the interview. Your green card will arrive by mail within 2–4 weeks.' },
      { condition: 'Case Continued (More Evidence)', icon: 'time', color: '#F5A623', guidance: 'The officer asked for additional documents. Submit everything requested within the timeframe given. This is common — do not be alarmed.' },
      { condition: 'Interview Waived (Not Scheduled)', icon: 'information-circle', color: '#2196F3', guidance: 'Some employment-based green card interviews are waived. If USCIS approves your case without scheduling an interview, your green card goes straight to card production.' },
    ],
    documents: [
      { name: 'Interview Notice (I-797C)', required: true },
      { name: 'Original Birth Certificate + Translation', required: true },
      { name: 'Original Passport (all pages)', required: true },
      { name: 'Original Marriage Certificate (if applicable)', required: false },
      { name: 'Tax Returns (last 3 years)', required: true },
      { name: 'Police Clearance Certificates', required: true },
      { name: 'TPS Approval Notice + EAD Card', required: true },
    ],
  },

  tps_green_card_9: {
    estimatedTime: '2–4 weeks after approval',
    difficulty: 'Easy',
    whyItMatters: 'The approval of your I-485 means you are now a Lawful Permanent Resident (LPR). Your green card will arrive by mail and serves as proof of your right to live and work permanently in the United States.',
    inThisStepYouWill: [
      'Receive your green card approval notice',
      'Check your mailbox for the physical green card',
      'Set reminders for your green card renewal date',
    ],
    whatYoullNeed: [
      { icon: 'mail',          label: 'Current Mailing Address on File with USCIS' },
      { icon: 'document-text', label: 'I-485 Approval Notice' },
      { icon: 'card',          label: 'Green Card (when received)' },
      { icon: 'calendar',      label: 'Renewal Reminder (set 6 months before expiration)' },
    ],
    microSteps: [
      { number: 1, title: 'Look for Your Approval Notice', description: 'USCIS sends an I-797 approval notice by mail when your I-485 is approved. Check your mail regularly.' },
      { number: 2, title: 'Wait for the Physical Green Card', description: 'Your actual green card (Form I-551) is produced at a card facility and mailed separately from the approval notice. It usually arrives within 2–4 weeks of approval.', tip: 'Your green card is valid for 10 years (or 2 years if you received a conditional green card).' },
      { number: 3, title: 'Check Your Card for Errors', description: 'When your green card arrives, verify: your name is spelled correctly, your photo is accurate, the expiration date is 10 years from now, and your A-Number matches your approval notice.', tip: 'Report errors immediately at uscis.gov. A card with errors can cause problems when traveling or applying for jobs.' },
      { number: 4, title: 'Set a Renewal Reminder', description: 'Green cards expire. Set a reminder to file Form I-90 (Renew Green Card) no later than 6 months before your expiration date. Permanent residents must maintain valid green cards at all times.' },
      { number: 5, title: 'Note Your Eligibility Date for Citizenship', description: 'As a new LPR, you can apply for naturalization after 5 years of continuous residence (or 3 years if married to a US citizen). Note this date now and start preparing.', tip: 'Check out the Citizenship pathway in PathwayUSA to begin tracking your journey to naturalization.' },
    ],
    commonIssues: [
      { condition: 'Green Card Received', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You are now a Lawful Permanent Resident! Protect this card — it is one of the most important documents you own. Make a copy and store it securely.' },
      { condition: 'Card Not Received After 4 Weeks', icon: 'time', color: '#F5A623', guidance: 'If 30+ days have passed since your approval and no card arrived, check the status at my.uscis.gov. You can also call USCIS at 1-800-375-5283 to request a follow-up.' },
    ],
    documents: [
      { name: 'I-485 Approval Notice (I-797)', required: true },
      { name: 'Green Card (I-551) — received by mail', required: true },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PATHWAY D — Green Card → Citizenship  (gc_citizenship, 11 steps)
  // ══════════════════════════════════════════════════════════════════════════

  gc_citizenship_1: {
    estimatedTime: 'Check before filing',
    difficulty: 'Medium',
    whyItMatters: 'Filing N-400 before you meet eligibility requirements wastes your filing fee and can delay your citizenship. Take time to confirm you meet every requirement before spending money on the application.',
    inThisStepYouWill: [
      'Confirm you have held your green card for 5 years (or 3 if married to US citizen)',
      'Verify you meet the good moral character standard',
      'Confirm you can pass the English language test',
    ],
    whatYoullNeed: [
      { icon: 'card',          label: 'Green Card (I-551)' },
      { icon: 'calendar',      label: 'Green Card Issue Date' },
      { icon: 'document-text', label: 'Marriage Certificate (if 3-year rule)' },
      { icon: 'document',      label: 'Criminal/Court Records (if any)' },
    ],
    microSteps: [
      { number: 1, title: 'Check Your Green Card Issue Date', description: 'Find the "Resident Since" date on your green card. You must have held LPR status for at least 5 years (or 3 years if you are currently married to and living with a US citizen).', tip: 'You can file up to 90 days before your 5-year anniversary.' },
      { number: 2, title: 'Review the Good Moral Character Requirement', description: 'USCIS evaluates your conduct during the past 5 years (or 3 years). Certain offenses — including tax fraud, domestic violence, DUIs, and drug offenses — can bar naturalization.', link: { label: 'Good Moral Character — USCIS', url: 'https://www.uscis.gov/policy-manual/volume-12-part-f' } },
      { number: 3, title: 'Confirm You Meet the English Requirement', description: 'You must be able to read, write, and speak basic English unless you are 50+ with 20 years of LPR status, or 55+ with 15 years, or have a qualifying disability.', tip: 'The N-400 interview tests your English. If you can read and discuss your application with an officer, you likely meet the requirement.' },
      { number: 4, title: 'Review Your Travel History', description: 'Calculate your time outside the US over the past 5 years. Trips over 6 months can break continuous residence. Trips over 1 year generally break it entirely. See Step 2 for details.' },
    ],
    commonIssues: [
      { condition: 'All Requirements Met', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You are eligible to apply. Proceed to Step 2 to calculate physical presence before filing.' },
      { condition: 'Criminal Record Exists', icon: 'alert-circle', color: '#E74C3C', guidance: 'Even minor criminal records can affect eligibility. Consult an immigration attorney before filing. Do not assume an old offense "doesn\'t count."', actionLabel: 'Find an Attorney' },
      { condition: 'Long Trips Abroad', icon: 'time', color: '#F5A623', guidance: 'If you spent more than 6 months outside the US in a single trip during the last 5 years, your continuous residence may have been broken. Consult an attorney before filing.' },
    ],
    documents: [
      { name: 'Green Card (front and back copy)', required: true },
      { name: 'Marriage Certificate to US Citizen (if 3-year rule)', required: false },
      { name: 'Criminal Court Records (if any)', required: false },
    ],
  },

  gc_citizenship_2: {
    estimatedTime: '1–2 days',
    difficulty: 'Medium',
    whyItMatters: 'The physical presence requirement is one of the most technical parts of the N-400. You need at least 30 months of physical presence in the US during the past 5 years (18 months for the 3-year rule). Failing to meet this means your application will be denied.',
    inThisStepYouWill: [
      'Gather all travel records for the past 5 years',
      'Calculate your total days outside the US',
      'Confirm you meet the 30-month presence requirement',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'Passport (all pages with stamps)' },
      { icon: 'calendar',      label: 'Travel records / airline receipts' },
      { icon: 'globe',         label: 'I-94 Travel History' },
      { icon: 'calculator',    label: 'Paper or spreadsheet to calculate days' },
    ],
    microSteps: [
      { number: 1, title: 'Retrieve Your I-94 Travel History', description: 'Go to i94.cbp.dhs.gov and download your full travel history. This shows all recorded entries and exits from the United States.', link: { label: 'I-94 Travel History', url: 'https://i94.cbp.dhs.gov/I94/#/history-search' } },
      { number: 2, title: 'Review Your Passport Stamps', description: 'Go through every page of every passport you have held for the past 5 years. Note every entry and exit stamp. International trips without stamps (e.g., Canada/Mexico by land) may still appear on your I-94.' },
      { number: 3, title: 'Calculate Days Outside the US', description: 'For each trip, count the number of days you were outside the US (the day you leave AND the day you return do not count as days abroad). Add all trip durations together.', tip: 'Use a simple spreadsheet with columns: Departure Date, Return Date, Days Abroad. Sum the Days Abroad column.' },
      { number: 4, title: 'Check if Continuous Residence Was Broken', description: 'Any single trip of 6+ months triggers a presumption that you broke continuous residence. A trip of 1+ year generally breaks continuous residence entirely. Note any such trips for your attorney.', tip: 'A USCIS officer may ask you to explain long trips. Prepare a written explanation for any trip over 90 days.' },
      { number: 5, title: 'Confirm You Meet 30 Months', description: 'Subtract your total days abroad from 1,825 days (5 years). The remainder is your approximate days in the US. You need at least 913 days (30 months) in the US to qualify.', tip: 'If you\'re close to the minimum, consider waiting another few months before filing to build more physical presence.' },
    ],
    commonIssues: [
      { condition: 'Requirement Met (30+ months)', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You meet the physical presence requirement. Proceed to studying for the civics test.' },
      { condition: 'Under 30 Months', icon: 'time', color: '#F5A623', guidance: 'You don\'t have enough physical presence yet. Wait until you do. You can file up to 90 days early — plan the date carefully.' },
      { condition: 'Broken Continuous Residence', icon: 'alert-circle', color: '#E74C3C', guidance: 'If a single trip exceeded 6 months, consult an attorney. You may need to re-establish continuous residence, which extends your wait significantly.', actionLabel: 'Find an Attorney' },
    ],
    documents: [
      { name: 'I-94 Travel History (printed)', required: true },
      { name: 'All Passports (last 5+ years)', required: true },
      { name: 'Airline/Travel Records if I-94 is incomplete', required: false },
      { name: 'Travel Log / Spreadsheet', required: false },
    ],
  },

  gc_citizenship_3: {
    estimatedTime: '2–3 months',
    difficulty: 'Medium',
    whyItMatters: 'The civics test is one of the final hurdles before you become a US citizen. At your interview, an officer will ask up to 10 questions from the official 100 civics questions — you must answer 6 correctly. Consistent daily practice makes this very achievable.',
    inThisStepYouWill: [
      'Download and review the official USCIS 100 civics questions',
      'Use PathwayUSA\'s daily quiz to practice',
      'Practice answering questions out loud in English',
    ],
    whatYoullNeed: [
      { icon: 'school',        label: 'USCIS 100 Civics Questions List' },
      { icon: 'phone-portrait',label: 'PathwayUSA App (daily quiz)' },
      { icon: 'headset',       label: 'Audio Resources (USCIS provides audio)' },
      { icon: 'time',          label: '15 minutes/day for 2–3 months' },
    ],
    microSteps: [
      { number: 1, title: 'Download the Official USCIS Civics Questions', description: 'USCIS provides the official list of 100 civics questions on their website. These are the only questions that will appear on your test.', link: { label: 'USCIS 100 Civics Questions', url: 'https://www.uscis.gov/citizenship/find-study-materials-and-resources' } },
      { number: 2, title: 'Learn the Questions in Small Groups', description: 'Don\'t try to memorize all 100 at once. Learn 10 questions at a time. Focus on the categories: American Government, American History, Integrated Civics (Geography/Holidays/Symbols).', tip: 'The 10 most commonly asked questions include: Who is the President? What are the first 10 Amendments called? Name two rights in the First Amendment.' },
      { number: 3, title: 'Use PathwayUSA Daily Quiz', description: 'Take the daily quiz in the Learn tab every day. The app focuses on your weak spots — the questions you get wrong most often. 15 minutes a day for 60 days is enough for most people.', tip: 'Your daily streak helps you stay consistent. Try not to break your streak!' },
      { number: 4, title: 'Practice Answering Out Loud', description: 'The civics test is oral — you answer questions out loud to an officer. Practice saying your answers aloud, not just reading them in your head. Ask a friend or family member to quiz you.', tip: 'Your pronunciation does not need to be perfect. The officer just needs to understand your answer.' },
      { number: 5, title: 'Review the Most Missed Questions 2 Weeks Before', description: 'In the final 2 weeks before your interview, focus on the questions you get wrong most often in the app. Make flashcards for your weak spots.', tip: 'If you are 65 or older and have been an LPR for 20+ years, you only need to answer 6 of the 20 "65/20" questions — a shorter test.' },
    ],
    commonIssues: [
      { condition: 'Ready (6+ out of 10 consistently)', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You\'re on track! Keep practicing daily to maintain your knowledge. A little review each day is better than cramming.' },
      { condition: 'Struggling (below 6 out of 10)', icon: 'time', color: '#F5A623', guidance: 'Focus on the questions you miss most. Use the PathwayUSA app\'s weak-spots mode. Consider joining a free citizenship class at a local library or community center.' },
      { condition: 'Language Barrier', icon: 'information-circle', color: '#2196F3', guidance: 'If you struggle with English, ask USCIS about an interpreter option. Certain age/residency exemptions allow you to take the civics test in your native language through an interpreter.' },
    ],
    documents: [
      { name: 'USCIS 100 Civics Questions (printed/digital)', required: false },
      { name: 'Practice Test Results', required: false },
    ],
  },

  gc_citizenship_4: {
    estimatedTime: '1–2 weeks',
    difficulty: 'Medium',
    whyItMatters: 'The N-400 requires extensive documentation. Gathering everything before you start the application prevents delays and ensures your application is complete. USCIS rejects or returns incomplete applications.',
    inThisStepYouWill: [
      'Compile your travel history for the past 5 years',
      'Gather tax returns, court records, and employment history',
      'Collect civil documents (birth certificate, marriage certificates)',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'Green Card (front and back)' },
      { icon: 'document',      label: 'Tax Returns (5 years)' },
      { icon: 'document',      label: 'Birth Certificate + Translation' },
      { icon: 'calendar',      label: 'Travel History Spreadsheet' },
    ],
    microSteps: [
      { number: 1, title: 'Gather Your Green Card and ID Documents', description: 'Collect: your current green card, any expired green cards, your passport, and driver\'s license or state ID.', tip: 'Make color copies (front and back) of your green card. Never mail the original.' },
      { number: 2, title: 'Compile 5 Years of Tax Returns', description: 'Collect your federal tax returns (Form 1040) for the last 5 years. If you were required to file but didn\'t, address this before applying — unfiled taxes can affect your good moral character determination.', tip: 'Get tax transcripts for free from the IRS at irs.gov/individuals/get-transcript if you lost your returns.' },
      { number: 3, title: 'Gather Civil Documents', description: 'Collect: birth certificate + certified English translation, marriage certificate (if applicable) + translation, divorce decree (if applicable), and any name change documents.' },
      { number: 4, title: 'Compile Your Employment History (5 Years)', description: 'N-400 asks for every employer for the past 5 years, including dates and addresses. Gather pay stubs, W-2s, or offer letters to help complete this section.' },
      { number: 5, title: 'Obtain Any Court Records', description: 'If you have ever been arrested, cited, or convicted — even for a minor offense — obtain official court records. Include all cases, even dismissed ones, juvenile cases, and expunged records.', tip: 'Contact the court clerk\'s office where the case was heard to get certified copies of court records.' },
    ],
    commonIssues: [
      { condition: 'All Documents Ready', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Great — you\'re organized. Proceed to Step 5 to file Form N-400.' },
      { condition: 'Missing Tax Returns', icon: 'time', color: '#F5A623', guidance: 'Request free transcripts from irs.gov. If you had unfiled returns, file them now and consult a tax professional. Filing before applying is better than hiding it.' },
      { condition: 'Criminal Record Concerns', icon: 'alert-circle', color: '#E74C3C', guidance: 'Consult an immigration attorney before filing if you have any criminal history — even a minor arrest with no conviction. Don\'t guess about how it affects your eligibility.', actionLabel: 'Find an Attorney' },
    ],
    documents: [
      { name: 'Green Card (front and back copy)', required: true },
      { name: 'Passport (all pages)', required: true },
      { name: 'Birth Certificate + Certified Translation', required: true },
      { name: 'Federal Tax Returns (5 years)', required: true },
      { name: 'Travel History (5 years, all trips)', required: true },
      { name: 'Marriage/Divorce Certificates (if applicable)', required: false },
      { name: 'Court Records (if any)', required: false },
      { name: 'Employment History (5 years)', required: true },
    ],
  },

  gc_citizenship_5: {
    estimatedTime: '8–24 months processing',
    difficulty: 'Hard',
    whyItMatters: 'Form N-400 is your official application for US citizenship. A complete, accurate, and honest application minimizes delays. Filing online is faster, cheaper, and has built-in error checks.',
    inThisStepYouWill: [
      'Create or log in to your myUSCIS account',
      'Complete every section of Form N-400',
      'Pay the $760 filing fee (or $710 by paper)',
      'Submit and save your receipt notice',
    ],
    whatYoullNeed: [
      { icon: 'globe',         label: 'myUSCIS Account' },
      { icon: 'document-text', label: 'All Documents from Step 4' },
      { icon: 'cash',          label: '$760 Filing Fee (online)' },
      { icon: 'card',          label: 'Payment Method (credit/debit)' },
    ],
    microSteps: [
      { number: 1, title: 'Log in to myUSCIS and Start N-400', description: 'Go to my.uscis.gov and start a new N-400 application. Filing online saves $10 versus paper and shows you errors before submission.', link: { label: 'Start N-400 Online', url: 'https://my.uscis.gov/account' }, tip: 'Do not start the online form until you have all documents from Step 4 ready — you can save and return, but don\'t lose your progress.' },
      { number: 2, title: 'Complete Parts 1–3: Basic Information', description: 'Enter your name (exactly as shown on your green card), address history (5 years), and date of birth. Check spelling of your name carefully — errors create problems later.' },
      { number: 3, title: 'Complete Parts 4–7: History Sections', description: 'Answer questions about employment (5 years), school history, travel history (every trip outside the US for the past 5 years), and marital history.', tip: 'For travel history, use the spreadsheet you created in Step 4. Be precise about dates.' },
      { number: 4, title: 'Answer Part 12: Background Questions Truthfully', description: 'Part 12 has over 20 yes/no questions about criminal history, affiliations, and past immigration violations. Answer EVERY question honestly. "No" answers are not automatically disqualifying — but lying is.', tip: 'Read each question very carefully. Some questions ask about your entire lifetime, not just 5 years.' },
      { number: 5, title: 'Pay the Fee and Submit', description: 'Pay $760 online (or $710 + $85 biometrics by paper check). Submit your application. Print and save your receipt — you will need the receipt number to track your case status.', link: { label: 'USCIS Fee Information', url: 'https://www.uscis.gov/n-400' }, tip: 'Fee waivers are available for applicants with household incomes below 150% of the federal poverty level. File Form I-912 concurrently.' },
      { number: 6, title: 'Track Your Case Status', description: 'Use the receipt number from your I-797 to track your case at egov.uscis.gov/casestatus. Check monthly.', link: { label: 'USCIS Case Status', url: 'https://egov.uscis.gov/casestatus' } },
    ],
    commonIssues: [
      { condition: 'Application Accepted (Receipt Notice)', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Your N-400 is in the queue. Processing times are currently 8–24 months. Use this time to keep studying for the civics test.' },
      { condition: 'Application Returned (Not Accepted)', icon: 'alert-circle', color: '#E74C3C', guidance: 'USCIS returned your application due to incorrect fees, missing signatures, or wrong forms. Fix all issues and refile immediately — your priority date resets.' },
      { condition: 'Fee Waiver Denied', icon: 'time', color: '#F5A623', guidance: 'If your fee waiver is denied, you must pay the full $760 to proceed. The denial notice explains the reason.' },
    ],
    documents: [
      { name: 'Completed N-400 (online or printed)', required: true },
      { name: 'Filing Fee Receipt or Waiver Approval', required: true },
      { name: 'I-797 Receipt Notice (from USCIS)', required: true },
    ],
  },

  gc_citizenship_6: {
    estimatedTime: '30–60 minutes',
    difficulty: 'Easy',
    whyItMatters: 'Biometrics is a required part of the naturalization process. It is quick and straightforward, but missing your appointment can significantly delay your application.',
    inThisStepYouWill: [
      'Receive your biometrics appointment notice',
      'Attend the appointment at your local ASC',
      'Complete fingerprinting and photo',
    ],
    whatYoullNeed: [
      { icon: 'mail',  label: 'Appointment Notice (I-797C)' },
      { icon: 'card',  label: 'Government-Issued Photo ID' },
      { icon: 'card',  label: 'Green Card' },
      { icon: 'map',   label: 'ASC Address (on notice)' },
    ],
    microSteps: [
      { number: 1, title: 'Receive Your Biometrics Notice', description: 'USCIS mails a biometrics appointment notice (I-797C) usually within 2–4 months of your N-400 filing. Check your mail regularly.' },
      { number: 2, title: 'Note the Date, Time, and Location', description: 'Your notice shows the date, time, and address of your assigned Application Support Center (ASC). It is different from a USCIS field office.' },
      { number: 3, title: 'Arrive Early with Required Documents', description: 'Bring: the appointment notice, a government-issued photo ID, and your green card. Arrive 15 minutes early. No appointment changes are possible online — call 1-800-375-5283 to reschedule if needed.' },
      { number: 4, title: 'Complete the Appointment', description: 'A USCIS officer takes your fingerprints (10 fingers), a photo, and your signature electronically. The appointment takes 20–40 minutes. No questions are asked about your case.' },
    ],
    commonIssues: [
      { condition: 'Completed Successfully', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Biometrics done! USCIS uses your fingerprints to run an FBI background check. Next: wait for your interview notice.' },
      { condition: 'Need to Reschedule', icon: 'time', color: '#F5A623', guidance: 'Call USCIS at 1-800-375-5283 to reschedule. Walk-ins are not always accepted — reschedule before missing your appointment.' },
    ],
    documents: [
      { name: 'Biometrics Appointment Notice (I-797C)', required: true },
      { name: 'Green Card', required: true },
      { name: 'Government-Issued Photo ID', required: true },
    ],
  },

  gc_citizenship_7: {
    estimatedTime: 'Scheduled by USCIS',
    difficulty: 'Easy',
    whyItMatters: 'The interview notice tells you when and where to appear for your N-400 interview. It also lists exactly which documents to bring. Missing this appointment requires a rescheduling request, which can add months to your case.',
    inThisStepYouWill: [
      'Receive your interview appointment notice',
      'Review the document list on the notice',
      'Confirm the date, time, and USCIS field office location',
    ],
    whatYoullNeed: [
      { icon: 'mail',     label: 'Interview Notice (I-797C)' },
      { icon: 'map',      label: 'USCIS Field Office Location' },
      { icon: 'document', label: 'Documents Listed on Notice' },
      { icon: 'clock',    label: 'Enough Time to Arrive Early' },
    ],
    microSteps: [
      { number: 1, title: 'Look for the Interview Notice in the Mail', description: 'USCIS sends your interview notice 4–6 weeks before the scheduled date. It will be an I-797C notice on official USCIS letterhead.' },
      { number: 2, title: 'Read the Notice Completely', description: 'The notice lists: (1) your interview date and time, (2) the USCIS field office address, (3) exactly which documents to bring. Read it carefully and start gathering items right away.' },
      { number: 3, title: 'Plan Your Travel to the Field Office', description: 'Look up the field office address and plan your route. Consider parking, public transit, and whether you need time off work. Field office interviews usually last 20–60 minutes.', tip: 'Government buildings have security screening. Remove belts, keys, and electronics before entering. Arrive at least 20 minutes early.' },
    ],
    commonIssues: [
      { condition: 'Notice Received', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You\'re almost there! Review the document list on your notice and gather everything well in advance of your interview date. Proceed to Step 8.' },
      { condition: 'Notice Not Received (6+ months after filing)', icon: 'time', color: '#F5A623', guidance: 'Submit an e-request at egov.uscis.gov if you haven\'t received an interview notice and your case is outside normal processing times for your field office.' },
    ],
    documents: [
      { name: 'Interview Notice (I-797C)', required: true },
    ],
  },

  gc_citizenship_8: {
    estimatedTime: '20–60 minutes',
    difficulty: 'Medium',
    whyItMatters: 'The N-400 interview is where USCIS verifies your application in person and tests your English and civics knowledge. This is the moment months of preparation have been leading to. Being calm, honest, and prepared makes all the difference.',
    inThisStepYouWill: [
      'Answer the officer\'s questions about your N-400 application',
      'Read a sentence aloud in English',
      'Write a sentence in English from dictation',
      'Answer up to 10 civics questions',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'All Original Documents from Interview Notice' },
      { icon: 'card',          label: 'Green Card' },
      { icon: 'document',      label: 'Tax Returns (5 years)' },
      { icon: 'school',        label: 'Civics Knowledge (practice!) ' },
    ],
    microSteps: [
      { number: 1, title: 'Arrive Early and Clear Security', description: 'Arrive at least 20 minutes before your interview. Go through security screening (remove keys, phone, belt). Check in at the front desk and wait to be called.', tip: 'Bring all original documents — photocopies are not sufficient at the interview.' },
      { number: 2, title: 'English Reading and Writing Test', description: 'The officer will ask you to read one sentence aloud from a card and write one sentence that they dictate to you. The sentences are simple (e.g., "The President lives in Washington.").', tip: 'If you have a qualifying disability or age exemption, notify the officer before the test begins.' },
      { number: 3, title: 'Civics Test', description: 'The officer asks up to 10 questions from the official 100 civics questions. You must answer 6 correctly. The officer stops as soon as you get 6 right — you may not be asked all 10.', tip: 'If you don\'t know an answer, say so honestly. The officer will move to the next question. Getting one wrong does not mean you fail if you still reach 6 correct.' },
      { number: 4, title: 'Review of Your N-400 Application', description: 'The officer goes through your N-400 with you and asks questions about your responses. Be consistent with what you wrote. If something on your application needs correction, this is the time to say so honestly.', tip: 'The officer may ask: "Have you ever committed a crime?" "Have you ever been a member of a political party?" Answer as you did on the application.' },
      { number: 5, title: 'Officer Issues a Decision', description: 'At the end of the interview, the officer usually announces whether your application is: Approved, Continued (more evidence needed), or Denied. Most routine cases are approved same day.' },
    ],
    commonIssues: [
      { condition: 'Approved at Interview', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Congratulations! You may receive Form N-14 (oath scheduling notice) at the interview, or receive it by mail. Proceed to Step 10: Oath Ceremony.' },
      { condition: 'Case Continued (needs more info)', icon: 'time', color: '#F5A623', guidance: 'The officer needs additional documents or time to review your background. Submit anything requested promptly. This is common and doesn\'t mean denial.' },
      { condition: 'Failed Civics or English Test', icon: 'information-circle', color: '#2196F3', guidance: 'You have one opportunity to retest within 60–90 days. Only the portion you failed (civics OR English) is retested — not both.' },
    ],
    documents: [
      { name: 'Green Card', required: true },
      { name: 'Passport (all pages)', required: true },
      { name: 'Tax Returns (5 years)', required: true },
      { name: 'All documents listed on interview notice', required: true },
    ],
  },

  gc_citizenship_9: {
    estimatedTime: '1–30 days after interview',
    difficulty: 'Easy',
    whyItMatters: 'Approval of your N-400 is the final determination before your oath ceremony. Most applicants are approved at the interview itself.',
    inThisStepYouWill: [
      'Receive the officer\'s decision on your N-400',
      'Review any Form N-14 requests if case is continued',
      'Await your oath ceremony scheduling notice if approved',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'Decision Notice (Form N-652 or N-14)' },
      { icon: 'mail',          label: 'Check Mail Regularly' },
    ],
    microSteps: [
      { number: 1, title: 'Receive Your Decision Notice', description: 'The officer gives you Form N-652 at the end of your interview showing your decision: Granted, Continued, or Not Granted.' },
      { number: 2, title: 'If Approved: Wait for Oath Scheduling', description: 'If your application was granted, USCIS schedules your oath ceremony. This can happen the same day (administrative oath) or weeks later at a court ceremony.' },
      { number: 3, title: 'If Continued: Submit Requested Documents', description: 'If the officer requested additional evidence, submit it as quickly as possible. Use the address shown on Form N-14.' },
    ],
    commonIssues: [
      { condition: 'Granted', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Approved! Look for your oath ceremony notice. Don\'t travel internationally between now and the ceremony without checking with an immigration attorney.' },
      { condition: 'Denied', icon: 'alert-circle', color: '#E74C3C', guidance: 'A denial can be appealed within 30 days using Form N-336. Consult an immigration attorney immediately.', actionLabel: 'Find an Attorney' },
    ],
    documents: [
      { name: 'Form N-652 (Interview Decision Notice)', required: true },
    ],
  },

  gc_citizenship_10: {
    estimatedTime: '1 day to 6 months after interview',
    difficulty: 'Easy',
    whyItMatters: 'The Oath of Allegiance ceremony is the final step to becoming a US citizen. You surrender your green card and officially become a citizen upon taking the oath.',
    inThisStepYouWill: [
      'Receive your oath ceremony scheduling notice',
      'Attend the ceremony with your green card',
      'Take the Oath of Allegiance',
      'Receive your Certificate of Naturalization',
    ],
    whatYoullNeed: [
      { icon: 'mail',  label: 'Oath Ceremony Notice (N-445)' },
      { icon: 'card',  label: 'Green Card (to surrender)' },
      { icon: 'document-text', label: 'Completed N-445 form (mailed with notice)' },
    ],
    microSteps: [
      { number: 1, title: 'Receive Your Oath Ceremony Notice (N-445)', description: 'USCIS mails Form N-445 with a questionnaire to complete before the ceremony. Answer the questions (e.g., has anything changed since your interview?) and bring the completed form to the ceremony.' },
      { number: 2, title: 'Attend the Ceremony', description: 'Arrive on time at the location on your notice. Oath ceremonies are held at USCIS offices or federal courthouses. Some ceremonies are very small (5–10 people); others are large public events with hundreds.', tip: 'Dress appropriately — this is a formal occasion. Bring family and friends if the notice allows guests.' },
      { number: 3, title: 'Surrender Your Green Card', description: 'At the ceremony, you surrender your Permanent Resident Card. This is normal and required — your Certificate of Naturalization replaces it as proof of your lawful status.' },
      { number: 4, title: 'Take the Oath of Allegiance', description: 'Read along as the officer or judge leads you and all other new citizens in the Oath of Allegiance. You swear to support and defend the US Constitution and faithfully serve the US.', tip: 'You do not need to memorize the oath — it is usually displayed on a screen or printed card.' },
      { number: 5, title: 'Receive Your Certificate of Naturalization', description: 'After the oath, you receive your Certificate of Naturalization. Check it immediately for errors in your name, date of birth, and country of birth. Report any errors before leaving the ceremony.' },
    ],
    commonIssues: [
      { condition: 'Ceremony Attended', icon: 'checkmark-circle', color: '#27AE60', guidance: 'You are now a US citizen! Congratulations. Proceed to Step 11 to apply for your passport.' },
      { condition: 'Cannot Attend Scheduled Ceremony', icon: 'time', color: '#F5A623', guidance: 'If you cannot attend, notify USCIS immediately. You can be rescheduled to a future ceremony.' },
    ],
    documents: [
      { name: 'Oath Ceremony Notice (Form N-445)', required: true },
      { name: 'Completed N-445 Questionnaire', required: true },
      { name: 'Green Card (to surrender at ceremony)', required: true },
      { name: 'Government-Issued Photo ID', required: true },
    ],
  },

  gc_citizenship_11: {
    estimatedTime: 'Same day as oath ceremony',
    difficulty: 'Easy',
    whyItMatters: 'Your Certificate of Naturalization is official proof of your US citizenship. Apply for a US passport immediately — it is the strongest and most widely accepted proof of citizenship, and you\'ll need it for international travel.',
    inThisStepYouWill: [
      'Check your Certificate of Naturalization for errors',
      'Apply for a US passport immediately',
      'Register to vote',
      'Update your Social Security record',
    ],
    whatYoullNeed: [
      { icon: 'document-text', label: 'Certificate of Naturalization (N-560)' },
      { icon: 'document',      label: 'Passport Photo (2x2 inches)' },
      { icon: 'cash',          label: 'Passport Application Fee ($165)' },
      { icon: 'card',          label: 'Social Security Card' },
    ],
    microSteps: [
      { number: 1, title: 'Check Your Certificate for Errors', description: 'Immediately review: your full name (exactly as you want it spelled), date of birth, country of birth, and date of naturalization. If any error exists, report it to the USCIS officer before leaving the ceremony. Do not take a certificate with errors.', tip: 'Make a high-quality color copy of your certificate and store the original in a fireproof safe. Never use the original for routine purposes.' },
      { number: 2, title: 'Apply for a US Passport', description: 'Apply immediately after receiving your certificate. A US passport is the most powerful proof of citizenship. Submit Form DS-11 at any passport acceptance facility (post offices, courthouses). You cannot renew your first passport — you must apply in person.', link: { label: 'Apply for US Passport — travel.state.gov', url: 'https://travel.state.gov/content/travel/en/passports.html' }, tip: 'Expedited processing ($60 extra) reduces wait time from 6–8 weeks to 2–3 weeks.' },
      { number: 3, title: 'Register to Vote', description: 'As a US citizen, you have the right to vote. Register at vote.gov or at your local Department of Motor Vehicles (DMV).', link: { label: 'Register to Vote', url: 'https://vote.gov' } },
      { number: 4, title: 'Update Your Social Security Record', description: 'Visit your local Social Security Administration office or update online at ssa.gov to record your US citizenship. This updates federal records and may affect certain benefits.', link: { label: 'Social Security Administration', url: 'https://www.ssa.gov' } },
      { number: 5, title: 'Celebrate — You\'ve Done It!', description: 'You completed one of the most significant legal processes a person can undertake. You are now a United States citizen with all the rights, privileges, and responsibilities that come with it. Congratulations. 🇺🇸' },
    ],
    commonIssues: [
      { condition: 'All Done', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Welcome to citizenship! Apply for your passport today — don\'t wait. Register to vote. Update your Social Security record.' },
      { condition: 'Error on Certificate', icon: 'alert-circle', color: '#E74C3C', guidance: 'Report errors to USCIS immediately. File Form N-565 to request a corrected certificate. Never alter or correct a certificate yourself.' },
    ],
    documents: [
      { name: 'Certificate of Naturalization (N-560)', required: true },
      { name: 'US Passport Application (DS-11)', required: false },
      { name: 'Voter Registration Form', required: false },
    ],
  },

};

// ─── Fallback builder ─────────────────────────────────────────────────────────
// Auto-generates mission data from existing step fields when specific data
// is not available in MISSION_DATA.

export function buildDefaultMissionData(step) {
  const descSentences = (step.description ?? '').split('. ').filter(Boolean).slice(0, 3);
  return {
    estimatedTime: step.timeframe ?? 'Varies',
    difficulty: step.important ? 'Medium' : 'Easy',
    whyItMatters: step.description ?? 'This step is an important part of your immigration journey.',
    inThisStepYouWill: descSentences.length > 0
      ? descSentences.map((s) => s.replace(/\.$/, ''))
      : ['Review the requirements for this step', 'Gather the necessary documents', 'Complete and submit the required forms'],
    whatYoullNeed: [
      { icon: 'document-text', label: step.form ? `Completed ${step.form}` : 'Required Documents' },
      { icon: 'globe',         label: 'myUSCIS Account (my.uscis.gov)' },
      { icon: 'cash',          label: 'Filing Fee (check uscis.gov)' },
      { icon: 'help-circle',   label: 'Attorney Review (recommended)' },
    ],
    microSteps: [
      { number: 1, title: 'Review Requirements', description: 'Read the full requirements for this step at uscis.gov before taking any action.', link: { label: 'USCIS Website', url: 'https://www.uscis.gov' } },
      { number: 2, title: 'Gather Required Documents', description: step.form ? `Collect all documents needed to complete ${step.form}.` : 'Collect all required identity and supporting documents.' },
      { number: 3, title: step.form ? `Complete ${step.form}` : 'Complete the Required Form', description: 'Fill out all sections accurately and completely. Do not leave any fields blank — write N/A where not applicable.', tip: 'Never falsify information on a US government form. Lying is a federal crime and can permanently bar you from immigration benefits.' },
      { number: 4, title: 'Review Everything Before Submitting', description: 'Check all dates, names, and A-numbers for accuracy. Have another person review your completed form if possible.' },
      { number: 5, title: 'Submit and Track Your Case', description: 'Submit to USCIS and save your receipt notice (I-797). Track your case status at egov.uscis.gov.', link: { label: 'USCIS Case Status', url: 'https://egov.uscis.gov/casestatus' } },
    ],
    commonIssues: [
      { condition: 'Application Accepted', icon: 'checkmark-circle', color: '#27AE60', guidance: 'Your application is being processed. Monitor your case status monthly at egov.uscis.gov.' },
      { condition: 'Request for Evidence (RFE)', icon: 'time', color: '#F5A623', guidance: 'An RFE asks for additional information. Respond within 87 days. Consult an attorney if you\'re unsure what to include.' },
      { condition: 'Application Denied', icon: 'alert-circle', color: '#E74C3C', guidance: 'Denials can be appealed or reconsidered with additional evidence. Consult an immigration attorney immediately.', actionLabel: 'Find an Attorney' },
    ],
    documents: step.form
      ? [{ name: `Completed ${step.form}`, required: true }, { name: 'Supporting Documents', required: true }]
      : [{ name: 'Required Documents for this Step', required: true }],
  };
}

// ─── Main lookup function ─────────────────────────────────────────────────────

export function getMissionData(pathwayId, stepId) {
  return MISSION_DATA[`${pathwayId}_${stepId}`] ?? null;
}

export default MISSION_DATA;

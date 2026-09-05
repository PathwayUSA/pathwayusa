export const COLORS = {
  primary:       '#2A8B7A',
  primaryLight:  '#E8F4F1',
  primaryDark:   '#1F6B5C',
  secondary:     '#F5A623',
  white:         '#ffffff',
  black:         '#000000',
  text:          '#1A1A2E',
  textSecondary: '#7F8C8D',
  textLight:     '#BDC3C7',
  background:    '#F5F7F5',
  card:          '#ffffff',
  border:        '#E8ECE8',
  success:       '#27AE60',
  warning:       '#E67E22',
  error:         '#E74C3C',
  gold:          '#F5A623',
  navy:          '#0F2A3D',
  gray:          '#F5F7F5',
  grayDark:      '#E0E6E0',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
};

export const RADII = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  20,
  xl:  28,
  xxl: 40,
};

// Type scale — all font size/weight constants live here so a single
// edit propagates everywhere. Outfit is the display face for headings;
// body and below stay on the system default.
export const TYPOGRAPHY = {
  // ── Display (Outfit) ────────────────────────────────────────────────────
  displayFamily:        'Outfit_800ExtraBold',
  headingFamily:        'Outfit_700Bold',

  displaySize:          32,
  displayLetterSpacing: -0.64,   // −0.02em at 32px
  displayLineHeight:    35,      // ≈1.1×

  headingSize:          20,
  headingLineHeight:    26,

  // ── Content scale (system font) ─────────────────────────────────────────
  // Subheading: modal titles, card-section headings, prominent in-content labels
  subheadingSize:       17,
  subheadingWeight:     '700',
  subheadingLineHeight: 23,

  // Body: main readable content
  bodySize:             15,
  bodyLineHeight:       22,

  // Secondary: supporting text, descriptions, subtitles
  secondarySize:        13,
  secondaryLineHeight:  19,

  // Label: uppercase eyebrow tags, tiny category chips
  labelSize:            11,
  labelWeight:          '700',
  labelTracking:        0.8,
};

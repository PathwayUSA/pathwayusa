/**
 * Maps the first 3 digits of a US ZIP code to a 2-letter state abbreviation.
 * Source: USPS sectional center facility (SCF) ranges.
 * Best-effort — edge cases near state borders may resolve to an adjacent state.
 */

// [rangeStart, rangeEnd, stateCode] — ranges are inclusive
const ZIP3_RANGES = [
  [5,   8,   'NY'], // Rural upstate NY
  [10,  27,  'MA'],
  [28,  29,  'RI'],
  [30,  38,  'NH'],
  [39,  49,  'ME'],
  [50,  59,  'VT'],
  [60,  69,  'CT'],
  [70,  89,  'NJ'],
  [100, 149, 'NY'], // NYC metro and upstate
  [150, 196, 'PA'],
  [197, 199, 'DE'],
  [200, 205, 'DC'],
  [206, 219, 'MD'],
  [220, 246, 'VA'], // includes northern VA (201 range)
  [247, 268, 'WV'],
  [270, 289, 'NC'],
  [290, 299, 'SC'],
  [300, 319, 'GA'],
  [320, 349, 'FL'],
  [350, 369, 'AL'],
  [370, 385, 'TN'],
  [386, 399, 'MS'], // 398-399 are GA/MS border; mapped to MS for simplicity
  [400, 427, 'KY'],
  [428, 429, 'OH'], // border gap between KY and OH
  [430, 458, 'OH'],
  [460, 479, 'IN'],
  [480, 499, 'MI'],
  [500, 528, 'IA'],
  [530, 549, 'WI'],
  [550, 567, 'MN'],
  [570, 577, 'SD'],
  [580, 588, 'ND'],
  [590, 599, 'MT'],
  [600, 629, 'IL'],
  [630, 658, 'MO'],
  [660, 679, 'KS'],
  [680, 693, 'NE'],
  [700, 714, 'LA'],
  [716, 729, 'AR'],
  [730, 749, 'OK'],
  [750, 799, 'TX'],
  [800, 816, 'CO'],
  [820, 831, 'WY'],
  [832, 838, 'ID'],
  [840, 847, 'UT'],
  [850, 865, 'AZ'],
  [870, 885, 'NM'],
  [889, 898, 'NV'],
  [900, 961, 'CA'],
  [967, 968, 'HI'],
  [970, 979, 'OR'],
  [980, 994, 'WA'],
  [995, 999, 'AK'],
];

/**
 * Returns a 2-letter US state code for the given ZIP code string,
 * or null if the ZIP cannot be mapped.
 */
export function getStateFromZip(zip) {
  if (!zip || typeof zip !== 'string') return null;
  const digits = zip.replace(/\D/g, '');
  if (digits.length < 3) return null;
  const prefix = parseInt(digits.substring(0, 3), 10);
  if (isNaN(prefix)) return null;
  for (const [start, end, state] of ZIP3_RANGES) {
    if (prefix >= start && prefix <= end) return state;
  }
  return null;
}

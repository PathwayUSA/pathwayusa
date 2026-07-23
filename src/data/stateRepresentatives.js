/**
 * US State civic data — governors, US senators, and state capitals.
 *
 * ⚠️  IMPORTANT: Governor and senator data changes after every election cycle.
 *    Federal elections: every 2 years (Senate classes 1, 2, 3 on rotating schedule).
 *    Gubernatorial elections: typically every 4 years, staggered by state.
 *    Review and update this file after each November election.
 *    Last verified: January 2025.
 *
 * State capitals never change and are always reliable.
 */

// Keys are 2-letter state codes.
// senators: [senator1, senator2] — order is alphabetical by last name.
// governor: current governor's full name.
// houseNote: shown for Q23 (House rep varies by district within each state).

export const STATE_DATA = {
  AL: {
    name: 'Alabama',
    capital: 'Montgomery',
    governor: 'Kay Ivey',
    senators: ['Katie Britt', 'Tommy Tuberville'],
  },
  AK: {
    name: 'Alaska',
    capital: 'Juneau',
    governor: 'Mike Dunleavy',
    senators: ['Lisa Murkowski', 'Dan Sullivan'],
  },
  AZ: {
    name: 'Arizona',
    capital: 'Phoenix',
    governor: 'Katie Hobbs',
    senators: ['Ruben Gallego', 'Mark Kelly'],
  },
  AR: {
    name: 'Arkansas',
    capital: 'Little Rock',
    governor: 'Sarah Huckabee Sanders',
    senators: ['John Boozman', 'Tom Cotton'],
  },
  CA: {
    name: 'California',
    capital: 'Sacramento',
    governor: 'Gavin Newsom',
    senators: ['Alex Padilla', 'Adam Schiff'],
  },
  CO: {
    name: 'Colorado',
    capital: 'Denver',
    governor: 'Jared Polis',
    senators: ['Michael Bennet', 'John Hickenlooper'],
  },
  CT: {
    name: 'Connecticut',
    capital: 'Hartford',
    governor: 'Ned Lamont',
    senators: ['Richard Blumenthal', 'Chris Murphy'],
  },
  DE: {
    name: 'Delaware',
    capital: 'Dover',
    governor: 'Matt Meyer',
    senators: ['Chris Coons', 'Lisa Blunt Rochester'],
  },
  FL: {
    name: 'Florida',
    capital: 'Tallahassee',
    governor: 'Ron DeSantis',
    senators: ['Rick Scott', 'Ashley Moody'],
  },
  GA: {
    name: 'Georgia',
    capital: 'Atlanta',
    governor: 'Brian Kemp',
    senators: ['Jon Ossoff', 'Raphael Warnock'],
  },
  HI: {
    name: 'Hawaii',
    capital: 'Honolulu',
    governor: 'Josh Green',
    senators: ['Mazie Hirono', 'Brian Schatz'],
  },
  ID: {
    name: 'Idaho',
    capital: 'Boise',
    governor: 'Brad Little',
    senators: ['Mike Crapo', 'Jim Risch'],
  },
  IL: {
    name: 'Illinois',
    capital: 'Springfield',
    governor: 'JB Pritzker',
    senators: ['Tammy Duckworth', 'Verify at senate.gov — seat changed in 2025'],
  },
  IN: {
    name: 'Indiana',
    capital: 'Indianapolis',
    governor: 'Mike Braun',
    senators: ['Todd Young', 'Jim Banks'],
  },
  IA: {
    name: 'Iowa',
    capital: 'Des Moines',
    governor: 'Kim Reynolds',
    senators: ['Joni Ernst', 'Chuck Grassley'],
  },
  KS: {
    name: 'Kansas',
    capital: 'Topeka',
    governor: 'Laura Kelly',
    senators: ['Jerry Moran', 'Roger Marshall'],
  },
  KY: {
    name: 'Kentucky',
    capital: 'Frankfort',
    governor: 'Andy Beshear',
    senators: ['Mitch McConnell', 'Rand Paul'],
  },
  LA: {
    name: 'Louisiana',
    capital: 'Baton Rouge',
    governor: 'Jeff Landry',
    senators: ['John Kennedy', 'Bill Cassidy'],
  },
  ME: {
    name: 'Maine',
    capital: 'Augusta',
    governor: 'Janet Mills',
    senators: ['Susan Collins', 'Angus King'],
  },
  MD: {
    name: 'Maryland',
    capital: 'Annapolis',
    governor: 'Wes Moore',
    senators: ['Angela Alsobrooks', 'Chris Van Hollen'],
  },
  MA: {
    name: 'Massachusetts',
    capital: 'Boston',
    governor: 'Maura Healey',
    senators: ['Ed Markey', 'Elizabeth Warren'],
  },
  MI: {
    name: 'Michigan',
    capital: 'Lansing',
    governor: 'Gretchen Whitmer',
    senators: ['Gary Peters', 'Elissa Slotkin'],
  },
  MN: {
    name: 'Minnesota',
    capital: 'Saint Paul',
    governor: 'Tim Walz',
    senators: ['Amy Klobuchar', 'Tina Smith'],
  },
  MS: {
    name: 'Mississippi',
    capital: 'Jackson',
    governor: 'Tate Reeves',
    senators: ['Cindy Hyde-Smith', 'Roger Wicker'],
  },
  MO: {
    name: 'Missouri',
    capital: 'Jefferson City',
    governor: 'Mike Kehoe',
    senators: ['Eric Schmitt', 'Josh Hawley'],
  },
  MT: {
    name: 'Montana',
    capital: 'Helena',
    governor: 'Greg Gianforte',
    senators: ['Steve Daines', 'Tim Sheehy'],
  },
  NE: {
    name: 'Nebraska',
    capital: 'Lincoln',
    governor: 'Jim Pillen',
    senators: ['Deb Fischer', 'Pete Ricketts'],
  },
  NV: {
    name: 'Nevada',
    capital: 'Carson City',
    governor: 'Joe Lombardo',
    senators: ['Catherine Cortez Masto', 'Jacky Rosen'],
  },
  NH: {
    name: 'New Hampshire',
    capital: 'Concord',
    governor: 'Kelly Ayotte',
    senators: ['Jeanne Shaheen', 'Maggie Hassan'],
  },
  NJ: {
    name: 'New Jersey',
    capital: 'Trenton',
    governor: 'Verify at nj.gov — new governor took office Jan 2026',
    senators: ['Andy Kim', 'Cory Booker'],
  },
  NM: {
    name: 'New Mexico',
    capital: 'Santa Fe',
    governor: 'Michelle Lujan Grisham',
    senators: ['Martin Heinrich', 'Ben Ray Luján'],
  },
  NY: {
    name: 'New York',
    capital: 'Albany',
    governor: 'Kathy Hochul',
    senators: ['Kirsten Gillibrand', 'Chuck Schumer'],
  },
  NC: {
    name: 'North Carolina',
    capital: 'Raleigh',
    governor: 'Josh Stein',
    senators: ['Thom Tillis', 'Ted Budd'],
  },
  ND: {
    name: 'North Dakota',
    capital: 'Bismarck',
    governor: 'Kelly Armstrong',
    senators: ['Kevin Cramer', 'John Hoeven'],
  },
  OH: {
    name: 'Ohio',
    capital: 'Columbus',
    governor: 'Mike DeWine',
    senators: ['Sherrod Brown', 'Bernie Moreno'],
  },
  OK: {
    name: 'Oklahoma',
    capital: 'Oklahoma City',
    governor: 'Kevin Stitt',
    senators: ['James Lankford', 'Markwayne Mullin'],
  },
  OR: {
    name: 'Oregon',
    capital: 'Salem',
    governor: 'Tina Kotek',
    senators: ['Ron Wyden', 'Jeff Merkley'],
  },
  PA: {
    name: 'Pennsylvania',
    capital: 'Harrisburg',
    governor: 'Josh Shapiro',
    senators: ['Bob Casey', 'Dave McCormick'],
  },
  RI: {
    name: 'Rhode Island',
    capital: 'Providence',
    governor: 'Dan McKee',
    senators: ['Jack Reed', 'Sheldon Whitehouse'],
  },
  SC: {
    name: 'South Carolina',
    capital: 'Columbia',
    governor: 'Henry McMaster',
    senators: ['Tim Scott', 'Lindsey Graham'],
  },
  SD: {
    name: 'South Dakota',
    capital: 'Pierre',
    governor: 'Larry Rhoden',
    senators: ['John Thune', 'Mike Rounds'],
  },
  TN: {
    name: 'Tennessee',
    capital: 'Nashville',
    governor: 'Bill Lee',
    senators: ['Marsha Blackburn', 'Bill Hagerty'],
  },
  TX: {
    name: 'Texas',
    capital: 'Austin',
    governor: 'Greg Abbott',
    senators: ['Ted Cruz', 'John Cornyn'],
  },
  UT: {
    name: 'Utah',
    capital: 'Salt Lake City',
    governor: 'Spencer Cox',
    senators: ['Mike Lee', 'John Curtis'],
  },
  VT: {
    name: 'Vermont',
    capital: 'Montpelier',
    governor: 'Phil Scott',
    senators: ['Peter Welch', 'Bernie Sanders'],
  },
  VA: {
    name: 'Virginia',
    capital: 'Richmond',
    governor: 'Verify at virginia.gov — new governor took office Jan 2026',
    senators: ['Tim Kaine', 'Mark Warner'],
  },
  WA: {
    name: 'Washington',
    capital: 'Olympia',
    governor: 'Bob Ferguson',
    senators: ['Patty Murray', 'Maria Cantwell'],
  },
  WV: {
    name: 'West Virginia',
    capital: 'Charleston',
    governor: 'Patrick Morrisey',
    senators: ['Jim Justice', 'Shelley Moore Capito'],
  },
  WI: {
    name: 'Wisconsin',
    capital: 'Madison',
    governor: 'Tony Evers',
    senators: ['Tammy Baldwin', 'Ron Johnson'],
  },
  WY: {
    name: 'Wyoming',
    capital: 'Cheyenne',
    governor: 'Mark Gordon',
    senators: ['John Barrasso', 'Cynthia Lummis'],
  },
  DC: {
    name: 'Washington D.C.',
    capital: 'Washington, D.C.',
    governor: null, // DC has a Mayor, not a governor; no voting senators
    senators: [],
  },
};

/**
 * IDs of USCIS civics questions whose answers vary by the user's location.
 * Q20: US Senators  Q23: House Rep  Q43: Governor  Q44: State Capital
 */
export const LOCATION_QUESTION_IDS = [20, 23, 43, 44];

/** Returns the personalized answer string for a location-based question. */
export function getPersonalizedAnswer(questionId, stateCode) {
  const data = STATE_DATA[stateCode];
  if (!data) return null;

  switch (questionId) {
    case 20: {
      if (stateCode === 'DC') return 'Washington D.C. does not have voting US Senators.';
      const [s1, s2] = data.senators;
      if (!s1) return null;
      return s2 ? `${s1} or ${s2}` : s1;
    }
    case 23:
      return null; // House reps vary by district — handled specially in UI
    case 43:
      if (stateCode === 'DC') return 'Washington D.C. has a Mayor, not a Governor. The Mayor is Muriel Bowser.';
      return data.governor || null;
    case 44:
      return data.capital || null;
    default:
      return null;
  }
}

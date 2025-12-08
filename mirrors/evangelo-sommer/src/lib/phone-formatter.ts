/**
 * Phone Formatter with Area Code Detection
 * Automatically detects and formats phone numbers based on area code database
 */

interface AreaCodeInfo {
  code: string;
  region: string;
  country: string;
  format: 'NANP' | 'UK' | 'AU' | 'INTL';
}

/**
 * North American Numbering Plan (NANP) Area Codes
 * US and Canadian area codes
 */
const NANP_AREA_CODES: Record<string, { region: string; country: string }> = {
  // United States - Major Metropolitan Areas
  '212': { region: 'New York, NY', country: 'US' },
  '213': { region: 'Los Angeles, CA', country: 'US' },
  '214': { region: 'Dallas, TX', country: 'US' },
  '215': { region: 'Philadelphia, PA', country: 'US' },
  '216': { region: 'Cleveland, OH', country: 'US' },
  '217': { region: 'Springfield, IL', country: 'US' },
  '218': { region: 'Duluth, MN', country: 'US' },
  '219': { region: 'Northwest Indiana', country: 'US' },
  '220': { region: 'Central Ohio', country: 'US' },
  '224': { region: 'Northern Illinois', country: 'US' },
  '225': { region: 'Baton Rouge, LA', country: 'US' },
  '228': { region: 'South Mississippi', country: 'US' },
  '229': { region: 'Southwest Georgia', country: 'US' },
  '231': { region: 'Northwestern Michigan', country: 'US' },
  '234': { region: 'Northeast Ohio', country: 'US' },
  '239': { region: 'Southwest Florida', country: 'US' },
  '240': { region: 'Western Maryland', country: 'US' },
  '248': { region: 'Oakland County, MI', country: 'US' },
  '251': { region: 'Southwest Alabama', country: 'US' },
  '252': { region: 'Eastern North Carolina', country: 'US' },
  '253': { region: 'Tacoma, WA', country: 'US' },
  '254': { region: 'Central Texas', country: 'US' },
  '256': { region: 'Northern Alabama', country: 'US' },
  '260': { region: 'Northeast Indiana', country: 'US' },
  '262': { region: 'Southeast Wisconsin', country: 'US' },
  '267': { region: 'Philadelphia, PA', country: 'US' },
  '269': { region: 'Southwest Michigan', country: 'US' },
  '270': { region: 'Western Kentucky', country: 'US' },
  '276': { region: 'Southwest Virginia', country: 'US' },
  '281': { region: 'Houston, TX', country: 'US' },
  '301': { region: 'Western Maryland', country: 'US' },
  '302': { region: 'Delaware', country: 'US' },
  '303': { region: 'Denver, CO', country: 'US' },
  '304': { region: 'West Virginia', country: 'US' },
  '305': { region: 'Miami-Dade, FL', country: 'US' },
  '307': { region: 'Wyoming', country: 'US' },
  '308': { region: 'Western Nebraska', country: 'US' },
  '309': { region: 'Western Illinois', country: 'US' },
  '310': { region: 'West Los Angeles, CA', country: 'US' },
  '312': { region: 'Chicago, IL', country: 'US' },
  '313': { region: 'Detroit, MI', country: 'US' },
  '314': { region: 'St. Louis, MO', country: 'US' },
  '315': { region: 'Syracuse, NY', country: 'US' },
  '316': { region: 'Wichita, KS', country: 'US' },
  '317': { region: 'Indianapolis, IN', country: 'US' },
  '318': { region: 'Northwest Louisiana', country: 'US' },
  '319': { region: 'Eastern Iowa', country: 'US' },
  '320': { region: 'Central Minnesota', country: 'US' },
  '321': { region: 'Orlando, FL', country: 'US' },
  '323': { region: 'Los Angeles, CA', country: 'US' },
  '330': { region: 'Northeast Ohio', country: 'US' },
  '331': { region: 'Northern Illinois', country: 'US' },
  '334': { region: 'Southeast Alabama', country: 'US' },
  '336': { region: 'North Central North Carolina', country: 'US' },
  '337': { region: 'Southwest Louisiana', country: 'US' },
  '339': { region: 'Boston, MA', country: 'US' },
  '346': { region: 'Houston, TX', country: 'US' },
  '347': { region: 'New York, NY', country: 'US' },
  '351': { region: 'Boston, MA', country: 'US' },
  '352': { region: 'Gainesville, FL', country: 'US' },
  '360': { region: 'Western Washington', country: 'US' },
  '361': { region: 'Corpus Christi, TX', country: 'US' },
  '386': { region: 'North Central Florida', country: 'US' },
  '401': { region: 'Rhode Island', country: 'US' },
  '402': { region: 'Eastern Nebraska', country: 'US' },
  '404': { region: 'Atlanta, GA', country: 'US' },
  '405': { region: 'Oklahoma City, OK', country: 'US' },
  '406': { region: 'Montana', country: 'US' },
  '407': { region: 'Orlando, FL', country: 'US' },
  '408': { region: 'San Jose, CA', country: 'US' },
  '409': { region: 'Southeast Texas', country: 'US' },
  '410': { region: 'Eastern Maryland', country: 'US' },
  '412': { region: 'Pittsburgh, PA', country: 'US' },
  '413': { region: 'Western Massachusetts', country: 'US' },
  '414': { region: 'Milwaukee, WI', country: 'US' },
  '415': { region: 'San Francisco, CA', country: 'US' },
  '417': { region: 'Southwest Missouri', country: 'US' },
  '419': { region: 'Northwest Ohio', country: 'US' },
  '423': { region: 'Eastern Tennessee', country: 'US' },
  '424': { region: 'West Los Angeles, CA', country: 'US' },
  '425': { region: 'Seattle, WA', country: 'US' },
  '430': { region: 'Northeast Texas', country: 'US' },
  '432': { region: 'West Texas', country: 'US' },
  '434': { region: 'Central Virginia', country: 'US' },
  '435': { region: 'Southern and Eastern Utah', country: 'US' },
  '440': { region: 'Cleveland, OH', country: 'US' },
  '442': { region: 'Southern California', country: 'US' },
  '443': { region: 'Eastern Maryland', country: 'US' },
  '469': { region: 'Dallas, TX', country: 'US' },
  '470': { region: 'Atlanta, GA', country: 'US' },
  '475': { region: 'Southwest Connecticut', country: 'US' },
  '478': { region: 'Central Georgia', country: 'US' },
  '479': { region: 'Northwest Arkansas', country: 'US' },
  '480': { region: 'Phoenix, AZ', country: 'US' },
  '484': { region: 'Eastern Pennsylvania', country: 'US' },
  '501': { region: 'Central Arkansas', country: 'US' },
  '502': { region: 'Louisville, KY', country: 'US' },
  '503': { region: 'Portland, OR', country: 'US' },
  '504': { region: 'New Orleans, LA', country: 'US' },
  '505': { region: 'New Mexico', country: 'US' },
  '507': { region: 'Southern Minnesota', country: 'US' },
  '508': { region: 'Central Massachusetts', country: 'US' },
  '509': { region: 'Eastern Washington', country: 'US' },
  '510': { region: 'Oakland, CA', country: 'US' },
  '512': { region: 'Austin, TX', country: 'US' },
  '513': { region: 'Cincinnati, OH', country: 'US' },
  '515': { region: 'Des Moines, IA', country: 'US' },
  '516': { region: 'Long Island, NY', country: 'US' },
  '517': { region: 'Lansing, MI', country: 'US' },
  '518': { region: 'Albany, NY', country: 'US' },
  '520': { region: 'Southern Arizona', country: 'US' },
  '530': { region: 'Northern California', country: 'US' },
  '540': { region: 'Western Virginia', country: 'US' },
  '541': { region: 'Oregon', country: 'US' },
  '551': { region: 'North Jersey', country: 'US' },
  '559': { region: 'Central California', country: 'US' },
  '561': { region: 'Palm Beach, FL', country: 'US' },
  '562': { region: 'Long Beach, CA', country: 'US' },
  '563': { region: 'Eastern Iowa', country: 'US' },
  '564': { region: 'Western Washington', country: 'US' },
  '567': { region: 'Northwest Ohio', country: 'US' },
  '570': { region: 'Northeast Pennsylvania', country: 'US' },
  '571': { region: 'Northern Virginia', country: 'US' },
  '573': { region: 'Southeast Missouri', country: 'US' },
  '574': { region: 'North Central Indiana', country: 'US' },
  '575': { region: 'New Mexico', country: 'US' },
  '580': { region: 'Oklahoma', country: 'US' },
  '585': { region: 'Rochester, NY', country: 'US' },
  '586': { region: 'Macomb County, MI', country: 'US' },
  '601': { region: 'Central Mississippi', country: 'US' },
  '602': { region: 'Phoenix, AZ', country: 'US' },
  '603': { region: 'New Hampshire', country: 'US' },
  '605': { region: 'South Dakota', country: 'US' },
  '606': { region: 'Eastern Kentucky', country: 'US' },
  '607': { region: 'Southern New York', country: 'US' },
  '608': { region: 'Southern Wisconsin', country: 'US' },
  '609': { region: 'Central New Jersey', country: 'US' },
  '610': { region: 'Eastern Pennsylvania', country: 'US' },
  '612': { region: 'Minneapolis, MN', country: 'US' },
  '614': { region: 'Columbus, OH', country: 'US' },
  '615': { region: 'Nashville, TN', country: 'US' },
  '616': { region: 'Grand Rapids, MI', country: 'US' },
  '617': { region: 'Boston, MA', country: 'US' },
  '618': { region: 'Southern Illinois', country: 'US' },
  '619': { region: 'San Diego, CA', country: 'US' },
  '620': { region: 'Southern Kansas', country: 'US' },
  '623': { region: 'Phoenix, AZ', country: 'US' },
  '626': { region: 'Pasadena, CA', country: 'US' },
  '630': { region: 'Western Chicago Suburbs, IL', country: 'US' },
  '631': { region: 'Long Island, NY', country: 'US' },
  '636': { region: 'Eastern Missouri', country: 'US' },
  '641': { region: 'Central Iowa', country: 'US' },
  '646': { region: 'New York, NY', country: 'US' },
  '650': { region: 'San Mateo County, CA', country: 'US' },
  '651': { region: 'St. Paul, MN', country: 'US' },
  '657': { region: 'Orange County, CA', country: 'US' },
  '660': { region: 'North Central Missouri', country: 'US' },
  '661': { region: 'Bakersfield, CA', country: 'US' },
  '662': { region: 'Northern Mississippi', country: 'US' },
  '667': { region: 'Eastern Maryland', country: 'US' },
  '669': { region: 'San Jose, CA', country: 'US' },
  '678': { region: 'Atlanta, GA', country: 'US' },
  '682': { region: 'Fort Worth, TX', country: 'US' },
  '701': { region: 'North Dakota', country: 'US' },
  '702': { region: 'Las Vegas, NV', country: 'US' },
  '703': { region: 'Northern Virginia', country: 'US' },
  '704': { region: 'Charlotte, NC', country: 'US' },
  '706': { region: 'Northern Georgia', country: 'US' },
  '707': { region: 'Northwest California', country: 'US' },
  '708': { region: 'Chicago Suburbs, IL', country: 'US' },
  '712': { region: 'Western Iowa', country: 'US' },
  '713': { region: 'Houston, TX', country: 'US' },
  '714': { region: 'Orange County, CA', country: 'US' },
  '715': { region: 'Northern Wisconsin', country: 'US' },
  '716': { region: 'Buffalo, NY', country: 'US' },
  '717': { region: 'South Central Pennsylvania', country: 'US' },
  '718': { region: 'New York, NY', country: 'US' },
  '719': { region: 'Colorado Springs, CO', country: 'US' },
  '720': { region: 'Denver, CO', country: 'US' },
  '724': { region: 'Western Pennsylvania', country: 'US' },
  '727': { region: 'St. Petersburg, FL', country: 'US' },
  '731': { region: 'Western Tennessee', country: 'US' },
  '732': { region: 'Central New Jersey', country: 'US' },
  '734': { region: 'Ann Arbor, MI', country: 'US' },
  '737': { region: 'Austin, TX', country: 'US' },
  '740': { region: 'Southeast Ohio', country: 'US' },
  '747': { region: 'Los Angeles, CA', country: 'US' },
  '754': { region: 'Broward County, FL', country: 'US' },
  '757': { region: 'Hampton Roads, VA', country: 'US' },
  '760': { region: 'Southern California', country: 'US' },
  '762': { region: 'Northern Georgia', country: 'US' },
  '763': { region: 'Minneapolis Suburbs, MN', country: 'US' },
  '765': { region: 'Central Indiana', country: 'US' },
  '770': { region: 'Atlanta, GA', country: 'US' },
  '772': { region: 'Treasure Coast, FL', country: 'US' },
  '773': { region: 'Chicago, IL', country: 'US' },
  '774': { region: 'Central Massachusetts', country: 'US' },
  '775': { region: 'Northern Nevada', country: 'US' },
  '781': { region: 'Boston, MA', country: 'US' },
  '785': { region: 'Northern Kansas', country: 'US' },
  '786': { region: 'Miami-Dade, FL', country: 'US' },
  '801': { region: 'Salt Lake City, UT', country: 'US' },
  '802': { region: 'Vermont', country: 'US' },
  '803': { region: 'Central South Carolina', country: 'US' },
  '804': { region: 'Richmond, VA', country: 'US' },
  '805': { region: 'Central California Coast', country: 'US' },
  '806': { region: 'Texas Panhandle', country: 'US' },
  '808': { region: 'Hawaii', country: 'US' },
  '810': { region: 'East Michigan', country: 'US' },
  '812': { region: 'Southern Indiana', country: 'US' },
  '813': { region: 'Tampa, FL', country: 'US' },
  '814': { region: 'Northwest Pennsylvania', country: 'US' },
  '815': { region: 'Northern Illinois', country: 'US' },
  '816': { region: 'Kansas City, MO', country: 'US' },
  '817': { region: 'Fort Worth, TX', country: 'US' },
  '818': { region: 'San Fernando Valley, CA', country: 'US' },
  '828': { region: 'Western North Carolina', country: 'US' },
  '830': { region: 'South Texas', country: 'US' },
  '831': { region: 'Central California Coast', country: 'US' },
  '832': { region: 'Houston, TX', country: 'US' },
  '843': { region: 'Charleston, SC', country: 'US' },
  '845': { region: 'Hudson Valley, NY', country: 'US' },
  '847': { region: 'Northern Chicago Suburbs, IL', country: 'US' },
  '848': { region: 'Central New Jersey', country: 'US' },
  '850': { region: 'Northwest Florida', country: 'US' },
  '856': { region: 'South Jersey', country: 'US' },
  '857': { region: 'Boston, MA', country: 'US' },
  '858': { region: 'San Diego, CA', country: 'US' },
  '859': { region: 'Lexington, KY', country: 'US' },
  '860': { region: 'Connecticut', country: 'US' },
  '862': { region: 'North Jersey', country: 'US' },
  '863': { region: 'Central Florida', country: 'US' },
  '864': { region: 'Upstate South Carolina', country: 'US' },
  '865': { region: 'Knoxville, TN', country: 'US' },
  '870': { region: 'Arkansas', country: 'US' },
  '872': { region: 'Chicago, IL', country: 'US' },
  '878': { region: 'Western Pennsylvania', country: 'US' },
  '901': { region: 'Memphis, TN', country: 'US' },
  '903': { region: 'Northeast Texas', country: 'US' },
  '904': { region: 'Jacksonville, FL', country: 'US' },
  '906': { region: 'Upper Peninsula, MI', country: 'US' },
  '907': { region: 'Alaska', country: 'US' },
  '908': { region: 'North Central New Jersey', country: 'US' },
  '909': { region: 'Inland Empire, CA', country: 'US' },
  '910': { region: 'Southeastern North Carolina', country: 'US' },
  '912': { region: 'Coastal Georgia', country: 'US' },
  '913': { region: 'Northeast Kansas', country: 'US' },
  '914': { region: 'Westchester County, NY', country: 'US' },
  '915': { region: 'El Paso, TX', country: 'US' },
  '916': { region: 'Sacramento, CA', country: 'US' },
  '917': { region: 'New York, NY', country: 'US' },
  '918': { region: 'Tulsa, OK', country: 'US' },
  '919': { region: 'Raleigh-Durham, NC', country: 'US' },
  '920': { region: 'Northeast Wisconsin', country: 'US' },
  '925': { region: 'East Bay, CA', country: 'US' },
  '928': { region: 'Northern Arizona', country: 'US' },
  '929': { region: 'New York, NY', country: 'US' },
  '931': { region: 'Central Tennessee', country: 'US' },
  '936': { region: 'East Texas', country: 'US' },
  '937': { region: 'Dayton, OH', country: 'US' },
  '940': { region: 'North Texas', country: 'US' },
  '941': { region: 'Southwest Florida', country: 'US' },
  '947': { region: 'Oakland County, MI', country: 'US' },
  '949': { region: 'South Orange County, CA', country: 'US' },
  '951': { region: 'Inland Empire, CA', country: 'US' },
  '952': { region: 'Minneapolis Suburbs, MN', country: 'US' },
  '954': { region: 'Broward County, FL', country: 'US' },
  '956': { region: 'South Texas', country: 'US' },
  '959': { region: 'Connecticut', country: 'US' },
  '970': { region: 'Northern Colorado', country: 'US' },
  '971': { region: 'Portland, OR', country: 'US' },
  '972': { region: 'Dallas, TX', country: 'US' },
  '973': { region: 'North Jersey', country: 'US' },
  '978': { region: 'Northeast Massachusetts', country: 'US' },
  '979': { region: 'Southeast Texas', country: 'US' },
  '980': { region: 'Charlotte, NC', country: 'US' },
  '984': { region: 'Raleigh-Durham, NC', country: 'US' },
  '985': { region: 'Southeast Louisiana', country: 'US' },
  '989': { region: 'Central Michigan', country: 'US' },

  // Canada
  '204': { region: 'Manitoba', country: 'CA' },
  '226': { region: 'Southwestern Ontario', country: 'CA' },
  '236': { region: 'British Columbia', country: 'CA' },
  '249': { region: 'Northern Ontario', country: 'CA' },
  '250': { region: 'British Columbia', country: 'CA' },
  '263': { region: 'Quebec', country: 'CA' },
  '289': { region: 'Southern Ontario', country: 'CA' },
  '306': { region: 'Saskatchewan', country: 'CA' },
  '343': { region: 'Eastern Ontario', country: 'CA' },
  '354': { region: 'Quebec', country: 'CA' },
  '365': { region: 'Ontario', country: 'CA' },
  '367': { region: 'Quebec', country: 'CA' },
  '368': { region: 'Alberta', country: 'CA' },
  '403': { region: 'Southern Alberta', country: 'CA' },
  '416': { region: 'Toronto, ON', country: 'CA' },
  '418': { region: 'Quebec City, QC', country: 'CA' },
  '428': { region: 'British Columbia', country: 'CA' },
  '431': { region: 'Manitoba', country: 'CA' },
  '437': { region: 'Toronto, ON', country: 'CA' },
  '438': { region: 'Montreal, QC', country: 'CA' },
  '450': { region: 'Quebec', country: 'CA' },
  '468': { region: 'Quebec', country: 'CA' },
  '474': { region: 'Saskatchewan', country: 'CA' },
  '506': { region: 'New Brunswick', country: 'CA' },
  '514': { region: 'Montreal, QC', country: 'CA' },
  '519': { region: 'Southwestern Ontario', country: 'CA' },
  '548': { region: 'Ontario', country: 'CA' },
  '579': { region: 'Quebec', country: 'CA' },
  '581': { region: 'Quebec', country: 'CA' },
  '584': { region: 'Manitoba', country: 'CA' },
  '587': { region: 'Alberta', country: 'CA' },
  '604': { region: 'Vancouver, BC', country: 'CA' },
  '613': { region: 'Eastern Ontario', country: 'CA' },
  '639': { region: 'Saskatchewan', country: 'CA' },
  '647': { region: 'Toronto, ON', country: 'CA' },
  '672': { region: 'British Columbia', country: 'CA' },
  '705': { region: 'Northern Ontario', country: 'CA' },
  '709': { region: 'Newfoundland and Labrador', country: 'CA' },
  '753': { region: 'Ontario', country: 'CA' },
  '778': { region: 'British Columbia', country: 'CA' },
  '780': { region: 'Northern Alberta', country: 'CA' },
  '782': { region: 'Nova Scotia', country: 'CA' },
  '807': { region: 'Northwestern Ontario', country: 'CA' },
  '819': { region: 'Western Quebec', country: 'CA' },
  '825': { region: 'Alberta', country: 'CA' },
  '867': { region: 'Yukon, NWT, Nunavut', country: 'CA' },
  '873': { region: 'Quebec', country: 'CA' },
  '879': { region: 'Quebec', country: 'CA' },
  '902': { region: 'Nova Scotia', country: 'CA' },
  '905': { region: 'Southern Ontario', country: 'CA' },
};

/**
 * Detect area code information from phone number
 */
export function detectAreaCode(phone: string): AreaCodeInfo | null {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 3) {
    return null;
  }

  // Extract first 3 digits as area code
  const areaCode = cleaned.substring(0, 3);

  // Check NANP area codes
  if (NANP_AREA_CODES[areaCode]) {
    const info = NANP_AREA_CODES[areaCode];
    return {
      code: areaCode,
      region: info.region,
      country: info.country,
      format: 'NANP'
    };
  }

  // If no match found, assume international or unknown NANP
  if (cleaned.length === 10) {
    return {
      code: areaCode,
      region: 'Unknown',
      country: 'Unknown',
      format: 'NANP'
    };
  }

  return {
    code: areaCode,
    region: 'International',
    country: 'International',
    format: 'INTL'
  };
}

/**
 * Format phone number based on detected area code
 */
export function formatPhoneNumberWithAreaCode(phone: string): {
  formatted: string;
  areaCodeInfo: AreaCodeInfo | null;
} {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 0) {
    return { formatted: '', areaCodeInfo: null };
  }

  const areaCodeInfo = detectAreaCode(cleaned);

  // NANP format: (XXX) XXX-XXXX
  if (cleaned.length <= 10) {
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      let formatted = '';
      if (match[1]) {
        formatted = `(${match[1]}`;
        if (match[1].length === 3) formatted += ')';
      }
      if (match[2]) {
        formatted += ` ${match[2]}`;
      }
      if (match[3]) {
        formatted += `-${match[3]}`;
      }
      return { formatted: formatted.trim(), areaCodeInfo };
    }
  }

  // International format: +X XXX XXX XXXX
  if (cleaned.length > 10) {
    const countryCode = cleaned.substring(0, cleaned.length - 10);
    const remaining = cleaned.substring(cleaned.length - 10);
    const match = remaining.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
      const formatted = `+${countryCode} (${match[1]}) ${match[2]}-${match[3]}`;
      return { formatted, areaCodeInfo };
    }
  }

  return { formatted: phone, areaCodeInfo };
}

/**
 * Get a user-friendly description of the phone number location
 */
export function getPhoneLocationDescription(phone: string): string {
  const areaCodeInfo = detectAreaCode(phone);

  if (!areaCodeInfo) {
    return '';
  }

  if (areaCodeInfo.country === 'US') {
    return `${areaCodeInfo.region}, United States`;
  } else if (areaCodeInfo.country === 'CA') {
    return `${areaCodeInfo.region}, Canada`;
  } else if (areaCodeInfo.country === 'Unknown') {
    return 'Area code not recognized';
  } else if (areaCodeInfo.country === 'International') {
    return 'International number';
  }

  return areaCodeInfo.region;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10;
}

/**
 * Clean phone number for storage
 */
export function cleanPhoneForStorage(phone: string): string {
  return phone.replace(/\D/g, '');
}

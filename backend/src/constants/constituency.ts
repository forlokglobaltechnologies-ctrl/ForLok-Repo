/**
 * Cheepurupalli Assembly Constituency (15)
 * District: Vizianagaram, Andhra Pradesh
 * 4 Mandals: Cheepurupalli, Garividi, Gurla, Merakamudidam
 *
 * BUGS FIXED (2026-03-04):
 *  - Removed 'vizianagaram' from accepted names (was causing false positives)
 *  - Tightened minLat from 18.10 → 18.17 (excludes Vizianagaram city 18.117°N)
 *  - Added alternate spellings for hyphenated & misspelled village names
 *  - Tightened polygon to exclude areas outside constituency
 */

export const CONSTITUENCY_BOUNDS = {
  minLat: 18.17,  // FIX: was 18.10
  maxLat: 18.55,
  minLng: 83.38,
  maxLng: 83.75,
};

export const CONSTITUENCY_PLACES = {
  CHEEPURUPALLI_MANDAL: {
    towns: ['Cheepurupalle', 'Cheepurupalli'],
    villages: [
      'Alajangi', 'Anjaneyapuram', 'Aridivalasa', 'Bhoolokapathivarakattu',
      'Devarapalle', 'Gollalapalle', 'Gunadam', 'Ippalavalasa', 'Kalavacherla',
      'Karakam', 'Karlam', 'Kondapalem', 'Lakshmipuram', 'Mettapalle',
      'Nadipalle', 'Nimmalavalasa', 'Pallepalem', 'Parannavalasa', 'Pathivada',
      'Pedanadipalli', 'Peripi', 'Pinnamitivalasa',
      'Purushothamapurm', 'Purushothamapuram',
      'Ramalingapuram', 'Ravivalasa', 'Sankupalem', 'Sivaram',
      'Taminaiduvalasa', 'Viswanadhapuram',
    ],
  },
  GARIVIDI_MANDAL: {
    towns: ['Garividi', 'Shreeramnagar'],
    villages: [
      'Appannavalasa', 'Arthamuru', 'Avagudem', 'Baguvalasa', 'Bondapalli',
      'Budatrayavalasa', 'Chenduvalasa', 'Devada', 'Duppada', 'Gadabavalasa',
      'Gadasam', 'Itlamamidi', 'Kalivaram', 'Kapusambham', 'Kondalakkivalasa',
      'Konisa', 'Konuru', 'Kottitivalasa', 'Kumaram', 'Lakshmipuram',
      'Lingalavalasa', 'Mandapalle', 'Mukundapuram', 'Nagallavalasa',
      'Niluvativalasa', 'Penubarthi', 'Regati', 'Seripeta', 'Sivaram',
      'Somalingapuram', 'Thodum', 'Vedullavalasa',
    ],
  },
  GURLA_MANDAL: {
    towns: [],
    villages: [
      'Anandapuram', 'Chinthalapeta', 'Chinthapallipeta', 'Chodavaram',
      'Garida', 'Geddaluppada', 'Gosada', 'Gudem', 'Gurla', 'Itikarlapalle',
      'Jamadala', 'Kalavacherla', 'Karatam', 'Kellam', 'Kothapalle', 'Kothuru',
      'Krosuru', 'Marrivalasa', 'Nagallavalasa', 'Nallaiahpeta', 'Pakki',
      'Palavalasa', 'Palligandredu', 'Peddamajipalem', 'Penubarthi', 'Polipalli',
      'Punnampeta', 'Sadanandapuram', 'Tettangi', 'Thandrangi', 'Vallapuram',
    ],
  },
  MERAKAMUDIDAM_MANDAL: {
    towns: [],
    villages: [
      'Badam', 'Bhagirathipuram', 'Bheemavaram', 'Bhyripuram', 'Budarayavalasa',
      'Bylapudi',
      'China-Bantupalli', 'China Bantupalli',
      'Garbham', 'Giduthuru', 'Gollalamulagam', 'Gummadam', 'Merakamudidam',
      'Naguru', 'Neelakantapuram',
      'Peda-Bantupalli', 'Peda Bantupalli',
      'Rachakindam', 'Somalingapuram', 'Sompuram', 'Thammapuram',
      'Uthanapalli', 'Vootapalli',
    ],
  },
} as const;

const _allPlaces: string[] = [
  ...CONSTITUENCY_PLACES.CHEEPURUPALLI_MANDAL.towns,
  ...CONSTITUENCY_PLACES.CHEEPURUPALLI_MANDAL.villages,
  ...CONSTITUENCY_PLACES.GARIVIDI_MANDAL.towns,
  ...CONSTITUENCY_PLACES.GARIVIDI_MANDAL.villages,
  ...CONSTITUENCY_PLACES.GURLA_MANDAL.villages,
  ...CONSTITUENCY_PLACES.MERAKAMUDIDAM_MANDAL.villages,
];

export const CONSTITUENCY_PLACE_SET: Set<string> = new Set(
  _allPlaces.map((p) => p.toLowerCase().trim()),
);

// Only the 4 actual mandal names. FIX: 'vizianagaram' removed (district name).
const MANDAL_NAMES = ['cheepurupalli', 'garividi', 'gurla', 'merakamudidam'];

export const CONSTITUENCY_POLYGON: Array<[number, number]> = [
  [18.52, 83.40],
  [18.55, 83.52],
  [18.55, 83.68],
  [18.42, 83.75],
  [18.28, 83.72],
  [18.18, 83.60],
  [18.20, 83.45],
  [18.35, 83.38],
  [18.52, 83.40],
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isInConstituencyBounds(lat: number, lng: number): boolean {
  return (
    lat >= CONSTITUENCY_BOUNDS.minLat &&
    lat <= CONSTITUENCY_BOUNDS.maxLat &&
    lng >= CONSTITUENCY_BOUNDS.minLng &&
    lng <= CONSTITUENCY_BOUNDS.maxLng
  );
}

export function isAddressInConstituency(address: string): boolean {
  const lower = address.toLowerCase().trim();
  for (const place of CONSTITUENCY_PLACE_SET) {
    const escaped = escapeRegex(place);
    const pattern = new RegExp(`(^|[\\s,])${escaped}($|[\\s,])`, 'i');
    if (pattern.test(lower)) return true;
  }
  for (const mandal of MANDAL_NAMES) {
    if (lower.includes(mandal)) return true;
  }
  return false;
}

export function isInsideConstituencyPolygon(lat: number, lng: number): boolean {
  const polygon = CONSTITUENCY_POLYGON;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isLocationInConstituency(params: {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
}): boolean {
  const { lat, lng, address, city } = params;
  if (!isInConstituencyBounds(lat, lng)) return false;
  if (city && isAddressInConstituency(city)) return true;
  if (address && isAddressInConstituency(address)) return true;
  return isInsideConstituencyPolygon(lat, lng);
}

export const CONSTITUENCY_ERROR_MESSAGE =
  'Location must be within Cheepurupalli Constituency (Cheepurupalli, Garividi, Gurla, or Merakamudidam mandal)';

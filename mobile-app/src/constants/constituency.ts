/**
 * Cheepurupalli Assembly Constituency (15)
 * District: Vizianagaram, Andhra Pradesh
 * 4 Mandals: Cheepurupalli, Garividi, Gurla, Merakamudidam
 *
 * All location validation is restricted to this constituency.
 * Three-layer validation:
 *  1. Bounding box (fast pre-filter)
 *  2. Village/town name whitelist (accurate for known places)
 *  3. Coordinate polygon (catch-all for unnamed spots inside boundary)
 *
 * BUGS FIXED (2026-03-04):
 *  - Removed 'vizianagaram' from accepted names → was causing Vizianagaram
 *    city (outside constituency) to pass validation as false positive
 *  - Tightened minLat from 18.10 → 18.17 → excludes Vizianagaram city
 *    (18.117°N) while keeping all 4 mandal villages (all above 18.17°N)
 *  - Added alternate spellings for hyphenated & misspelled village names
 *  - Tightened polygon to exclude corners of bounding box outside constituency
 */

// ── Layer 1: Bounding box ─────────────────────────────────────────────────────
// minLat = 18.17 specifically excludes Vizianagaram city (18.117°N) which is
// in a different assembly constituency despite being in Vizianagaram district.
export const CONSTITUENCY_BOUNDS = {
  minLat: 18.17,  // FIX: was 18.10 — now excludes Vizianagaram city
  maxLat: 18.55,
  minLng: 83.38,
  maxLng: 83.75,
};

// ── Layer 2: Complete village/town whitelist from official records ─────────────
export const CONSTITUENCY_PLACES = {
  CHEEPURUPALLI_MANDAL: {
    towns: ['Cheepurupalle', 'Cheepurupalli'],
    villages: [
      'Alajangi', 'Anjaneyapuram', 'Aridivalasa', 'Bhoolokapathivarakattu',
      'Devarapalle', 'Gollalapalle', 'Gunadam', 'Ippalavalasa', 'Kalavacherla',
      'Karakam', 'Karlam', 'Kondapalem', 'Lakshmipuram', 'Mettapalle',
      'Nadipalle', 'Nimmalavalasa', 'Pallepalem', 'Parannavalasa', 'Pathivada',
      'Pedanadipalli', 'Peripi', 'Pinnamitivalasa',
      'Purushothamapurm', 'Purushothamapuram',   // FIX: both spellings (PDF typo)
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
      'China-Bantupalli', 'China Bantupalli',  // FIX: both spellings (hyphen vs space)
      'Garbham', 'Giduthuru', 'Gollalamulagam', 'Gummadam', 'Merakamudidam',
      'Naguru', 'Neelakantapuram',
      'Peda-Bantupalli', 'Peda Bantupalli',    // FIX: both spellings (hyphen vs space)
      'Rachakindam', 'Somalingapuram', 'Sompuram', 'Thammapuram',
      'Uthanapalli', 'Vootapalli',
    ],
  },
} as const;

// ── Flat lowercase Set for O(1) lookup ─────────────────────────────────────────
// NOTE: Duplicate village names across mandals (e.g. Lakshmipuram appears in
// Cheepurupalli + Garividi; Kalavacherla in Cheepurupalli + Gurla; Sivaram in
// Cheepurupalli + Garividi; Nagallavalasa in Garividi + Gurla; Penubarthi in
// Garividi + Gurla; Somalingapuram in Garividi + Merakamudidam) — duplicates
// collapse into one Set entry which is correct (all are inside constituency).
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

// Only the 4 actual mandal names of this constituency.
// FIX: 'vizianagaram' REMOVED — it is the district name, not a mandal name.
//      Including it caused Vizianagaram city (outside constituency) to pass
//      validation because geocoded addresses include the district name.
const MANDAL_NAMES = ['cheepurupalli', 'garividi', 'gurla', 'merakamudidam'];

// ── Layer 3: Tighter polygon approximating constituency boundary ────────────────
// This polygon is more accurate than the bounding box — it excludes the
// SW corner (where Vizianagaram city sits) and NW corner (outside boundary).
// TODO: Replace with official GeoJSON from Election Commission for production.
export const CONSTITUENCY_POLYGON: Array<[number, number]> = [
  // [lat, lng] — clockwise from NW
  [18.52, 83.40], // NW  — Garividi mandal top-west
  [18.55, 83.52], // N   — Merakamudidam mandal top
  [18.55, 83.68], // NE  — Merakamudidam mandal top-east
  [18.42, 83.75], // E   — Merakamudidam east edge
  [18.28, 83.72], // SE  — Gurla mandal east
  [18.18, 83.60], // S   — Gurla mandal south
  [18.20, 83.45], // SW  — Cheepurupalli mandal south-west
  [18.35, 83.38], // W   — Garividi mandal west
  [18.52, 83.40], // close polygon
];

// ── Helper: escape regex special characters in a place name ──────────────────
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Note: hyphen (-) is NOT special outside character classes, so China-Bantupalli
  // works without escaping, but this future-proofs against other special chars.
}

// ── Validation helpers ────────────────────────────────────────────────────────

/** Layer 1: Fast bounding box pre-filter */
export function isInConstituencyBounds(lat: number, lng: number): boolean {
  return (
    lat >= CONSTITUENCY_BOUNDS.minLat &&
    lat <= CONSTITUENCY_BOUNDS.maxLat &&
    lng >= CONSTITUENCY_BOUNDS.minLng &&
    lng <= CONSTITUENCY_BOUNDS.maxLng
  );
}

/** Layer 2: Village/town name whitelist check (checks full address string) */
export function isAddressInConstituency(address: string): boolean {
  const lower = address.toLowerCase().trim();

  // Check against known place names with word-boundary pattern
  for (const place of CONSTITUENCY_PLACE_SET) {
    const escaped = escapeRegex(place);
    const pattern = new RegExp(`(^|[\\s,])${escaped}($|[\\s,])`, 'i');
    if (pattern.test(lower)) return true;
  }

  // Check against the 4 mandal names only (NOT district name)
  for (const mandal of MANDAL_NAMES) {
    if (lower.includes(mandal)) return true;
  }

  return false;
}

/** Layer 3: Ray-casting point-in-polygon check */
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

/**
 * Master validation: combines all 3 layers.
 * Returns true if the location is within Cheepurupalli Constituency.
 *
 * Logic:
 *  - If bounding box fails → reject immediately (fast path)
 *  - If address/city name matches a known village → accept
 *  - Otherwise fall through to polygon check (catches unnamed spots in fields etc.)
 */
export function isLocationInConstituency(params: {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
}): boolean {
  const { lat, lng, address, city } = params;

  // Layer 1: bounding box (fast reject)
  if (!isInConstituencyBounds(lat, lng)) return false;

  // Layer 2a: check city field
  if (city && isAddressInConstituency(city)) return true;

  // Layer 2b: check full address string
  if (address && isAddressInConstituency(address)) return true;

  // Layer 3: polygon fallback (catches unnamed coordinates inside boundary)
  return isInsideConstituencyPolygon(lat, lng);
}

export const CONSTITUENCY_ERROR_MESSAGE =
  'Please select a location within Cheepurupalli Constituency\n' +
  '(Cheepurupalli, Garividi, Gurla, or Merakamudidam mandal)';

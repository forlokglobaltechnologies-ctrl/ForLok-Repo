import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId: string) => `@forlok_hw_places_${userId}`;

export type HomeWorkPlace = {
  label: 'home' | 'work';
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
};

function parseCoord(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export async function getDeviceHomeWork(userId: string): Promise<{ home?: HomeWorkPlace; work?: HomeWorkPlace }> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { home?: HomeWorkPlace; work?: HomeWorkPlace };
    const norm = (p?: HomeWorkPlace): HomeWorkPlace | undefined => {
      if (!p || typeof p.address !== 'string' || !p.address.trim()) return undefined;
      const lat = parseCoord(p.lat);
      const lng = parseCoord(p.lng);
      if (lat === undefined || lng === undefined) return undefined;
      const lab = String(p.label || '').toLowerCase();
      if (lab !== 'home' && lab !== 'work') return undefined;
      return {
        label: lab,
        address: p.address,
        lat,
        lng,
        city: p.city,
        state: p.state,
      };
    };
    return { home: norm(parsed.home), work: norm(parsed.work) };
  } catch {
    return {};
  }
}

export async function setDeviceHomeWork(
  userId: string,
  next: { home?: HomeWorkPlace; work?: HomeWorkPlace }
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
}

export async function upsertDeviceHomeWork(
  userId: string,
  label: 'home' | 'work',
  place: { address: string; lat: number; lng: number; city?: string; state?: string }
): Promise<{ home?: HomeWorkPlace; work?: HomeWorkPlace }> {
  const cur = await getDeviceHomeWork(userId);
  const lat = parseCoord(place.lat);
  const lng = parseCoord(place.lng);
  if (lat === undefined || lng === undefined) return cur;
  const entry: HomeWorkPlace = {
    label,
    address: place.address,
    lat,
    lng,
    city: place.city,
    state: place.state,
  };
  const merged = { ...cur, [label]: entry };
  await setDeviceHomeWork(userId, merged);
  return merged;
}

function apiRowToCache(p: any): HomeWorkPlace | undefined {
  if (!p || typeof p.address !== 'string' || !p.address.trim()) return undefined;
  const lat = parseCoord(p.lat);
  const lng = parseCoord(p.lng);
  if (lat === undefined || lng === undefined) return undefined;
  const lab = String(p.label || '').toLowerCase();
  if (lab !== 'home' && lab !== 'work') return undefined;
  return {
    label: lab,
    address: p.address,
    lat,
    lng,
    city: p.city,
    state: p.state,
  };
}

/** Prefer server rows when present; keep device copy when the API omits them (offline / transient errors). */
export async function reconcileDeviceWithApi(
  userId: string,
  apiPlaces: any[]
): Promise<{ home?: HomeWorkPlace; work?: HomeWorkPlace }> {
  const cur = await getDeviceHomeWork(userId);
  const apiHome = apiPlaces.find((p) => String(p?.label || '').toLowerCase() === 'home');
  const apiWork = apiPlaces.find((p) => String(p?.label || '').toLowerCase() === 'work');
  const next = {
    home: apiRowToCache(apiHome) ?? cur.home,
    work: apiRowToCache(apiWork) ?? cur.work,
  };
  await setDeviceHomeWork(userId, next);
  return next;
}

export function buildSavedPlacesList(
  apiPlaces: any[],
  device: { home?: HomeWorkPlace; work?: HomeWorkPlace }
): any[] {
  const list = apiPlaces || [];
  const customs = list.filter((p) => String(p?.label || '').toLowerCase() === 'custom');
  const apiHome = list.find((p) => String(p?.label || '').toLowerCase() === 'home');
  const apiWork = list.find((p) => String(p?.label || '').toLowerCase() === 'work');
  const home = apiHome || device.home;
  const work = apiWork || device.work;
  const out: any[] = [];
  if (home) out.push({ ...home, label: 'home' });
  if (work) out.push({ ...work, label: 'work' });
  out.push(...customs);
  return out;
}

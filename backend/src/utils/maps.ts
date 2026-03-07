/**
 * Maps utility for OpenStreetMap and Google Maps
 * OpenStreetMap is free and doesn't require API keys
 */

import { config } from '../config/env';
import logger from './logger';
import { osrmService } from '../services/osrm.service';

const REVERSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const reverseGeocodeCache = new Map<string, { value: GeocodeResult | null; expiresAt: number }>();
let osmReverseBackoffUntilMs = 0;

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  pincode?: string;
}

// Type definitions for API responses
interface OpenStreetMapGeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    state?: string;
    postcode?: string;
  };
}

interface GoogleMapsGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}

interface OpenStreetMapReverseGeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    state?: string;
    postcode?: string;
  };
}

interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    distance?: number;
    duration?: number;
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}

export interface RouteAlternative {
  routeId: string;
  distanceKm: number;
  durationMin: number;
  polyline: Array<{ lat: number; lng: number; index: number }>;
}

export interface RoutePlaceSuggestion {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  order: number;
  distanceFromStartKm: number;
}

export function calculatePolylineDistanceKm(
  polyline: Array<{ lat: number; lng: number; index: number }>
): number {
  if (!Array.isArray(polyline) || polyline.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < polyline.length; i++) {
    total += calculateHaversineDistance(
      polyline[i - 1].lat,
      polyline[i - 1].lng,
      polyline[i].lat,
      polyline[i].lng
    );
  }
  return total;
}

/**
 * Geocode address using OpenStreetMap Nominatim API (free, no API key needed)
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    if (config.maps.provider === 'openstreetmap') {
      return await geocodeWithOpenStreetMap(address);
    } else {
      return await geocodeWithGoogleMaps(address);
    }
  } catch (error) {
    logger.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Geocode using OpenStreetMap Nominatim API
 */
async function geocodeWithOpenStreetMap(address: string): Promise<GeocodeResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Forlok-App/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenStreetMapGeocodeResult[];

    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const result = data[0];
    const addressParts = result.display_name.split(',');

    return {
      address: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      city: extractCity(addressParts),
      state: extractState(addressParts),
      pincode: extractPincode(addressParts),
    };
  } catch (error) {
    logger.error('Error geocoding with OpenStreetMap:', error);
    return null;
  }
}

/**
 * Geocode using Google Maps API (if configured)
 */
async function geocodeWithGoogleMaps(address: string): Promise<GeocodeResult | null> {
  try {
    if (!config.maps.google.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${config.maps.google.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleMapsGeocodeResponse;

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;
    const addressComponents = result.address_components;

    return {
      address: result.formatted_address,
      lat: location.lat,
      lng: location.lng,
      city: extractCityFromComponents(addressComponents),
      state: extractStateFromComponents(addressComponents),
      pincode: extractPincodeFromComponents(addressComponents),
    };
  } catch (error) {
    logger.error('Error geocoding with Google Maps:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    if (config.maps.provider === 'openstreetmap') {
      return await reverseGeocodeWithOpenStreetMap(lat, lng);
    } else {
      return await reverseGeocodeWithGoogleMaps(lat, lng);
    }
  } catch (error) {
    logger.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Reverse geocode using OpenStreetMap
 */
async function reverseGeocodeWithOpenStreetMap(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    if (Date.now() < osmReverseBackoffUntilMs) {
      return null;
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Forlok-App/1.0',
      },
    });

    if (response.status === 429) {
      // Back off for a minute when Nominatim rate-limits us.
      osmReverseBackoffUntilMs = Date.now() + 60 * 1000;
      logger.warn('OpenStreetMap reverse geocode rate-limited (429). Applying temporary backoff.');
      return null;
    }

    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenStreetMapReverseGeocodeResult;

    if (!data || !data.display_name) {
      return null;
    }

    const addressParts = data.display_name.split(',');

    return {
      address: data.display_name,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      city: extractCity(addressParts),
      state: extractState(addressParts),
      pincode: extractPincode(addressParts),
    };
  } catch (error) {
    logger.error('Error reverse geocoding with OpenStreetMap:', error);
    return null;
  }
}

function getReverseCacheKey(lat: number, lng: number): string {
  // Round to increase cache hits for nearby sampled points.
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function reverseGeocodeCached(lat: number, lng: number): Promise<GeocodeResult | null> {
  const key = getReverseCacheKey(lat, lng);
  const now = Date.now();
  const cached = reverseGeocodeCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await reverseGeocode(lat, lng);
  reverseGeocodeCache.set(key, {
    value,
    expiresAt: now + REVERSE_CACHE_TTL_MS,
  });
  return value;
}

/**
 * Reverse geocode using Google Maps
 */
async function reverseGeocodeWithGoogleMaps(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    if (!config.maps.google.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${config.maps.google.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleMapsGeocodeResponse;

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components;

    return {
      address: result.formatted_address,
      lat: lat,
      lng: lng,
      city: extractCityFromComponents(addressComponents),
      state: extractStateFromComponents(addressComponents),
      pincode: extractPincodeFromComponents(addressComponents),
    };
  } catch (error) {
    logger.error('Error reverse geocoding with Google Maps:', error);
    return null;
  }
}

// Helper functions
function extractCity(parts: string[]): string | undefined {
  // Try to find city in address parts
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0 && !trimmed.match(/^\d+$/)) {
      return trimmed;
    }
  }
  return undefined;
}

function extractState(parts: string[]): string | undefined {
  // Usually state is near the end
  if (parts.length >= 2) {
    return parts[parts.length - 2]?.trim();
  }
  return undefined;
}

function extractPincode(parts: string[]): string | undefined {
  // Pincode is usually a 6-digit number
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.match(/^\d{6}$/)) {
      return trimmed;
    }
  }
  return undefined;
}

function extractCityFromComponents(
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>
): string | undefined {
  const city = components.find((c) => c.types.includes('locality'));
  return city?.long_name;
}

function extractStateFromComponents(
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>
): string | undefined {
  const state = components.find((c) => c.types.includes('administrative_area_level_1'));
  return state?.long_name;
}

function extractPincodeFromComponents(
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>
): string | undefined {
  const pincode = components.find((c) => c.types.includes('postal_code'));
  return pincode?.long_name;
}

/**
 * Get route polyline from OpenStreetMap using OSRM routing service
 * Returns array of coordinates with indices for route matching
 */
export async function getRoutePolyline(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<Array<{ lat: number; lng: number; index: number }>> {
  try {
    const osrmBaseUrl = (config.osrm?.baseUrl || 'http://router.project-osrm.org').replace(/\/+$/, '');
    // Use OSRM (Open Source Routing Machine) - free routing service
    // Format: http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
    const url = `${osrmBaseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Forlok-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OSRMRouteResponse;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      logger.warn('No route found from OSRM, using interpolated straight-line fallback');
      // Fallback: interpolate 20 points between source and destination so
      // intermediate passenger matching still works (not just a 2-point line).
      return interpolateStraightLine(fromLat, fromLng, toLat, toLng, 20);
    }

    // Extract coordinates from GeoJSON geometry
    const coordinates = data.routes[0].geometry.coordinates;
    const polyline: Array<{ lat: number; lng: number; index: number }> = [];

    // OSRM returns coordinates as [lng, lat]
    coordinates.forEach((coord: [number, number], index: number) => {
      polyline.push({
        lat: coord[1], // Latitude
        lng: coord[0], // Longitude
        index: index,
      });
    });

    logger.info(`Generated polyline with ${polyline.length} points`);
    return polyline;
  } catch (error) {
    logger.error('Error getting route polyline:', error);
    return interpolateStraightLine(fromLat, fromLng, toLat, toLng, 20);
  }
}

/**
 * Get route alternatives from OSRM.
 * Returns normalized alternatives with distance/duration and full polyline points.
 */
export async function getRouteAlternatives(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  maxAlternatives: number = 5
): Promise<RouteAlternative[]> {
  try {
    const osrmBaseUrl = (config.osrm?.baseUrl || 'http://router.project-osrm.org').replace(/\/+$/, '');
    const requestedCount = Math.max(2, Math.min(maxAlternatives, 8));
    const base = `${osrmBaseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
    // Public OSRM limits alternatives to max 3 and supports boolean mode.
    // If we send a higher number (e.g. 5/8), it returns 400 TooBig.
    const osrmAlternativesCount = Math.max(2, Math.min(requestedCount, 3));
    const commonParams = `overview=full&geometries=geojson&steps=true&alternatives=${osrmAlternativesCount}`;
    const commonParamsBool = 'overview=full&geometries=geojson&steps=true&alternatives=true';
    const viaParams = `overview=full&geometries=geojson&steps=true&alternatives=false`;

    const candidateUrls = [
      `${base}?${commonParamsBool}`,
      `${base}?${commonParams}`,
      `${base}?${commonParams}&continue_straight=true`,
      `${base}?${commonParams}&continue_straight=false`,
    ];

    const candidateRoutes: Array<{ distance?: number; duration?: number; geometry: { coordinates: Array<[number, number]> } }> = [];
    const fetchRoutesForUrl = async (url: string) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Forlok-App/1.0',
          },
        });
        if (!response.ok) {
          logger.warn(`OSRM alternatives HTTP ${response.status} for url: ${url}`);
          return;
        }
        const data = (await response.json()) as OSRMRouteResponse;
        if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
          logger.warn(`OSRM alternatives empty/code=${data.code} for url: ${url}`);
          return;
        }
        candidateRoutes.push(...data.routes);
      } catch (err) {
        logger.warn('OSRM candidate alternatives request failed:', err);
      }
    };

    for (const url of candidateUrls) {
      await fetchRoutesForUrl(url);
    }

    const buildRouteSignature = (route: { distance?: number; geometry: { coordinates: Array<[number, number]> } }) => {
      const coords = route.geometry?.coordinates || [];
      if (coords.length < 2) return '';
      const pointAt = (ratio: number) => coords[Math.min(coords.length - 1, Math.max(0, Math.floor((coords.length - 1) * ratio)))];
      const start = pointAt(0);
      const q1 = pointAt(0.25);
      const mid = pointAt(0.5);
      const q3 = pointAt(0.75);
      const end = pointAt(1);
      const distBucket = Math.round((route.distance || 0) / 100); // 100m buckets
      return `${start[0].toFixed(4)},${start[1].toFixed(4)}|${q1[0].toFixed(4)},${q1[1].toFixed(4)}|${mid[0].toFixed(4)},${mid[1].toFixed(4)}|${q3[0].toFixed(4)},${q3[1].toFixed(4)}|${end[0].toFixed(4)},${end[1].toFixed(4)}|${distBucket}`;
    };

    const getUniqueRoutes = () => {
      const seenSignatures = new Set<string>();
      return candidateRoutes.filter((route) => {
        const coords = route.geometry?.coordinates || [];
        if (coords.length < 2) return false;
        const signature = buildRouteSignature(route);
        if (!signature || seenSignatures.has(signature)) return false;
        seenSignatures.add(signature);
        return true;
      });
    };

    let uniqueRoutes = getUniqueRoutes();

    // If OSRM default alternatives are sparse, try additional routes by forcing a via point
    // near the route body on both sides. This often unlocks multiple viable paths.
    if (uniqueRoutes.length < requestedCount && uniqueRoutes.length > 0) {
      const seedCoords = uniqueRoutes[0].geometry?.coordinates || [];
      if (seedCoords.length >= 3) {
        const toLocalXY = (lng: number, lat: number, refLat: number) => ({
          x: lng * 111 * Math.cos((refLat * Math.PI) / 180),
          y: lat * 111,
        });
        const toLatLng = (x: number, y: number, refLat: number) => ({
          lng: x / (111 * Math.cos((refLat * Math.PI) / 180)),
          lat: y / 111,
        });

        const tryViaPoints: Array<{ lat: number; lng: number }> = [];
        const anchorRatios = [0.3, 0.5, 0.7];
        const directKm = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
        const offsetKm = Math.max(1.5, Math.min(8, directKm * 0.08));

        for (const ratio of anchorRatios) {
          const idx = Math.min(seedCoords.length - 2, Math.max(1, Math.floor((seedCoords.length - 1) * ratio)));
          const prev = seedCoords[Math.max(0, idx - 1)];
          const anchor = seedCoords[idx];
          const next = seedCoords[Math.min(seedCoords.length - 1, idx + 1)];
          if (!prev || !anchor || !next) continue;

          const refLat = anchor[1];
          const p1 = toLocalXY(prev[0], prev[1], refLat);
          const p2 = toLocalXY(next[0], next[1], refLat);
          const pMid = toLocalXY(anchor[0], anchor[1], refLat);

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (!Number.isFinite(len) || len < 1e-6) continue;

          const perpX = -dy / len;
          const perpY = dx / len;
          for (const sign of [-1, 1]) {
            const viaX = pMid.x + perpX * offsetKm * sign;
            const viaY = pMid.y + perpY * offsetKm * sign;
            const via = toLatLng(viaX, viaY, refLat);
            if (Number.isFinite(via.lat) && Number.isFinite(via.lng)) {
              tryViaPoints.push(via);
            }
          }
        }

        for (const via of tryViaPoints) {
          const viaUrl = `${osrmBaseUrl}/route/v1/driving/${fromLng},${fromLat};${via.lng},${via.lat};${toLng},${toLat}?${viaParams}`;
          await fetchRoutesForUrl(viaUrl);
          uniqueRoutes = getUniqueRoutes();
          if (uniqueRoutes.length >= requestedCount) break;
        }
      }
    }

    if (candidateRoutes.length === 0) {
      logger.warn('No OSRM alternatives found, falling back to primary route polyline');
      const fallbackPolyline = await getRoutePolyline(fromLat, fromLng, toLat, toLng);
      return [
        {
          routeId: 'r0',
          distanceKm: Number(calculateHaversineDistance(fromLat, fromLng, toLat, toLng).toFixed(2)),
          durationMin: 0,
          polyline: fallbackPolyline,
        },
      ];
    }

    const normalized = uniqueRoutes
      .slice(0, requestedCount)
      .map((route, routeIndex) => {
        const coords = route.geometry?.coordinates || [];
        const polyline = coords.map((coord: [number, number], index: number) => ({
          lat: coord[1],
          lng: coord[0],
          index,
        }));
        return {
          routeId: `r${routeIndex}`,
          distanceKm: Number(((route.distance || 0) / 1000).toFixed(2)),
          durationMin: Number(((route.duration || 0) / 60).toFixed(1)),
          polyline,
        } as RouteAlternative;
      })
      .filter((route) => route.polyline.length > 0);

    if (normalized.length > 0) return normalized;

    const fallbackPolyline = await getRoutePolyline(fromLat, fromLng, toLat, toLng);
    return [
      {
        routeId: 'r0',
        distanceKm: Number(calculateHaversineDistance(fromLat, fromLng, toLat, toLng).toFixed(2)),
        durationMin: 0,
        polyline: fallbackPolyline,
      },
    ];
  } catch (error) {
    logger.error('Error getting route alternatives:', error);
    const fallbackPolyline = await getRoutePolyline(fromLat, fromLng, toLat, toLng);
    return [
      {
        routeId: 'r0',
        distanceKm: Number(calculateHaversineDistance(fromLat, fromLng, toLat, toLng).toFixed(2)),
        durationMin: 0,
        polyline: fallbackPolyline,
      },
    ];
  }
}

/**
 * Interpolate N evenly-spaced points along a straight line from (fromLat,fromLng)
 * to (toLat,toLng). Used as an OSRM fallback so intermediate passenger matching
 * has enough polyline resolution instead of a 2-point straight line.
 */
function interpolateStraightLine(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  points: number
): Array<{ lat: number; lng: number; index: number }> {
  const result: Array<{ lat: number; lng: number; index: number }> = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    result.push({
      lat: fromLat + t * (toLat - fromLat),
      lng: fromLng + t * (toLng - fromLng),
      index: i,
    });
  }
  return result;
}

/**
 * Determine minimum required waypoints based on route distance.
 * Even short routes (< 30km) need waypoints for intermediate passenger matching —
 * without them, a 2-point straight-line polyline makes matching fail for village stops.
 */
export function getMinWaypointCount(routeDistanceKm: number): number {
  if (routeDistanceKm < 20) return 1;
  if (routeDistanceKm < 80) return 2;
  if (routeDistanceKm < 200) return 3;
  return 4;
}

/**
 * Auto-generate waypoints by sampling the polyline at even intervals
 * and reverse-geocoding each sampled point to get a city name.
 * Skips the first/last 10% of the polyline to avoid duplicating source/destination.
 * Deduplicates by city name.
 */
export async function generateAutoWaypoints(
  polyline: Array<{ lat: number; lng: number; index: number }>,
  routeDistanceKm: number
): Promise<Array<{ address: string; lat: number; lng: number; city?: string; order: number }>> {
  const count = getMinWaypointCount(routeDistanceKm);
  if (count === 0 || polyline.length < 2) return [];

  // If polyline is too sparse (e.g. old OSRM 2-point fallback), densify it first
  // so we have enough points to sample from.
  let workingPolyline = polyline;
  if (polyline.length < count + 2) {
    const first = polyline[0];
    const last = polyline[polyline.length - 1];
    workingPolyline = interpolateStraightLine(first.lat, first.lng, last.lat, last.lng, Math.max(count * 4, 20));
  }

  const startIdx = Math.floor(workingPolyline.length * 0.1);
  const endIdx = Math.floor(workingPolyline.length * 0.9);
  const usableLength = endIdx - startIdx;

  if (usableLength < 1) return [];

  const actualCount = Math.min(count, usableLength);
  const step = usableLength / (actualCount + 1);
  const sampledPoints: Array<{ lat: number; lng: number }> = [];

  for (let i = 1; i <= actualCount; i++) {
    const idx = Math.round(startIdx + step * i);
    const point = workingPolyline[Math.min(idx, workingPolyline.length - 1)];
    sampledPoints.push({ lat: point.lat, lng: point.lng });
  }

  const waypoints: Array<{ address: string; lat: number; lng: number; city?: string; order: number }> = [];
  const seenCities = new Set<string>();

  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    try {
      const geo = await reverseGeocodeCached(pt.lat, pt.lng);
      const city = geo?.city || '';
      const cityKey = city.toLowerCase().trim();

      if (cityKey && seenCities.has(cityKey)) continue;
      if (cityKey) seenCities.add(cityKey);

      waypoints.push({
        address: geo?.address || `${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`,
        lat: pt.lat,
        lng: pt.lng,
        city: city || undefined,
        order: waypoints.length,
      });
    } catch (err) {
      logger.warn(`Failed to reverse-geocode waypoint at (${pt.lat}, ${pt.lng}):`, err);
      waypoints.push({
        address: `${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`,
        lat: pt.lat,
        lng: pt.lng,
        order: waypoints.length,
      });
    }
  }

  logger.info(`Auto-generated ${waypoints.length} waypoints for ${routeDistanceKm.toFixed(0)}km route`);
  return waypoints;
}

/**
 * Generate dense, ordered route place suggestions from a selected polyline.
 * Samples points along the route at intervalKm, reverse-geocodes each sample,
 * and preserves order from source -> destination.
 */
export async function generateRoutePlaceSuggestions(
  polyline: Array<{ lat: number; lng: number; index: number }>,
  intervalKm: number = 8,
  maxPoints: number = 80
): Promise<RoutePlaceSuggestion[]> {
  if (!Array.isArray(polyline) || polyline.length < 2) return [];

  const totalKm = calculatePolylineDistanceKm(polyline);
  if (totalKm <= 0) return [];

  const safeInterval = Math.max(2, intervalKm);
  const targetCount = Math.max(3, Math.min(maxPoints, Math.floor(totalKm / safeInterval)));
  if (targetCount <= 0) return [];

  const cumulative: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    const stepKm = calculateHaversineDistance(
      polyline[i - 1].lat,
      polyline[i - 1].lng,
      polyline[i].lat,
      polyline[i].lng
    );
    cumulative.push(cumulative[i - 1] + stepKm);
  }

  const sampleDistances: number[] = [];
  for (let i = 1; i <= targetCount; i++) {
    const d = (totalKm * i) / (targetCount + 1);
    sampleDistances.push(d);
  }

  // Use actual polyline vertices (not synthetic interpolated coordinates) so
  // generated via points stay tightly aligned with the selected route geometry.
  const sampledPoints: Array<{ lat: number; lng: number; distanceFromStartKm: number; polylineIndex: number }> = [];
  const usedPolylineIndexes = new Set<number>();
  let segIndex = 1;
  for (const d of sampleDistances) {
    while (segIndex < cumulative.length && cumulative[segIndex] < d) {
      segIndex++;
    }
    const right = Math.min(segIndex, polyline.length - 1);
    const left = Math.max(0, right - 1);
    const segStartDist = cumulative[left];
    const segEndDist = cumulative[right];
    const distToLeft = Math.abs(d - segStartDist);
    const distToRight = Math.abs(segEndDist - d);
    let preferredIndex = distToLeft <= distToRight ? left : right;

    // Avoid repeated waypoint coordinates on sparse segments by picking nearby
    // unused vertices when possible.
    if (usedPolylineIndexes.has(preferredIndex)) {
      let picked = preferredIndex;
      let foundUnused = false;
      for (let radius = 1; radius <= 6; radius++) {
        const low = Math.max(1, preferredIndex - radius);
        const high = Math.min(polyline.length - 2, preferredIndex + radius);
        if (!usedPolylineIndexes.has(low)) {
          picked = low;
          foundUnused = true;
          break;
        }
        if (!usedPolylineIndexes.has(high)) {
          picked = high;
          foundUnused = true;
          break;
        }
      }
      if (foundUnused) preferredIndex = picked;
    }

    preferredIndex = Math.max(1, Math.min(polyline.length - 2, preferredIndex));
    const pickedPoint = polyline[preferredIndex];
    usedPolylineIndexes.add(preferredIndex);
    sampledPoints.push({
      lat: pickedPoint.lat,
      lng: pickedPoint.lng,
      distanceFromStartKm: d,
      polylineIndex: preferredIndex,
    });
  }

  const suggestions: RoutePlaceSuggestion[] = [];
  // Nominatim rate limits aggressively. We reverse-geocode only a bounded subset
  // and still return all sampled route points for UI search/add flows.
  const maxReverseCalls = 20;
  const reverseEvery = Math.max(1, Math.ceil(sampledPoints.length / maxReverseCalls));
  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    const shouldReverseGeocode = i % reverseEvery === 0;
    const geo = shouldReverseGeocode ? await reverseGeocodeCached(pt.lat, pt.lng) : null;
    suggestions.push({
      address: geo?.address || `Route point ${i + 1} - ${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`,
      lat: pt.lat,
      lng: pt.lng,
      city: geo?.city || `Point ${i + 1}`,
      order: i,
      distanceFromStartKm: Number(pt.distanceFromStartKm.toFixed(1)),
    });
  }

  logger.info(
    `Generated ${suggestions.length} ordered route place suggestions for ${totalKm.toFixed(0)}km route`
  );
  return suggestions;
}

/**
 * Find nearest polyline index for a given coordinate
 * Returns the index and distance of the closest point in the polyline
 */
export function findNearestPolylineIndex(
  lat: number,
  lng: number,
  polyline: Array<{ lat: number; lng: number; index: number }>
): { index: number; distance: number } {
  if (!polyline || polyline.length === 0) {
    return { index: 0, distance: Infinity };
  }

  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < polyline.length; i++) {
    const point = polyline[i];
    const distance = calculateHaversineDistance(lat, lng, point.lat, point.lng);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = point.index;
    }
  }

  return { index: nearestIndex, distance: minDistance };
}

/**
 * Calculate Haversine distance between two coordinates (in km)
 */
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance from a point to a line segment (polyline segment)
 * Returns the minimum distance from point to any segment of the polyline
 */
function distanceToPolylineSegment(
  pointLat: number,
  pointLng: number,
  polyline: Array<{ lat: number; lng: number; index: number }>
): { distance: number; nearestIndex: number } {
  if (polyline.length < 2) {
    const dist = calculateHaversineDistance(
      pointLat,
      pointLng,
      polyline[0]?.lat || 0,
      polyline[0]?.lng || 0
    );
    return { distance: dist, nearestIndex: 0 };
  }

  let minDistance = Infinity;
  let nearestIndex = 0;

  // Check distance to each segment of the polyline
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    // Calculate distance from point to line segment
    const dist = distanceToLineSegment(
      pointLat,
      pointLng,
      p1.lat,
      p1.lng,
      p2.lat,
      p2.lng
    );

    if (dist < minDistance) {
      minDistance = dist;
      // Use the index of the closer endpoint
      const distToP1 = calculateHaversineDistance(pointLat, pointLng, p1.lat, p1.lng);
      const distToP2 = calculateHaversineDistance(pointLat, pointLng, p2.lat, p2.lng);
      nearestIndex = distToP1 < distToP2 ? p1.index : p2.index;
    }
  }

  return { distance: minDistance, nearestIndex };
}

export function validateWaypointOnRoute(
  waypointLat: number,
  waypointLng: number,
  driverPolyline: Array<{ lat: number; lng: number; index: number }>
): { valid: boolean; reason?: string; nearestIndex: number; distanceKm: number; toleranceKm: number } {
  // Constraint removed intentionally:
  // any user-selected waypoint is accepted without route-position rejection.
  if (!driverPolyline || driverPolyline.length < 2) {
    return {
      valid: true,
      nearestIndex: 0,
      distanceKm: 0,
      toleranceKm: 0,
    };
  }

  const nearest = distanceToPolylineSegment(waypointLat, waypointLng, driverPolyline);
  return {
    valid: true,
    nearestIndex: nearest.nearestIndex,
    distanceKm: nearest.distance,
    toleranceKm: 0,
  };
}

/**
 * Calculate distance from a point to a line segment
 * Uses perpendicular distance if point projects onto segment, otherwise distance to nearest endpoint
 */
function distanceToLineSegment(
  pointLat: number,
  pointLng: number,
  lineStartLat: number,
  lineStartLng: number,
  lineEndLat: number,
  lineEndLng: number
): number {
  const A = pointLat - lineStartLat;
  const B = pointLng - lineStartLng;
  const C = lineEndLat - lineStartLat;
  const D = lineEndLng - lineStartLng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = lineStartLat;
    yy = lineStartLng;
  } else if (param > 1) {
    xx = lineEndLat;
    yy = lineEndLng;
  } else {
    xx = lineStartLat + param * C;
    yy = lineStartLng + param * D;
  }

  return calculateHaversineDistance(pointLat, pointLng, xx, yy);
}

/**
 * Check if passenger route is on driver route using polyline index matching
 * Logic: driverStartIndex <= passengerStartIndex < passengerEndIndex <= driverEndIndex
 * AND passenger points must be within reasonable distance from driver route segments (max 3km)
 */
export function isRouteOnPath(
  passengerFromLat: number,
  passengerFromLng: number,
  passengerToLat: number,
  passengerToLng: number,
  driverPolyline: Array<{ lat: number; lng: number; index: number }>
): boolean {
  if (!driverPolyline || driverPolyline.length === 0) {
    logger.info('❌ No driver polyline available');
    return false;
  }

  // Dynamic radius based on driver route length
  const driverRouteDistance = calculateHaversineDistance(
    driverPolyline[0].lat,
    driverPolyline[0].lng,
    driverPolyline[driverPolyline.length - 1].lat,
    driverPolyline[driverPolyline.length - 1].lng
  );
  let maxDistanceKm: number;
  if (driverRouteDistance < 30) {
    maxDistanceKm = 3;
  } else if (driverRouteDistance < 100) {
    maxDistanceKm = 5;
  } else if (driverRouteDistance < 200) {
    maxDistanceKm = 8;
  } else {
    maxDistanceKm = 12;
  }

  // For very sparse polylines (likely OSRM fallback), be even more generous
  if (driverPolyline.length <= 5 && driverRouteDistance > 50) {
    maxDistanceKm = Math.max(maxDistanceKm, driverRouteDistance * 0.15);
    logger.info(`⚠️ Sparse polyline (${driverPolyline.length} points for ${driverRouteDistance.toFixed(0)}km), using extended radius: ${maxDistanceKm.toFixed(0)}km`);
  }

  const passengerStart = distanceToPolylineSegment(
    passengerFromLat,
    passengerFromLng,
    driverPolyline
  );
  const passengerEnd = distanceToPolylineSegment(
    passengerToLat,
    passengerToLng,
    driverPolyline
  );

  if (passengerStart.distance > maxDistanceKm) {
    logger.info(
      `❌ Route mismatch: Passenger start is ${passengerStart.distance.toFixed(2)}km away (max: ${maxDistanceKm}km, route: ${driverRouteDistance.toFixed(0)}km)`
    );
    return false;
  }

  if (passengerEnd.distance > maxDistanceKm) {
    logger.info(
      `❌ Route mismatch: Passenger end is ${passengerEnd.distance.toFixed(2)}km away (max: ${maxDistanceKm}km, route: ${driverRouteDistance.toFixed(0)}km)`
    );
    return false;
  }

  const passengerStartIndex = passengerStart.nearestIndex;
  const passengerEndIndex = passengerEnd.nearestIndex;

  const driverStartIndex = driverPolyline[0]?.index || 0;
  const driverEndIndex = driverPolyline[driverPolyline.length - 1]?.index || 0;

  const isIndexMatch =
    driverStartIndex <= passengerStartIndex &&
    passengerStartIndex < passengerEndIndex &&
    passengerEndIndex <= driverEndIndex;

  if (!isIndexMatch) {
    logger.info(
      `❌ Index mismatch: driver[${driverStartIndex}-${driverEndIndex}] vs passenger[${passengerStartIndex}-${passengerEndIndex}]`
    );
    return false;
  }

  logger.info(
    `✅ Route match: driver[${driverStartIndex}-${driverEndIndex}] vs passenger[${passengerStartIndex}-${passengerEndIndex}], ` +
    `route=${driverRouteDistance.toFixed(2)}km, radius=${maxDistanceKm}km, ` +
    `startDist=${passengerStart.distance.toFixed(2)}km, endDist=${passengerEnd.distance.toFixed(2)}km`
  );

  return true;
}

/**
 * Get route with road segments from OSRM
 * Returns road segments for road-aware matching
 * Returns empty array on failure (doesn't throw) to allow graceful fallback
 */
export async function getRouteWithRoadSegments(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  startTime?: Date
): Promise<Array<{
  roadId: string;
  roadName?: string;
  roadRef?: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  estimatedTime: Date;
  lat: number;
  lng: number;
  segmentIndex: number;
  distance?: number;
}>> {
  logger.error('[DEBUG] ENTERED getRouteWithRoadSegments');
  
  try {
    // Validate coordinates before making API call
    if (
      !Number.isFinite(fromLat) || !Number.isFinite(fromLng) ||
      !Number.isFinite(toLat) || !Number.isFinite(toLng)
    ) {
      logger.warn(
        `Invalid coordinates for road segments: from(${fromLat}, ${fromLng}), to(${toLat}, ${toLng})`
      );
      return [];
    }

    logger.error(`[DEBUG] Calling osrmService.getRouteWithSegments from(${fromLat}, ${fromLng}) to(${toLat}, ${toLng}), startTime=${startTime?.toISOString() || 'undefined'}`);
    
    const segments = await osrmService.getRouteWithSegments(fromLat, fromLng, toLat, toLng, startTime);
    
    logger.error(`[DEBUG] getRouteWithSegments returned ${segments?.length || 0} segments`);
    
    // Validate segments
    if (!segments || segments.length === 0) {
      logger.error('[DEBUG] OSRM returned empty segments array');
      logger.warn('OSRM returned empty segments array');
      return [];
    }

    logger.info(`Successfully retrieved ${segments.length} segments from OSRM`);

    // Validate segment structure
    const invalidSegments = segments.filter(seg => 
      !seg.roadId || 
      !seg.direction || 
      !Number.isFinite(seg.lat) || 
      !Number.isFinite(seg.lng) ||
      !seg.estimatedTime ||
      typeof seg.segmentIndex !== 'number'
    );

    if (invalidSegments.length > 0) {
      logger.warn(`Found ${invalidSegments.length} invalid segments, filtering them out`);
      const validSegments = segments.filter(seg => 
        seg.roadId && 
        seg.direction && 
        Number.isFinite(seg.lat) && 
        Number.isFinite(seg.lng) &&
        seg.estimatedTime &&
        typeof seg.segmentIndex === 'number'
      );
      
      if (validSegments.length === 0) {
        logger.error('[DEBUG] All segments were invalid after filtering');
        return [];
      }
      
      logger.error(`[DEBUG] Returning ${validSegments.length} valid segments after filtering`);
      return validSegments;
    }

    logger.error(`[DEBUG] Returning ${segments.length} segments from getRouteWithRoadSegments`);
    return segments;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(
      `[DEBUG] ERROR in getRouteWithRoadSegments: ${errorMessage}. fromLat=${fromLat}, fromLng=${fromLng}, toLat=${toLat}, toLng=${toLng}`
    );
    if (errorStack) {
      logger.error(`Stack trace: ${errorStack}`);
    }
    return [];
  }
}

/**
 * Snap GPS coordinate to nearest road using OSRM Nearest API
 * Returns snapped coordinates with road name for matching
 */
export async function snapToRoad(
  lat: number,
  lng: number
): Promise<{
  lat: number;
  lng: number;
  roadId: string;
  roadName?: string;
  roadRef?: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  confidence: number;
  distanceFromOriginal?: number;
} | null> {
  try {
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      logger.error(`Invalid coordinates provided for snapToRoad: (${lat},${lng})`);
      return null;
    }
    return await osrmService.snapToRoad(lat, lng);
  } catch (error) {
    logger.error('Error snapping coordinate to road:', error);
    return null;
  }
}

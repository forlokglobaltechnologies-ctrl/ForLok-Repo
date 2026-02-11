/**
 * Maps utility for OpenStreetMap and Google Maps
 * OpenStreetMap is free and doesn't require API keys
 */

import { config } from '../config/env';
import logger from './logger';

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
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
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
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Forlok-App/1.0',
      },
    });

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
    // Use OSRM (Open Source Routing Machine) - free routing service
    // Format: http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
    const url = `http://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

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
      logger.warn('No route found from OSRM, using direct line');
      // Fallback: create simple polyline with start and end points
      return [
        { lat: fromLat, lng: fromLng, index: 0 },
        { lat: toLat, lng: toLng, index: 1 },
      ];
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
    // Fallback: return simple polyline with start and end
    return [
      { lat: fromLat, lng: fromLng, index: 0 },
      { lat: toLat, lng: toLng, index: 1 },
    ];
  }
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

  // Maximum allowed distance from route (3km) - stricter than before
  const MAX_DISTANCE_FROM_ROUTE_KM = 3;

  // Find nearest points on driver route for passenger start and end
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

  // Check if passenger points are too far from driver route
  if (passengerStart.distance > MAX_DISTANCE_FROM_ROUTE_KM) {
    logger.info(
      `❌ Route mismatch: Passenger start is ${passengerStart.distance.toFixed(2)}km away (max: ${MAX_DISTANCE_FROM_ROUTE_KM}km)`
    );
    return false;
  }

  if (passengerEnd.distance > MAX_DISTANCE_FROM_ROUTE_KM) {
    logger.info(
      `❌ Route mismatch: Passenger end is ${passengerEnd.distance.toFixed(2)}km away (max: ${MAX_DISTANCE_FROM_ROUTE_KM}km)`
    );
    return false;
  }

  const passengerStartIndex = passengerStart.nearestIndex;
  const passengerEndIndex = passengerEnd.nearestIndex;

  // Driver route indices (first and last points)
  const driverStartIndex = driverPolyline[0]?.index || 0;
  const driverEndIndex = driverPolyline[driverPolyline.length - 1]?.index || 0;

  // Core matching logic: driverStartIndex <= passengerStartIndex < passengerEndIndex <= driverEndIndex
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

  // Calculate route distances for validation
  const driverRouteDistance = calculateHaversineDistance(
    driverPolyline[0].lat,
    driverPolyline[0].lng,
    driverPolyline[driverPolyline.length - 1].lat,
    driverPolyline[driverPolyline.length - 1].lng
  );

  const passengerRouteDistance = calculateHaversineDistance(
    passengerFromLat,
    passengerFromLng,
    passengerToLat,
    passengerToLng
  );

  // Passenger route should be shorter than driver route (max 10% longer allowed for route variations)
  const isDistanceValid = passengerRouteDistance <= driverRouteDistance * 1.1;

  if (!isDistanceValid) {
    logger.info(
      `❌ Distance mismatch: driver=${driverRouteDistance.toFixed(2)}km, passenger=${passengerRouteDistance.toFixed(2)}km`
    );
    return false;
  }

  const isMatch = isIndexMatch && isDistanceValid;

  logger.info(
    `✅ Route match: driver[${driverStartIndex}-${driverEndIndex}] vs passenger[${passengerStartIndex}-${passengerEndIndex}], ` +
    `driver=${driverRouteDistance.toFixed(2)}km, passenger=${passengerRouteDistance.toFixed(2)}km, ` +
    `startDist=${passengerStart.distance.toFixed(2)}km, endDist=${passengerEnd.distance.toFixed(2)}km`
  );

  return isMatch;
}

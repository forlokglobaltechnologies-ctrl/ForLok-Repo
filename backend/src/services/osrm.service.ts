/**
 * OSRM Service - Integration with Open Source Routing Machine
 * Provides road-aware routing and GPS matching capabilities
 */

import logger from '../utils/logger';
import { config } from '../config/env';

// OSRM API response interfaces
interface OSRMRouteResponse {
  code: string;
  routes?: Array<{
    geometry: {
      coordinates: [number, number][];
    };
    legs: Array<{
      steps: Array<{
        geometry: {
          coordinates: [number, number][];
        };
        maneuver: {
          location: [number, number];
        };
        name: string; // Road name from OSRM
        ref?: string; // Road reference number (e.g., NH-65)
        distance: number;
        duration: number;
        mode?: string;
        driving_side?: string;
      }>;
      distance: number;
      duration: number;
    }>;
    distance: number;
    duration: number;
  }>;
}

interface OSRMMatchResponse {
  code: string;
  matchings?: Array<{
    geometry: {
      coordinates: [number, number][];
    };
    legs: Array<{
      steps: Array<{
        geometry: {
          coordinates: [number, number][];
        };
        maneuver: {
          location: [number, number];
        };
        name: string; // Road name from OSRM
        ref?: string; // Road reference number
        distance: number;
        duration: number;
      }>;
      distance: number;
      duration: number;
    }>;
    confidence: number;
    distance: number;
    duration: number;
  }>;
}

/**
 * RoadSegment interface - represents a segment of a driver's route
 * Contains both roadId (hash-based) and roadName (OSRM name) for flexible matching
 */
export interface RoadSegment {
  roadId: string;                                    // Hash-based unique ID
  roadName?: string;                                 // Actual road name from OSRM (e.g., "Kaleswara Rao Flyover") - optional for backward compatibility
  roadRef?: string;                                  // Road reference number (e.g., "NH-65")
  direction: 'forward' | 'backward' | 'bidirectional';
  estimatedTime: Date;
  lat: number;
  lng: number;
  segmentIndex: number;
  distance?: number;                                 // Distance of this segment in meters
}

/**
 * MatchedPoint interface - represents a snapped GPS point
 * Contains both roadId (hash-based) and roadName (OSRM name) for flexible matching
 */
export interface MatchedPoint {
  lat: number;
  lng: number;
  roadId: string;                                    // Hash-based unique ID
  roadName?: string;                                 // Actual road name from OSRM - optional for backward compatibility
  roadRef?: string;                                  // Road reference number
  direction: 'forward' | 'backward' | 'bidirectional';
  confidence: number;
  distanceFromOriginal?: number;                     // Distance from original point in meters
}

class OSRMService {
  private readonly BASE_URL: string;
  private readonly TIMEOUT_MS: number;
  private readonly RETRY_ATTEMPTS: number;
  private readonly RETRY_DELAY_MS: number;
  private healthCheckCache: { isHealthy: boolean; timestamp: number } | null = null;
  private readonly HEALTH_CHECK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.BASE_URL = config.osrm.baseUrl;
    this.TIMEOUT_MS = config.osrm.timeoutMs;
    this.RETRY_ATTEMPTS = config.osrm.retryAttempts;
    this.RETRY_DELAY_MS = config.osrm.retryDelayMs;
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.RETRY_ATTEMPTS) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn(
            `${operation} failed (attempt ${attempt}/${this.RETRY_ATTEMPTS}), retrying in ${delay}ms: ${lastError.message}`
          );
          await this.sleep(delay);
        } else {
          logger.error(
            `${operation} failed after ${this.RETRY_ATTEMPTS} attempts: ${lastError.message}`
          );
        }
      }
    }

    throw lastError || new Error(`${operation} failed after ${this.RETRY_ATTEMPTS} attempts`);
  }

  /**
   * Sleep helper for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make fetch request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Yaaryatra-App/1.0',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OSRM API request timeout after ${this.TIMEOUT_MS}ms`);
      }
      throw error;
    }
  }

  /**
   * Check OSRM API health
   */
  async checkOSRMHealth(): Promise<boolean> {
    // Check cache first
    if (this.healthCheckCache) {
      const age = Date.now() - this.healthCheckCache.timestamp;
      if (age < this.HEALTH_CHECK_CACHE_TTL) {
        return this.healthCheckCache.isHealthy;
      }
    }

    try {
      // Simple health check - try to get a route for a known good coordinate pair
      const testUrl = `${this.BASE_URL}/route/v1/driving/78.3908,17.4486;78.4983,17.4399?overview=false`;
      const response = await this.fetchWithTimeout(testUrl);
      
      const isHealthy = response.ok;
      this.healthCheckCache = {
        isHealthy,
        timestamp: Date.now(),
      };

      if (!isHealthy) {
        logger.warn(`OSRM health check failed: ${response.status} ${response.statusText}`);
      }

      return isHealthy;
    } catch (error) {
      logger.warn('OSRM health check failed:', error);
      this.healthCheckCache = {
        isHealthy: false,
        timestamp: Date.now(),
      };
      return false;
    }
  }

  /**
   * Get route with road segments from OSRM Route API
   * Extracts road segments with way_ids, directions, and estimated times
   */
  async getRouteWithSegments(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    startTime?: Date
  ): Promise<RoadSegment[]> {
    // [DEBUG] ENTERED getRouteWithSegments
    logger.error(`[DEBUG] ENTERED getRouteWithSegments from(${fromLat}, ${fromLng}) to(${toLat}, ${toLng})`);
    
    return this.retryWithBackoff(async () => {
      // Validate coordinates
      if (
        !Number.isFinite(fromLat) || !Number.isFinite(fromLng) ||
        !Number.isFinite(toLat) || !Number.isFinite(toLng)
      ) {
        throw new Error('Invalid coordinates provided');
      }

      // OSRM Route API with steps=true to get detailed segment information
      const url = `${this.BASE_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
      
      logger.error(`[DEBUG] Fetching OSRM route from URL: ${url}`);

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `OSRM Route API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = (await response.json()) as OSRMRouteResponse;

      if (data.code !== 'Ok') {
        throw new Error(`OSRM returned error code: ${data.code}`);
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found from OSRM (empty routes array)');
      }

      const route = data.routes[0];
      if (!route) {
        throw new Error('Route object is undefined');
      }
      
      if (!route.legs || route.legs.length === 0) {
        throw new Error('No legs found in OSRM route');
      }

      logger.error(`[DEBUG] Calling extractRoadSegments with ${route.legs.length} legs`);
      const roadSegments = this.extractRoadSegments(route, startTime);
      logger.error(`[DEBUG] extractRoadSegments returned ${roadSegments.length} segments`);

      if (roadSegments.length === 0) {
        throw new Error('No road segments extracted from OSRM route');
      }

      logger.info(`Extracted ${roadSegments.length} road segments from OSRM route`);
      logger.error(`[DEBUG] getRouteWithSegments returning ${roadSegments.length} segments`);
      return roadSegments;
    }, 'getRouteWithSegments');
  }

  /**
   * Match GPS points to roads using OSRM Match API
   * Snaps GPS coordinates to nearest road segments
   */
  async matchGPSPoints(
    coordinates: Array<{ lat: number; lng: number }>
  ): Promise<MatchedPoint[]> {
    if (coordinates.length === 0) {
      return [];
    }

    return this.retryWithBackoff(async () => {
      // Validate coordinates
      for (const coord of coordinates) {
        if (!Number.isFinite(coord.lat) || !Number.isFinite(coord.lng)) {
          throw new Error(`Invalid coordinate: lat=${coord.lat}, lng=${coord.lng}`);
        }
      }

      // Format coordinates for OSRM Match API: lng,lat;lng,lat;...
      const coordsString = coordinates
        .map((coord) => `${coord.lng},${coord.lat}`)
        .join(';');

      const url = `${this.BASE_URL}/match/v1/driving/${coordsString}?geometries=geojson&steps=true`;

      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `OSRM Match API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = (await response.json()) as OSRMMatchResponse;

      if (data.code !== 'Ok') {
        throw new Error(`OSRM returned error code: ${data.code}`);
      }

      if (!data.matchings || data.matchings.length === 0) {
        throw new Error('No match found from OSRM (empty matchings array)');
      }

      const matching = data.matchings[0];
      const matchedPoints = this.extractMatchedPoints(matching, coordinates);

      if (matchedPoints.length === 0) {
        throw new Error('No matched points extracted from OSRM response');
      }

      logger.info(`Matched ${matchedPoints.length} GPS points to roads`);
      return matchedPoints;
    }, 'matchGPSPoints');
  }

  /**
   * Extract road segments from OSRM route response
   * Generates road segments with way_ids, directions, and coordinates
   */
  private extractRoadSegments(
    route: NonNullable<OSRMRouteResponse['routes']>[0],
    startTime?: Date
  ): RoadSegment[] {
    // [DEBUG] ENTERED extractRoadSegments
    logger.error(`[DEBUG] ENTERED extractRoadSegments with ${route.legs?.length || 0} legs`);
    
    const segments: RoadSegment[] = [];
    let segmentIndex = 0;
    let cumulativeTime = 0; // in seconds

    // Use start time or current time as base
    const baseTime = startTime || new Date();

    // Process each leg of the route
    for (const leg of route.legs) {
      // FIX: Check if steps exist and is an array
      if (!leg.steps || !Array.isArray(leg.steps) || leg.steps.length === 0) {
        logger.warn(
          `Leg has no steps or steps is not an array. hasSteps=${!!leg.steps}, stepsType=${typeof leg.steps}, stepsLength=${Array.isArray(leg.steps) ? leg.steps.length : 'N/A'}`
        );
        continue;
      }
      
      logger.error(`[DEBUG] Processing leg with ${leg.steps.length} steps`);
      
      // Process each step in the leg
      for (const step of leg.steps) {
        // FIX: Validate step structure before accessing properties
        if (!step || !step.geometry || !step.geometry.coordinates) {
          logger.warn('Step missing geometry or coordinates, skipping');
          continue;
        }
        
        const stepCoords = step.geometry.coordinates;
        if (!Array.isArray(stepCoords) || stepCoords.length === 0) {
          logger.warn('Step coordinates is not an array or is empty, skipping');
          continue;
        }

        // Get start coordinate of this step
        const startCoord = stepCoords[0];
        if (!Array.isArray(startCoord) || startCoord.length < 2) {
          logger.warn('Start coordinate is invalid, skipping step');
          continue;
        }
        
        const lat = startCoord[1];
        const lng = startCoord[0];
        
        // Validate coordinates
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          logger.warn(`Invalid coordinates in step: lat=${lat}, lng=${lng}`);
          continue;
        }

        // Extract road name from OSRM step (critical for flyover vs service road matching)
        // OSRM returns road names like "Kaleswara Rao Flyover", "NH-65 Service Road", etc.
        const roadName = (step as any).name || '';
        const roadRef = (step as any).ref || '';
        
        // DETAILED LOGGING: Log each road name extracted from OSRM
        logger.info(
          `[OSRM-SEGMENT] Step ${segmentIndex}: roadName="${roadName}", ref="${roadRef}", ` +
          `coords=(${lat.toFixed(6)}, ${lng.toFixed(6)}), duration=${(step as any).duration}s`
        );

        // Generate road ID from step geometry (hash of coordinates)
        // In production, OSRM provides way_ids, but public API may not expose them
        // We'll use a hash of the step coordinates as road identifier
        const roadId = this.generateRoadId(stepCoords);

        // Determine direction based on step geometry
        const direction = this.determineDirection(stepCoords);

        // Calculate estimated time for this segment
        // FIX: Validate step.duration exists and is a number
        const stepDuration = typeof step.duration === 'number' && Number.isFinite(step.duration) 
          ? step.duration 
          : 0; // Default to 0 if duration is missing
        
        const stepDistance = typeof step.distance === 'number' && Number.isFinite(step.distance)
          ? step.distance
          : 0;
        
        cumulativeTime += stepDuration; // duration in seconds
        const estimatedTime = new Date(baseTime.getTime() + cumulativeTime * 1000);

        segments.push({
          roadId,
          roadName,           // NEW: Store actual road name for matching
          roadRef: roadRef || undefined,  // NEW: Store road reference (NH-65, etc.)
          direction,
          estimatedTime,
          lat,
          lng,
          segmentIndex: segmentIndex++,
          distance: stepDistance,
        });
      }
    }

    // [DEBUG] extractRoadSegments returning X segments
    logger.error(`[DEBUG] extractRoadSegments returning ${segments.length} segments`);
    
    if (segments.length === 0) {
      const legsCount = route.legs?.length || 0;
      const totalSteps = route.legs?.reduce((sum: number, leg: { steps?: Array<any> }) => sum + (leg.steps?.length || 0), 0) || 0;
      logger.warn(
        `No segments extracted from route. legsCount=${legsCount}, totalSteps=${totalSteps}`
      );
    }

    return segments;
  }

  /**
   * Extract matched points from OSRM match response
   */
  private extractMatchedPoints(
    matching: NonNullable<OSRMMatchResponse['matchings']>[0],
    originalCoordinates: Array<{ lat: number; lng: number }>
  ): MatchedPoint[] {
    const matchedPoints: MatchedPoint[] = [];
    let coordIndex = 0;

    for (const leg of matching.legs) {
      for (const step of leg.steps) {
        const stepCoords = step.geometry.coordinates;
        if (stepCoords.length === 0) continue;

        // Get the matched coordinate
        const matchedCoord = stepCoords[0];
        const lat = matchedCoord[1];
        const lng = matchedCoord[0];

        // Extract road name from step
        const roadName = step.name || '';
        const roadRef = step.ref || '';

        // Generate road ID
        const roadId = this.generateRoadId(stepCoords);

        // Determine direction
        const direction = this.determineDirection(stepCoords);

        // Use matching confidence if available
        const confidence = matching.confidence || 1.0;

        matchedPoints.push({
          lat,
          lng,
          roadId,
          roadName,           // NEW: Include road name
          roadRef: roadRef || undefined,
          direction,
          confidence,
        });

        coordIndex++;
        if (coordIndex >= originalCoordinates.length) break;
      }
      if (coordIndex >= originalCoordinates.length) break;
    }

    return matchedPoints;
  }

  /**
   * Generate a road ID from coordinates
   * Uses a hash of coordinates to create a unique identifier
   */
  private generateRoadId(coordinates: [number, number][]): string {
    // Create a hash from coordinates
    // In production, OSRM way_ids would be used directly
    const coordString = coordinates
      .map((c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`)
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < coordString.length; i++) {
      const char = coordString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `road_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Determine direction of travel from coordinates
   */
  private determineDirection(
    coordinates: [number, number][]
  ): 'forward' | 'backward' | 'bidirectional' {
    if (coordinates.length < 2) {
      return 'bidirectional';
    }

    // Calculate bearing from first to last point
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];

    const lat1 = start[1] * (Math.PI / 180);
    const lat2 = end[1] * (Math.PI / 180);
    const dLng = (end[0] - start[0]) * (Math.PI / 180);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(y, x) * (180 / Math.PI);
    const normalizedBearing = ((bearing + 360) % 360);

    // Determine direction based on bearing
    // Forward: generally north-east direction (0-180 degrees)
    // Backward: generally south-west direction (180-360 degrees)
    // This is a simplified heuristic - in production, use OSRM's direction data
    if (normalizedBearing >= 0 && normalizedBearing < 180) {
      return 'forward';
    } else {
      return 'backward';
    }
  }

  /**
   * Calculate estimated times for road segments
   * Distributes total route duration across segments proportionally
   */
  calculateSegmentTimes(
    segments: RoadSegment[],
    totalDurationSeconds: number,
    startTime: Date
  ): RoadSegment[] {
    if (segments.length === 0) {
      return segments;
    }

    // Calculate cumulative time distribution
    let cumulativeTime = 0;
    const timePerSegment = totalDurationSeconds / segments.length;

    return segments.map((segment) => {
      cumulativeTime += timePerSegment;
      const estimatedTime = new Date(startTime.getTime() + cumulativeTime * 1000);

      return {
        ...segment,
        estimatedTime,
      };
    });
  }

  /**
   * Snap a single GPS coordinate to nearest road using OSRM Nearest API
   * 
   * NOTE: This uses the Nearest API (/nearest/v1/) instead of Match API (/match/v1/)
   * because the Match API requires at least 2 coordinates, while Nearest works with 1.
   * 
   * @param lat - Latitude of the point to snap
   * @param lng - Longitude of the point to snap
   * @returns MatchedPoint with snapped coordinates and road info, or null on failure
   */
  async snapToRoad(lat: number, lng: number): Promise<MatchedPoint | null> {
    // Validate coordinates first
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      logger.warn(`Invalid coordinates for snapToRoad: lat=${lat}, lng=${lng}`);
      return null;
    }

    // Validate coordinate ranges
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      logger.warn(`Coordinates out of range for snapToRoad: lat=${lat}, lng=${lng}`);
      return null;
    }

    return this.retryWithBackoff(async () => {
      // Use OSRM Nearest API for single point snapping
      // Format: /nearest/v1/{profile}/{coordinates}.json?number={number}
      const url = `${this.BASE_URL}/nearest/v1/driving/${lng},${lat}?number=1`;
      
      logger.debug(`Calling OSRM Nearest API: ${url}`);
      
      const response = await this.fetchWithTimeout(url);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `OSRM Nearest API error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }
      
      const data = await response.json() as {
        code: string;
        waypoints?: Array<{
          hint: string;
          distance: number;
          name: string;
          location: [number, number]; // [lng, lat]
        }>;
      };
      
      // Check API response status
      if (data.code !== 'Ok') {
        logger.warn(`OSRM Nearest API returned non-Ok code: ${data.code} for coordinates (${lat}, ${lng})`);
        return null;
      }
      
      // Check if we got any waypoints
      if (!data.waypoints || data.waypoints.length === 0) {
        logger.warn(`No nearest road found for coordinates: (${lat}, ${lng})`);
        return null;
      }
      
      const waypoint = data.waypoints[0];
      const snappedLng = waypoint.location[0];
      const snappedLat = waypoint.location[1];
      const distanceMeters = waypoint.distance; // Distance from original to snapped point in meters
      const roadName = waypoint.name || '';
      
      // Generate a consistent road ID from the snapped location
      // Use the hint (which contains encoded road info) if available, otherwise use coordinates
      const roadId = this.generateRoadIdFromNearest(snappedLng, snappedLat, roadName, waypoint.hint);
      
      // Calculate confidence based on distance from original point
      // - Distance < 10m: Very high confidence (1.0)
      // - Distance < 50m: High confidence (0.9-1.0)
      // - Distance < 100m: Medium confidence (0.7-0.9)
      // - Distance < 500m: Low confidence (0.5-0.7)
      // - Distance >= 500m: Very low confidence (0.3-0.5)
      let confidence: number;
      if (distanceMeters < 10) {
        confidence = 1.0;
      } else if (distanceMeters < 50) {
        confidence = 0.9 + (0.1 * (1 - distanceMeters / 50));
      } else if (distanceMeters < 100) {
        confidence = 0.7 + (0.2 * (1 - (distanceMeters - 50) / 50));
      } else if (distanceMeters < 500) {
        confidence = 0.5 + (0.2 * (1 - (distanceMeters - 100) / 400));
      } else {
        confidence = Math.max(0.3, 0.5 - (distanceMeters - 500) / 2000);
      }
      
      logger.debug(
        `Snapped (${lat}, ${lng}) to (${snappedLat}, ${snappedLng}), ` +
        `distance=${distanceMeters.toFixed(1)}m, road="${roadName}", confidence=${confidence.toFixed(2)}`
      );
      
      return {
        lat: snappedLat,
        lng: snappedLng,
        roadId,
        roadName,                              // NEW: Include road name for matching
        direction: 'bidirectional' as const,  // Nearest API doesn't provide direction info
        confidence,
        distanceFromOriginal: distanceMeters, // NEW: Distance from original point
      };
    }, 'snapToRoad');
  }

  /**
   * Generate a road ID from OSRM Nearest API response
   * Uses hint (which contains encoded road info) combined with coordinates for uniqueness
   */
  private generateRoadIdFromNearest(
    lng: number, 
    lat: number, 
    roadName: string, 
    hint: string
  ): string {
    // Create a unique identifier combining road name and hint
    // The hint contains encoded information about the road segment
    const combinedString = `${roadName}_${hint.substring(0, 20)}_${lng.toFixed(5)}_${lat.toFixed(5)}`;
    
    // Simple hash function for consistent road IDs
    let hash = 0;
    for (let i = 0; i < combinedString.length; i++) {
      const char = combinedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `road_${Math.abs(hash).toString(36)}`;
  }
}

export const osrmService = new OSRMService();
export default osrmService;

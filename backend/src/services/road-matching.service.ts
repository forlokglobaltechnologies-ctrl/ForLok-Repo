/**
 * Road-Aware Matching Service - Production-Grade Implementation
 * 
 * Validates passenger routes against driver routes using:
 * 1. Road NAME matching (primary) - Handles flyover vs service road scenarios
 * 2. Proximity-based matching (secondary) - For unnamed roads
 * 3. Time ordering validation
 * 4. Direction validation
 * 
 * Edge cases handled:
 * - Flyover vs Service Road (different names, close proximity)
 * - Same road with different coordinates
 * - Unnamed roads (empty names)
 * - Parallel roads
 * - Loop/zigzag routes
 * - GPS inaccuracies
 */

import logger from '../utils/logger';
import { snapToRoad } from '../utils/maps';
import { RoadSegment, MatchedPoint } from './osrm.service';

export interface RoadMatchResult {
  isValid: boolean;
  confidence: number;
  pickupSegmentIndex?: number;
  dropSegmentIndex?: number;
  reason?: string;
  matchMethod?: 'road_name' | 'proximity' | 'hybrid';
}

export interface ConfidenceScoreBreakdown {
  roadOverlap: number;
  directionMatch: number;
  timeOrder: number;
  gpsConfidence: number;
  deviationRisk: number;
  roadNameMatch: number;  // NEW: Score for road name matching
  total: number;
}

// Configuration constants
const CONFIG = {
  // Maximum distance (meters) to consider two points as "on same road" when names don't match
  MAX_PROXIMITY_DISTANCE_METERS: 100,
  
  // Maximum distance (meters) for unnamed road proximity matching
  MAX_UNNAMED_ROAD_DISTANCE_METERS: 200,
  
  // Minimum confidence threshold for a valid match
  MIN_CONFIDENCE_THRESHOLD: 0.6,
  
  // Boost factor for exact road name matches
  ROAD_NAME_MATCH_BOOST: 0.25,
  
  // Penalty factor for flyover/service road mismatch
  FLYOVER_MISMATCH_PENALTY: 0.5,
  
  // Keywords indicating flyover or elevated roads
  FLYOVER_KEYWORDS: ['flyover', 'overpass', 'elevated', 'bridge', 'viaduct', 'ramp'],
  
  // Keywords indicating service/parallel roads
  SERVICE_ROAD_KEYWORDS: ['service', 'parallel', 'slip', 'access', 'frontage'],
};

class RoadMatchingService {
  /**
   * Validate road-aware match between passenger route and driver route
   * Uses hybrid approach: road name matching + proximity fallback
   */
  async validateRoadAwareMatch(
    driverRoadSegments: RoadSegment[],
    passengerPickupLat: number,
    passengerPickupLng: number,
    passengerDropLat: number,
    passengerDropLng: number,
    hasRecentDeviation: boolean = false
  ): Promise<RoadMatchResult> {
    try {
      // Validate input
      if (!driverRoadSegments || driverRoadSegments.length === 0) {
        logger.warn('No driver road segments provided for matching');
        return {
          isValid: false,
          confidence: 0,
          reason: 'No driver road segments available',
        };
      }

      // Step 1: Snap passenger pickup and drop to roads
      const pickupMatch = await snapToRoad(passengerPickupLat, passengerPickupLng);
      const dropMatch = await snapToRoad(passengerDropLat, passengerDropLng);

      if (!pickupMatch || !dropMatch) {
        logger.warn('Failed to snap passenger coordinates to roads');
        return {
          isValid: false,
          confidence: 0,
          reason: 'Failed to snap coordinates to roads',
        };
      }

      // Cast to include roadName (which may be optional in base interface)
      const pickupMatchWithName = pickupMatch as MatchedPoint & { roadName?: string };
      const dropMatchWithName = dropMatch as MatchedPoint & { roadName?: string };
      
      // ============= DETAILED LOGGING START =============
      logger.info(`[MATCH-STEP-1] ========== ROAD MATCHING ANALYSIS ==========`);
      
      // Log passenger details
      logger.info(
        `[MATCH-STEP-2] PASSENGER PICKUP: road="${pickupMatchWithName.roadName || 'UNNAMED'}", ` +
        `snappedCoords=(${pickupMatch.lat.toFixed(6)}, ${pickupMatch.lng.toFixed(6)}), ` +
        `confidence=${pickupMatch.confidence.toFixed(2)}, roadId="${pickupMatch.roadId}"`
      );
      logger.info(
        `[MATCH-STEP-3] PASSENGER DROP: road="${dropMatchWithName.roadName || 'UNNAMED'}", ` +
        `snappedCoords=(${dropMatch.lat.toFixed(6)}, ${dropMatch.lng.toFixed(6)}), ` +
        `confidence=${dropMatch.confidence.toFixed(2)}, roadId="${dropMatch.roadId}"`
      );
      
      // Log all driver segments with road names
      const uniqueRoadNames = this.getUniqueRoadNames(driverRoadSegments);
      const namedSegments = driverRoadSegments.filter(s => s.roadName && s.roadName.length > 0);
      const unnamedSegments = driverRoadSegments.filter(s => !s.roadName || s.roadName.length === 0);
      
      logger.info(
        `[MATCH-STEP-4] DRIVER ROUTE SUMMARY: ` +
        `totalSegments=${driverRoadSegments.length}, ` +
        `namedSegments=${namedSegments.length}, ` +
        `unnamedSegments=${unnamedSegments.length}`
      );
      logger.info(
        `[MATCH-STEP-5] DRIVER ROAD NAMES: [${uniqueRoadNames.join(' | ')}]`
      );
      
      // Log first few driver segments in detail
      logger.info(`[MATCH-STEP-6] DRIVER SEGMENTS (first 5):`);
      driverRoadSegments.slice(0, 5).forEach((seg, idx) => {
        logger.info(
          `  [SEG-${idx}] roadName="${seg.roadName || 'UNNAMED'}", ` +
          `coords=(${seg.lat.toFixed(6)}, ${seg.lng.toFixed(6)}), ` +
          `segmentIndex=${seg.segmentIndex}, roadId="${seg.roadId}"`
        );
      });
      
      // Log last few driver segments
      if (driverRoadSegments.length > 5) {
        logger.info(`[MATCH-STEP-7] DRIVER SEGMENTS (last 3):`);
        driverRoadSegments.slice(-3).forEach((seg, idx) => {
          logger.info(
            `  [SEG-END-${idx}] roadName="${seg.roadName || 'UNNAMED'}", ` +
            `coords=(${seg.lat.toFixed(6)}, ${seg.lng.toFixed(6)}), ` +
            `segmentIndex=${seg.segmentIndex}, roadId="${seg.roadId}"`
          );
        });
      }
      // ============= DETAILED LOGGING END =============

      // Step 2: Find pickup and drop segments using HYBRID matching
      const pickupResult = this.findSegmentHybrid(
        driverRoadSegments,
        pickupMatch,
        'pickup'
      );
      
      const dropResult = this.findSegmentHybrid(
        driverRoadSegments,
        dropMatch,
        'drop'
      );

      if (!pickupResult.segment) {
        logger.error(
          `[MATCH-FAIL] ❌ PICKUP SEGMENT NOT FOUND! ` +
          `passengerRoad="${(pickupMatch as any).roadName || 'UNNAMED'}", ` +
          `passengerCoords=(${pickupMatch.lat.toFixed(6)}, ${pickupMatch.lng.toFixed(6)})`
        );
        logger.error(
          `[MATCH-FAIL] Driver route roads: [${this.getUniqueRoadNames(driverRoadSegments).join(' | ')}]`
        );
        logger.error(
          `[MATCH-FAIL] Possible causes: ` +
          `1) Passenger too far from driver route, ` +
          `2) Road names don't match, ` +
          `3) Old offer without roadName data`
        );
        return {
          isValid: false,
          confidence: 0,
          reason: 'Passenger pickup location not found on driver route',
        };
      }

      if (!dropResult.segment) {
        logger.error(
          `[MATCH-FAIL] ❌ DROP SEGMENT NOT FOUND! ` +
          `passengerRoad="${(dropMatch as any).roadName || 'UNNAMED'}", ` +
          `passengerCoords=(${dropMatch.lat.toFixed(6)}, ${dropMatch.lng.toFixed(6)})`
        );
        logger.error(
          `[MATCH-FAIL] Driver route roads: [${this.getUniqueRoadNames(driverRoadSegments).join(' | ')}]`
        );
        logger.error(
          `[MATCH-FAIL] Possible causes: ` +
          `1) Passenger drop too far from driver route, ` +
          `2) Road names don't match, ` +
          `3) Passenger going to different destination than driver`
        );
        return {
          isValid: false,
          confidence: 0,
          reason: 'Passenger drop location not found on driver route',
        };
      }

      const pickupSegment = pickupResult.segment;
      const dropSegment = dropResult.segment;

      logger.info(`[MATCH-STEP-8] ========== SEGMENTS FOUND ==========`);
      logger.info(
        `[MATCH-STEP-9] ✅ PICKUP FOUND: segmentIndex=${pickupSegment.segmentIndex}, ` +
        `method=${pickupResult.matchMethod}, distance=${pickupResult.distance?.toFixed(1)}m, ` +
        `roadName="${pickupSegment.roadName || 'UNNAMED'}"`
      );
      logger.info(
        `[MATCH-STEP-10] ✅ DROP FOUND: segmentIndex=${dropSegment.segmentIndex}, ` +
        `method=${dropResult.matchMethod}, distance=${dropResult.distance?.toFixed(1)}m, ` +
        `roadName="${dropSegment.roadName || 'UNNAMED'}"`
      );

      // Step 3: Validate pickup comes BEFORE drop (critical for ride direction)
      logger.info(
        `[MATCH-STEP-11] Validating segment order: pickup=${pickupSegment.segmentIndex} < drop=${dropSegment.segmentIndex}?`
      );
      if (pickupSegment.segmentIndex >= dropSegment.segmentIndex) {
        logger.error(
          `[MATCH-FAIL] ❌ INVALID SEGMENT ORDER! pickup=${pickupSegment.segmentIndex} >= drop=${dropSegment.segmentIndex}`
        );
        return {
          isValid: false,
          confidence: 0,
          reason: 'Pickup must be before drop on driver route',
        };
      }
      logger.info(`[MATCH-STEP-11] ✅ Segment order valid`)

      // Step 4: Validate time order (pickup time must be before drop time)
      if (pickupSegment.estimatedTime >= dropSegment.estimatedTime) {
        return {
          isValid: false,
          confidence: 0,
          reason: 'Pickup time must be before drop time',
        };
      }

      // Step 5: Validate direction matches
      const directionMatch = this.validateDirection(
        pickupMatch.direction,
        pickupSegment.direction
      );

      if (!directionMatch) {
        return {
          isValid: false,
          confidence: 0,
          reason: 'Direction mismatch between passenger and driver',
        };
      }

      // Step 6: Calculate comprehensive confidence score
      const confidenceBreakdown = this.calculateConfidenceScore(
        driverRoadSegments,
        pickupSegment,
        dropSegment,
        pickupMatch,
        dropMatch,
        pickupResult,
        dropResult,
        hasRecentDeviation
      );

      const isValid = confidenceBreakdown.total >= CONFIG.MIN_CONFIDENCE_THRESHOLD;
      const matchMethod = pickupResult.matchMethod === 'road_name' && dropResult.matchMethod === 'road_name'
        ? 'road_name'
        : pickupResult.matchMethod === 'proximity' || dropResult.matchMethod === 'proximity'
          ? 'proximity'
          : 'hybrid';

      logger.info(`[MATCH-STEP-14] ========== CONFIDENCE BREAKDOWN ==========`);
      logger.info(
        `[MATCH-STEP-14] roadOverlap=${confidenceBreakdown.roadOverlap.toFixed(3)}, ` +
        `roadNameMatch=${confidenceBreakdown.roadNameMatch.toFixed(3)}, ` +
        `directionMatch=${confidenceBreakdown.directionMatch.toFixed(3)}, ` +
        `timeOrder=${confidenceBreakdown.timeOrder.toFixed(3)}, ` +
        `gpsConfidence=${confidenceBreakdown.gpsConfidence.toFixed(3)}, ` +
        `deviationRisk=${confidenceBreakdown.deviationRisk.toFixed(3)}`
      );
      logger.info(
        `[MATCH-STEP-15] TOTAL CONFIDENCE: ${confidenceBreakdown.total.toFixed(3)} ` +
        `(threshold: ${CONFIG.MIN_CONFIDENCE_THRESHOLD})`
      );
      
      if (isValid) {
        logger.info(
          `[MATCH-SUCCESS] ✅✅✅ MATCH VALID! confidence=${confidenceBreakdown.total.toFixed(2)}, ` +
          `method=${matchMethod}, pickup=${pickupSegment.segmentIndex}, drop=${dropSegment.segmentIndex}`
        );
      } else {
        logger.warn(
          `[MATCH-FAIL] ❌ CONFIDENCE TOO LOW: ${confidenceBreakdown.total.toFixed(2)} < ${CONFIG.MIN_CONFIDENCE_THRESHOLD}`
        );
      }

      // Validate segment indices are within bounds
      if (pickupSegment.segmentIndex < 0 || pickupSegment.segmentIndex >= driverRoadSegments.length ||
          dropSegment.segmentIndex < 0 || dropSegment.segmentIndex >= driverRoadSegments.length) {
        logger.error(
          `Invalid segment indices: pickup=${pickupSegment.segmentIndex}, drop=${dropSegment.segmentIndex}, ` +
          `total=${driverRoadSegments.length}`
        );
        return {
          isValid: false,
          confidence: 0,
          reason: 'Invalid segment indices',
        };
      }

      return {
        isValid,
        confidence: confidenceBreakdown.total,
        pickupSegmentIndex: pickupSegment.segmentIndex,
        dropSegmentIndex: dropSegment.segmentIndex,
        matchMethod,
        reason: isValid ? undefined : 'Confidence score below threshold',
      };
    } catch (error) {
      logger.error('Error validating road-aware match:', error);
      return {
        isValid: false,
        confidence: 0,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * HYBRID segment finding - combines road name matching and proximity matching
   * 
   * Strategy:
   * 1. If passenger has a road name -> Try exact name match first
   * 2. If name match fails or no name -> Use proximity matching
   * 3. Special handling for flyover vs service road
   */
  private findSegmentHybrid(
    roadSegments: RoadSegment[],
    passengerPoint: MatchedPoint,
    pointType: 'pickup' | 'drop'
  ): { segment: RoadSegment | null; matchMethod: 'road_name' | 'proximity' | 'none'; distance?: number } {
    const passengerRoadName = ((passengerPoint as any).roadName || '').trim().toLowerCase();
    const hasRoadName = passengerRoadName.length > 0;

    logger.info(
      `[HYBRID-${pointType.toUpperCase()}] Starting hybrid matching: ` +
      `passengerRoadName="${passengerRoadName || 'NONE'}", hasRoadName=${hasRoadName}, ` +
      `passengerCoords=(${passengerPoint.lat.toFixed(6)}, ${passengerPoint.lng.toFixed(6)})`
    );

    // First, try road name matching (most reliable)
    if (hasRoadName) {
      logger.info(`[HYBRID-${pointType.toUpperCase()}] Attempting ROAD NAME matching...`);
      const nameMatchResult = this.findSegmentByRoadName(roadSegments, passengerRoadName, passengerPoint);
      if (nameMatchResult.segment) {
        logger.info(
          `[HYBRID-${pointType.toUpperCase()}] ✅ ROAD NAME MATCH SUCCESS! ` +
          `Found segment at index ${nameMatchResult.segment.segmentIndex}, ` +
          `driverRoad="${nameMatchResult.segment.roadName}", distance=${nameMatchResult.distance?.toFixed(1)}m`
        );
        return {
          segment: nameMatchResult.segment,
          matchMethod: 'road_name',
          distance: nameMatchResult.distance,
        };
      }
      logger.info(`[HYBRID-${pointType.toUpperCase()}] ❌ Road name match FAILED - no matching road name found`);
    }

    // Fallback to proximity matching
    const maxDistance = hasRoadName ? CONFIG.MAX_PROXIMITY_DISTANCE_METERS : CONFIG.MAX_UNNAMED_ROAD_DISTANCE_METERS;
    logger.info(
      `[HYBRID-${pointType.toUpperCase()}] Attempting PROXIMITY matching with maxDistance=${maxDistance}m...`
    );
    
    const proximityResult = this.findSegmentByProximity(
      roadSegments,
      passengerPoint.lat,
      passengerPoint.lng,
      maxDistance
    );

    if (proximityResult.segment) {
      logger.info(
        `[HYBRID-${pointType.toUpperCase()}] Proximity found candidate: ` +
        `segmentIndex=${proximityResult.segment.segmentIndex}, ` +
        `driverRoad="${proximityResult.segment.roadName || 'UNNAMED'}", ` +
        `distance=${proximityResult.distance?.toFixed(1)}m`
      );
      
      // CRITICAL: Check for flyover vs service road mismatch
      if (hasRoadName && proximityResult.segment.roadName) {
        const isFlyoverMismatch = this.isFlyoverServiceRoadMismatch(
          passengerRoadName,
          proximityResult.segment.roadName.toLowerCase()
        );
        
        if (isFlyoverMismatch) {
          logger.warn(
            `[HYBRID-${pointType.toUpperCase()}] ⚠️ FLYOVER/SERVICE ROAD MISMATCH! ` +
            `passenger="${passengerRoadName}", driver="${proximityResult.segment.roadName}" - REJECTING`
          );
          return { segment: null, matchMethod: 'none' };
        }
      }

      logger.info(
        `[HYBRID-${pointType.toUpperCase()}] ✅ PROXIMITY MATCH SUCCESS! ` +
        `segment=${proximityResult.segment.segmentIndex}, distance=${proximityResult.distance?.toFixed(1)}m`
      );
      return {
        segment: proximityResult.segment,
        matchMethod: 'proximity',
        distance: proximityResult.distance,
      };
    }

    logger.warn(
      `[HYBRID-${pointType.toUpperCase()}] ❌ PROXIMITY MATCH FAILED! ` +
      `Closest segment was ${proximityResult.distance?.toFixed(1)}m away (max allowed: ${maxDistance}m)`
    );
    return { segment: null, matchMethod: 'none' };
  }

  /**
   * Find segment by road name (exact or fuzzy match)
   */
  private findSegmentByRoadName(
    roadSegments: RoadSegment[],
    passengerRoadName: string,
    passengerPoint: MatchedPoint
  ): { segment: RoadSegment | null; distance?: number } {
    // Try exact match first
    let matchingSegments = roadSegments.filter(
      segment => (segment.roadName || '').trim().toLowerCase() === passengerRoadName
    );

    // Try fuzzy match if exact match fails
    if (matchingSegments.length === 0) {
      matchingSegments = roadSegments.filter(segment => {
        const segmentName = (segment.roadName || '').trim().toLowerCase();
        return this.fuzzyRoadNameMatch(passengerRoadName, segmentName);
      });
    }

    if (matchingSegments.length === 0) {
      return { segment: null };
    }

    // If multiple segments match, find the closest one
    let closestSegment = matchingSegments[0];
    let minDistance = this.calculateHaversineDistance(
      passengerPoint.lat, passengerPoint.lng,
      closestSegment.lat, closestSegment.lng
    );

    for (const segment of matchingSegments) {
      const distance = this.calculateHaversineDistance(
        passengerPoint.lat, passengerPoint.lng,
        segment.lat, segment.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestSegment = segment;
      }
    }

    return { segment: closestSegment, distance: minDistance };
  }

  /**
   * Find segment by proximity (closest segment within threshold)
   */
  private findSegmentByProximity(
    roadSegments: RoadSegment[],
    lat: number,
    lng: number,
    maxDistanceMeters: number
  ): { segment: RoadSegment | null; distance?: number } {
    let closestSegment: RoadSegment | null = null;
    let minDistance = Infinity;
    
    // Log all distances for debugging
    const distanceLog: Array<{idx: number, dist: number, roadName: string}> = [];

    for (const segment of roadSegments) {
      const distance = this.calculateHaversineDistance(
        lat, lng,
        segment.lat, segment.lng
      );
      
      distanceLog.push({
        idx: segment.segmentIndex,
        dist: Math.round(distance),
        roadName: segment.roadName || 'UNNAMED'
      });

      if (distance < minDistance) {
        minDistance = distance;
        closestSegment = segment;
      }
    }

    // Log top 5 closest segments
    const sortedDistances = distanceLog.sort((a, b) => a.dist - b.dist).slice(0, 5);
    logger.info(
      `[PROXIMITY-CALC] Closest 5 segments to (${lat.toFixed(6)}, ${lng.toFixed(6)}): ` +
      sortedDistances.map(d => `[${d.idx}]${d.roadName}:${d.dist}m`).join(', ')
    );

    // Only return if within threshold
    if (closestSegment && minDistance <= maxDistanceMeters) {
      logger.info(
        `[PROXIMITY-CALC] ✅ Found segment within threshold: ` +
        `idx=${closestSegment.segmentIndex}, distance=${minDistance.toFixed(1)}m <= ${maxDistanceMeters}m`
      );
      return { segment: closestSegment, distance: minDistance };
    }

    logger.warn(
      `[PROXIMITY-CALC] ❌ No segment within threshold: ` +
      `minDistance=${minDistance.toFixed(1)}m > maxAllowed=${maxDistanceMeters}m`
    );
    return { segment: null, distance: minDistance };
  }

  /**
   * Check if two road names indicate a flyover vs service road mismatch
   * This is CRITICAL to prevent matching flyover passengers with service road drivers
   */
  private isFlyoverServiceRoadMismatch(name1: string, name2: string): boolean {
    const isFlyover1 = CONFIG.FLYOVER_KEYWORDS.some(kw => name1.includes(kw));
    const isFlyover2 = CONFIG.FLYOVER_KEYWORDS.some(kw => name2.includes(kw));
    const isService1 = CONFIG.SERVICE_ROAD_KEYWORDS.some(kw => name1.includes(kw));
    const isService2 = CONFIG.SERVICE_ROAD_KEYWORDS.some(kw => name2.includes(kw));

    // Mismatch if one is flyover and other is service road
    if ((isFlyover1 && isService2) || (isService1 && isFlyover2)) {
      return true;
    }

    // Mismatch if one is flyover and other is not (and they have different names)
    if ((isFlyover1 && !isFlyover2 && name1 !== name2) || 
        (isFlyover2 && !isFlyover1 && name1 !== name2)) {
      return true;
    }

    return false;
  }

  /**
   * Fuzzy road name matching
   * Handles variations like "NH 65" vs "NH-65" vs "National Highway 65"
   */
  private fuzzyRoadNameMatch(name1: string, name2: string): boolean {
    if (!name1 || !name2) return false;

    // Normalize both names
    const normalize = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove special chars
        .replace(/national\s*highway/g, 'nh')
        .replace(/state\s*highway/g, 'sh');
    };

    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);

    // Check if one contains the other (for partial matches)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }

    // Check Levenshtein distance for similar names (typos, etc.)
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const similarity = 1 - (distance / maxLength);

    return similarity >= 0.8; // 80% similarity threshold
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate Haversine distance between two coordinates
   * @returns Distance in meters
   */
  private calculateHaversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get unique road names from segments
   */
  private getUniqueRoadNames(segments: RoadSegment[]): string[] {
    const names = new Set<string>();
    for (const segment of segments) {
      if (segment.roadName) {
        names.add(segment.roadName);
      }
    }
    return Array.from(names);
  }

  /**
   * Validate direction compatibility
   */
  private validateDirection(
    passengerDirection: 'forward' | 'backward' | 'bidirectional',
    driverDirection: 'forward' | 'backward' | 'bidirectional'
  ): boolean {
    // Bidirectional roads always match
    if (passengerDirection === 'bidirectional' || driverDirection === 'bidirectional') {
      return true;
    }
    // Same direction required
    return passengerDirection === driverDirection;
  }

  /**
   * Calculate comprehensive confidence score
   */
  private calculateConfidenceScore(
    driverSegments: RoadSegment[],
    pickupSegment: RoadSegment,
    dropSegment: RoadSegment,
    pickupMatch: MatchedPoint,
    dropMatch: MatchedPoint,
    pickupResult: { matchMethod: string; distance?: number },
    dropResult: { matchMethod: string; distance?: number },
    hasRecentDeviation: boolean
  ): ConfidenceScoreBreakdown {
    // 1. Road overlap percentage (30% weight)
    const passengerRouteLength = dropSegment.segmentIndex - pickupSegment.segmentIndex + 1;
    const driverRouteLength = driverSegments.length;
    let roadOverlap = Math.min(passengerRouteLength / driverRouteLength, 1.0);
    if (roadOverlap >= 0.3 || passengerRouteLength >= 3) {
      roadOverlap = Math.min(roadOverlap * 1.3, 1.0);
    }
    const roadOverlapScore = roadOverlap * 0.3;

    // 2. Road name match bonus (25% weight) - NEW
    let roadNameMatchScore = 0;
    if (pickupResult.matchMethod === 'road_name' && dropResult.matchMethod === 'road_name') {
      roadNameMatchScore = 0.25; // Full score for both name matches
    } else if (pickupResult.matchMethod === 'road_name' || dropResult.matchMethod === 'road_name') {
      roadNameMatchScore = 0.15; // Partial score for one name match
    } else {
      // Proximity only - give partial score if distances are small
      const avgDistance = ((pickupResult.distance || 500) + (dropResult.distance || 500)) / 2;
      roadNameMatchScore = Math.max(0, 0.1 * (1 - avgDistance / CONFIG.MAX_UNNAMED_ROAD_DISTANCE_METERS));
    }

    // 3. Direction match (15% weight)
    const pickupDirectionMatch = this.validateDirection(pickupMatch.direction, pickupSegment.direction);
    const dropDirectionMatch = this.validateDirection(dropMatch.direction, dropSegment.direction);
    const directionMatch = pickupDirectionMatch && dropDirectionMatch ? 1.0 : 0.0;
    const directionScore = directionMatch * 0.15;

    // 4. Time order validation (15% weight)
    const timeOrderValid = pickupSegment.estimatedTime < dropSegment.estimatedTime ? 1.0 : 0.0;
    const timeScore = timeOrderValid * 0.15;

    // 5. GPS match confidence (10% weight)
    let avgGPSConfidence = (pickupMatch.confidence + dropMatch.confidence) / 2;
    if (avgGPSConfidence < 0.7 && pickupMatch.confidence > 0 && dropMatch.confidence > 0) {
      avgGPSConfidence = Math.min(avgGPSConfidence * 1.3, 0.95);
    }
    const gpsScore = avgGPSConfidence * 0.1;

    // 6. Route deviation risk (5% weight)
    const deviationScore = hasRecentDeviation ? 0.0 : 0.05;

    let total = roadOverlapScore + roadNameMatchScore + directionScore + timeScore + gpsScore + deviationScore;

    // Boost for perfect matches (name match + direction match + time order)
    if (pickupResult.matchMethod === 'road_name' && 
        dropResult.matchMethod === 'road_name' && 
        directionMatch === 1.0 && 
        timeOrderValid === 1.0 && 
        !hasRecentDeviation) {
      // Perfect match scenario - ensure minimum 0.85 confidence
      if (total < 0.85) {
        total = 0.85;
      }
    }

    // Ensure total doesn't exceed 1.0
    total = Math.min(total, 1.0);

    return {
      roadOverlap: roadOverlapScore,
      roadNameMatch: roadNameMatchScore,
      directionMatch: directionScore,
      timeOrder: timeScore,
      gpsConfidence: gpsScore,
      deviationRisk: deviationScore,
      total,
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use findSegmentHybrid instead
   */
  findSegmentInRoute(
    roadSegments: RoadSegment[],
    roadId: string,
    direction: 'forward' | 'backward' | 'bidirectional'
  ): RoadSegment | null {
    const matchingSegments = roadSegments.filter(
      (segment) => segment.roadId === roadId
    );

    if (matchingSegments.length === 0) {
      return null;
    }

    const segment = matchingSegments[0];

    if (
      segment.direction === 'bidirectional' ||
      direction === 'bidirectional' ||
      segment.direction === direction
    ) {
      return segment;
    }

    return null;
  }

  /**
   * Find all segments matching a road ID (for loop/zigzag handling)
   */
  findAllSegmentsByRoadId(
    roadSegments: RoadSegment[],
    roadId: string
  ): RoadSegment[] {
    return roadSegments.filter((segment) => segment.roadId === roadId);
  }

  /**
   * Validate time order for multiple segments with same road ID
   */
  validateTimeOrderForSegments(
    segments: RoadSegment[],
    pickupTime: Date,
    dropTime: Date
  ): boolean {
    const segmentsInWindow = segments.filter(
      (segment) =>
        segment.estimatedTime >= pickupTime &&
        segment.estimatedTime <= dropTime
    );

    if (segmentsInWindow.length === 0) {
      return false;
    }

    return pickupTime < dropTime;
  }
}

export const roadMatchingService = new RoadMatchingService();
export default roadMatchingService;

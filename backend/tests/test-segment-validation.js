/**
 * Comprehensive Segment Validation Test Suite
 * Tests road segment generation, storage, and fallback behavior
 * Provides detailed diagnostics and issue identification
 */

const axios = require('axios');
const {
  apiRequest,
  createTestDriver,
  createTestVehicle,
  createPoolingOffer,
  log,
  testHeader,
  testResult,
  sleep,
} = require('./test-utils');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

// OSRM Configuration (from env defaults)
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'http://router.project-osrm.org';
const OSRM_TIMEOUT_MS = parseInt(process.env.OSRM_TIMEOUT_MS || '10000', 10);
const OSRM_RETRY_ATTEMPTS = parseInt(process.env.OSRM_RETRY_ATTEMPTS || '3', 10);
const OSRM_RETRY_DELAY_MS = parseInt(process.env.OSRM_RETRY_DELAY_MS || '1000', 10);

// Test coordinates (Hyderabad, India)
const TEST_COORDS = {
  from: { lat: 17.4486, lng: 78.3908 }, // HITEC City
  to: { lat: 17.4399, lng: 78.4983 },   // Gachibowli
};

// Test results summary
const testSummary = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: [],
  diagnostics: {
    osrmConnectivity: null,
    osrmResponse: null,
    segmentGeneration: null,
    segmentStorage: null,
    segmentStructure: null,
    fallbackBehavior: null,
  },
};

/**
 * Test 1: OSRM API Connectivity
 */
async function testOSRMConnectivity() {
  testHeader('Test 1: OSRM API Connectivity');
  testSummary.totalTests++;

  try {
    // Test 1.1: Basic connectivity (use a simple route endpoint instead of nearest)
    log('\n📡 Testing OSRM API connectivity...', 'yellow');
    // Use a simple route between two known points (Hyderabad, India)
    const healthUrl = `${OSRM_BASE_URL}/route/v1/driving/${TEST_COORDS.from.lng},${TEST_COORDS.from.lat};${TEST_COORDS.to.lng},${TEST_COORDS.to.lat}?overview=false`;
    
    const startTime = Date.now();
    let response;
    try {
      response = await axios.get(healthUrl, {
        timeout: OSRM_TIMEOUT_MS,
        headers: { 'User-Agent': 'Yaaryatra-TestSuite/1.0' },
      });
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200 && response.data?.code === 'Ok') {
        testResult('OSRM Connectivity', true, `Response time: ${responseTime}ms`);
        testSummary.diagnostics.osrmConnectivity = {
          status: 'success',
          responseTime,
          message: 'OSRM API is accessible',
        };
        testSummary.passed++;
        return true;
      } else {
        testResult('OSRM Connectivity', false, `Unexpected status: ${response.status} or code: ${response.data?.code}`);
        testSummary.diagnostics.osrmConnectivity = {
          status: 'failed',
          error: `HTTP ${response.status}, Code: ${response.data?.code || 'unknown'}`,
        };
        testSummary.failed++;
        return false;
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        testResult('OSRM Connectivity', false, `Cannot reach OSRM server: ${error.message}`);
        testSummary.diagnostics.osrmConnectivity = {
          status: 'failed',
          error: `Network error: ${error.message}`,
          responseTime,
        };
        testSummary.issues.push('OSRM_API_UNREACHABLE');
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        testResult('OSRM Connectivity', false, `Request timed out after ${OSRM_TIMEOUT_MS}ms`);
        testSummary.diagnostics.osrmConnectivity = {
          status: 'failed',
          error: 'Request timeout',
          responseTime,
        };
        testSummary.issues.push('OSRM_API_TIMEOUT');
      } else {
        testResult('OSRM Connectivity', false, `Error: ${error.message}`);
        testSummary.diagnostics.osrmConnectivity = {
          status: 'failed',
          error: error.message,
          responseTime,
        };
        testSummary.issues.push('OSRM_API_ERROR');
      }
      testSummary.failed++;
      return false;
    }
  } catch (error) {
    testResult('OSRM Connectivity', false, `Unexpected error: ${error.message}`);
    testSummary.failed++;
    return false;
  }
}

/**
 * Test 2: OSRM Route API Response
 */
async function testOSRMRouteAPI() {
  testHeader('Test 2: OSRM Route API Response');
  testSummary.totalTests++;

  try {
    log('\n🗺️  Testing OSRM Route API with steps...', 'yellow');
    const routeUrl = `${OSRM_BASE_URL}/route/v1/driving/${TEST_COORDS.from.lng},${TEST_COORDS.from.lat};${TEST_COORDS.to.lng},${TEST_COORDS.to.lat}?overview=full&geometries=geojson&steps=true`;
    
    const startTime = Date.now();
    let response;
    try {
      response = await axios.get(routeUrl, {
        timeout: OSRM_TIMEOUT_MS,
        headers: { 'User-Agent': 'Yaaryatra-TestSuite/1.0' },
      });
      const responseTime = Date.now() - startTime;

      if (response.status !== 200) {
        testResult('OSRM Route API', false, `HTTP ${response.status}`);
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: `HTTP ${response.status}`,
        };
        testSummary.failed++;
        return false;
      }

      const data = response.data;

      // Check response structure
      if (data.code !== 'Ok') {
        testResult('OSRM Route API', false, `OSRM error code: ${data.code}`);
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: `OSRM code: ${data.code}`,
        };
        testSummary.failed++;
        return false;
      }

      if (!data.routes || data.routes.length === 0) {
        testResult('OSRM Route API', false, 'No routes in response');
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: 'Empty routes array',
        };
        testSummary.failed++;
        return false;
      }

      const route = data.routes[0];
      if (!route.legs || route.legs.length === 0) {
        testResult('OSRM Route API', false, 'No legs in route');
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: 'Empty legs array',
        };
        testSummary.failed++;
        return false;
      }

      // Count steps
      const totalSteps = route.legs.reduce((sum, leg) => sum + (leg.steps?.length || 0), 0);
      
      if (totalSteps === 0) {
        testResult('OSRM Route API', false, 'No steps found in route legs');
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: 'No steps in legs',
        };
        testSummary.failed++;
        return false;
      }

      // Check step structure
      const firstStep = route.legs[0].steps[0];
      const hasGeometry = firstStep?.geometry?.coordinates?.length > 0;
      const hasDuration = typeof firstStep?.duration === 'number';
      const hasDistance = typeof firstStep?.distance === 'number';

      testResult('OSRM Route API', true, `Found ${totalSteps} steps, Response time: ${responseTime}ms`);
      log(`   ✅ Route distance: ${(route.distance / 1000).toFixed(2)} km`, 'green');
      log(`   ✅ Route duration: ${(route.duration / 60).toFixed(2)} minutes`, 'green');
      log(`   ✅ Steps have geometry: ${hasGeometry}`, hasGeometry ? 'green' : 'yellow');
      log(`   ✅ Steps have duration: ${hasDuration}`, hasDuration ? 'green' : 'yellow');
      log(`   ✅ Steps have distance: ${hasDistance}`, hasDistance ? 'green' : 'yellow');

      testSummary.diagnostics.osrmResponse = {
        status: 'success',
        responseTime,
        totalSteps,
        routeDistance: route.distance,
        routeDuration: route.duration,
        hasGeometry,
        hasDuration,
        hasDistance,
      };
      testSummary.passed++;
      return true;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        testResult('OSRM Route API', false, `Request timed out after ${OSRM_TIMEOUT_MS}ms`);
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: 'Request timeout',
          responseTime,
        };
        testSummary.issues.push('OSRM_ROUTE_TIMEOUT');
      } else {
        testResult('OSRM Route API', false, `Error: ${error.message}`);
        testSummary.diagnostics.osrmResponse = {
          status: 'failed',
          error: error.message,
          responseTime,
        };
        testSummary.issues.push('OSRM_ROUTE_ERROR');
      }
      testSummary.failed++;
      return false;
    }
  } catch (error) {
    testResult('OSRM Route API', false, `Unexpected error: ${error.message}`);
    testSummary.failed++;
    return false;
  }
}

/**
 * Test 3: Segment Generation via Backend Service
 */
async function testSegmentGeneration() {
  testHeader('Test 3: Segment Generation via Backend');
  testSummary.totalTests++;

  try {
    log('\n🔧 Testing segment generation through backend service...', 'yellow');

    // Check if backend is running (try a simple API endpoint)
    log('\n🔍 Checking backend availability...', 'yellow');
    try {
      // Try to access a simple endpoint to verify backend is running
      // We'll use the auth send-otp endpoint as a health check (it should return 400 for missing params, not 404)
      const healthCheck = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/send-otp`, {}, { 
        timeout: 5000,
        validateStatus: () => true, // Accept any status code
      });
      // If we get 400 (bad request) or 200, backend is running. If 404, backend is not running.
      if (healthCheck.status === 404) {
        throw new Error('Backend endpoint not found (404)');
      }
      log(`   ✅ Backend is running (status: ${healthCheck.status})`, 'green');
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        testResult('Backend Check', false, `Backend not available: ${error.message}. Please start the backend server.`);
        testSummary.diagnostics.segmentGeneration = {
          status: 'skipped',
          error: 'Backend not available',
          message: 'Cannot test segment generation without backend server',
        };
        testSummary.issues.push('BACKEND_NOT_AVAILABLE');
        testSummary.failed++;
        return false;
      }
      // Other errors might be OK (like 400 for missing params)
      log(`   ⚠️  Backend check warning: ${error.message}`, 'yellow');
    }

    // Create test driver
    log('\n👤 Creating test driver...', 'yellow');
    const driver = await createTestDriver();
    if (!driver.success) {
      testResult('Create Driver', false, driver.error);
      testSummary.diagnostics.segmentGeneration = {
        status: 'error',
        error: `Driver creation failed: ${driver.error}`,
      };
      testSummary.failed++;
      return false;
    }
    const driverToken = driver.token;
    testResult('Create Driver', true, `Driver ID: ${driver.userId}`);
    await sleep(1000);

    // Create test vehicle
    log('\n🚗 Creating test vehicle...', 'yellow');
    const vehicle = await createTestVehicle(driverToken);
    if (!vehicle.success) {
      testResult('Create Vehicle', false, vehicle.error);
      testSummary.failed++;
      return false;
    }
    const vehicleId = vehicle.vehicleId;
    testResult('Create Vehicle', true, `Vehicle ID: ${vehicleId}`);
    await sleep(1000);

    // Create pooling offer with road segments
    log('\n📋 Creating pooling offer (should generate segments)...', 'yellow');
    const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    testDate.setHours(9, 0, 0, 0);
    const offerDate = testDate.toISOString();

    const offer = await createPoolingOffer(driverToken, vehicleId, {
      fromLat: TEST_COORDS.from.lat,
      fromLng: TEST_COORDS.from.lng,
      toLat: TEST_COORDS.to.lat,
      toLng: TEST_COORDS.to.lng,
      date: offerDate,
      time: '09:00 AM',
      seats: 3,
    });

    if (!offer.success) {
      testResult('Create Offer', false, offer.error);
      testSummary.failed++;
      return false;
    }

    const offerId = offer.offerId;
    const hasRoadSegments = offer.offer?.route?.roadSegments?.length > 0;
    const roadSegmentsCount = offer.offer?.route?.roadSegments?.length || 0;

    if (hasRoadSegments) {
      testResult('Segment Generation', true, `Generated ${roadSegmentsCount} segments`);
      log(`   ✅ Offer ID: ${offerId}`, 'green');
      log(`   ✅ Road segments: ${roadSegmentsCount}`, 'green');
      
      testSummary.diagnostics.segmentGeneration = {
        status: 'success',
        segmentsGenerated: roadSegmentsCount,
        offerId,
      };
      testSummary.passed++;
    } else {
      // Check if polyline is available (fallback)
      const hasPolyline = offer.offer?.route?.polyline && offer.offer.route.polyline.length > 0;
      
      if (hasPolyline) {
        testResult('Segment Generation', true, 'No segments (fallback mode)');
        log(`   ⚠️  Offer ID: ${offerId}`, 'yellow');
        log(`   ⚠️  Road segments: 0 (fallback to polyline)`, 'yellow');
        log(`   ✅ Polyline available: Yes`, 'green');
        
        testSummary.diagnostics.segmentGeneration = {
          status: 'fallback',
          segmentsGenerated: 0,
          offerId,
          polylineAvailable: true,
          message: 'Segments not generated, but polyline fallback is working',
        };
        testSummary.issues.push('SEGMENTS_NOT_GENERATED');
        testSummary.warnings++;
        testSummary.passed++; // Pass because fallback works
      } else {
        testResult('Segment Generation', false, 'No segments and no polyline fallback');
        log(`   ❌ Offer ID: ${offerId}`, 'red');
        log(`   ❌ Road segments: 0`, 'red');
        log(`   ❌ Polyline: Not available`, 'red');
        
        testSummary.diagnostics.segmentGeneration = {
          status: 'failed',
          segmentsGenerated: 0,
          offerId,
          polylineAvailable: false,
          message: 'No routing data available',
        };
        testSummary.issues.push('SEGMENTS_NOT_GENERATED');
        testSummary.issues.push('NO_ROUTING_DATA');
        testSummary.failed++;
      }
    }

    // Store offer ID for next test
    testSummary.diagnostics.segmentGeneration.offerId = offerId;
    testSummary.diagnostics.segmentGeneration.driverToken = driverToken;

    return true;
  } catch (error) {
    testResult('Segment Generation', false, `Error: ${error.message}`);
    testSummary.diagnostics.segmentGeneration = {
      status: 'error',
      error: error.message,
    };
    testSummary.failed++;
    return false;
  }
}

/**
 * Test 4: Segment Storage and Retrieval
 */
async function testSegmentStorage() {
  testHeader('Test 4: Segment Storage and Retrieval');
  testSummary.totalTests++;

  try {
    const offerId = testSummary.diagnostics.segmentGeneration?.offerId;
    const driverToken = testSummary.diagnostics.segmentGeneration?.driverToken;

    if (!offerId || !driverToken) {
      testResult('Segment Storage', false, 'No offer ID from previous test');
      testSummary.failed++;
      return false;
    }

    log('\n💾 Testing segment storage and retrieval...', 'yellow');

    // Retrieve offer via API
    const response = await apiRequest('GET', `/pooling/offers/${encodeURIComponent(offerId)}`, null, driverToken);
    
    if (!response.success) {
      testResult('Retrieve Offer', false, response.error);
      testSummary.failed++;
      return false;
    }

    const retrievedOffer = response.data?.data;
    if (!retrievedOffer) {
      testResult('Retrieve Offer', false, 'No offer data in response');
      testSummary.failed++;
      return false;
    }

    const storedSegments = retrievedOffer.route?.roadSegments || [];
    const segmentsCount = storedSegments.length;

    if (segmentsCount > 0) {
      testResult('Segment Storage', true, `Retrieved ${segmentsCount} segments from database`);
      log(`   ✅ Segments stored: ${segmentsCount}`, 'green');
      
      testSummary.diagnostics.segmentStorage = {
        status: 'success',
        segmentsStored: segmentsCount,
        segmentsRetrieved: segmentsCount,
      };
      testSummary.passed++;
    } else {
      // Check if this is because segments weren't generated (fallback mode)
      const hasPolyline = retrievedOffer?.route?.polyline && retrievedOffer.route.polyline.length > 0;
      
      if (hasPolyline) {
        testResult('Segment Storage', true, 'No segments stored (fallback mode)');
        log(`   ⚠️  Segments in database: 0`, 'yellow');
        log(`   ✅ Polyline available: Yes (fallback working)`, 'green');
        
        testSummary.diagnostics.segmentStorage = {
          status: 'fallback',
          segmentsStored: 0,
          segmentsRetrieved: 0,
          polylineAvailable: true,
          message: 'Segments not stored, but polyline fallback is available',
        };
        testSummary.warnings++;
        testSummary.passed++; // Pass because fallback works
      } else {
        testResult('Segment Storage', false, 'No segments found in stored offer');
        log(`   ❌ Segments in database: 0`, 'red');
        log(`   ❌ Polyline: Not available`, 'red');
        
        testSummary.diagnostics.segmentStorage = {
          status: 'failed',
          segmentsStored: 0,
          segmentsRetrieved: 0,
          message: 'Segments not stored in database',
        };
        testSummary.issues.push('SEGMENTS_NOT_STORED');
        testSummary.failed++;
        return false;
      }
    }

    return true;
  } catch (error) {
    testResult('Segment Storage', false, `Error: ${error.message}`);
    testSummary.diagnostics.segmentStorage = {
      status: 'error',
      error: error.message,
    };
    testSummary.failed++;
    return false;
  }
}

/**
 * Test 5: Segment Structure Validation
 */
async function testSegmentStructure() {
  testHeader('Test 5: Segment Structure Validation');
  testSummary.totalTests++;

  try {
    const offerId = testSummary.diagnostics.segmentGeneration?.offerId;
    const driverToken = testSummary.diagnostics.segmentGeneration?.driverToken;

    if (!offerId || !driverToken) {
      testResult('Segment Structure', false, 'No offer ID from previous test');
      testSummary.failed++;
      return false;
    }

    log('\n🔍 Validating segment structure...', 'yellow');

    // Retrieve offer
    const response = await apiRequest('GET', `/pooling/offers/${encodeURIComponent(offerId)}`, null, driverToken);
    if (!response.success) {
      testResult('Retrieve Offer', false, response.error);
      testSummary.failed++;
      return false;
    }

    const segments = response.data?.data?.route?.roadSegments || [];
    
    if (segments.length === 0) {
      testResult('Segment Structure', false, 'No segments to validate');
      testSummary.diagnostics.segmentStructure = {
        status: 'skipped',
        reason: 'No segments available',
      };
      testSummary.failed++;
      return false;
    }

    // Validate each segment
    const requiredFields = ['roadId', 'direction', 'estimatedTime', 'lat', 'lng', 'segmentIndex'];
    const validationResults = {
      total: segments.length,
      valid: 0,
      invalid: 0,
      missingFields: {},
      typeErrors: {},
    };

    segments.forEach((segment, index) => {
      let isValid = true;
      const missing = [];
      const typeErrors = [];

      // Check required fields exist
      requiredFields.forEach(field => {
        if (!(field in segment)) {
          isValid = false;
          missing.push(field);
          if (!validationResults.missingFields[field]) {
            validationResults.missingFields[field] = 0;
          }
          validationResults.missingFields[field]++;
        }
      });

      // Check field types
      if (segment.roadId && typeof segment.roadId !== 'string') {
        isValid = false;
        typeErrors.push(`roadId should be string, got ${typeof segment.roadId}`);
      }
      if (segment.direction && !['forward', 'backward', 'bidirectional'].includes(segment.direction)) {
        isValid = false;
        typeErrors.push(`direction should be forward/backward/bidirectional, got ${segment.direction}`);
      }
      if (segment.lat !== undefined && !Number.isFinite(segment.lat)) {
        isValid = false;
        typeErrors.push(`lat should be number, got ${typeof segment.lat}`);
      }
      if (segment.lng !== undefined && !Number.isFinite(segment.lng)) {
        isValid = false;
        typeErrors.push(`lng should be number, got ${typeof segment.lng}`);
      }
      if (segment.segmentIndex !== undefined && typeof segment.segmentIndex !== 'number') {
        isValid = false;
        typeErrors.push(`segmentIndex should be number, got ${typeof segment.segmentIndex}`);
      }
      if (segment.estimatedTime && !(segment.estimatedTime instanceof Date || typeof segment.estimatedTime === 'string')) {
        isValid = false;
        typeErrors.push(`estimatedTime should be Date or string, got ${typeof segment.estimatedTime}`);
      }

      if (isValid) {
        validationResults.valid++;
      } else {
        validationResults.invalid++;
        if (missing.length > 0) {
          log(`   ⚠️  Segment ${index}: Missing fields: ${missing.join(', ')}`, 'yellow');
        }
        if (typeErrors.length > 0) {
          log(`   ⚠️  Segment ${index}: Type errors: ${typeErrors.join(', ')}`, 'yellow');
        }
      }
    });

    // Check segment ordering
    let orderingValid = true;
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].segmentIndex >= segments[i + 1].segmentIndex) {
        orderingValid = false;
        log(`   ⚠️  Segment ordering issue: segment ${i} has index ${segments[i].segmentIndex}, segment ${i + 1} has ${segments[i + 1].segmentIndex}`, 'yellow');
        break;
      }
    }

    // Check time ordering
    let timeOrderingValid = true;
    for (let i = 0; i < segments.length - 1; i++) {
      const time1 = new Date(segments[i].estimatedTime).getTime();
      const time2 = new Date(segments[i + 1].estimatedTime).getTime();
      if (time1 >= time2) {
        timeOrderingValid = false;
        log(`   ⚠️  Time ordering issue: segment ${i} time >= segment ${i + 1} time`, 'yellow');
        break;
      }
    }

    if (validationResults.invalid === 0 && orderingValid && timeOrderingValid) {
      testResult('Segment Structure', true, `All ${validationResults.total} segments are valid`);
      log(`   ✅ All segments have required fields`, 'green');
      log(`   ✅ Segment ordering is correct`, 'green');
      log(`   ✅ Time ordering is correct`, 'green');
      
      testSummary.diagnostics.segmentStructure = {
        status: 'success',
        totalSegments: validationResults.total,
        validSegments: validationResults.valid,
        orderingValid,
        timeOrderingValid,
      };
      testSummary.passed++;
    } else {
      testResult('Segment Structure', false, `${validationResults.invalid} invalid segments found`);
      log(`   ⚠️  Valid segments: ${validationResults.valid}/${validationResults.total}`, 'yellow');
      log(`   ⚠️  Ordering valid: ${orderingValid}`, orderingValid ? 'green' : 'yellow');
      log(`   ⚠️  Time ordering valid: ${timeOrderingValid}`, timeOrderingValid ? 'green' : 'yellow');
      
      testSummary.diagnostics.segmentStructure = {
        status: 'failed',
        totalSegments: validationResults.total,
        validSegments: validationResults.valid,
        invalidSegments: validationResults.invalid,
        missingFields: validationResults.missingFields,
        orderingValid,
        timeOrderingValid,
      };
      testSummary.issues.push('SEGMENT_STRUCTURE_INVALID');
      testSummary.failed++;
      return false;
    }

    return true;
  } catch (error) {
    testResult('Segment Structure', false, `Error: ${error.message}`);
    testSummary.diagnostics.segmentStructure = {
      status: 'error',
      error: error.message,
    };
    testSummary.failed++;
    return false;
  }
}

/**
 * Test 6: Fallback Behavior
 */
async function testFallbackBehavior() {
  testHeader('Test 6: Fallback Behavior');
  testSummary.totalTests++;

  try {
    log('\n🔄 Testing fallback to polyline matching...', 'yellow');

    const offerId = testSummary.diagnostics.segmentGeneration?.offerId;
    const driverToken = testSummary.diagnostics.segmentGeneration?.driverToken;

    if (!offerId || !driverToken) {
      testResult('Fallback Behavior', false, 'No offer ID from previous test');
      testSummary.failed++;
      return false;
    }

    // Retrieve offer
    const response = await apiRequest('GET', `/pooling/offers/${encodeURIComponent(offerId)}`, null, driverToken);
    if (!response.success) {
      testResult('Retrieve Offer', false, response.error);
      testSummary.failed++;
      return false;
    }

    const offer = response.data?.data;
    const hasSegments = offer?.route?.roadSegments?.length > 0;
    const hasPolyline = offer?.route?.polyline && offer.route.polyline.length > 0;

    if (hasSegments) {
      log(`   ✅ Road segments available: ${offer.route.roadSegments.length}`, 'green');
      log(`   ✅ Polyline available: ${hasPolyline ? 'Yes' : 'No'}`, hasPolyline ? 'green' : 'yellow');
      
      testResult('Fallback Behavior', true, 'Both segments and polyline available');
      testSummary.diagnostics.fallbackBehavior = {
        status: 'success',
        segmentsAvailable: true,
        polylineAvailable: hasPolyline,
        message: 'System has both road segments and polyline fallback',
      };
      testSummary.passed++;
    } else if (hasPolyline) {
      log(`   ⚠️  Road segments: Not available`, 'yellow');
      log(`   ✅ Polyline available: Yes (fallback working)`, 'green');
      
      testResult('Fallback Behavior', true, 'Polyline fallback available');
      testSummary.diagnostics.fallbackBehavior = {
        status: 'fallback',
        segmentsAvailable: false,
        polylineAvailable: true,
        message: 'Segments not available, but polyline fallback is working',
      };
      testSummary.warnings++;
      testSummary.passed++;
    } else {
      log(`   ❌ Road segments: Not available`, 'red');
      log(`   ❌ Polyline: Not available`, 'red');
      
      testResult('Fallback Behavior', false, 'Neither segments nor polyline available');
      testSummary.diagnostics.fallbackBehavior = {
        status: 'failed',
        segmentsAvailable: false,
        polylineAvailable: false,
        message: 'No routing data available',
      };
      testSummary.issues.push('NO_ROUTING_DATA');
      testSummary.failed++;
      return false;
    }

    return true;
  } catch (error) {
    testResult('Fallback Behavior', false, `Error: ${error.message}`);
    testSummary.diagnostics.fallbackBehavior = {
      status: 'error',
      error: error.message,
    };
    testSummary.failed++;
    return false;
  }
}

/**
 * Generate comprehensive diagnostic report
 */
function generateDiagnosticReport() {
  testHeader('Diagnostic Report');
  
  log('\n📊 TEST SUMMARY', 'bright');
  log(`Total Tests: ${testSummary.totalTests}`, 'cyan');
  log(`Passed: ${testSummary.passed}`, 'green');
  log(`Failed: ${testSummary.failed}`, testSummary.failed > 0 ? 'red' : 'green');
  log(`Warnings: ${testSummary.warnings}`, testSummary.warnings > 0 ? 'yellow' : 'cyan');

  if (testSummary.issues.length > 0) {
    log('\n⚠️  IDENTIFIED ISSUES:', 'yellow');
    testSummary.issues.forEach((issue, index) => {
      log(`   ${index + 1}. ${issue}`, 'yellow');
    });
  }

  log('\n🔍 DETAILED DIAGNOSTICS:', 'cyan');
  
  // OSRM Connectivity
  log('\n1. OSRM Connectivity:', 'bright');
  if (testSummary.diagnostics.osrmConnectivity) {
    const diag = testSummary.diagnostics.osrmConnectivity;
    log(`   Status: ${diag.status}`, diag.status === 'success' ? 'green' : 'red');
    if (diag.responseTime) log(`   Response Time: ${diag.responseTime}ms`, 'cyan');
    if (diag.error) log(`   Error: ${diag.error}`, 'red');
  } else {
    log('   Status: Not tested', 'yellow');
  }

  // OSRM Response
  log('\n2. OSRM Route API Response:', 'bright');
  if (testSummary.diagnostics.osrmResponse) {
    const diag = testSummary.diagnostics.osrmResponse;
    log(`   Status: ${diag.status}`, diag.status === 'success' ? 'green' : 'red');
    if (diag.totalSteps) log(`   Total Steps: ${diag.totalSteps}`, 'cyan');
    if (diag.routeDistance) log(`   Route Distance: ${(diag.routeDistance / 1000).toFixed(2)} km`, 'cyan');
    if (diag.routeDuration) log(`   Route Duration: ${(diag.routeDuration / 60).toFixed(2)} minutes`, 'cyan');
    if (diag.error) log(`   Error: ${diag.error}`, 'red');
  } else {
    log('   Status: Not tested', 'yellow');
  }

  // Segment Generation
  log('\n3. Segment Generation:', 'bright');
  if (testSummary.diagnostics.segmentGeneration) {
    const diag = testSummary.diagnostics.segmentGeneration;
    log(`   Status: ${diag.status}`, diag.status === 'success' ? 'green' : 'yellow');
    log(`   Segments Generated: ${diag.segmentsGenerated || 0}`, 'cyan');
    if (diag.offerId) log(`   Offer ID: ${diag.offerId}`, 'cyan');
    if (diag.message) log(`   Message: ${diag.message}`, 'yellow');
    if (diag.error) log(`   Error: ${diag.error}`, 'red');
  } else {
    log('   Status: Not tested', 'yellow');
  }

  // Segment Storage
  log('\n4. Segment Storage:', 'bright');
  if (testSummary.diagnostics.segmentStorage) {
    const diag = testSummary.diagnostics.segmentStorage;
    log(`   Status: ${diag.status}`, diag.status === 'success' ? 'green' : 'red');
    log(`   Segments Stored: ${diag.segmentsStored || 0}`, 'cyan');
    log(`   Segments Retrieved: ${diag.segmentsRetrieved || 0}`, 'cyan');
    if (diag.message) log(`   Message: ${diag.message}`, 'yellow');
    if (diag.error) log(`   Error: ${diag.error}`, 'red');
  } else {
    log('   Status: Not tested', 'yellow');
  }

  // Segment Structure
  log('\n5. Segment Structure:', 'bright');
  if (testSummary.diagnostics.segmentStructure) {
    const diag = testSummary.diagnostics.segmentStructure;
    log(`   Status: ${diag.status}`, diag.status === 'success' ? 'green' : 'red');
    if (diag.totalSegments !== undefined) log(`   Total Segments: ${diag.totalSegments}`, 'cyan');
    if (diag.validSegments !== undefined) log(`   Valid Segments: ${diag.validSegments}`, 'cyan');
    if (diag.invalidSegments !== undefined) log(`   Invalid Segments: ${diag.invalidSegments}`, 'red');
    if (diag.orderingValid !== undefined) log(`   Ordering Valid: ${diag.orderingValid}`, diag.orderingValid ? 'green' : 'red');
    if (diag.timeOrderingValid !== undefined) log(`   Time Ordering Valid: ${diag.timeOrderingValid}`, diag.timeOrderingValid ? 'green' : 'red');
    if (diag.error) log(`   Error: ${diag.error}`, 'red');
  } else {
    log('   Status: Not tested', 'yellow');
  }

  // Fallback Behavior
  log('\n6. Fallback Behavior:', 'bright');
  if (testSummary.diagnostics.fallbackBehavior) {
    const diag = testSummary.diagnostics.fallbackBehavior;
    log(`   Status: ${diag.status}`, diag.status === 'success' || diag.status === 'fallback' ? 'green' : 'red');
    log(`   Segments Available: ${diag.segmentsAvailable}`, diag.segmentsAvailable ? 'green' : 'yellow');
    log(`   Polyline Available: ${diag.polylineAvailable}`, diag.polylineAvailable ? 'green' : 'red');
    if (diag.message) log(`   Message: ${diag.message}`, 'yellow');
    if (diag.error) log(`   Error: ${diag.error}`, 'red');
  } else {
    log('   Status: Not tested', 'yellow');
  }

  // Recommendations
  log('\n💡 RECOMMENDATIONS:', 'bright');
  if (testSummary.issues.includes('OSRM_API_UNREACHABLE')) {
    log('   • Check internet connectivity', 'yellow');
    log('   • Verify OSRM server is accessible: http://router.project-osrm.org', 'yellow');
    log('   • Check firewall settings', 'yellow');
  }
  if (testSummary.issues.includes('OSRM_API_TIMEOUT')) {
    log('   • Increase OSRM_TIMEOUT_MS in .env (default: 10000ms)', 'yellow');
    log('   • Check network latency', 'yellow');
  }
  if (testSummary.issues.includes('SEGMENTS_NOT_GENERATED')) {
    log('   • Check backend logs for OSRM errors', 'yellow');
    log('   • Verify OSRM API is returning valid routes', 'yellow');
    log('   • System will fallback to polyline matching', 'green');
  }
  if (testSummary.issues.includes('SEGMENTS_NOT_STORED')) {
    log('   • Check MongoDB connection', 'yellow');
    log('   • Verify PoolingOffer schema includes roadSegments field', 'yellow');
    log('   • Check backend logs for database errors', 'yellow');
  }
  if (testSummary.issues.includes('SEGMENT_STRUCTURE_INVALID')) {
    log('   • Review OSRM service extractRoadSegments method', 'yellow');
    log('   • Check segment validation logic in pooling.service.ts', 'yellow');
  }
  if (testSummary.issues.includes('NO_ROUTING_DATA')) {
    log('   • Critical: No routing data available', 'red');
    log('   • Check route generation in pooling.service.ts', 'yellow');
    log('   • Verify OSRM service is working', 'yellow');
  }

  // Final verdict
  log('\n' + '='.repeat(60), 'cyan');
  if (testSummary.failed === 0 && testSummary.issues.length === 0) {
    log('✅ ALL TESTS PASSED - Segments are working correctly!', 'green');
  } else if (testSummary.failed === 0 && testSummary.warnings > 0) {
    log('⚠️  TESTS PASSED WITH WARNINGS - Segments may not be generating, but fallback is working', 'yellow');
  } else {
    log('❌ SOME TESTS FAILED - Review issues above', 'red');
  }
  log('='.repeat(60), 'cyan');
}

/**
 * Main test runner
 */
async function runSegmentValidationTests() {
  console.clear();
  log('\n🧪 ROAD SEGMENT VALIDATION TEST SUITE', 'bright');
  log('='.repeat(60), 'cyan');
  log(`OSRM Base URL: ${OSRM_BASE_URL}`, 'cyan');
  log(`Timeout: ${OSRM_TIMEOUT_MS}ms`, 'cyan');
  log(`Retry Attempts: ${OSRM_RETRY_ATTEMPTS}`, 'cyan');
  log(`Retry Delay: ${OSRM_RETRY_DELAY_MS}ms`, 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Run tests sequentially
    await testOSRMConnectivity();
    await sleep(1000);

    await testOSRMRouteAPI();
    await sleep(1000);

    await testSegmentGeneration();
    await sleep(1000);

    await testSegmentStorage();
    await sleep(1000);

    await testSegmentStructure();
    await sleep(1000);

    await testFallbackBehavior();
    await sleep(1000);

    // Generate report
    generateDiagnosticReport();

    // Exit with appropriate code
    process.exit(testSummary.failed > 0 ? 1 : 0);
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runSegmentValidationTests();
}

module.exports = {
  runSegmentValidationTests,
  testSummary,
};

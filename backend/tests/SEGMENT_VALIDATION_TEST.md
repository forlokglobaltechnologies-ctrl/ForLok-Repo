# Road Segment Validation Test Suite

## Overview

This comprehensive test suite validates the road segment generation, storage, and fallback behavior of the road-aware matching system. It provides detailed diagnostics to identify issues and verify that segments are working correctly.

## Test Coverage

### Test 1: OSRM API Connectivity
- **Purpose**: Verifies that the OSRM API server is accessible
- **Checks**:
  - Network connectivity to OSRM server
  - Response time
  - HTTP status codes
- **Issues Detected**:
  - `OSRM_API_UNREACHABLE`: Cannot reach OSRM server
  - `OSRM_API_TIMEOUT`: Request timed out
  - `OSRM_API_ERROR`: Other API errors

### Test 2: OSRM Route API Response
- **Purpose**: Validates that OSRM Route API returns valid route data
- **Checks**:
  - Response structure (code, routes, legs, steps)
  - Step geometry, duration, and distance
  - Total number of steps available
- **Issues Detected**:
  - `OSRM_ROUTE_TIMEOUT`: Route API timed out
  - `OSRM_ROUTE_ERROR`: Route API returned errors

### Test 3: Segment Generation via Backend Service
- **Purpose**: Tests that the backend successfully generates road segments when creating offers
- **Checks**:
  - Segments are generated during offer creation
  - Number of segments generated
  - Offer creation succeeds even if segments fail (fallback)
- **Issues Detected**:
  - `SEGMENTS_NOT_GENERATED`: No segments generated (fallback mode)

### Test 4: Segment Storage and Retrieval
- **Purpose**: Verifies that segments are properly stored in MongoDB and can be retrieved
- **Checks**:
  - Segments are stored in database
  - Segments can be retrieved via API
  - Segment count matches between creation and retrieval
- **Issues Detected**:
  - `SEGMENTS_NOT_STORED`: Segments not found in database

### Test 5: Segment Structure Validation
- **Purpose**: Validates the structure and integrity of generated segments
- **Checks**:
  - Required fields present: `roadId`, `direction`, `estimatedTime`, `lat`, `lng`, `segmentIndex`
  - Field types are correct
  - Segment ordering (segmentIndex increases)
  - Time ordering (estimatedTime increases)
- **Issues Detected**:
  - `SEGMENT_STRUCTURE_INVALID`: Segments have missing or invalid fields

### Test 6: Fallback Behavior
- **Purpose**: Ensures the system gracefully falls back to polyline matching when segments are unavailable
- **Checks**:
  - Polyline is available as fallback
  - System continues to function without segments
- **Issues Detected**:
  - `NO_ROUTING_DATA`: Neither segments nor polyline available

## Usage

### Run Standalone
```bash
cd backend
node tests/test-segment-validation.js
```

### Run via Test Runner
```bash
cd backend
node tests/test-runner.js
```

### Environment Variables
The test uses these environment variables (with defaults):
- `OSRM_BASE_URL`: OSRM server URL (default: `http://router.project-osrm.org`)
- `OSRM_TIMEOUT_MS`: Request timeout in milliseconds (default: `10000`)
- `OSRM_RETRY_ATTEMPTS`: Number of retry attempts (default: `3`)
- `OSRM_RETRY_DELAY_MS`: Delay between retries in milliseconds (default: `1000`)
- `API_BASE_URL`: Backend API URL (default: `http://localhost:3000`)

## Test Output

The test suite provides:

1. **Real-time Test Results**: Each test shows pass/fail status with details
2. **Detailed Diagnostics**: Comprehensive information about each test component
3. **Issue Identification**: Specific issues detected with recommendations
4. **Final Report**: Summary of all tests with recommendations

### Sample Output

```
🧪 ROAD SEGMENT VALIDATION TEST SUITE
============================================================
OSRM Base URL: http://router.project-osrm.org
Timeout: 10000ms
Retry Attempts: 3
Retry Delay: 1000ms
============================================================

============================================================
TEST: Test 1: OSRM API Connectivity
============================================================

📡 Testing OSRM API connectivity...
✅ OSRM Connectivity: PASS (Response time: 234ms)

============================================================
TEST: Test 2: OSRM Route API Response
============================================================

🗺️  Testing OSRM Route API with steps...
✅ OSRM Route API: PASS (Found 45 steps, Response time: 567ms)
   ✅ Route distance: 12.34 km
   ✅ Route duration: 18.45 minutes
   ✅ Steps have geometry: true
   ✅ Steps have duration: true
   ✅ Steps have distance: true

...

============================================================
Diagnostic Report
============================================================

📊 TEST SUMMARY
Total Tests: 6
Passed: 6
Failed: 0
Warnings: 0

🔍 DETAILED DIAGNOSTICS:

1. OSRM Connectivity:
   Status: success
   Response Time: 234ms

2. OSRM Route API Response:
   Status: success
   Total Steps: 45
   Route Distance: 12.34 km
   Route Duration: 18.45 minutes

3. Segment Generation:
   Status: success
   Segments Generated: 45
   Offer ID: PO1234567890

4. Segment Storage:
   Status: success
   Segments Stored: 45
   Segments Retrieved: 45

5. Segment Structure:
   Status: success
   Total Segments: 45
   Valid Segments: 45
   Ordering Valid: true
   Time Ordering Valid: true

6. Fallback Behavior:
   Status: success
   Segments Available: true
   Polyline Available: true

============================================================
✅ ALL TESTS PASSED - Segments are working correctly!
============================================================
```

## Troubleshooting

### Issue: OSRM API Unreachable
**Symptoms:**
- Test 1 fails with "Cannot reach OSRM server"
- Network errors in diagnostics

**Solutions:**
1. Check internet connectivity
2. Verify OSRM server is accessible: `curl http://router.project-osrm.org/nearest/v1/driving/0,0`
3. Check firewall settings
4. Try accessing OSRM URL in browser

### Issue: Segments Not Generated
**Symptoms:**
- Test 3 shows "No segments generated"
- Warning: "Segments not generated, using polyline fallback"

**Solutions:**
1. Check backend logs for OSRM errors
2. Verify OSRM API is returning valid routes (Test 2 should pass)
3. Check OSRM service configuration in `backend/src/services/osrm.service.ts`
4. Verify coordinates are valid
5. System will fallback to polyline matching (this is expected behavior)

### Issue: Segments Not Stored
**Symptoms:**
- Test 4 fails with "No segments found in stored offer"
- Segments generated but not in database

**Solutions:**
1. Check MongoDB connection
2. Verify `PoolingOffer` schema includes `roadSegments` field
3. Check backend logs for database errors
4. Verify offer was created successfully

### Issue: Segment Structure Invalid
**Symptoms:**
- Test 5 fails with "Invalid segments found"
- Missing fields or type errors

**Solutions:**
1. Review `extractRoadSegments` method in `osrm.service.ts`
2. Check segment validation logic in `pooling.service.ts`
3. Verify OSRM API response structure
4. Check for recent changes to segment structure

### Issue: No Routing Data
**Symptoms:**
- Test 6 fails with "Neither segments nor polyline available"
- Critical: No routing data at all

**Solutions:**
1. Check route generation in `pooling.service.ts`
2. Verify OSRM service is working
3. Check polyline generation logic
4. Review backend logs for route generation errors

## Expected Behavior

### When Segments Work:
- ✅ All 6 tests pass
- ✅ Segments generated and stored
- ✅ Segment structure is valid
- ✅ Both segments and polyline available

### When Segments Fail (Fallback Mode):
- ⚠️ Test 3 shows warning (not failure)
- ✅ Test 6 passes (polyline fallback available)
- ✅ System continues to function
- ✅ Offers still created successfully

### When System Fails:
- ❌ Multiple tests fail
- ❌ No routing data available
- ❌ System cannot create offers

## Integration with CI/CD

The test suite exits with:
- **Exit code 0**: All tests passed
- **Exit code 1**: Some tests failed

This makes it suitable for CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Segment Validation Tests
  run: |
    cd backend
    node tests/test-segment-validation.js
```

## Related Files

- `backend/src/services/osrm.service.ts`: OSRM service implementation
- `backend/src/services/pooling.service.ts`: Offer creation with segments
- `backend/src/models/PoolingOffer.ts`: Database schema
- `backend/src/utils/maps.ts`: Route generation utilities
- `backend/tests/test-utils.js`: Test utilities

## Notes

- The test creates real test data (driver, vehicle, offer) in the database
- Test data is not cleaned up automatically (manual cleanup may be needed)
- The test uses real OSRM API calls (requires internet connectivity)
- Test execution time: ~30-60 seconds depending on network latency

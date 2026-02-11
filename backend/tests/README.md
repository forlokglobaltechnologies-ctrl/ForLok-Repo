# Road-Aware Matching Fixes - Test Suite

Complete test suite for verifying all bug fixes in the road-aware matching implementation.

## 📋 Prerequisites

1. **Backend server running**
   ```bash
   cd backend
   npm run dev
   ```

2. **MongoDB connected** and running

3. **Dependencies installed**
   ```bash
   npm install axios
   ```

4. **Environment variables configured** (`.env` file)

## 🧪 Test Files

### 1. `test-utils.js`
Utility functions for API testing:
- API request helpers
- Test user creation
- Test result tracking
- Console output formatting

### 2. `test-direction-validation.js`
Tests the direction validation fix:
- ✅ Same direction should match (high confidence)
- ❌ Reverse direction should NOT match
- Verifies passenger vs driver direction comparison

### 3. `test-array-bounds.js`
Tests array bounds validation:
- ✅ Valid segment indices stored correctly
- ✅ Invalid indices caught and handled
- ✅ Edge cases handled gracefully

### 4. `test-error-handling.js`
Tests error handling improvements:
- ✅ OSRM failures handled gracefully
- ✅ Missing segments don't crash system
- ✅ Invalid data handled with warnings

### 5. `test-route-deviation.js`
Tests route deviation service:
- ✅ Deviation detection after 10+ GPS updates
- ✅ Route adaptation
- ✅ ETA recalculation

### 6. `test-runner.js`
Runs all tests in sequence and provides summary.

## 🚀 Running Tests

### Run All Tests
```bash
cd backend
node tests/test-runner.js
```

### Run Individual Tests

#### Direction Validation
```bash
node tests/test-direction-validation.js
```

#### Array Bounds
```bash
node tests/test-array-bounds.js
```

#### Error Handling
```bash
node tests/test-error-handling.js
```

#### Route Deviation
```bash
node tests/test-route-deviation.js
```

## 📊 Expected Results

### Direction Validation Test
- ✅ Driver offer created with road segments
- ✅ Same direction search finds offer (confidence >= 0.6)
- ✅ Reverse direction search does NOT find offer

### Array Bounds Test
- ✅ Booking created successfully
- ✅ Segment indices within bounds (0 to length-1)
- ✅ All required fields present

### Error Handling Test
- ✅ Invalid coordinates handled gracefully
- ✅ Valid offers created successfully
- ✅ Bookings created even with missing segments

### Route Deviation Test
- ✅ Location updates sent successfully
- ✅ Deviation detected (check logs)
- ✅ Route adapted (check logs)
- ✅ ETAs recalculated (check logs)

## 🔍 Verifying Results

### Check Backend Logs
```bash
tail -f backend/logs/combined.log | grep -E "Road-aware|Direction|confidence|Invalid segment|Route deviation"
```

### Expected Log Messages

#### Direction Validation
```
Road-aware match validation: isValid=true, confidence=0.85, pickupSegment=5, dropSegment=12
✅ MATCH: Driver ... (road-aware match, confidence=0.85)
```

#### Array Bounds
```
Stored road segments for booking: pickup=road_abc123, drop=road_def456, confidence=0.85
```

#### Error Handling
```
Failed to generate road segments, using polyline fallback
Cannot store road segments: roadSegmentsAvailable=false
```

#### Route Deviation
```
Route deviation detected: offerId=PO..., deviation=35%
Route adapted for offer PO...: 2 ETAs recalculated
Recalculated ETA for booking BK...: 2026-02-04T09:15:00.000Z
```

## 🐛 Troubleshooting

### Issue: Tests fail with "Cannot find module 'axios'"
**Solution:**
```bash
cd backend
npm install axios
```

### Issue: Tests fail with authentication errors
**Solution:**
- Ensure backend server is running
- Check `.env` file has correct JWT_SECRET
- Verify MongoDB is connected

### Issue: OSRM API errors / No road segments generated

**Symptoms:**
- Tests show "Road Segments: 0"
- Logs show "Failed to generate road segments"
- Offers created but no `roadSegments` array

**Diagnosis Steps:**

1. **Check OSRM API Connectivity:**
   ```bash
   # Test OSRM API directly
   curl "http://router.project-osrm.org/route/v1/driving/78.3908,17.4486;78.4983,17.4399?overview=false"
   ```
   - Should return JSON with `"code":"Ok"`
   - If fails: Check internet connection or OSRM server status

2. **Check Backend Logs:**
   ```bash
   tail -f backend/logs/combined.log | grep -i "osrm\|road segment"
   ```
   - Look for: "OSRM Route API error", "No route found", "timeout"
   - Check for retry attempts: "attempt 1/3", "attempt 2/3"

3. **Verify Coordinates:**
   - Ensure coordinates are valid numbers (not NaN, not Infinity)
   - Check coordinates are within valid ranges:
     - Latitude: -90 to 90
     - Longitude: -180 to 180

4. **Check OSRM Configuration:**
   - Verify `.env` has OSRM settings (optional, defaults work)
   - Check `OSRM_BASE_URL` if using custom server
   - Verify `OSRM_TIMEOUT_MS` is reasonable (default: 10000ms)

**Solutions:**

- **Network Issues:**
  - Check internet connection
  - Verify firewall allows outbound HTTP requests
  - Try accessing OSRM URL in browser

- **Rate Limiting:**
  - OSRM public server may rate limit
  - System will retry automatically (3 attempts)
  - Wait a few minutes and try again

- **Invalid Coordinates:**
  - Verify test coordinates are valid
  - Check if coordinates are swapped (lat/lng vs lng/lat)
  - Ensure coordinates are for a valid location

- **OSRM Server Down:**
  - System will fallback to polyline matching
  - Tests should still pass (with warning)
  - Check OSRM status: https://status.openstreetmap.org/

**Expected Behavior:**
- System retries up to 3 times with exponential backoff
- If all retries fail, falls back to polyline matching
- Offers are still created successfully
- Tests should pass even if segments are missing (fallback mode)

### Issue: Location updates failing

**Symptoms:**
- Tests show "0/5 updates sent"
- Error: "Booking is not in progress"
- Location tracking not working

**Diagnosis Steps:**

1. **Check Booking Status:**
   ```bash
   # In test, check booking status before sending updates
   # Booking must be 'in_progress' or 'confirmed'
   ```

2. **Verify Trip Started:**
   - Tests should call `startTrip()` helper before sending location updates
   - Check if `startTrip()` succeeded
   - Verify booking status changed to `in_progress`

3. **Check Endpoint Path:**
   - Verify using `/api/tracking/update-location` (not `/api/tracking/location`)
   - Check test utility uses correct endpoint

**Solutions:**

- **Booking Status Wrong:**
  - Call `startTrip(driverToken, bookingId)` before sending updates
  - Or call `confirmBooking(driverToken, bookingId)` for confirmed status
  - Verify status with `getBooking(bookingId, token)`

- **Endpoint Mismatch:**
  - Use `/api/tracking/update-location` (correct endpoint)
  - Check test utility `updateDriverLocation()` function

- **Driver Authorization:**
  - Ensure `driverId` matches booking's driver
  - Verify driver token is valid

**Expected Behavior:**
- Booking created with status `pending`
- Call `startTrip()` to change status to `in_progress`
- Location updates succeed after status change
- System logs each location update

### Issue: Route deviation not detected

**Symptoms:**
- Location updates sent but no deviation detected
- Logs don't show "Route deviation detected"

**Diagnosis Steps:**

1. **Check Location Update Count:**
   - Need at least 10 GPS updates for deviation detection
   - Check test sends enough updates

2. **Verify Deviation Threshold:**
   - Deviation must be >30% to trigger detection
   - Check if GPS points actually deviate from route

3. **Check Backend Logs:**
   ```bash
   tail -f backend/logs/combined.log | grep -i "deviation\|route adapted"
   ```

**Solutions:**

- **Not Enough Updates:**
  - Send at least 10 location updates
  - System checks deviation after 10+ points

- **Deviation Too Small:**
  - Ensure GPS points actually deviate from planned route
  - Deviation must be >30% to trigger

- **Route Segments Missing:**
  - If offer has no road segments, deviation detection may not work
  - Check if road segments were generated for offer

## 📝 Test Data

### Test Coordinates (Hyderabad, India)
- **Hitech City**: `17.4486, 78.3908`
- **Secunderabad**: `17.4399, 78.4983`

### Test Users
- Created automatically with random phone numbers
- Format: `98765XXXXX`
- Password: `Test@123456`

## ✅ Success Criteria

All tests should pass with:
- ✅ No crashes or unhandled errors
- ✅ Proper error messages in logs
- ✅ Graceful fallbacks when services unavailable
- ✅ Correct validation logic
- ✅ Array bounds checked
- ✅ Type safety maintained

## 🔄 Continuous Testing

To run tests continuously during development:
```bash
# Watch mode (requires nodemon or similar)
nodemon --watch tests --exec "node tests/test-runner.js"
```

## 📚 Additional Resources

- [Testing Guide](../TESTING_GUIDE_FIXES.md) - Detailed manual testing guide
- [UI Testing Guide](../UI_TESTING_GUIDE_ROAD_AWARE_MATCHING.md) - Frontend testing guide
- Backend logs: `backend/logs/combined.log`

---

**Last Updated:** 2026-02-04
**Test Suite Version:** 1.0.0

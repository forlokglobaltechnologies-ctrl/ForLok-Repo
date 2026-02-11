# 🧪 Feature Test Suite Guide

Complete test suite for validating all 4 road-aware matching features.

## 📋 Test Files

1. **`test-confidence-scoring.js`** - Tests confidence score calculation
2. **`test-segment-matching.js`** - Tests segment-based pickup matching
3. **`test-direction-time-validation.js`** - Tests direction and time validation
4. **`test-live-gps-rematching.js`** - Tests live GPS rematching and route deviation
5. **`test-all-features.js`** - Master test runner (runs all tests)

## 🚀 Quick Start

### Run All Tests
```bash
cd backend
node tests/test-all-features.js
```

### Run Individual Tests
```bash
# Confidence scoring
node tests/test-confidence-scoring.js

# Segment matching
node tests/test-segment-matching.js

# Direction & time validation
node tests/test-direction-time-validation.js

# Live GPS rematching
node tests/test-live-gps-rematching.js
```

## ✅ Test Coverage

### Feature 1: Confidence Score Calculation

**Tests:**
- ✅ Perfect Match (>= 0.8) - Full overlap, same direction, correct time order
- ✅ Partial Match (0.6-0.8) - Partial overlap, slight deviation
- ✅ Wrong Direction (0 or rejected) - Same road, opposite direction
- ✅ Low Confidence (< 0.6) - Minimal overlap or invalid match

**Expected Results:**
- Perfect match: `confidence >= 0.8`, match accepted
- Partial match: `0.6 <= confidence < 0.8`, fallback to polyline
- Wrong direction: `confidence = 0` or match rejected
- Low confidence: `confidence < 0.6` or match rejected

### Feature 2: Segment-Based Pickup Matching

**Tests:**
- ✅ Valid Pickup on Route - Passenger pickup matches driver segment
- ✅ Matching Uses Segments - Verify matching uses `roadSegments[]`, not raw GPS
- ✅ Segment Structure - Verify segments have required fields

**Expected Results:**
- Pickup/drop segments stored in booking
- Matching uses road segments, not GPS distance alone
- Segments have: `roadId`, `direction`, `lat`, `lng`, `estimatedTime`, `segmentIndex`

### Feature 3: Direction & Time Validation

**Tests:**
- ✅ Time Order Validation - Pickup time < Drop time
- ✅ Direction Validation - Direction mismatch detected and rejected
- ✅ Segment Index Ordering - Sequential indices (0, 1, 2...)
- ✅ Time-Based Segment Selection - Correct occurrence chosen for duplicate roads

**Expected Results:**
- Time order enforced: `pickup.estimatedTime < drop.estimatedTime`
- Direction mismatch rejected
- Sequential segment indices
- Time-based selection works for loop roads

### Feature 4: Live GPS Rematching

**Tests:**
- ✅ Minor Deviation - Driver slightly off route, ETA updated, trip continues
- ✅ Booking Status After Deviation - Status remains active (not cancelled)
- ✅ Route Deviation Service - Service detects deviations
- ✅ GPS Map-Matching - GPS points map-matched to road segments

**Expected Results:**
- Minor deviations: ETA updated, trip continues
- Major deviations: Segments recalculated, ETAs updated
- No automatic cancellation
- GPS points map-matched using OSRM Match API

## 📊 Test Output

Each test provides:
- ✅ **PASS** - Test passed
- ❌ **FAIL** - Test failed (with reason)
- ⚠️ **WARNING** - Test completed but with warnings

## 🔍 Debugging Failed Tests

### Common Issues

1. **No Segments Generated**
   - Check OSRM API connectivity
   - Verify coordinates are valid
   - Check backend logs for `[DEBUG]` messages

2. **Booking Creation Failed**
   - Verify offer has available seats
   - Check passenger coordinates are valid
   - Ensure booking is within offer date/time

3. **Location Updates Failed**
   - Ensure booking status is `in_progress` or `confirmed`
   - Call `startTrip()` before sending location updates
   - Verify booking ID is correct

4. **Confidence Score Missing**
   - Check if road-aware matching is enabled
   - Verify segments exist in offer
   - Check backend logs for matching errors

## 📝 Test Data

All tests use:
- **Driver Route**: HITEC City → Gachibowli (Hyderabad)
- **Coordinates**: 
  - From: `17.4486, 78.3908`
  - To: `17.4399, 78.4983`

## 🎯 Success Criteria

All features are **COMPLETE** when:

| Feature | Status | Criteria |
|---------|--------|----------|
| Confidence Scoring | ✅ | Scores calculated, thresholds work |
| Segment Matching | ✅ | Segments used, not raw GPS |
| Direction/Time | ✅ | Validation enforced |
| Live GPS Rematch | ✅ | Deviation detected, ETAs updated |

## 🚨 Important Notes

1. **Backend Must Be Running**: Tests require backend server on `http://localhost:3000`
2. **OSRM API Required**: Tests need OSRM API connectivity
3. **Test Data**: Tests create real users/offers/bookings in database
4. **Cleanup**: Test data persists (consider cleanup script for production)

## 📚 Related Documentation

- `SEGMENT_TEST_SUCCESS_REPORT.md` - Segment generation verification
- `UI_TESTING_GUIDE_ROAD_AWARE_MATCHING.md` - UI-level testing guide
- `TEST_RESULTS_ANALYSIS.md` - Test results analysis

---

**Last Updated**: After segment generation fix
**Status**: ✅ All tests created and ready to run

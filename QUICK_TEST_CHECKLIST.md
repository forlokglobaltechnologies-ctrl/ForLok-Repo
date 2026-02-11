# ⚡ Quick Test Checklist - Road-Aware Matching

**Quick reference for testing road-aware car pooling features**

---

## 🚀 Setup (5 minutes)

- [ ] **Driver Account:** Phone `9876543210`, Password `Test@123`
- [ ] **Passenger Account:** Phone `9876543211`, Password `Test@123`
- [ ] **Vehicle Added:** Car, Maruti Swift, TS01AB1234
- [ ] **Documents Uploaded:** (if required)

---

## ✅ Test 1: Offer Creation (2 minutes)

**Driver Actions:**
1. [ ] Login as driver
2. [ ] Create Pooling Offer:
   - From: `Hitech City, Hyderabad` (17.4486, 78.3908)
   - To: `Secunderabad Station` (17.4399, 78.4983)
   - Date: Tomorrow
   - Time: 09:00 AM
   - Vehicle: Select vehicle
   - Seats: 3
3. [ ] Submit offer

**Verify:**
- [ ] Offer created successfully
- [ ] Check logs: "Generated X road segments"
- [ ] Offer has `roadSegments` array (check API or logs)

---

## ✅ Test 2: Valid Match (1 minute)

**Passenger Actions:**
1. [ ] Login as passenger
2. [ ] Search Pooling:
   - From: `Hitech City` (17.4490, 78.3910)
   - To: `Secunderabad Station` (17.4400, 78.4990)
   - Date: Same as driver
3. [ ] Tap Search

**Verify:**
- [ ] Driver's offer appears in results
- [ ] Logs show: `confidence >= 0.8`
- [ ] Logs show: `road-aware match`

---

## ✅ Test 3: Reverse Direction Rejection (1 minute)

**Passenger Actions:**
1. [ ] Search Pooling:
   - From: `Secunderabad Station` (driver's TO)
   - To: `Hitech City` (driver's FROM)
   - Date: Same as driver
2. [ ] Tap Search

**Verify:**
- [ ] Driver's offer does NOT appear
- [ ] Logs show: `Direction mismatch` or `confidence < 0.6`

---

## ✅ Test 4: Booking Creation (2 minutes)

**Passenger Actions:**
1. [ ] Tap on matching offer
2. [ ] Review details
3. [ ] Select payment: `Offline Cash`
4. [ ] Tap "Book Now"

**Verify:**
- [ ] Booking created successfully
- [ ] Check API: Booking has `passengerPickupSegment`
- [ ] Check API: Booking has `passengerDropSegment`
- [ ] Check API: Booking has `matchingConfidence` (0.0-1.0)

---

## ✅ Test 5: Real-Time Tracking (3 minutes)

**Driver Actions:**
1. [ ] Login as driver
2. [ ] Open active offer
3. [ ] Tap "Start Trip" (at scheduled time)
4. [ ] Location tracking starts automatically

**Verify:**
- [ ] Location updates every 5 seconds
- [ ] Map shows driver location
- [ ] Logs show: "Location updated for booking"

**Passenger Actions:**
1. [ ] Login as passenger
2. [ ] Open active booking
3. [ ] Tap "Track Trip"

**Verify:**
- [ ] Driver location visible on map
- [ ] Location updates every 5 seconds
- [ ] ETA displayed

---

## ✅ Test 6: Route Deviation (5 minutes)

**Driver Actions:**
1. [ ] Continue trip on planned route (5 location updates)
2. [ ] Take different road (deviate) (5 more location updates)
3. [ ] Continue sending location updates

**Verify (After 10 Updates):**
- [ ] Logs show: "Route deviation detected: X%"
- [ ] Logs show: "Route adapted"
- [ ] Logs show: "ETAs recalculated"
- [ ] Trip continues (NOT cancelled)

---

## ✅ Test 7: Edge Cases (5 minutes)

### 7.1 OSRM Failure Fallback
- [ ] Disconnect internet
- [ ] Try creating offer with invalid coordinates
- [ ] Verify: Offer still created, polyline fallback works

### 7.2 Intermediate Pickup
- [ ] Driver: Create long route A → B → C
- [ ] Passenger: Search B → C
- [ ] Verify: Match works, segment indices correct

### 7.3 Loop Route
- [ ] Driver: Create circular route (same start/end)
- [ ] Verify: Segments generated, time ordering works

---

## 🎯 Quick Verification Commands

### Check Offer Has Road Segments
```bash
GET /api/pooling/offers/{offerId}
# Look for: route.roadSegments array
```

### Check Booking Has Segments
```bash
GET /api/bookings/{bookingId}
# Look for: passengerPickupSegment, passengerDropSegment, matchingConfidence
```

### Check Logs
```bash
# Backend logs should show:
- "Generated X road segments"
- "Road-aware match: isValid=..."
- "confidence=0.XX"
- "Route deviation detected"
```

---

## ❌ Common Failures & Fixes

| Issue | Check |
|-------|-------|
| No road segments | OSRM API accessible? Internet connected? |
| No matches found | Coordinates correct? Date matches? |
| Reverse direction matches | Check logs for direction validation |
| Deviation not detected | Need 10+ GPS updates, check threshold |
| Booking fails | Check road segments exist in offer |

---

## 📊 Test Results

**Date:** ___________

| Test | Status | Notes |
|------|--------|-------|
| Offer Creation | ⬜ Pass / ⬜ Fail | |
| Valid Match | ⬜ Pass / ⬜ Fail | |
| Reverse Rejection | ⬜ Pass / ⬜ Fail | |
| Booking Creation | ⬜ Pass / ⬜ Fail | |
| Real-Time Tracking | ⬜ Pass / ⬜ Fail | |
| Route Deviation | ⬜ Pass / ⬜ Fail | |
| Edge Cases | ⬜ Pass / ⬜ Fail | |

**Issues Found:**
1. _________________________________
2. _________________________________

---

**Total Test Time:** ~20 minutes
**Status:** ⬜ All Pass / ⬜ Issues Found

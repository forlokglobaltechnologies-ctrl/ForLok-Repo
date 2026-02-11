# 🧪 UI Testing Guide: Road-Aware Car Pooling Matching System

**Complete step-by-step testing guide for testing road-aware matching features through the mobile app UI**

---

## 📋 Prerequisites

- ✅ Mobile app installed and running (Expo/React Native)
- ✅ Backend server running on `http://localhost:3000` (or configured URL)
- ✅ MongoDB connected and running
- ✅ Two test devices/emulators (or use one device with logout/login)
- ✅ Internet connection (for OSRM API)

---

## 🎯 Test Scenarios Overview

1. **Driver Registration & Vehicle Setup**
2. **Create Pooling Offer (Road Segments Generation)**
3. **Passenger Search (Road-Aware Matching)**
4. **Booking Creation (Segment Storage)**
5. **Real-Time Tracking & Route Deviation**
6. **Edge Cases Testing**

---

## 📱 TEST SCENARIO 1: Driver Setup & Offer Creation

### Step 1.1: Driver Registration

**Screen:** Sign Up Screen

1. **Open the app** → Tap "Sign Up" or "Create Account"
2. **Enter Driver Details:**
   - Phone Number: `9876543210`
   - Tap "Send OTP"
   - Wait for OTP (check console/logs for OTP code)
   - Enter OTP: `123456` (or actual OTP from logs)
   - Name: `Test Driver`
   - Password: `Test@123`
   - User Type: Select `Individual`
   - Tap "Register"

**Expected Result:**
- ✅ Account created successfully
- ✅ Redirected to Dashboard
- ✅ User logged in automatically

---

### Step 1.2: Add Vehicle

**Screen:** Dashboard → "Add Vehicle" or Vehicle Management

1. **Navigate to Vehicle Section:**
   - Tap "Add Vehicle" button (or go to Profile → Vehicles)
2. **Fill Vehicle Details:**
   - Vehicle Type: Select `Car`
   - Brand: `Maruti`
   - Model: `Swift`
   - Vehicle Number: `TS01AB1234`
   - Year: `2020`
   - Seats: `4`
   - Color: `White`
   - Tap "Save" or "Add Vehicle"

**Expected Result:**
- ✅ Vehicle added successfully
- ✅ Vehicle appears in vehicle list
- ✅ Vehicle ID generated

**Note:** Save the vehicle details for later use.

---

### Step 1.3: Upload Required Documents (If Required)

**Screen:** Profile → Documents

1. **Check Document Requirements:**
   - Driving License (Front & Back)
   - Vehicle Registration
   - Vehicle Insurance
   - Vehicle Photos
2. **Upload Documents:**
   - Tap each document type
   - Select from gallery or take photo
   - Upload all required documents
3. **Verify Status:**
   - All documents should show "Verified" or "Pending"

**Expected Result:**
- ✅ Documents uploaded
- ✅ Can proceed to create offers

---

## 🚗 TEST SCENARIO 2: Create Pooling Offer with Road Segments

### Step 2.1: Navigate to Create Offer

**Screen:** Dashboard → "Create Offer" or "Offer Ride"

1. **Open Create Offer Screen:**
   - Tap "Create Pooling Offer" button
   - Or navigate: Dashboard → Offers → Create New

**Expected Result:**
- ✅ Create Pooling Offer screen opens
- ✅ Form fields visible

---

### Step 2.2: Select Route (From & To)

**Screen:** Create Pooling Offer Screen

1. **Select "From" Location:**
   - Tap "From" field or "Select Pickup Location"
   - Map opens → Search or tap location
   - **Test Location 1:** 
     - Search: `Hitech City, Hyderabad`
     - Or coordinates: `17.4486, 78.3908`
   - Tap "Confirm" or "Select"

2. **Select "To" Location:**
   - Tap "To" field or "Select Drop Location"
   - Map opens → Search or tap location
   - **Test Location 2:**
     - Search: `Secunderabad Railway Station, Hyderabad`
     - Or coordinates: `17.4399, 78.4983`
   - Tap "Confirm" or "Select"

**Expected Result:**
- ✅ Both locations selected
- ✅ Addresses displayed in fields
- ✅ Map shows route preview
- ✅ Distance and duration calculated

---

### Step 2.3: Fill Offer Details

**Screen:** Create Pooling Offer Screen (continued)

1. **Select Date:**
   - Tap Date field
   - Select: `Tomorrow` or `2024-12-25`
   - Confirm

2. **Select Time:**
   - Tap Time field
   - Select: `09:00 AM`
   - Confirm

3. **Select Vehicle:**
   - Tap Vehicle dropdown
   - Select: `Maruti Swift (TS01AB1234)` (from Step 1.2)

4. **Set Available Seats:**
   - Tap Seats field
   - Enter: `3`

5. **Add Notes (Optional):**
   - Tap Notes field
   - Enter: `Test road-aware offer`

**Expected Result:**
- ✅ All fields filled
- ✅ Form validation passes

---

### Step 2.4: Submit Offer

**Screen:** Create Pooling Offer Screen

1. **Review Details:**
   - Check all fields are correct
   - Verify route on map

2. **Tap "Create Offer" or "Submit"**

**Expected Result:**
- ✅ Offer created successfully
- ✅ Success message displayed
- ✅ Redirected to "My Offers" or Dashboard
- ✅ Offer appears in offer list

---

### Step 2.5: Verify Road Segments Generated

**Screen:** My Offers → View Offer Details

1. **Open Created Offer:**
   - Navigate to "My Offers"
   - Tap on the offer you just created

2. **Check Offer Details:**
   - View offer information
   - Check backend logs/console for:
     ```
     Generated X road segments for offer PO...
     ```

3. **Verify in Backend (Optional - Check API Response):**
   ```bash
   GET /api/pooling/offers/{offerId}
   ```
   - Check response includes `route.roadSegments` array
   - Verify segments have: `roadId`, `direction`, `estimatedTime`, `lat`, `lng`, `segmentIndex`

**Expected Result:**
- ✅ Road segments generated (check logs)
- ✅ `roadSegments` array exists in offer data
- ✅ Each segment has all required fields
- ✅ Segments ordered by `segmentIndex`
- ✅ `estimatedTime` increases with segment index

**Troubleshooting - No Road Segments Generated:**

If `roadSegments` is empty or missing:

1. **Check OSRM API Connectivity:**
   ```bash
   # Test OSRM API
   curl "http://router.project-osrm.org/route/v1/driving/78.3908,17.4486;78.4983,17.4399?overview=false"
   ```
   - Should return JSON with `"code":"Ok"`
   - If fails: Check internet connection

2. **Check Backend Logs:**
   ```bash
   tail -f backend/logs/combined.log | grep -i "osrm\|road segment"
   ```
   - Look for: "Failed to generate road segments"
   - Check for retry attempts: "attempt 1/3", "attempt 2/3"

3. **Verify Coordinates:**
   - Ensure coordinates are valid (not NaN, within valid ranges)
   - Check if coordinates are for a valid location

4. **System Behavior:**
   - System will retry up to 3 times automatically
   - If all retries fail, falls back to polyline matching
   - Offer is still created successfully
   - Matching will use polyline fallback (acceptable)

**Note:** 
- Polyline fallback is acceptable and works correctly
- Road segments enhance matching but aren't required
- Save the `offerId` for passenger testing

---

## 🔍 TEST SCENARIO 3: Passenger Search with Road-Aware Matching

### Step 3.1: Logout Driver & Login as Passenger

**Screen:** Profile → Logout

1. **Logout Driver:**
   - Navigate to Profile screen
   - Tap "Logout" or "Sign Out"
   - Confirm logout

2. **Login as Passenger:**
   - If passenger account exists, login
   - If not, create new account:
     - Phone: `9876543211`
     - Name: `Test Passenger`
     - Password: `Test@123`
     - Complete registration

**Expected Result:**
- ✅ Logged out successfully
- ✅ Passenger account logged in
- ✅ Dashboard shows passenger view

---

### Step 3.2: Search for Pooling Offers

**Screen:** Dashboard → "Find Ride" or "Search Pooling"

1. **Navigate to Search:**
   - Tap "Find Pooling" or "Search Rides"
   - Search Pooling screen opens

2. **Select From Location:**
   - Tap "From" field
   - **Test Case 3.2A - Valid Match (Same Direction):**
     - Search: `Hitech City, Hyderabad` (same as driver's from)
     - Or coordinates: `17.4490, 78.3910` (slightly different but on route)
   - Tap "Confirm"

3. **Select To Location:**
   - Tap "To" field
   - **Test Case 3.2A:**
     - Search: `Secunderabad Railway Station` (same as driver's to)
     - Or coordinates: `17.4400, 78.4990` (slightly different but on route)
   - Tap "Confirm"

4. **Select Date:**
   - Tap Date field
   - Select: `Same date as driver's offer` (from Step 2.3)

5. **Tap "Search" or "Find Rides"**

**Expected Result:**
- ✅ Search executes
- ✅ Loading indicator shows
- ✅ Results appear after search
- ✅ **Driver's offer should appear in results**
- ✅ Check console logs for:
  ```
  Road-aware match: isValid=true, confidence=0.XX
  ✅ MATCH: Driver ... (road-aware match, confidence=0.XX)
  ```

**Verification Checklist:**
- [ ] Offer appears in search results
- [ ] Confidence score >= 0.8 (check logs)
- [ ] Road-aware matching used (not polyline fallback)
- [ ] Offer details displayed correctly

---

### Step 3.3: Test Reverse Direction Rejection

**Screen:** Search Pooling Screen

1. **Clear Previous Search:**
   - Tap "Clear" or reset form

2. **Search Reverse Direction:**
   - **From:** `Secunderabad Railway Station` (driver's TO location)
   - **To:** `Hitech City, Hyderabad` (driver's FROM location)
   - **Date:** Same as driver's offer
   - Tap "Search"

**Expected Result:**
- ✅ Search executes
- ✅ **Driver's offer should NOT appear in results**
- ✅ Check console logs for:
  ```
  ❌ NO MATCH: Direction mismatch
  OR
  ❌ NO MATCH: Road-aware confidence too low (0.XX)
  ```

**Verification Checklist:**
- [ ] Offer does NOT appear in results
- [ ] Logs show direction mismatch or low confidence
- [ ] No false positives

---

### Step 3.4: Test Intermediate Pickup (Passenger on Route)

**Screen:** Search Pooling Screen

1. **Create New Driver Offer (if needed):**
   - Login as driver again
   - Create offer: `Point A → Point B → Point C` (long route)
   - Example: `Hyderabad Airport → Hitech City → Secunderabad`

2. **Login as Passenger:**
   - Logout driver, login passenger

3. **Search Intermediate Route:**
   - **From:** `Hitech City` (middle point of driver route)
   - **To:** `Secunderabad` (end point of driver route)
   - **Date:** Same as driver's offer
   - Tap "Search"

**Expected Result:**
- ✅ Driver's offer appears in results
- ✅ Logs show: `pickupSegmentIndex < dropSegmentIndex`
- ✅ Time order validated: `pickup_time < drop_time`

**Verification Checklist:**
- [ ] Offer appears (intermediate pickup allowed)
- [ ] Segment indices correct
- [ ] Time ordering validated

---

### Step 3.5: Test Flyover vs Service Road

**Screen:** Search Pooling Screen

1. **Create Driver Offer on Flyover:**
   - Login as driver
   - Create offer with coordinates on elevated road/flyover
   - Example: `17.4486, 78.3908` → `17.4500, 78.4000` (flyover)

2. **Login as Passenger**

3. **Search from Service Road (Same Coordinates, Different Road):**
   - **From:** Same lat/lng as driver's from (but on service road)
   - **To:** Same lat/lng as driver's to (but on service road)
   - Tap "Search"

**Expected Result:**
- ✅ Road-aware matching detects different `roadId`
- ✅ Match rejected if roads don't match
- ✅ OR falls back to polyline if confidence 0.6-0.8

**Verification Checklist:**
- [ ] Different road detection works
- [ ] False matches prevented
- [ ] Fallback logic works if needed

---

## 📝 TEST SCENARIO 4: Booking Creation with Road Segments

### Step 4.1: View Offer Details

**Screen:** Search Results → Tap on Offer

1. **Select Offer:**
   - From search results, tap on a matching offer
   - Offer Details screen opens

2. **Review Offer:**
   - Check route details
   - Check driver information
   - Check vehicle details
   - Check price

**Expected Result:**
- ✅ Offer details displayed
- ✅ Route shown on map
- ✅ All information visible

---

### Step 4.2: Confirm Passenger Route

**Screen:** Offer Details Screen

1. **Verify Route:**
   - Check "From" location matches your search
   - Check "To" location matches your search
   - Map shows passenger route overlay

2. **Check Price:**
   - Price calculated based on passenger route
   - Price breakdown visible

**Expected Result:**
- ✅ Passenger route displayed correctly
- ✅ Price calculated dynamically

---

### Step 4.3: Create Booking

**Screen:** Offer Details → "Book Now" or "Confirm Booking"

1. **Select Payment Method:**
   - Tap payment method dropdown
   - Select: `Offline Cash` (for testing)

2. **Review Booking Summary:**
   - Check route
   - Check price
   - Check date/time

3. **Tap "Confirm Booking" or "Book Now"**

**Expected Result:**
- ✅ Booking created successfully
- ✅ Success message displayed
- ✅ Redirected to Booking Confirmation screen
- ✅ Booking ID displayed

---

### Step 4.4: Verify Road Segments Stored in Booking

**Screen:** Booking Confirmation or Booking Details

1. **View Booking Details:**
   - Navigate to "My Bookings"
   - Tap on the booking you just created

2. **Check Backend (Optional - API Call):**
   ```bash
   GET /api/bookings/{bookingId}
   ```
   - Check response includes:
     - `passengerPickupSegment` object
     - `passengerDropSegment` object
     - `matchingConfidence` number (0.0-1.0)

**Expected Result:**
- ✅ Booking created with road segment references
- ✅ `passengerPickupSegment` exists with: `roadId`, `direction`, `lat`, `lng`, `estimatedTime`
- ✅ `passengerDropSegment` exists with same fields
- ✅ `matchingConfidence` between 0.0-1.0
- ✅ `pickupSegment.estimatedTime < dropSegment.estimatedTime`

**Verification Checklist:**
- [ ] Road segments stored in booking
- [ ] Confidence score stored
- [ ] Time ordering correct

---

## 🗺️ TEST SCENARIO 5: Real-Time Tracking & Route Deviation

### Step 5.1: Driver Starts Trip

**Screen:** Driver Dashboard → "My Offers" → Active Offer

1. **Login as Driver:**
   - Logout passenger, login driver

2. **Navigate to Active Offer:**
   - Go to "My Offers"
   - Find offer with bookings
   - Tap on offer

3. **Start Trip:**
   - Tap "Start Trip" button
   - Confirm start
   - **Note:** Trip can only start at or after scheduled time

**Expected Result:**
- ✅ Trip started successfully
   - All bookings marked as `in_progress`
   - Trip tracking screen opens
   - Location tracking starts automatically

**Important for Location Tracking:**
- Booking status must be `in_progress` or `confirmed` for location updates
- Location tracking will fail if booking is still `pending`
- Use API endpoint: `PUT /api/bookings/{bookingId}/status` with `{"status": "in_progress"}`

**Test Helper Usage (for automated testing):**
```javascript
// In test files, use startTrip helper before sending location updates
const tripStart = await startTrip(driverToken, bookingId);
if (!tripStart.success) {
  // Handle error
}
// Now location updates will work
```

---

### Step 5.2: Driver Location Tracking

**Screen:** Driver Trip Screen

1. **Verify Location Tracking Started:**
   - Check location permission granted
   - Map shows current location
   - Location updates every 5 seconds

2. **Monitor Location Updates:**
   - Watch map for location updates
   - Check console logs for:
     ```
     Location updated for booking BK...: lat, lng
     ```

**Expected Result:**
- ✅ Location tracking active
- ✅ Map updates with driver location
- ✅ Location sent to backend every 5 seconds

---

### Step 5.3: Simulate Route Deviation

**Screen:** Driver Trip Screen

1. **Follow Planned Route (First 5 Updates):**
   - Driver follows the planned route
   - Location updates sent normally

2. **Deviate from Route (Next 5 Updates):**
   - Driver takes different road (simulate traffic reroute)
   - Continue sending location updates
   - After 10 total updates, deviation detection triggers

**Expected Result:**
- ✅ After 10 location updates, check backend logs:
  ```
  Route deviation detected for offer PO...: X% deviation
  Route adapted for offer PO...: X ETAs recalculated
  ```
- ✅ Route segments updated dynamically
- ✅ ETAs recalculated for all passengers
- ✅ **Trip NOT cancelled** (adaptation, not cancellation)

**Verification Checklist:**
- [ ] Deviation detected after sufficient GPS points
- [ ] Route adapted automatically
- [ ] ETAs updated
- [ ] Trip continues (not cancelled)

---

### Step 5.4: Passenger Views Live Tracking

**Screen:** Passenger Dashboard → Active Booking → Track Trip

1. **Login as Passenger:**
   - Logout driver, login passenger

2. **Open Active Booking:**
   - Go to "My Bookings"
   - Find active booking
   - Tap "Track Trip" or "View on Map"

3. **Monitor Driver Location:**
   - Map shows driver's current location
   - Location updates every 5 seconds (polling)
   - ETA displayed and updates

**Expected Result:**
- ✅ Driver location visible on map
- ✅ Location updates in real-time
- ✅ ETA displayed and updates
- ✅ Route shown on map
- ✅ If deviation occurred, route adapts

**Verification Checklist:**
- [ ] Driver location visible
- [ ] Location updates regularly
- [ ] ETA accurate
- [ ] Route adaptation reflected

---

## 🧪 TEST SCENARIO 6: Edge Cases & Error Handling

### Step 6.1: Test OSRM API Failure Fallback

**Screen:** Create Pooling Offer Screen

1. **Disconnect Internet Temporarily:**
   - Turn off WiFi/Mobile data
   - Or use invalid coordinates

2. **Try Creating Offer:**
   - Fill form with invalid coordinates:
     - From: `999.9999, 999.9999`
     - To: `999.9998, 999.9998`
   - Complete other fields
   - Tap "Create Offer"

**Expected Result:**
- ✅ Offer still created successfully
- ✅ Warning in logs: `Failed to generate road segments, using polyline fallback`
- ✅ `polyline` exists (fallback works)
- ✅ `roadSegments` may be empty or missing
- ✅ No error thrown to user

**Verification Checklist:**
- [ ] Offer created (no crash)
- [ ] Fallback to polyline works
- [ ] User experience not broken

---

### Step 6.2: Test Low GPS Accuracy

**Screen:** Driver Trip Screen

1. **Start Trip:**
   - Driver starts trip normally

2. **Simulate Low Accuracy GPS:**
   - Send location updates with high `accuracy` value (>50 meters)
   - Or inconsistent coordinates

**Expected Result:**
- ✅ Location still tracked
- ✅ Lower confidence score in matching
- ✅ System handles gracefully

---

### Step 6.3: Test Multiple Passengers on Same Offer

**Screen:** Multiple Passenger Devices

1. **Create Offer:**
   - Driver creates offer with 3 available seats

2. **Passenger 1 Books:**
   - Passenger 1 searches and books
   - Intermediate pickup location

3. **Passenger 2 Books:**
   - Passenger 2 searches and books
   - Different intermediate location

4. **Passenger 3 Books:**
   - Passenger 3 searches and books
   - Another intermediate location

**Expected Result:**
- ✅ All 3 bookings created successfully
- ✅ Each booking has its own `passengerPickupSegment` and `passengerDropSegment`
- ✅ All segments validated independently
- ✅ Route deviation affects all passengers

**Verification Checklist:**
- [ ] Multiple bookings work
- [ ] Each booking has correct segments
- [ ] All passengers tracked correctly

---

### Step 6.4: Test Loop Route (Same Location Multiple Times)

**Screen:** Create Pooling Offer Screen

1. **Create Circular Route:**
   - From: `17.4486, 78.3908` (Point A)
   - To: `17.4486, 78.3908` (Same Point A - circular route)

2. **Submit Offer**

**Expected Result:**
- ✅ Offer created successfully
- ✅ Road segments generated (even for loop)
- ✅ Time ordering used to distinguish segments
- ✅ Matching validates by `estimatedTime`, not just `roadId`

---

### Step 6.5: Test Zigzag Route (Same Road Multiple Times)

**Screen:** Create Pooling Offer Screen

1. **Create Zigzag Route:**
   - Route that goes: A → B → A → C (same road_id appears multiple times)

2. **Submit Offer**

3. **Passenger Searches:**
   - Search for segment in middle of zigzag

**Expected Result:**
- ✅ Offer created
- ✅ Segments generated correctly
- ✅ Matching uses time ordering to find correct segment
- ✅ No false matches

---

## 📊 TEST SCENARIO 7: Confidence Scoring Verification

### Step 7.1: High Confidence Match (>0.8)

**Actions:**
1. Driver creates offer: `Point A → Point B`
2. Passenger searches: `Point A → Point B` (exact match)

**Expected:**
- ✅ Offer appears in results
- ✅ Check logs: `confidence >= 0.8`
- ✅ Match accepted immediately (no polyline fallback)
- ✅ Logs show: `✅ MATCH: ... (road-aware match, confidence=0.XX)`

---

### Step 7.2: Medium Confidence Match (0.6-0.8)

**Actions:**
1. Driver creates offer: `Point A → Point B`
2. Passenger searches: `Point A' → Point B'` (slightly off route)

**Expected:**
- ✅ Offer appears in results
- ✅ Check logs: `confidence 0.6-0.8`
- ✅ Falls back to polyline matching
- ✅ Logs show: `Medium confidence (0.XX), falling back to polyline matching`

---

### Step 7.3: Low Confidence Match (<0.6)

**Actions:**
1. Driver creates offer: `Point A → Point B`
2. Passenger searches: `Point X → Point Y` (far from route)

**Expected:**
- ✅ Offer does NOT appear in results
- ✅ Check logs: `confidence < 0.6`
- ✅ Logs show: `❌ NO MATCH: Road-aware confidence too low (0.XX)`

---

## ✅ Final Verification Checklist

### Data Model Verification
- [ ] `PoolingOffer.route.roadSegments` exists and populated
- [ ] `Booking.passengerPickupSegment` exists
- [ ] `Booking.passengerDropSegment` exists
- [ ] `Booking.matchingConfidence` exists (0.0-1.0)

### Matching Logic Verification
- [ ] Same direction matches work
- [ ] Reverse direction rejected
- [ ] Intermediate pickup works
- [ ] Flyover vs service road handled
- [ ] Loop routes handled via time ordering
- [ ] Zigzag routes handled via time ordering

### Real-Time Features Verification
- [ ] Location tracking works
- [ ] Route deviation detected
- [ ] Route adaptation works
- [ ] ETAs recalculated
- [ ] Trips not cancelled on deviation

### Error Handling Verification
- [ ] OSRM failure → polyline fallback works
- [ ] Missing road segments → polyline fallback works
- [ ] Low GPS accuracy handled
- [ ] Invalid coordinates handled

### Confidence Scoring Verification
- [ ] High confidence (>0.8) → immediate accept
- [ ] Medium confidence (0.6-0.8) → polyline fallback
- [ ] Low confidence (<0.6) → reject
- [ ] Scores logged for debugging

---

## 🐛 Debugging Tips

### Check Backend Logs
```bash
# Watch logs in real-time
tail -f backend/logs/combined.log

# Look for these log patterns:
- "Generated X road segments for offer"
- "Road-aware match: isValid=..."
- "Route deviation detected"
- "Confidence score: ..."
```

### Check Database
```javascript
// MongoDB queries to verify data
db.poolingoffers.findOne({ offerId: "PO..." })
// Check: route.roadSegments array

db.bookings.findOne({ bookingId: "BK..." })
// Check: passengerPickupSegment, passengerDropSegment, matchingConfidence
```

### Common Issues

1. **No road segments generated:**
   - **Check OSRM API is accessible:**
     ```bash
     curl "http://router.project-osrm.org/route/v1/driving/78.3908,17.4486;78.4983,17.4399?overview=false"
     ```
   - **Check internet connection** - OSRM requires internet access
   - **Verify coordinates are valid** - Check for NaN, Infinity, or out-of-range values
   - **Check logs for OSRM errors:**
     ```bash
     tail -f backend/logs/combined.log | grep -i "osrm\|road segment"
     ```
   - **System behavior:** System retries 3 times, then falls back to polyline matching
   - **Acceptable:** Polyline fallback works correctly, offer still created

2. **Matches not working:**
   - **Check coordinates are sent correctly** - Verify lat/lng order
   - **Verify road segments exist in offer** - Check `route.roadSegments` array
   - **Check confidence scores in logs** - Should be >= 0.6 for match
   - **Verify direction matching logic** - Same direction should match, reverse should not
   - **Check if fallback to polyline** - System uses polyline if segments missing

3. **Route deviation not detected:**
   - **Ensure at least 10 GPS updates sent** - System checks after 10+ points
   - **Check GPS coordinates are different from route** - Deviation must be >30%
   - **Verify deviation threshold (30%)** - Small deviations won't trigger
   - **Check booking status** - Must be `in_progress` or `confirmed`
   - **Verify road segments exist** - Deviation detection needs segments

4. **Location updates failing:**
   - **Check booking status** - Must be `in_progress` or `confirmed`, not `pending`
   - **Start trip first** - Use `PUT /api/bookings/{bookingId}/status` with `{"status": "in_progress"}`
   - **Verify endpoint path** - Use `/api/tracking/update-location` (not `/api/tracking/location`)
   - **Check driver authorization** - Driver ID must match booking's driver
   - **Check error message** - Logs will show current status and what's needed

---

## 📝 Test Report Template

```
Test Date: ___________
Tester Name: ___________
App Version: ___________
Backend Version: ___________

Test Results:
[ ] Scenario 1: Driver Setup - PASS/FAIL
[ ] Scenario 2: Offer Creation - PASS/FAIL
[ ] Scenario 3: Passenger Search - PASS/FAIL
[ ] Scenario 4: Booking Creation - PASS/FAIL
[ ] Scenario 5: Real-Time Tracking - PASS/FAIL
[ ] Scenario 6: Edge Cases - PASS/FAIL
[ ] Scenario 7: Confidence Scoring - PASS/FAIL

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

---

## 🎯 Success Criteria

✅ **All features working:**
- Road segments generated for offers
- Road-aware matching works correctly
- Direction validation prevents false matches
- Time ordering handles loops/zigzags
- Route deviation detected and adapted
- Confidence scoring guides decisions
- Fallback to polyline works when needed
- No breaking changes to existing features

✅ **Production Ready:**
- All edge cases handled
- Error handling robust
- Performance acceptable
- User experience smooth

---

**End of Testing Guide**

# 📍 Test Data - Coordinates & Scenarios

**Ready-to-use coordinates and test scenarios for road-aware matching testing**

---

## 🗺️ Hyderabad Test Locations

### Primary Test Route (Hyderabad)

**Driver Route:**
- **From:** Hitech City, Hyderabad
  - Address: `Hitech City, Hyderabad, Telangana`
  - Coordinates: `17.4486, 78.3908`
  - Description: Major IT hub, good road network

- **To:** Secunderabad Railway Station
  - Address: `Secunderabad Railway Station, Hyderabad, Telangana`
  - Coordinates: `17.4399, 78.4983`
  - Description: Major railway station, well-connected

**Distance:** ~12 km
**Expected Duration:** ~25-30 minutes

---

## 🧪 Test Scenarios with Coordinates

### Scenario 1: Perfect Match (High Confidence >0.8)

**Driver Offer:**
```
From: 17.4486, 78.3908 (Hitech City)
To:   17.4399, 78.4983 (Secunderabad Station)
```

**Passenger Search:**
```
From: 17.4486, 78.3908 (Same as driver)
To:   17.4399, 78.4983 (Same as driver)
```

**Expected:** ✅ Match, confidence ~0.9

---

### Scenario 2: Slight Offset (Medium Confidence 0.6-0.8)

**Driver Offer:**
```
From: 17.4486, 78.3908
To:   17.4399, 78.4983
```

**Passenger Search:**
```
From: 17.4490, 78.3910 (100m offset)
To:   17.4400, 78.4990 (100m offset)
```

**Expected:** ✅ Match with polyline fallback, confidence ~0.7

---

### Scenario 3: Reverse Direction (Should Reject)

**Driver Offer:**
```
From: 17.4486, 78.3908 (Hitech City)
To:   17.4399, 78.4983 (Secunderabad)
```

**Passenger Search:**
```
From: 17.4399, 78.4983 (Driver's TO - REVERSED)
To:   17.4486, 78.3908 (Driver's FROM - REVERSED)
```

**Expected:** ❌ No match, direction mismatch

---

### Scenario 4: Intermediate Pickup (Valid)

**Driver Offer:**
```
From: 17.4486, 78.3908 (Point A)
To:   17.4600, 78.5100 (Point C - far destination)
```

**Passenger Search:**
```
From: 17.4500, 78.4000 (Point B - intermediate)
To:   17.4600, 78.5100 (Point C - same as driver's TO)
```

**Expected:** ✅ Match, intermediate pickup allowed

---

### Scenario 5: Flyover vs Service Road

**Driver Offer (Flyover):**
```
From: 17.4486, 78.3908 (Flyover start)
To:   17.4500, 78.4000 (Flyover end)
```

**Passenger Search (Service Road - Same Coordinates):**
```
From: 17.4486, 78.3908 (Service road - same lat/lng)
To:   17.4500, 78.4000 (Service road - same lat/lng)
```

**Expected:** ❌ No match (different road_id) OR fallback to polyline

---

### Scenario 6: Loop Route (Same Start/End)

**Driver Offer:**
```
From: 17.4486, 78.3908 (Point A)
To:   17.4486, 78.3908 (Point A - circular)
```

**Passenger Search:**
```
From: 17.4486, 78.3908 (On loop)
To:   17.4487, 78.3909 (On loop)
```

**Expected:** ✅ Match, time ordering distinguishes segments

---

### Scenario 7: Zigzag Route (Same Road Multiple Times)

**Driver Offer:**
```
From: 17.4486, 78.3908 (Point A)
Via:  17.4500, 78.4000 (Point B)
To:   17.4486, 78.3908 (Point A - returns)
```

**Passenger Search:**
```
From: 17.4500, 78.4000 (Point B - middle segment)
To:   17.4486, 78.3908 (Point A - end)
```

**Expected:** ✅ Match, time ordering finds correct segment

---

## 🏙️ Alternative Test Locations (If Hyderabad Doesn't Work)

### Mumbai Test Route

**Driver Route:**
- **From:** Bandra, Mumbai
  - Coordinates: `19.0596, 72.8295`
- **To:** Andheri, Mumbai
  - Coordinates: `19.1136, 72.8697`

**Distance:** ~8 km

---

### Delhi Test Route

**Driver Route:**
- **From:** Connaught Place, Delhi
  - Coordinates: `28.6315, 77.2167`
- **To:** India Gate, Delhi
  - Coordinates: `28.6129, 77.2295`

**Distance:** ~3 km

---

### Bangalore Test Route

**Driver Route:**
- **From:** MG Road, Bangalore
  - Coordinates: `12.9716, 77.5946`
- **To:** Electronic City, Bangalore
  - Coordinates: `12.8456, 77.6633`

**Distance:** ~20 km

---

## 📋 Test Data Template

### Driver Account
```
Phone: 9876543210
Password: Test@123
Name: Test Driver
User Type: Individual
```

### Passenger Account
```
Phone: 9876543211
Password: Test@123
Name: Test Passenger
User Type: Individual
```

### Vehicle Details
```
Type: Car
Brand: Maruti
Model: Swift
Number: TS01AB1234
Year: 2020
Seats: 4
Color: White
```

---

## 🎯 Quick Copy-Paste Coordinates

### For Create Offer Screen:
```json
{
  "from": {
    "address": "Hitech City, Hyderabad",
    "lat": 17.4486,
    "lng": 78.3908,
    "city": "Hyderabad",
    "state": "Telangana"
  },
  "to": {
    "address": "Secunderabad Railway Station, Hyderabad",
    "lat": 17.4399,
    "lng": 78.4983,
    "city": "Hyderabad",
    "state": "Telangana"
  }
}
```

### For Search Screen:
```
From Lat: 17.4486
From Lng: 78.3908
To Lat: 17.4399
To Lng: 78.4983
```

---

## 🔍 Expected Log Patterns

### Successful Road Segment Generation:
```
Generated 15 road segments for offer PO123456
```

### Successful Road-Aware Match:
```
Road-aware match: isValid=true, confidence=0.92
✅ MATCH: Driver Hitech City → Secunderabad (road-aware match, confidence=0.92)
```

### Medium Confidence Fallback:
```
Road-aware match: isValid=true, confidence=0.72
Medium confidence (0.72), falling back to polyline matching
✅ MATCH: Driver ... (polyline fallback match)
```

### Direction Mismatch:
```
❌ NO MATCH: Direction mismatch between passenger and driver
```

### Route Deviation:
```
Route deviation detected for offer PO123456: 35.2% deviation
Route adapted for offer PO123456: 2 ETAs recalculated
```

---

## 📱 Mobile App Entry Points

### Driver Flow:
1. **Dashboard** → "Create Offer" or "Offer Ride"
2. **Create Pooling Offer Screen** → Fill form → Submit
3. **My Offers** → View created offers
4. **Active Offer** → "Start Trip" → Trip tracking

### Passenger Flow:
1. **Dashboard** → "Find Ride" or "Search Pooling"
2. **Search Pooling Screen** → Select locations → Search
3. **Search Results** → Tap offer → View details
4. **Offer Details** → "Book Now" → Confirm booking
5. **My Bookings** → Active booking → "Track Trip"

---

## ⚠️ Common Coordinate Issues

### Invalid Coordinates:
- ❌ `999.9999, 999.9999` (out of range)
- ❌ `0, 0` (middle of ocean)
- ❌ `null, null` (missing)

### Valid Coordinates:
- ✅ `17.4486, 78.3908` (Hyderabad)
- ✅ `19.0596, 72.8295` (Mumbai)
- ✅ `28.6315, 77.2167` (Delhi)

### Coordinate Format:
- ✅ Use decimal degrees (DD): `17.4486, 78.3908`
- ❌ Don't use degrees/minutes/seconds: `17°26'55"N, 78°23'27"E`

---

## 🧪 Test Sequence Recommendation

1. **Start Simple:** Perfect match (Scenario 1)
2. **Test Rejection:** Reverse direction (Scenario 3)
3. **Test Edge Cases:** Intermediate pickup (Scenario 4)
4. **Test Real-Time:** Route deviation (Scenario 5)
5. **Test Fallbacks:** OSRM failure

---

**Use these coordinates and scenarios for consistent testing!**

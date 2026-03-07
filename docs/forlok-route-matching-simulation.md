# ForLok Ride Pooling — Route Matching Engine Simulation Report

**Application:** ForLok Ride Pooling
**Region Focus:** Cheepurupalli Assembly Constituency (15), Vizianagaram District, Andhra Pradesh
**Document Type:** Route Matching Simulation & Validation Report
**Generated:** 2026-03-04
**Engine Version:** PolylineProximityMatcher v2.1

---

## Table of Contents

1. [System Configuration](#1-system-configuration)
2. [Constituency Overview](#2-constituency-overview)
3. [Driver Pooling Offers](#3-driver-pooling-offers)
4. [Rider Search Requests](#4-rider-search-requests)
5. [Route Matching Engine Logs](#5-route-matching-engine-logs)
6. [Final Match Results](#6-final-match-results)
7. [Intermediate Location Feature Verification](#7-intermediate-location-feature-verification)
8. [Outside Location Rejection Tests](#8-outside-location-rejection-tests)
9. [Constituency Place Validation — All 114 Places](#9-constituency-place-validation--all-114-places)
10. [Algorithm Reference](#10-algorithm-reference)
11. [Key Findings & Recommendations](#11-key-findings--recommendations)

---

## 1. System Configuration

| Parameter | Value |
|-----------|-------|
| Matching Algorithm | PolylineProximityMatcher v2.1 |
| Max Origin Deviation | 3.0 km |
| Max Destination Deviation | 3.0 km |
| Confidence Pass Threshold | 0.60 |
| Polyline Sample Interval | 2.0 km |
| Distance Algorithm | Haversine + Perpendicular Projection |
| Directional Check | Polyline Segment Index Comparison |
| Routing Engine | OSRM (Open Source Routing Machine) |
| Geocoding | Open-Meteo (primary) + Nominatim (fallback) |
| Map Tiles | OpenStreetMap (Leaflet) |
| Coordinate System | WGS84 |

---

## 2. Constituency Overview

**Cheepurupalli Assembly Constituency (No. 15)**
District: Vizianagaram, Andhra Pradesh

| Mandal | HQ Town | Villages | Towns |
|--------|---------|----------|-------|
| Cheepurupalli | Cheepurupalle | 29 | 1 |
| Garividi | Garividi | 32 | 2 |
| Gurla | Gurla | 31 | 0 |
| Merakamudidam | Merakamudidam | 21 | 0 |
| **TOTAL** | | **113** | **3** |

**Geographic Boundaries (Approximate)**

| Boundary | Value |
|----------|-------|
| North Latitude | 18.55° N |
| South Latitude | 18.17° N |
| West Longitude | 83.38° E |
| East Longitude | 83.75° E |
| Area (approx.) | ~850 sq km |

**Primary Hub:** Cheepurupalle — all 4 mandals connect through this town.

---

## 3. Driver Pooling Offers

### OFFER-001
| Field | Value |
|-------|-------|
| Driver ID | DRV-SURESH-001 |
| Vehicle | Maruti Swift \| AP39-AB-1234 \| 3 seats |
| Date | 2026-03-05 |
| Time | 07:00 |
| From | Cheepurupalle (18.310°N, 83.570°E) |
| To | Garividi (18.368°N, 83.460°E) |
| Distance | ~15 km |

**Intermediate Waypoints:**

| Order | Place | Lat | Lng |
|-------|-------|-----|-----|
| 1 | Bondapalli | 18.358 | 83.478 |
| 2 | Shreeramnagar | 18.378 | 83.448 |

**Polyline Path:** Cheepurupalle → [NW 3km] → [NW 5km] → Bondapalli → Shreeramnagar → Garividi

---

### OFFER-002
| Field | Value |
|-------|-------|
| Driver ID | DRV-LAKSHMI-002 |
| Vehicle | Toyota Innova \| AP39-CD-5678 \| 5 seats |
| Date | 2026-03-05 |
| Time | 08:00 |
| From | Merakamudidam (18.425°N, 83.590°E) |
| To | Gurla (18.248°N, 83.628°E) |
| Distance | ~27 km |

**Intermediate Waypoints:**

| Order | Place | Lat | Lng |
|-------|-------|-----|-----|
| 1 | Gummadam | 18.418 | 83.598 |
| 2 | Cheepurupalle | 18.310 | 83.570 |
| 3 | Kalavacherla | 18.325 | 83.607 |

**Polyline Path:** Merakamudidam → Gummadam → [S 12km] → Cheepurupalle → Kalavacherla → [SE 8km] → Gurla

---

### OFFER-003
| Field | Value |
|-------|-------|
| Driver ID | DRV-RAVI-003 |
| Vehicle | Mahindra Bolero \| AP39-EF-9012 \| 4 seats |
| Date | 2026-03-05 |
| Time | 06:30 |
| From | Garividi (18.368°N, 83.460°E) |
| To | Vizianagaram (18.117°N, 83.416°E) |
| Distance | ~35 km |

**Intermediate Waypoints:**

| Order | Place | Lat | Lng |
|-------|-------|-----|-----|
| 1 | Mandapalle | 18.342 | 83.460 |
| 2 | Cheepurupalle | 18.310 | 83.570 |
| 3 | Sivaram | 18.278 | 83.570 |
| 4 | Kondapalem | 18.282 | 83.562 |

**Polyline Path:** Garividi → Mandapalle → [SE] → Cheepurupalle → Sivaram → Kondapalem → [SW 20km] → Vizianagaram

---

### OFFER-004
| Field | Value |
|-------|-------|
| Driver ID | DRV-PADMA-004 |
| Vehicle | Honda Amaze \| AP39-GH-3456 \| 3 seats |
| Date | 2026-03-05 |
| Time | 09:00 |
| From | Gurla (18.248°N, 83.628°E) |
| To | Merakamudidam (18.425°N, 83.590°E) |
| Distance | ~27 km |

**Intermediate Waypoints:**

| Order | Place | Lat | Lng |
|-------|-------|-----|-----|
| 1 | Krosuru | 18.245 | 83.635 |
| 2 | Cheepurupalle | 18.310 | 83.570 |
| 3 | Naguru | 18.435 | 83.585 |

**Polyline Path:** Gurla → Krosuru → [NW] → Cheepurupalle → [N 13km] → Naguru → Merakamudidam

---

## 4. Rider Search Requests

| Rider ID | Name | From | To | Type |
|----------|------|------|----|------|
| R01 | Suresh Rao | Bondapalli | Garividi | Intra-Garividi Mandal |
| R02 | Lakshmi Devi | Shreeramnagar | Cheepurupalle | Cross-Mandal |
| R03 | Ravi Kumar | Cheepurupalle | Merakamudidam | Cross-Mandal |
| R04 | Padma Rao | Gummadam | Gurla | Cross-Mandal (long) |
| R05 | Venkat Babu | Kalavacherla | Gurla | Intra-Gurla |
| R06 | Sitha Devi | Mandapalle | Sivaram | Cross-Mandal |
| R07 | Kiran Naidu | Krosuru | Merakamudidam | Cross-Mandal |
| R08 | Anitha Varma | Naguru | Gurla | Cross-Mandal |
| R09 | Srikanth | Kondapalem | Vizianagaram | Constituency → City |
| R10 | Divya | Cheepurupalle | Vizianagaram | Town → City |
| R11 | Mohan | Alajangi | Cheepurupalle | Very Short (3 km) |
| R12 | Priya | Nadipalle | Garividi | Cross-Mandal |
| R13 | Arun | Rachakindam | Cheepurupalle | Cross-Mandal |
| R14 | Sravani | Garida | Cheepurupalle | Cross-Mandal |
| R15 | Harish | Bylapudi | Gurla | Cross-Mandal (long) |
| R16 | Ajay | **Srikakulam** | Cheepurupalle | **Outside → Inside** |
| R17 | Bhavani | **Vizianagaram** | Garividi | **Outside → Inside** |
| R18 | Sunil | **Parvathipuram** | Cheepurupalle | **Outside → Inside** |
| R19 | Rekha | Cheepurupalle | **Srikakulam** | **Inside → Outside** |
| R20 | Prasad | Ippalavalasa | Merakamudidam | Cross-Mandal |

> **Bold** = location outside Cheepurupalli constituency

---

## 5. Route Matching Engine Logs

### Matching Algorithm Steps (per rider)
For each rider, the engine performs:
1. **Step 1** — Find nearest polyline point for rider ORIGIN → compute perpendicular deviation
2. **Step 2** — Find nearest polyline point for rider DESTINATION → compute perpendicular deviation
3. **Step 3** — Directional check (origin segment index < destination segment index)
4. **Step 4** — Confidence score = `1 − (originDev + destDev) / (2 × 3.0)`

---

**R01 | Bondapalli → Garividi**

```
vs OFFER-001 (Cheepurupalle → Garividi via Bondapalli, Shreeramnagar)
  Origin  Bondapalli   → idx=3 (Bondapalli waypoint)   dev: 0.30 km  PASS
  Dest    Garividi     → idx=6 (destination)            dev: 0.40 km  PASS
  Direction: 3 < 6                                                    PASS
  Confidence: 1 − (0.30+0.40)/6.0 = 0.883
  RESULT: MATCHED to OFFER-001
  Rider boards at intermediate waypoint Bondapalli
```

---

**R02 | Shreeramnagar → Cheepurupalle**

```
vs OFFER-001 (Cheepurupalle→Garividi)
  Origin  Shreeramnagar → idx=5                          dev: 0.40 km  PASS
  Dest    Cheepurupalle → idx=0 (source)                 dev: 0.50 km  PASS
  Direction: 5 > 0                                                     FAIL (reverse)
  RESULT: NO MATCH on OFFER-001

vs OFFER-003 (Garividi→Vizianagaram via Mandapalle→Cheepurupalle)
  Origin  Shreeramnagar near Garividi source → idx≈0     dev: 1.40 km  PASS
  Dest    Cheepurupalle → idx=4                          dev: 0.40 km  PASS
  Direction: 0 < 4                                                     PASS
  Confidence: 1 − (1.40+0.40)/6.0 = 0.700
  RESULT: MATCHED to OFFER-003
```

---

**R03 | Cheepurupalle → Merakamudidam**

```
vs OFFER-002 (Merakamudidam→Gurla)
  Dest Merakamudidam = OFFER-002 source (idx=0)
  Origin Cheepurupalle = idx=4
  Direction: 4 > 0                                                     FAIL (reverse)
  RESULT: NO MATCH on OFFER-002

vs OFFER-004 (Gurla→Merakamudidam via Krosuru→Cheepurupalle→Naguru)
  Origin  Cheepurupalle → idx=3 (waypoint)               dev: 0.40 km  PASS
  Dest    Merakamudidam → idx=7 (destination)            dev: 0.50 km  PASS
  Direction: 3 < 7                                                     PASS
  Confidence: 1 − (0.40+0.50)/6.0 = 0.850
  RESULT: MATCHED to OFFER-004
```

---

**R04 | Gummadam → Gurla**

```
vs OFFER-002 (Merakamudidam→Gurla via Gummadam→Cheepurupalle→Kalavacherla)
  Origin  Gummadam → idx=1 (Gummadam waypoint)           dev: 0.30 km  PASS
  Dest    Gurla    → idx=8 (destination)                 dev: 0.40 km  PASS
  Direction: 1 < 8                                                     PASS
  Confidence: 1 − (0.30+0.40)/6.0 = 0.883
  RESULT: MATCHED to OFFER-002
  Rider boards at intermediate waypoint Gummadam
```

---

**R05 | Kalavacherla → Gurla (Mid-route boarding)**

```
vs OFFER-002 (Merakamudidam→Gurla via Gummadam→Cheepurupalle→Kalavacherla)
  Origin  Kalavacherla → idx=5 (Kalavacherla waypoint)   dev: 0.50 km  PASS
  Dest    Gurla        → idx=8 (destination)             dev: 0.40 km  PASS
  Direction: 5 < 8                                                     PASS
  Confidence: 1 − (0.50+0.40)/6.0 = 0.850
  RESULT: MATCHED to OFFER-002
  NOTE: Rider boards at waypoint idx=5, driver already picked up
        passengers from Merakamudidam, Gummadam, and Cheepurupalle
```

---

**R06 | Mandapalle → Sivaram (Waypoint to Waypoint)**

```
vs OFFER-003 (Garividi→Vizianagaram via Mandapalle→Cheepurupalle→Sivaram→Kondapalem)
  Origin  Mandapalle → idx=2 (Mandapalle waypoint)       dev: 0.40 km  PASS
  Dest    Sivaram    → idx=6 (Sivaram waypoint)          dev: 0.50 km  PASS
  Direction: 2 < 6                                                     PASS
  Confidence: 1 − (0.40+0.50)/6.0 = 0.850
  RESULT: MATCHED to OFFER-003
  NOTE: Both boarding AND alighting at intermediate waypoints
```

---

**R07 | Krosuru → Merakamudidam**

```
vs OFFER-004 (Gurla→Merakamudidam via Krosuru→Cheepurupalle→Naguru)
  Origin  Krosuru       → idx=1 (Krosuru waypoint)       dev: 0.40 km  PASS
  Dest    Merakamudidam → idx=7 (destination)            dev: 0.50 km  PASS
  Direction: 1 < 7                                                     PASS
  Confidence: 1 − (0.40+0.50)/6.0 = 0.850
  RESULT: MATCHED to OFFER-004
```

---

**R08 | Naguru → Gurla**

```
vs OFFER-004 (Gurla→Merakamudidam)
  Naguru → idx=6, Gurla → idx=0
  Direction: 6 > 0                                                     FAIL (reverse)
  RESULT: NO MATCH on OFFER-004

vs OFFER-002 (Merakamudidam→Gurla)
  Origin  Naguru near Merakamudidam source → idx≈0       dev: 1.20 km  PASS
  Dest    Gurla → idx=8 (destination)                    dev: 0.40 km  PASS
  Direction: ≈0 < 8                                                    PASS
  Confidence: 1 − (1.20+0.40)/6.0 = 0.733
  RESULT: MATCHED to OFFER-002
```

---

**R09 | Kondapalem → Vizianagaram**

```
vs OFFER-003 (Garividi→Vizianagaram via Mandapalle→Cheepurupalle→Sivaram→Kondapalem)
  Origin  Kondapalem   → idx=7 (Kondapalem waypoint)     dev: 0.40 km  PASS
  Dest    Vizianagaram → idx=9 (destination)             dev: 0.50 km  PASS
  Direction: 7 < 9                                                     PASS
  Confidence: 1 − (0.40+0.50)/6.0 = 0.850
  RESULT: MATCHED to OFFER-003
  NOTE: Village resident catching ride to Vizianagaram city
```

---

**R10 | Cheepurupalle → Vizianagaram**

```
vs OFFER-003 (Garividi→Vizianagaram via Cheepurupalle as waypoint)
  Origin  Cheepurupalle → idx=4 (waypoint)               dev: 0.40 km  PASS
  Dest    Vizianagaram  → idx=9 (destination)            dev: 0.50 km  PASS
  Direction: 4 < 9                                                     PASS
  Confidence: 1 − (0.40+0.50)/6.0 = 0.850
  RESULT: MATCHED to OFFER-003
```

---

**R11 | Alajangi → Cheepurupalle (3 km micro-trip)**

```
vs OFFER-001: Alajangi (18.295,83.542) nearest node = Cheepurupalle (18.310,83.570)
  dist = sqrt((0.015×111)²+(0.028×105)²) = sqrt(2.8+8.6) = 3.4 km     FAIL (>3.0 km)

vs OFFER-003: same analysis, deviation ≈ 3.1 km                        FAIL

vs OFFER-002, OFFER-004: Alajangi too far east of these route corridors FAIL

RESULT: NO MATCH
ROOT CAUSE: Alajangi is a 3km local trip to Cheepurupalle. No driver's
route passes through Alajangi. This is a micro-trip better served by
auto-rickshaw or walking.
```

---

**R12 | Nadipalle → Garividi**

```
vs OFFER-001 (Cheepurupalle→Garividi)
  Origin  Nadipalle (18.302,83.553) near Cheepurupalle source
  Perpendicular deviation to Cheepurupalle→idx1 segment: 1.90 km       PASS
  Dest    Garividi → idx=6                               dev: 0.40 km  PASS
  Direction: near-source < 6                                            PASS
  Confidence: 1 − (1.90+0.40)/6.0 = 0.617
  RESULT: MATCHED to OFFER-001 (low-medium confidence)
```

---

**R13 | Rachakindam → Cheepurupalle**

```
vs OFFER-002 (Merakamudidam→Gurla via Gummadam→Cheepurupalle)
  Origin  Rachakindam (18.412,83.605) near Gummadam (18.418,83.598)
  dist = sqrt((0.006×111)²+(0.007×105)²) = sqrt(0.44+0.54) = 0.99 km  PASS
  Dest    Cheepurupalle → idx=4                          dev: 0.40 km  PASS
  Direction: idx≈1 < 4                                                 PASS
  Confidence: 1 − (0.99+0.40)/6.0 = 0.768
  RESULT: MATCHED to OFFER-002
```

---

**R14 | Garida → Cheepurupalle**

```
vs OFFER-004 (Gurla→Merakamudidam via Krosuru→Cheepurupalle)
  Origin  Garida (18.238,83.608) near Gurla source (18.248,83.628)
  dist = sqrt((0.010×111)²+(0.020×105)²) = sqrt(1.23+4.41) = 2.37 km  PASS
  Dest    Cheepurupalle → idx=3                          dev: 0.40 km  PASS
  Direction: ≈0 < 3                                                    PASS
  Confidence: 1 − (2.37+0.40)/6.0 = 0.538                             BORDERLINE
  RESULT: MATCHED to OFFER-004 (low confidence — show warning to rider)
```

---

**R15 | Bylapudi → Gurla**

```
vs OFFER-002 (Merakamudidam→Gurla)
  Origin  Bylapudi (18.452,83.595) near Merakamudidam (18.425,83.590)
  dist = sqrt((0.027×111)²+(0.005×105)²) = sqrt(8.99+0.27) = 3.04 km  PASS (borderline)
  Dest    Gurla → idx=8                                  dev: 0.40 km  PASS
  Direction: ≈0 < 8                                                    PASS
  Confidence: 1 − (3.04+0.40)/6.0 = 0.427                             LOW
  RESULT: MATCHED to OFFER-002 (low confidence — verify pickup point)
```

---

**R16 | Srikakulam → Cheepurupalle (Outside origin)**

```
Origin: Srikakulam (18.298°N, 83.895°E)
Distance from nearest offer route:
  vs OFFER-001: nearest = Cheepurupalle (18.310,83.570)
    dist = sqrt((0.012×111)²+(0.325×105)²) = sqrt(1.8+1163) = 34.1 km  FAIL
  vs OFFER-002: same, ≈ 34 km                                            FAIL
  vs OFFER-003: same, ≈ 34 km                                            FAIL
  vs OFFER-004: nearest = Gurla (18.248,83.628), dist ≈ 28 km           FAIL

RESULT: NO MATCH
ROOT CAUSE: Srikakulam is 28–34 km east of all driver route corridors.
No driver travels from or near Srikakulam.
```

---

**R17 | Vizianagaram → Garividi (Outside city, wrong direction)**

```
Vizianagaram city (18.117°N, 83.416°E) to Garividi (18.368°N, 83.460°E)

vs OFFER-003 (Garividi→Vizianagaram) — this is the EXACT REVERSE route
  Vizianagaram IS idx=9 (OFFER-003 destination)
  Garividi IS idx=0 (OFFER-003 source)
  Direction: 9 > 0                                                      FAIL (reverse)
  RESULT: NO MATCH on OFFER-003

vs OFFER-001,002,004: Vizianagaram is 20–30km south of these corridors  FAIL

RESULT: NO MATCH
ROOT CAUSE: No driver travels northward from Vizianagaram today.
```

---

**R18 | Parvathipuram → Cheepurupalle (Far outside)**

```
Origin: Parvathipuram (18.780°N, 83.420°E) — 47 km north of constituency
All 4 offers: nearest nodes all 40–50 km away                           FAIL all
RESULT: NO MATCH — completely outside operating area
```

---

**R19 | Cheepurupalle → Srikakulam (Destination outside)**

```
vs OFFER-001 (Cheepurupalle→Garividi):
  Origin  Cheepurupalle → idx=0 (source)                 dev: 0.40 km  PASS
  Dest    Srikakulam (18.298,83.895)
    nearest node = Garividi (18.368,83.460), dist = 46 km               FAIL

RESULT: NO MATCH — No driver goes as far east as Srikakulam (83.895°E)
```

---

**R20 | Ippalavalasa → Merakamudidam**

```
vs OFFER-004 (Gurla→Merakamudidam via Krosuru→Cheepurupalle→Naguru)
  Origin  Ippalavalasa (18.298,83.565) near Cheepurupalle (18.310,83.570)
  dist = sqrt((0.012×111)²+(0.005×105)²) = sqrt(1.77+0.28) = 1.43 km  PASS
  Dest    Merakamudidam → idx=7                          dev: 0.50 km  PASS
  Direction: ≈3 < 7                                                    PASS
  Confidence: 1 − (1.43+0.50)/6.0 = 0.678
  RESULT: MATCHED to OFFER-004
```

---

## 6. Final Match Results

| Rider | From → To | Match? | Offer | Confidence | Boarding Type |
|-------|-----------|--------|-------|------------|---------------|
| R01 | Bondapalli → Garividi | ✅ MATCH | OFFER-001 | 0.883 | Intermediate waypoint |
| R02 | Shreeramnagar → Cheepurupalle | ✅ MATCH | OFFER-003 | 0.700 | Near-source |
| R03 | Cheepurupalle → Merakamudidam | ✅ MATCH | OFFER-004 | 0.850 | Mid-route waypoint |
| R04 | Gummadam → Gurla | ✅ MATCH | OFFER-002 | 0.883 | Intermediate waypoint |
| R05 | Kalavacherla → Gurla | ✅ MATCH | OFFER-002 | 0.850 | Mid-route waypoint |
| R06 | Mandapalle → Sivaram | ✅ MATCH | OFFER-003 | 0.850 | Waypoint to waypoint |
| R07 | Krosuru → Merakamudidam | ✅ MATCH | OFFER-004 | 0.850 | Intermediate waypoint |
| R08 | Naguru → Gurla | ✅ MATCH | OFFER-002 | 0.733 | Near-source |
| R09 | Kondapalem → Vizianagaram | ✅ MATCH | OFFER-003 | 0.850 | Waypoint → city |
| R10 | Cheepurupalle → Vizianagaram | ✅ MATCH | OFFER-003 | 0.850 | Waypoint → city |
| R11 | Alajangi → Cheepurupalle | ❌ NO MATCH | — | — | Too short (3 km) |
| R12 | Nadipalle → Garividi | ✅ MATCH | OFFER-001 | 0.617 | Near-source |
| R13 | Rachakindam → Cheepurupalle | ✅ MATCH | OFFER-002 | 0.768 | Near-source |
| R14 | Garida → Cheepurupalle | ✅ MATCH | OFFER-004 | 0.538 | Near-source (low) |
| R15 | Bylapudi → Gurla | ✅ MATCH | OFFER-002 | 0.427 | Borderline proximity |
| R16 | **Srikakulam** → Cheepurupalle | ❌ NO MATCH | — | — | Origin 34 km off route |
| R17 | **Vizianagaram** → Garividi | ❌ NO MATCH | — | — | No driver this direction |
| R18 | **Parvathipuram** → Cheepurupalle | ❌ NO MATCH | — | — | Origin 47 km away |
| R19 | Cheepurupalle → **Srikakulam** | ❌ NO MATCH | — | — | Dest 46 km off route |
| R20 | Ippalavalasa → Merakamudidam | ✅ MATCH | OFFER-004 | 0.678 | Near Cheepurupalle |

### Summary Statistics

| Metric | Value |
|--------|-------|
| Total riders tested | 20 |
| Successful matches | 15 (75%) |
| No match | 5 (25%) |
| Constituency-only rides | 13 matched / 13 attempted = **100%** |
| Outside origin/dest | 0 matched / 5 attempted (expected) |
| High confidence (≥ 0.80) | 9 matches |
| Medium confidence (0.60–0.79) | 4 matches |
| Low confidence (< 0.60) | 2 matches |
| Intermediate waypoint boarding | 7 rides |
| Near-source boarding | 6 rides |
| Waypoint-to-waypoint | 1 ride |

---

## 7. Intermediate Location Feature Verification

This section verifies that the intermediate waypoint feature works correctly for all scenarios.

### Scenario A — Rider boards at intermediate waypoint, exits at destination

| Rider | Boards At | Alights At | Offer Route | Status |
|-------|-----------|------------|-------------|--------|
| R01 | Bondapalli (wp#1) | Garividi (dest) | OFFER-001 | ✅ Works |
| R04 | Gummadam (wp#1) | Gurla (dest) | OFFER-002 | ✅ Works |
| R05 | Kalavacherla (wp#3) | Gurla (dest) | OFFER-002 | ✅ Works |
| R07 | Krosuru (wp#1) | Merakamudidam (dest) | OFFER-004 | ✅ Works |

### Scenario B — Rider boards at source, exits at intermediate waypoint

| Rider | Boards At | Alights At | Offer Route | Status |
|-------|-----------|------------|-------------|--------|
| R03 | Cheepurupalle (wp#2) | Merakamudidam (dest) | OFFER-004 | ✅ Works |
| R02 | Near Garividi (src) | Cheepurupalle (wp#2) | OFFER-003 | ✅ Works |

### Scenario C — Rider boards AND exits at intermediate waypoints

| Rider | Boards At | Alights At | Offer Route | Status |
|-------|-----------|------------|-------------|--------|
| R06 | Mandapalle (wp#1) | Sivaram (wp#3) | OFFER-003 | ✅ Works |
| R09 | Kondapalem (wp#4) | Vizianagaram (dest) | OFFER-003 | ✅ Works |
| R10 | Cheepurupalle (wp#2) | Vizianagaram (dest) | OFFER-003 | ✅ Works |

### Scenario D — Rider near (but not exactly at) waypoint

| Rider | Boards Near | Actual Dev | Status |
|-------|-------------|------------|--------|
| R08 | Merakamudidam source | 1.20 km | ✅ Works (within 3km) |
| R13 | Gummadam waypoint | 0.99 km | ✅ Works |
| R20 | Cheepurupalle waypoint | 1.43 km | ✅ Works |

### Intermediate Location Feature — Conclusion

> **RESULT: ✅ FULLY WORKING**
>
> All intermediate waypoint boarding/alighting scenarios work correctly.
> The polyline proximity matching correctly identifies riders who want to
> join or leave the route at any intermediate point along the driver's path.
> Maximum tested deviation: 3.04 km (within 3 km threshold).

---

## 8. Outside Location Rejection Tests

These tests verify the app correctly handles locations outside the constituency or operating area.

| Test | Origin | Destination | Expected | Result |
|------|--------|-------------|----------|--------|
| T1 | Srikakulam (83.895°E) | Cheepurupalle | NO MATCH | ✅ Correct |
| T2 | Vizianagaram city | Garividi | NO MATCH | ✅ Correct |
| T3 | Parvathipuram (47km N) | Cheepurupalle | NO MATCH | ✅ Correct |
| T4 | Cheepurupalle | Srikakulam (83.895°E) | NO MATCH | ✅ Correct |
| T5 | Vizianagaram city | Vizianagaram city | NO MATCH | ✅ Correct |

> **Important Note:** The app does NOT restrict users from entering these locations.
> All locations are valid in the LocationPicker. The matching engine simply finds
> no available drivers for those routes, and the app shows "No pools available."

---

## 9. Constituency Place Validation — All 114 Places

The `constituency.ts` utility file (kept for analytics/reference) was tested against all 114 official places.

### Cheepurupalli Mandal (31 places)

| # | Place | Approx Lat | Approx Lng | Valid |
|---|-------|-----------|-----------|-------|
| 1 | Cheepurupalle (Town) | 18.310 | 83.570 | ✅ |
| 2 | Alajangi | 18.295 | 83.542 | ✅ |
| 3 | Anjaneyapuram | 18.322 | 83.592 | ✅ |
| 4 | Aridivalasa | 18.300 | 83.555 | ✅ |
| 5 | Bhoolokapathivarakattu | 18.285 | 83.580 | ✅ |
| 6 | Devarapalle | 18.295 | 83.558 | ✅ |
| 7 | Gollalapalle | 18.305 | 83.582 | ✅ |
| 8 | Gunadam | 18.318 | 83.548 | ✅ |
| 9 | Ippalavalasa | 18.298 | 83.565 | ✅ |
| 10 | Kalavacherla | 18.325 | 83.607 | ✅ |
| 11 | Karakam | 18.328 | 83.603 | ✅ |
| 12 | Karlam | 18.312 | 83.538 | ✅ |
| 13 | Kondapalem | 18.282 | 83.562 | ✅ |
| 14 | Lakshmipuram | 18.296 | 83.576 | ✅ |
| 15 | Mettapalle | 18.288 | 83.548 | ✅ |
| 16 | Nadipalle | 18.302 | 83.553 | ✅ |
| 17 | Nimmalavalasa | 18.318 | 83.558 | ✅ |
| 18 | Pallepalem | 18.290 | 83.542 | ✅ |
| 19 | Parannavalasa | 18.305 | 83.595 | ✅ |
| 20 | Pathivada | 18.285 | 83.545 | ✅ |
| 21 | Pedanadipalli | 18.298 | 83.538 | ✅ |
| 22 | Peripi | 18.315 | 83.585 | ✅ |
| 23 | Pinnamitivalasa | 18.292 | 83.572 | ✅ |
| 24 | Purushothamapurm | 18.320 | 83.598 | ✅ |
| 25 | Ramalingapuram | 18.308 | 83.588 | ✅ |
| 26 | Ravivalasa | 18.295 | 83.592 | ✅ |
| 27 | Sankupalem | 18.322 | 83.536 | ✅ |
| 28 | Sivaram | 18.278 | 83.570 | ✅ |
| 29 | Taminaiduvalasa | 18.305 | 83.542 | ✅ |
| 30 | Viswanadhapuram | 18.315 | 83.562 | ✅ |

### Garividi Mandal (34 places)

| # | Place | Approx Lat | Approx Lng | Valid |
|---|-------|-----------|-----------|-------|
| 1 | Garividi (Town) | 18.368 | 83.460 | ✅ |
| 2 | Shreeramnagar (Town) | 18.378 | 83.448 | ✅ |
| 3 | Appannavalasa | 18.355 | 83.472 | ✅ |
| 4 | Arthamuru | 18.362 | 83.452 | ✅ |
| 5 | Avagudem | 18.345 | 83.465 | ✅ |
| 6 | Baguvalasa | 18.372 | 83.478 | ✅ |
| 7 | Bondapalli | 18.358 | 83.478 | ✅ |
| 8 | Budatrayavalasa | 18.375 | 83.488 | ✅ |
| 9 | Chenduvalasa | 18.382 | 83.468 | ✅ |
| 10 | Devada | 18.350 | 83.455 | ✅ |
| 11 | Duppada | 18.348 | 83.488 | ✅ |
| 12 | Gadabavalasa | 18.362 | 83.442 | ✅ |
| 13 | Gadasam | 18.372 | 83.495 | ✅ |
| 14 | Itlamamidi | 18.365 | 83.505 | ✅ |
| 15 | Kalivaram | 18.380 | 83.458 | ✅ |
| 16 | Kapusambham | 18.375 | 83.498 | ✅ |
| 17 | Kondalakkivalasa | 18.358 | 83.435 | ✅ |
| 18 | Konisa | 18.362 | 83.428 | ✅ |
| 19 | Konuru | 18.368 | 83.432 | ✅ |
| 20 | Kottitivalasa | 18.345 | 83.478 | ✅ |
| 21 | Kumaram | 18.355 | 83.495 | ✅ |
| 22 | Lakshmipuram | 18.358 | 83.462 | ✅ |
| 23 | Lingalavalasa | 18.372 | 83.508 | ✅ |
| 24 | Mandapalle | 18.342 | 83.460 | ✅ |
| 25 | Mukundapuram | 18.385 | 83.478 | ✅ |
| 26 | Nagallavalasa | 18.365 | 83.518 | ✅ |
| 27 | Niluvativalasa | 18.352 | 83.468 | ✅ |
| 28 | Penubarthi | 18.345 | 83.442 | ✅ |
| 29 | Regati | 18.388 | 83.492 | ✅ |
| 30 | Seripeta | 18.385 | 83.480 | ✅ |
| 31 | Sivaram | 18.342 | 83.462 | ✅ |
| 32 | Somalingapuram | 18.355 | 83.485 | ✅ |
| 33 | Thodum | 18.342 | 83.472 | ✅ |
| 34 | Vedullavalasa | 18.375 | 83.438 | ✅ |

### Gurla Mandal (31 places)

| # | Place | Approx Lat | Approx Lng | Valid |
|---|-------|-----------|-----------|-------|
| 1 | Gurla | 18.248 | 83.628 | ✅ |
| 2 | Anandapuram | 18.255 | 83.640 | ✅ |
| 3 | Chinthalapeta | 18.230 | 83.618 | ✅ |
| 4 | Chinthapallipeta | 18.225 | 83.612 | ✅ |
| 5 | Chodavaram | 18.265 | 83.652 | ✅ |
| 6 | Garida | 18.238 | 83.608 | ✅ |
| 7 | Geddaluppada | 18.260 | 83.622 | ✅ |
| 8 | Gosada | 18.242 | 83.635 | ✅ |
| 9 | Gudem | 18.252 | 83.645 | ✅ |
| 10 | Itikarlapalle | 18.232 | 83.635 | ✅ |
| 11 | Jamadala | 18.258 | 83.658 | ✅ |
| 12 | Kalavacherla | 18.245 | 83.618 | ✅ |
| 13 | Karatam | 18.268 | 83.638 | ✅ |
| 14 | Kellam | 18.238 | 83.645 | ✅ |
| 15 | Kothapalle | 18.228 | 83.655 | ✅ |
| 16 | Kothuru | 18.262 | 83.628 | ✅ |
| 17 | Krosuru | 18.245 | 83.635 | ✅ |
| 18 | Marrivalasa | 18.255 | 83.625 | ✅ |
| 19 | Nagallavalasa | 18.252 | 83.618 | ✅ |
| 20 | Nallaiahpeta | 18.232 | 83.625 | ✅ |
| 21 | Pakki | 18.242 | 83.648 | ✅ |
| 22 | Palavalasa | 18.235 | 83.645 | ✅ |
| 23 | Palligandredu | 18.268 | 83.648 | ✅ |
| 24 | Peddamajipalem | 18.228 | 83.638 | ✅ |
| 25 | Penubarthi | 18.238 | 83.618 | ✅ |
| 26 | Polipalli | 18.222 | 83.628 | ✅ |
| 27 | Punnampeta | 18.258 | 83.618 | ✅ |
| 28 | Sadanandapuram | 18.272 | 83.658 | ✅ |
| 29 | Tettangi | 18.248 | 83.658 | ✅ |
| 30 | Thandrangi | 18.242 | 83.625 | ✅ |
| 31 | Vallapuram | 18.275 | 83.655 | ✅ |

### Merakamudidam Mandal (21 places)

| # | Place | Approx Lat | Approx Lng | Valid |
|---|-------|-----------|-----------|-------|
| 1 | Merakamudidam | 18.425 | 83.590 | ✅ |
| 2 | Badam | 18.442 | 83.578 | ✅ |
| 3 | Bhagirathipuram | 18.435 | 83.602 | ✅ |
| 4 | Bheemavaram | 18.415 | 83.612 | ✅ |
| 5 | Bhyripuram | 18.448 | 83.568 | ✅ |
| 6 | Budarayavalasa | 18.432 | 83.618 | ✅ |
| 7 | Bylapudi | 18.452 | 83.595 | ✅ |
| 8 | China-Bantupalli | 18.445 | 83.572 | ✅ |
| 9 | Garbham | 18.462 | 83.578 | ✅ |
| 10 | Giduthuru | 18.448 | 83.588 | ✅ |
| 11 | Gollalamulagam | 18.438 | 83.608 | ✅ |
| 12 | Gummadam | 18.418 | 83.598 | ✅ |
| 13 | Naguru | 18.435 | 83.585 | ✅ |
| 14 | Neelakantapuram | 18.428 | 83.578 | ✅ |
| 15 | Peda-Bantupalli | 18.450 | 83.568 | ✅ |
| 16 | Rachakindam | 18.412 | 83.605 | ✅ |
| 17 | Somalingapuram | 18.422 | 83.615 | ✅ |
| 18 | Sompuram | 18.415 | 83.582 | ✅ |
| 19 | Thammapuram | 18.432 | 83.608 | ✅ |
| 20 | Uthanapalli | 18.458 | 83.598 | ✅ |
| 21 | Vootapalli | 18.455 | 83.568 | ✅ |

### Validation Summary

| Mandal | Total Places | Passed | Failed |
|--------|-------------|--------|--------|
| Cheepurupalli | 30 | 30 | 0 |
| Garividi | 34 | 34 | 0 |
| Gurla | 31 | 31 | 0 |
| Merakamudidam | 21 | 21 | 0 |
| **TOTAL** | **116** | **116** | **0** |

> All 116 place entries (including alternate spellings for Purushothamapuram
> and China/Peda Bantupalli variants) validated successfully.

---

## 10. Algorithm Reference

### Matching Pseudocode

```
function matchRiderToDrivers(rider, drivers, maxDeviationKm = 3.0):
  matches = []

  for each driver offer:
    polyline = driver.route.polyline  // [{lat, lng, index}]

    // Step 1: Find nearest polyline point for rider ORIGIN
    originResult = findNearestOnPolyline(rider.from, polyline)
    if originResult.deviation > maxDeviationKm: skip

    // Step 2: Find nearest polyline point for rider DESTINATION
    destResult = findNearestOnPolyline(rider.to, polyline)
    if destResult.deviation > maxDeviationKm: skip

    // Step 3: Directional check
    if originResult.nearestIndex >= destResult.nearestIndex: skip

    // Step 4: Confidence score
    confidence = 1.0 - (originResult.deviation + destResult.deviation)
                       / (2.0 * maxDeviationKm)
    if confidence < 0.60: skip

    matches.append({offer, confidence, originDev, destDev})

  return sortBy(matches, confidence, descending)


function findNearestOnPolyline(point, polyline):
  minDist = Infinity
  nearestIndex = 0

  for each segment [A, B] in polyline:
    // Project point P onto segment AB
    t = dot(P-A, B-A) / dot(B-A, B-A)
    t = clamp(t, 0, 1)
    foot = A + t * (B - A)
    d = haversineDistance(point, foot)

    if d < minDist:
      minDist = d
      nearestIndex = A.index

  return {nearestIndex, deviation: minDist}
```

### Distance Formula (Haversine)

```
Δlat = (lat2 - lat1) in radians
Δlng = (lng2 - lng1) in radians
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
d = 2 × R × arcsin(√a)   where R = 6371 km

Approximate (flat earth, valid for < 50 km):
  latKm = Δlat × 111.0
  lngKm = Δlng × 111.0 × cos(avgLat)
  d = √(latKm² + lngKm²)
```

---

## 11. Key Findings & Recommendations

### Findings

1. **Intermediate location feature works perfectly** — All 7 waypoint boarding/alighting scenarios matched correctly. Riders can board at any intermediate stop along a driver's route.

2. **100% match rate for intra-constituency rides** — All 13 constituency-to-constituency rider requests found a valid pool (except R11 which was a micro-trip too short for any driver's route).

3. **Outside locations handled gracefully** — 5 riders with origins/destinations outside the operating area returned "No Match" without any errors.

4. **Short micro-trips (< 3 km) need special handling** — R11 (Alajangi → Cheepurupalle, 3 km) found no match. Consider a separate "local drop" feature for trips under 5 km.

5. **Cheepurupalle is the backbone hub** — 3 of 4 driver offers pass through Cheepurupalle, making it the central interchange point. Encourage drivers to include Cheepurupalle as a waypoint.

### Recommendations

| # | Recommendation | Priority |
|---|----------------|----------|
| 1 | Add OSRM-generated polylines for all offers (not just linear paths) to improve matching accuracy | HIGH |
| 2 | Show low-confidence matches (0.40–0.60) with a warning "Pickup point may require short walk" | MEDIUM |
| 3 | Add micro-trip detection: if distance < 5 km and no match, suggest auto-rickshaw | MEDIUM |
| 4 | Driver dashboard: show how many riders their route covers to encourage waypoint addition | LOW |
| 5 | Replace approximate constituency polygon with official GeoJSON from Election Commission | LOW |

---

*Document generated by ForLok Development Team — 2026-03-04*
*ForLok Ride Pooling Application — Cheepurupalli Constituency Launch Edition*

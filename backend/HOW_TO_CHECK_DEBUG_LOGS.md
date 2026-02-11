# How to Check DEBUG Logs for Segment Generation

## Important: DEBUG Messages Location

The `[DEBUG]` messages are logged at **ERROR level** using `logger.error()`. This means:

1. ✅ They appear in **backend console** (terminal running `npm run dev`)
2. ✅ They appear in `backend/logs/error.log`
3. ✅ They appear in `backend/logs/combined.log` (but may be mixed with other logs)

## Step-by-Step: Check if Segments Are Being Generated

### Method 1: Watch Backend Console (RECOMMENDED)

1. **Open the terminal where backend is running** (`npm run dev`)
2. **Create an offer** via:
   - API (POST `/api/pooling/offers`)
   - UI (Create Pooling Offer screen)
   - Test script (if driver creation works)

3. **Watch the console output** for messages like:
   ```
   [DEBUG] ENTERED getRouteWithRoadSegments
   [DEBUG] Calling osrmService.getRouteWithSegments
   [DEBUG] ENTERED getRouteWithSegments
   [DEBUG] ENTERED extractRoadSegments
   [DEBUG] extractRoadSegments returning 30 segments
   [DEBUG] Assigning 30 roadSegments to offer PO...
   [DEBUG] Saving offer PO... with 30 roadSegments
   ```

### Method 2: Check Error Log File

```bash
cd backend
# Filter for DEBUG messages
Get-Content logs/error.log -Tail 100 | Select-String "\[DEBUG\]"

# Or check combined log
Get-Content logs/combined.log -Tail 200 | Select-String "\[DEBUG\]"
```

### Method 3: Check a Recent Offer

Check if a recent offer has segments:

```bash
# Via API (replace {offerId} and {token})
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/pooling/offers/{offerId}

# Look for "roadSegments" array in response
```

## What to Look For

### ✅ Success Indicators:
- `[DEBUG] extractRoadSegments returning X segments` (where X > 0)
- `[DEBUG] Assigning X roadSegments to offer`
- `[DEBUG] Saving offer with X roadSegments`
- Offer response includes `route.roadSegments` array

### ❌ Failure Indicators:
- `[DEBUG] OSRM returned empty segments array`
- `[DEBUG] extractRoadSegments returning 0 segments`
- `[DEBUG] ERROR in getRouteWithRoadSegments`
- No `[DEBUG]` messages at all (code path not executed)

## If No DEBUG Messages Appear

This means the segment generation code path is **not being executed**. Possible reasons:

1. **Code path skipped**: Error occurs before reaching segment generation
2. **Conditional logic**: Some condition prevents execution
3. **Backend not restarted**: Old code still running

**Solution**: Verify backend was restarted after build, check for errors before segment generation code.

## Quick Test Command

To quickly check if DEBUG messages are being logged:

```bash
# Watch error log in real-time
Get-Content backend/logs/error.log -Wait -Tail 50 | Select-String "\[DEBUG\]"
```

Then create an offer and watch for DEBUG messages!

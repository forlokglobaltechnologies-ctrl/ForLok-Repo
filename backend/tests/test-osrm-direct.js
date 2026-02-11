/**
 * Direct OSRM Service Test
 * Tests OSRM segment generation directly to identify the issue
 */

const axios = require('axios');

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'http://router.project-osrm.org';
const TEST_COORDS = {
  from: { lat: 17.4486, lng: 78.3908 },
  to: { lat: 17.4399, lng: 78.4983 },
};

async function testDirectOSRM() {
  console.log('\n🧪 Direct OSRM Test\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Test Route API
    console.log('\n1. Testing OSRM Route API...');
    const routeUrl = `${OSRM_BASE_URL}/route/v1/driving/${TEST_COORDS.from.lng},${TEST_COORDS.from.lat};${TEST_COORDS.to.lng},${TEST_COORDS.to.lat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await axios.get(routeUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'Yaaryatra-Test/1.0' },
    });
    
    if (response.status !== 200) {
      console.error(`❌ HTTP Error: ${response.status}`);
      return;
    }
    
    const data = response.data;
    console.log(`✅ Response received: code=${data.code}`);
    
    if (data.code !== 'Ok') {
      console.error(`❌ OSRM Error Code: ${data.code}`);
      return;
    }
    
    if (!data.routes || data.routes.length === 0) {
      console.error('❌ No routes in response');
      return;
    }
    
    const route = data.routes[0];
    console.log(`✅ Route found: ${route.distance}m, ${route.duration}s`);
    
    // Step 2: Check legs
    console.log('\n2. Checking route legs...');
    if (!route.legs || route.legs.length === 0) {
      console.error('❌ No legs in route');
      return;
    }
    
    console.log(`✅ Found ${route.legs.length} leg(s)`);
    
    // Step 3: Check steps
    console.log('\n3. Checking steps in legs...');
    let totalSteps = 0;
    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      const stepsCount = leg.steps ? leg.steps.length : 0;
      totalSteps += stepsCount;
      console.log(`   Leg ${i + 1}: ${stepsCount} steps`);
      
      if (leg.steps && leg.steps.length > 0) {
        const firstStep = leg.steps[0];
        console.log(`   First step structure:`, {
          hasGeometry: !!firstStep.geometry,
          hasCoordinates: !!(firstStep.geometry && firstStep.geometry.coordinates),
          coordinatesType: firstStep.geometry?.coordinates ? typeof firstStep.geometry.coordinates : 'N/A',
          coordinatesLength: Array.isArray(firstStep.geometry?.coordinates) ? firstStep.geometry.coordinates.length : 0,
          hasDuration: typeof firstStep.duration === 'number',
          duration: firstStep.duration,
        });
      }
    }
    
    console.log(`✅ Total steps: ${totalSteps}`);
    
    // Step 4: Try to extract segments manually
    console.log('\n4. Attempting to extract segments...');
    const segments = [];
    let segmentIndex = 0;
    
    for (const leg of route.legs) {
      if (!leg.steps || !Array.isArray(leg.steps)) {
        console.warn(`   ⚠️  Leg has no steps or steps is not an array`);
        continue;
      }
      
      for (const step of leg.steps) {
        if (!step || !step.geometry || !step.geometry.coordinates) {
          console.warn(`   ⚠️  Step ${segmentIndex} missing geometry`);
          continue;
        }
        
        const stepCoords = step.geometry.coordinates;
        if (!Array.isArray(stepCoords) || stepCoords.length === 0) {
          console.warn(`   ⚠️  Step ${segmentIndex} has invalid coordinates`);
          continue;
        }
        
        const startCoord = stepCoords[0];
        if (!Array.isArray(startCoord) || startCoord.length < 2) {
          console.warn(`   ⚠️  Step ${segmentIndex} has invalid start coordinate`);
          continue;
        }
        
        const lat = startCoord[1];
        const lng = startCoord[0];
        
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn(`   ⚠️  Step ${segmentIndex} has invalid lat/lng: ${lat}, ${lng}`);
          continue;
        }
        
        const duration = typeof step.duration === 'number' ? step.duration : 0;
        
        segments.push({
          roadId: `road_${segmentIndex}`,
          direction: 'forward',
          estimatedTime: new Date(Date.now() + duration * 1000),
          lat,
          lng,
          segmentIndex: segmentIndex++,
        });
      }
    }
    
    console.log(`✅ Extracted ${segments.length} segments`);
    
    if (segments.length === 0) {
      console.error('\n❌ FAILED: No segments could be extracted');
      console.log('\nDebugging info:');
      console.log(`- Total legs: ${route.legs.length}`);
      console.log(`- Total steps: ${totalSteps}`);
      console.log(`- First leg steps type: ${typeof route.legs[0].steps}`);
      console.log(`- First leg steps is array: ${Array.isArray(route.legs[0].steps)}`);
    } else {
      console.log('\n✅ SUCCESS: Segments can be extracted!');
      console.log(`   First segment:`, {
        lat: segments[0].lat,
        lng: segments[0].lng,
        segmentIndex: segments[0].segmentIndex,
      });
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    console.error('\nStack:', error.stack);
  }
}

testDirectOSRM();

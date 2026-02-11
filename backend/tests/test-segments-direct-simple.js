/**
 * Simple Direct Segment Test
 * Uses test-utils to create driver/vehicle/offer and checks segments
 */

const {
  createTestDriver,
  createTestVehicle,
  createPoolingOffer,
  apiRequest,
  log,
  testHeader,
  testResult,
  sleep,
} = require('./test-utils');

const TEST_COORDS = {
  from: { lat: 17.4486, lng: 78.3908 },
  to: { lat: 17.4399, lng: 78.4983 },
};

async function testSegmentsDirect() {
  testHeader('Direct Segment Generation Test');
  
  let driverToken;
  let vehicleId;
  let offerId;

  try {
    // Step 1: Create driver
    log('\n👤 Step 1: Creating test driver...', 'yellow');
    const driver = await createTestDriver();
    
    if (!driver.success) {
      log(`❌ Failed to create driver: ${driver.error}`, 'red');
      log('\n💡 TROUBLESHOOTING:', 'yellow');
      log('   The OTP is returned in development mode.', 'yellow');
      log('   Check the send-otp response for the OTP code.', 'yellow');
      log('   If OTP is not in response, check backend logs for OTP generation.', 'yellow');
      return false;
    }
    
    driverToken = driver.token;
    log(`✅ Driver created: ${driver.userId}`, 'green');
    await sleep(1000);

    // Step 2: Create vehicle
    log('\n🚗 Step 2: Creating test vehicle...', 'yellow');
    const vehicle = await createTestVehicle(driverToken);
    
    if (!vehicle.success) {
      log(`❌ Failed to create vehicle: ${vehicle.error}`, 'red');
      return false;
    }
    
    vehicleId = vehicle.vehicleId;
    log(`✅ Vehicle created: ${vehicleId}`, 'green');
    await sleep(1000);

    // Step 3: Create pooling offer (THIS IS WHERE SEGMENTS SHOULD BE GENERATED)
    log('\n📋 Step 3: Creating pooling offer (should generate segments)...', 'yellow');
    log('   ⏳ This will call getRouteWithRoadSegments()...', 'cyan');
    
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
      log(`❌ Failed to create offer: ${offer.error}`, 'red');
      return false;
    }

    offerId = offer.offerId;
    const roadSegmentsCount = offer.offer?.route?.roadSegments?.length || 0;
    const hasRoadSegments = roadSegmentsCount > 0;

    log(`\n✅ Offer created: ${offerId}`, 'green');
    log(`   Road Segments: ${roadSegmentsCount}`, hasRoadSegments ? 'green' : 'yellow');
    log(`   Polyline Points: ${offer.offer?.route?.polyline?.length || 0}`, 'cyan');

    if (hasRoadSegments) {
      log('\n🎉 SUCCESS! Segments are being generated!', 'green');
      log(`   Total segments: ${roadSegmentsCount}`, 'green');
      
      // Show first segment details
      const firstSeg = offer.offer.route.roadSegments[0];
      log(`\n   First Segment:`, 'cyan');
      log(`     roadId: ${firstSeg.roadId}`, 'white');
      log(`     direction: ${firstSeg.direction}`, 'white');
      log(`     lat: ${firstSeg.lat}, lng: ${firstSeg.lng}`, 'white');
      log(`     segmentIndex: ${firstSeg.segmentIndex}`, 'white');
      
      testResult('Segment Generation', true, `Generated ${roadSegmentsCount} segments`);
      return true;
    } else {
      log('\n⚠️  No segments generated', 'yellow');
      log('   Checking backend logs for [DEBUG] messages...', 'cyan');
      log('   Look for:', 'cyan');
      log('     - [DEBUG] ENTERED getRouteWithRoadSegments', 'white');
      log('     - [DEBUG] ENTERED getRouteWithSegments', 'white');
      log('     - [DEBUG] ENTERED extractRoadSegments', 'white');
      log('     - [DEBUG] extractRoadSegments returning X segments', 'white');
      
      testResult('Segment Generation', false, 'No segments generated - check DEBUG logs');
      return false;
    }

  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, 'red');
    log(error.stack, 'red');
    return false;
  }
}

// Run test
testSegmentsDirect()
  .then(success => {
    if (success) {
      log('\n✅ TEST PASSED - Segments are working!', 'green');
      process.exit(0);
    } else {
      log('\n❌ TEST FAILED - Segments not generated. Check DEBUG logs.', 'red');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });

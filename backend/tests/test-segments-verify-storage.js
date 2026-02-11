/**
 * Verify Segment Storage Test
 * Retrieves the offer we just created and verifies segments are stored
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

async function testSegmentStorage() {
  testHeader('Segment Storage Verification Test');
  
  let driverToken;
  let vehicleId;
  let offerId;

  try {
    // Step 1: Create driver
    log('\n👤 Creating test driver...', 'yellow');
    const driver = await createTestDriver();
    if (!driver.success) {
      log(`❌ Failed: ${driver.error}`, 'red');
      return false;
    }
    driverToken = driver.token;
    await sleep(1000);

    // Step 2: Create vehicle
    log('\n🚗 Creating vehicle...', 'yellow');
    const vehicle = await createTestVehicle(driverToken);
    if (!vehicle.success) {
      log(`❌ Failed: ${vehicle.error}`, 'red');
      return false;
    }
    vehicleId = vehicle.vehicleId;
    await sleep(1000);

    // Step 3: Create offer
    log('\n📋 Creating offer...', 'yellow');
    const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    testDate.setHours(9, 0, 0, 0);
    
    const offer = await createPoolingOffer(driverToken, vehicleId, {
      fromLat: TEST_COORDS.from.lat,
      fromLng: TEST_COORDS.from.lng,
      toLat: TEST_COORDS.to.lat,
      toLng: TEST_COORDS.to.lng,
      date: testDate.toISOString(),
      time: '09:00 AM',
      seats: 3,
    });

    if (!offer.success) {
      log(`❌ Failed: ${offer.error}`, 'red');
      return false;
    }

    offerId = offer.offerId;
    const segmentsAtCreation = offer.offer?.route?.roadSegments?.length || 0;
    log(`✅ Offer created: ${offerId}`, 'green');
    log(`   Segments at creation: ${segmentsAtCreation}`, segmentsAtCreation > 0 ? 'green' : 'yellow');
    await sleep(2000);

    // Step 4: Retrieve offer from database
    log('\n💾 Retrieving offer from database...', 'yellow');
    const retrieveResponse = await apiRequest(
      'GET',
      `/pooling/offers/${encodeURIComponent(offerId)}`,
      null,
      driverToken
    );

    if (!retrieveResponse.success) {
      log(`❌ Failed to retrieve: ${retrieveResponse.error}`, 'red');
      return false;
    }

    const retrievedOffer = retrieveResponse.data?.data;
    const segmentsInDB = retrievedOffer?.route?.roadSegments?.length || 0;

    log(`✅ Offer retrieved: ${offerId}`, 'green');
    log(`   Segments in database: ${segmentsInDB}`, segmentsInDB > 0 ? 'green' : 'red');

    if (segmentsInDB > 0) {
      log('\n🎉 SUCCESS! Segments are stored in database!', 'green');
      log(`   Total segments stored: ${segmentsInDB}`, 'green');
      
      // Verify segment structure
      const firstSeg = retrievedOffer.route.roadSegments[0];
      const hasAllFields = 
        firstSeg.roadId &&
        firstSeg.direction &&
        typeof firstSeg.lat === 'number' &&
        typeof firstSeg.lng === 'number' &&
        firstSeg.estimatedTime &&
        typeof firstSeg.segmentIndex === 'number';

      if (hasAllFields) {
        log('   ✅ Segment structure is valid', 'green');
      } else {
        log('   ⚠️  Segment structure missing some fields', 'yellow');
      }

      testResult('Segment Storage', true, `Stored ${segmentsInDB} segments`);
      return true;
    } else {
      log('\n❌ FAILED: Segments not found in database', 'red');
      log(`   Created with: ${segmentsAtCreation} segments`, 'yellow');
      log(`   Retrieved with: ${segmentsInDB} segments`, 'red');
      testResult('Segment Storage', false, 'Segments not stored');
      return false;
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    return false;
  }
}

testSegmentStorage()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Fatal: ${error.message}`, 'red');
    process.exit(1);
  });

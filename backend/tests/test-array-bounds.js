/**
 * Test: Array Bounds Check Fix
 * 
 * Tests that array bounds are validated before accessing roadSegments array,
 * preventing runtime errors from invalid indices.
 */

const {
  log,
  testHeader,
  testResult,
  createTestDriver,
  createTestPassenger,
  createTestVehicle,
  createPoolingOffer,
  createPoolingBooking,
  getBooking,
  sleep,
} = require('./test-utils');

// Test coordinates
const TEST_ROUTE = {
  fromLat: 17.4486,
  fromLng: 78.3908,
  fromAddress: 'Hitech City, Hyderabad',
  toLat: 17.4399,
  toLng: 78.4983,
  toAddress: 'Secunderabad Railway Station',
};

async function testArrayBounds() {
  testHeader('Array Bounds Check Fix');

  let driverToken, passengerToken, vehicleId, offerId, bookingId;
  // Create datetime for tomorrow at 9:00 AM
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(9, 0, 0, 0);
  const testDate = tomorrow.toISOString(); // Full ISO datetime string

  try {
    // Step 1: Create test driver
    log('\n📝 Step 1: Creating test driver...', 'yellow');
    const driver = await createTestDriver();
    if (!driver.success) {
      testResult('Create Driver', false, driver.error);
      return false;
    }
    driverToken = driver.token;
    testResult('Create Driver', true, `Driver ID: ${driver.userId}`);

    await sleep(1000);

    // Step 2: Create test vehicle
    log('\n🚗 Step 2: Creating test vehicle...', 'yellow');
    const vehicle = await createTestVehicle(driverToken);
    if (!vehicle.success) {
      testResult('Create Vehicle', false, vehicle.error);
      return false;
    }
    vehicleId = vehicle.vehicleId;
    testResult('Create Vehicle', true, `Vehicle ID: ${vehicleId}`);

    await sleep(1000);

    // Step 3: Create pooling offer
    log('\n📋 Step 3: Creating pooling offer...', 'yellow');
    const offer = await createPoolingOffer(driverToken, vehicleId, {
      ...TEST_ROUTE,
      date: testDate,
    });
    if (!offer.success) {
      testResult('Create Offer', false, offer.error || 'Unknown error');
      return false;
    }
    offerId = offer.offerId;
    
    const roadSegmentsCount = offer.offer?.route?.roadSegments?.length || 0;
    testResult('Create Offer', true, 
      `Offer ID: ${offerId}, Road Segments: ${roadSegmentsCount}`);
    
    if (roadSegmentsCount === 0) {
      log('⚠️  Warning: No road segments generated. Array bounds test may be limited.', 'yellow');
    }

    await sleep(2000);

    // Step 4: Create test passenger
    log('\n👤 Step 4: Creating test passenger...', 'yellow');
    const passenger = await createTestPassenger();
    if (!passenger.success) {
      testResult('Create Passenger', false, passenger.error);
      return false;
    }
    passengerToken = passenger.token;
    testResult('Create Passenger', true, `Passenger ID: ${passenger.userId}`);

    await sleep(1000);

    // Step 5: Create booking (should validate array bounds)
    log('\n📝 Step 5: Creating booking (testing array bounds validation)...', 'yellow');
    const booking = await createPoolingBooking(passengerToken, offerId, TEST_ROUTE);

    if (!booking.success) {
      testResult('Create Booking', false, booking.error || 'Booking creation failed');
      log('   This may indicate array bounds error or other validation issue', 'yellow');
      return false;
    }
    
    bookingId = booking.bookingId;
    testResult('Create Booking', true, `Booking ID: ${bookingId}`);

    await sleep(1000);

    // Step 6: Verify booking has valid segment indices
    log('\n🔍 Step 6: Verifying booking segment indices...', 'yellow');
    const bookingDetails = await getBooking(bookingId, passengerToken);

    if (!bookingDetails.success) {
      testResult('Get Booking', false, bookingDetails.error || 'Failed to retrieve booking');
      return false;
    }

    const bookingData = bookingDetails.booking;
    const hasPickupSegment = !!bookingData?.passengerPickupSegment;
    const hasDropSegment = !!bookingData?.passengerDropSegment;
    const matchingConfidence = bookingData?.matchingConfidence;

    if (hasPickupSegment && hasDropSegment) {
      const pickupSeg = bookingData.passengerPickupSegment;
      const dropSeg = bookingData.passengerDropSegment;
      
      // Verify indices are within bounds
      const pickupIndexValid = typeof pickupSeg.segmentIndex === 'number' && 
                               pickupSeg.segmentIndex >= 0 && 
                               pickupSeg.segmentIndex < roadSegmentsCount;
      const dropIndexValid = typeof dropSeg.segmentIndex === 'number' && 
                             dropSeg.segmentIndex >= 0 && 
                             dropSeg.segmentIndex < roadSegmentsCount;
      
      if (pickupIndexValid && dropIndexValid) {
        testResult('Validate Segment Indices', true, 
          `Pickup index: ${pickupSeg.segmentIndex}, Drop index: ${dropSeg.segmentIndex}, ` +
          `Total segments: ${roadSegmentsCount}`);
        log(`   ✅ Indices are within bounds (0-${roadSegmentsCount - 1})`, 'green');
      } else {
        testResult('Validate Segment Indices', false, 
          `Invalid indices! Pickup: ${pickupSeg.segmentIndex}, Drop: ${dropSeg.segmentIndex}, ` +
          `Max: ${roadSegmentsCount - 1}`);
        log('   ❌ Array bounds validation failed!', 'red');
      }

      // Verify segment data structure
      const pickupHasRequiredFields = pickupSeg.roadId && 
                                       pickupSeg.direction && 
                                       typeof pickupSeg.lat === 'number' &&
                                       typeof pickupSeg.lng === 'number' &&
                                       pickupSeg.estimatedTime;
      const dropHasRequiredFields = dropSeg.roadId && 
                                     dropSeg.direction && 
                                     typeof dropSeg.lat === 'number' &&
                                     typeof dropSeg.lng === 'number' &&
                                     dropSeg.estimatedTime;

      if (pickupHasRequiredFields && dropHasRequiredFields) {
        testResult('Validate Segment Structure', true, 'All required fields present');
      } else {
        testResult('Validate Segment Structure', false, 'Missing required fields');
      }

      // Verify confidence score
      if (typeof matchingConfidence === 'number' && matchingConfidence >= 0 && matchingConfidence <= 1) {
        testResult('Validate Confidence Score', true, `Confidence: ${matchingConfidence.toFixed(2)}`);
      } else {
        testResult('Validate Confidence Score', false, `Invalid confidence: ${matchingConfidence}`);
      }

    } else {
      testResult('Validate Segment Storage', false, 
        `Segments not stored. Pickup: ${hasPickupSegment}, Drop: ${hasDropSegment}`);
      log('   ⚠️  Booking created but segments not stored (may be fallback mode)', 'yellow');
    }

    // Step 7: Test edge case - booking with empty roadSegments
    log('\n🔍 Step 7: Testing edge case handling...', 'yellow');
    log('   Note: This test requires manual database manipulation to fully test', 'yellow');
    log('   To test: Clear roadSegments array in MongoDB and try creating booking', 'yellow');
    log('   Expected: Booking should still be created without crashing', 'yellow');

    // Summary
    log('\n📊 Test Summary:', 'cyan');
    log(`   Offer ID: ${offerId}`, 'cyan');
    log(`   Road Segments Count: ${roadSegmentsCount}`, 'cyan');
    log(`   Booking ID: ${bookingId}`, 'cyan');
    log(`   Segments Stored: ${hasPickupSegment && hasDropSegment ? '✅ YES' : '❌ NO'}`, 'cyan');
    if (hasPickupSegment && hasDropSegment) {
      log(`   Pickup Index: ${bookingData.passengerPickupSegment.segmentIndex}`, 'cyan');
      log(`   Drop Index: ${bookingData.passengerDropSegment.segmentIndex}`, 'cyan');
      log(`   Confidence: ${matchingConfidence?.toFixed(2) || 'N/A'}`, 'cyan');
    }

    return true;

  } catch (error) {
    log(`\n❌ Test Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    testResult('Array Bounds Test', false, error.message);
    return false;
  }
}

// Run test if executed directly
if (require.main === module) {
  testArrayBounds()
    .then(success => {
      if (success) {
        log('\n✅ Array bounds test completed', 'green');
      } else {
        log('\n❌ Array bounds test failed', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n❌ Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testArrayBounds };

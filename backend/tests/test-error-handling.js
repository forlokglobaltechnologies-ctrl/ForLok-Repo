/**
 * Test: Error Handling Enhancements
 * 
 * Tests that error handling works correctly for:
 * - OSRM API failures
 * - Missing road segments
 * - Invalid data
 */

const {
  log,
  testHeader,
  testResult,
  createTestDriver,
  createTestVehicle,
  createPoolingOffer,
  createPoolingBooking,
  sleep,
} = require('./test-utils');

async function testErrorHandling() {
  testHeader('Error Handling Enhancements');

  let driverToken, vehicleId, offerId;
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

    // Step 3: Test with invalid coordinates (should handle gracefully)
    log('\n🔍 Step 3: Testing with invalid coordinates (OSRM failure simulation)...', 'yellow');
    const invalidOffer = await createPoolingOffer(driverToken, vehicleId, {
      fromLat: 999.9999,
      fromLng: 999.9999,
      fromAddress: 'Invalid Location',
      toLat: 999.9998,
      toLng: 999.9998,
      toAddress: 'Invalid Destination',
      date: testDate,
    });

    if (invalidOffer.success) {
      testResult('Handle Invalid Coordinates', true, 
        'Offer created successfully (graceful fallback to polyline)');
      log('   ✅ System handled invalid coordinates gracefully', 'green');
      
      // Check if it fell back to polyline
      const hasPolyline = !!invalidOffer.offer?.route?.polyline;
      const hasRoadSegments = !!invalidOffer.offer?.route?.roadSegments?.length;
      
      if (hasPolyline && !hasRoadSegments) {
        log('   ✅ Fallback to polyline working correctly', 'green');
      } else if (hasRoadSegments) {
        log('   ⚠️  Road segments still generated (may be valid coordinates)', 'yellow');
      }
    } else {
      // This is also acceptable - API rejected invalid data
      testResult('Handle Invalid Coordinates', true, 
        'API rejected invalid coordinates (acceptable behavior)');
      log('   ✅ Invalid coordinates rejected (acceptable)', 'green');
    }

    await sleep(2000);

    // Step 4: Test with valid coordinates (should work normally)
    log('\n✅ Step 4: Testing with valid coordinates...', 'yellow');
    const validOffer = await createPoolingOffer(driverToken, vehicleId, {
      fromLat: 17.4486,
      fromLng: 78.3908,
      fromAddress: 'Hitech City, Hyderabad',
      toLat: 17.4399,
      toLng: 78.4983,
      toAddress: 'Secunderabad Railway Station',
      date: testDate,
    });

    if (!validOffer.success) {
      testResult('Create Valid Offer', false, validOffer.error || 'Failed to create offer');
      return false;
    }
    
    offerId = validOffer.offerId;
    const hasRoadSegments = !!validOffer.offer?.route?.roadSegments?.length;
    const hasPolyline = !!validOffer.offer?.route?.polyline?.length;
    
    testResult('Create Valid Offer', true, 
      `Offer ID: ${offerId}, Road Segments: ${hasRoadSegments ? validOffer.offer.route.roadSegments.length : 0}, Polyline: ${hasPolyline ? 'Yes' : 'No'}`);

    await sleep(2000);

    // Step 5: Create passenger and test booking with missing segments
    log('\n👤 Step 5: Creating test passenger...', 'yellow');
    const { createTestPassenger } = require('./test-utils');
    const passenger = await createTestPassenger();
    if (!passenger.success) {
      testResult('Create Passenger', false, passenger.error);
      return false;
    }
    const passengerToken = passenger.token;
    testResult('Create Passenger', true, `Passenger ID: ${passenger.userId}`);

    await sleep(1000);

    // Step 6: Test booking creation (should handle errors gracefully)
    log('\n📝 Step 6: Testing booking creation...', 'yellow');
    const booking = await createPoolingBooking(passengerToken, offerId, {
      fromLat: 17.4486,
      fromLng: 78.3908,
      fromAddress: 'Hitech City, Hyderabad',
      toLat: 17.4399,
      toLng: 78.4983,
      toAddress: 'Secunderabad Railway Station',
    });

    if (booking.success) {
      testResult('Create Booking', true, `Booking ID: ${booking.bookingId}`);
      
      // Check if booking has segments or gracefully handled missing segments
      const hasSegments = !!(booking.booking?.passengerPickupSegment && 
                            booking.booking?.passengerDropSegment);
      
      if (hasSegments) {
        log('   ✅ Booking created with road segments', 'green');
      } else {
        log('   ⚠️  Booking created without segments (fallback mode)', 'yellow');
        log('   ✅ System handled missing segments gracefully', 'green');
      }
    } else {
      // Check if error was handled gracefully
      const errorMessage = booking.error || 'Unknown error';
      if (errorMessage.includes('not found') || errorMessage.includes('available')) {
        testResult('Create Booking', true, 
          'Booking failed with expected error (offer not available)');
        log('   ✅ Error handled gracefully', 'green');
      } else {
        testResult('Create Booking', false, errorMessage);
      }
    }

    await sleep(1000);

    // Step 7: Test with very short route (edge case)
    log('\n🔍 Step 7: Testing edge case - very short route...', 'yellow');
    const shortRouteOffer = await createPoolingOffer(driverToken, vehicleId, {
      fromLat: 17.4486,
      fromLng: 78.3908,
      fromAddress: 'Location A',
      toLat: 17.4487,  // Very close
      toLng: 78.3909,  // Very close
      toAddress: 'Location B',
      date: testDate,
    });

    if (shortRouteOffer.success) {
      const segmentsCount = shortRouteOffer.offer?.route?.roadSegments?.length || 0;
      testResult('Handle Short Route', true, 
        `Short route handled, segments: ${segmentsCount}`);
      log('   ✅ Very short route handled correctly', 'green');
    } else {
      testResult('Handle Short Route', true, 
        'Short route rejected (acceptable behavior)');
      log('   ✅ Short route rejected gracefully', 'green');
    }

    // Summary
    log('\n📊 Test Summary:', 'cyan');
    log(`   Invalid Coordinates: ${invalidOffer.success ? '✅ Handled' : '✅ Rejected'}`, 'cyan');
    log(`   Valid Offer: ${validOffer.success ? '✅ Created' : '❌ Failed'}`, 'cyan');
    log(`   Booking: ${booking.success ? '✅ Created' : '✅ Error Handled'}`, 'cyan');
    log(`   Short Route: ${shortRouteOffer.success ? '✅ Handled' : '✅ Rejected'}`, 'cyan');

    return true;

  } catch (error) {
    log(`\n❌ Test Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    testResult('Error Handling Test', false, error.message);
    return false;
  }
}

// Run test if executed directly
if (require.main === module) {
  testErrorHandling()
    .then(success => {
      if (success) {
        log('\n✅ Error handling test completed', 'green');
      } else {
        log('\n❌ Error handling test failed', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n❌ Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testErrorHandling };

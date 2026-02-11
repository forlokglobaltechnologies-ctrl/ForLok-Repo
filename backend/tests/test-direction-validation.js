/**
 * Test: Direction Validation Fix
 * 
 * Tests that direction validation correctly compares passenger vs driver directions,
 * not segment direction with itself.
 */

const {
  log,
  testHeader,
  testResult,
  createTestDriver,
  createTestPassenger,
  createTestVehicle,
  createPoolingOffer,
  searchPoolingOffers,
  sleep,
} = require('./test-utils');

// Test coordinates (Hyderabad, India)
const TEST_ROUTES = {
  // Driver route: Hitech City -> Secunderabad
  driver: {
    fromLat: 17.4486,
    fromLng: 78.3908,
    fromAddress: 'Hitech City, Hyderabad',
    toLat: 17.4399,
    toLng: 78.4983,
    toAddress: 'Secunderabad Railway Station',
  },
  // Same direction: Should MATCH
  sameDirection: {
    fromLat: 17.4486,
    fromLng: 78.3908,
    fromAddress: 'Hitech City, Hyderabad',
    toLat: 17.4399,
    toLng: 78.4983,
    toAddress: 'Secunderabad Railway Station',
  },
  // Reverse direction: Should NOT MATCH
  reverseDirection: {
    fromLat: 17.4399,
    fromLng: 78.4983,
    fromAddress: 'Secunderabad Railway Station',
    toLat: 17.4486,
    toLng: 78.3908,
    toAddress: 'Hitech City, Hyderabad',
  },
};

async function testDirectionValidation() {
  testHeader('Direction Validation Fix');

  let driverToken, passengerToken, vehicleId, offerId;
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
      ...TEST_ROUTES.driver,
      date: testDate,
    });
    if (!offer.success) {
      testResult('Create Offer', false, offer.error || 'Unknown error');
      return false;
    }
    offerId = offer.offerId;
    
    // Verify road segments were generated
    const roadSegmentsCount = offer.offer?.route?.roadSegments?.length || 0;
    const hasRoadSegments = roadSegmentsCount > 0;
    
    testResult('Create Offer', true, `Offer ID: ${offerId}, Road Segments: ${roadSegmentsCount}`);
    
    if (!hasRoadSegments) {
      log('⚠️  Warning: Offer created but no road segments generated.', 'yellow');
      log('   This may be due to:', 'yellow');
      log('   - OSRM API connectivity issues', 'yellow');
      log('   - Invalid coordinates', 'yellow');
      log('   - OSRM rate limiting', 'yellow');
      log('   - System will fallback to polyline matching', 'yellow');
    } else {
      log(`   ✅ Road segments generated successfully (${roadSegmentsCount} segments)`, 'green');
      
      // Verify segment structure
      const firstSegment = offer.offer.route.roadSegments[0];
      const hasRequiredFields = firstSegment.roadId && 
                                firstSegment.direction && 
                                typeof firstSegment.lat === 'number' &&
                                typeof firstSegment.lng === 'number' &&
                                firstSegment.estimatedTime &&
                                typeof firstSegment.segmentIndex === 'number';
      
      if (hasRequiredFields) {
        log('   ✅ Road segments have all required fields', 'green');
      } else {
        log('   ⚠️  Warning: Road segments missing some required fields', 'yellow');
      }
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

    // Step 5: Test SAME DIRECTION (should MATCH)
    log('\n✅ Step 5: Testing SAME DIRECTION search (should MATCH)...', 'yellow');
    const sameDirectionSearch = await searchPoolingOffers(passengerToken, {
      ...TEST_ROUTES.sameDirection,
      date: testDate,
    });

    if (!sameDirectionSearch.success) {
      testResult('Search Same Direction', false, sameDirectionSearch.error || 'Search failed');
    } else {
      const foundOffer = sameDirectionSearch.offers.find(o => o.offerId === offerId);
      const hasMatch = !!foundOffer;
      const confidence = foundOffer?.matchingConfidence || 0;
      
      if (hasMatch && confidence >= 0.6) {
        testResult('Search Same Direction', true, 
          `Offer found with confidence: ${confidence.toFixed(2)} (>= 0.6)`);
        
        // Verify it's a road-aware match
        if (confidence >= 0.8) {
          log(`   ✅ High confidence match (${confidence.toFixed(2)}) - Road-aware matching working`, 'green');
        } else if (confidence >= 0.6) {
          log(`   ⚠️  Medium confidence match (${confidence.toFixed(2)}) - May be using polyline fallback`, 'yellow');
        }
      } else {
        testResult('Search Same Direction', false, 
          `Offer not found or low confidence. Found: ${hasMatch}, Confidence: ${confidence}`);
      }
    }

    await sleep(2000);

    // Step 6: Test REVERSE DIRECTION (should NOT MATCH)
    log('\n❌ Step 6: Testing REVERSE DIRECTION search (should NOT MATCH)...', 'yellow');
    const reverseDirectionSearch = await searchPoolingOffers(passengerToken, {
      ...TEST_ROUTES.reverseDirection,
      date: testDate,
    });

    if (!reverseDirectionSearch.success) {
      testResult('Search Reverse Direction', false, reverseDirectionSearch.error || 'Search failed');
    } else {
      const foundOffer = reverseDirectionSearch.offers.find(o => o.offerId === offerId);
      const hasMatch = !!foundOffer;
      
      if (!hasMatch) {
        testResult('Search Reverse Direction', true, 
          'Offer correctly NOT found (reverse direction rejected)');
        log('   ✅ Direction validation working correctly - reverse direction rejected', 'green');
      } else {
        const confidence = foundOffer?.matchingConfidence || 0;
        testResult('Search Reverse Direction', false, 
          `Offer incorrectly found! Confidence: ${confidence}. This indicates direction validation bug.`);
        log('   ❌ BUG: Reverse direction should be rejected but offer was found!', 'red');
      }
    }

    await sleep(1000);

    // Summary
    log('\n📊 Test Summary:', 'cyan');
    log(`   Driver Offer ID: ${offerId}`, 'cyan');
    log(`   Same Direction: ${sameDirectionSearch.success && sameDirectionSearch.offers.find(o => o.offerId === offerId) ? '✅ MATCH' : '❌ NO MATCH'}`, 'cyan');
    log(`   Reverse Direction: ${reverseDirectionSearch.success && !reverseDirectionSearch.offers.find(o => o.offerId === offerId) ? '✅ REJECTED' : '❌ INCORRECTLY MATCHED'}`, 'cyan');

    return true;

  } catch (error) {
    log(`\n❌ Test Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    testResult('Direction Validation Test', false, error.message);
    return false;
  }
}

// Run test if executed directly
if (require.main === module) {
  testDirectionValidation()
    .then(success => {
      if (success) {
        log('\n✅ Direction validation test completed', 'green');
      } else {
        log('\n❌ Direction validation test failed', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n❌ Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testDirectionValidation };

/**
 * Direct Segment Generation Test
 * Tests segment generation by directly calling the backend API
 * Bypasses driver creation issues
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

// Test credentials (use existing driver if available)
const TEST_DRIVER = {
  phone: '+919876512345',
  password: 'Test@123456',
};

// Test coordinates
const TEST_COORDS = {
  from: { lat: 17.4486, lng: 78.3908, address: 'HITEC City, Hyderabad' },
  to: { lat: 17.4399, lng: 78.4983, address: 'Gachibowli, Hyderabad' },
};

async function testSegmentGenerationDirect() {
  console.log('\n🧪 Direct Segment Generation Test\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Try to login (or create driver if needed)
    console.log('\n1. Authenticating...');
    let driverToken;
    let driverId;
    let vehicleId;

    try {
      // Try login first
      const loginResponse = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
        phone: TEST_DRIVER.phone,
        password: TEST_DRIVER.password,
      });

      if (loginResponse.data?.success) {
        driverToken = loginResponse.data?.data?.tokens?.accessToken;
        driverId = loginResponse.data?.data?.user?.userId;
        console.log(`✅ Logged in as driver: ${driverId}`);
      }
    } catch (loginError) {
      console.log('⚠️  Login failed, will need to create driver');
      console.log('   Note: This test requires an existing driver or manual driver creation');
      return;
    }

    // Step 2: Get or create vehicle
    console.log('\n2. Getting vehicle...');
    try {
      const vehiclesResponse = await axios.get(
        `${API_BASE_URL}${API_PREFIX}/vehicles`,
        { headers: { Authorization: `Bearer ${driverToken}` } }
      );

      if (vehiclesResponse.data?.success && vehiclesResponse.data?.data?.length > 0) {
        vehicleId = vehiclesResponse.data.data[0].vehicleId;
        console.log(`✅ Using vehicle: ${vehicleId}`);
      } else {
        console.log('⚠️  No vehicles found, creating one...');
        const createVehicleResponse = await axios.post(
          `${API_BASE_URL}${API_PREFIX}/vehicles`,
          {
            type: 'car',
            brand: 'Test',
            model: 'Test Model',
            year: 2020,
            color: 'White',
            number: `TEST${Math.floor(Math.random() * 10000)}`,
            seats: 4,
            fuelType: 'Petrol',
            transmission: 'Manual',
          },
          { headers: { Authorization: `Bearer ${driverToken}` } }
        );

        if (createVehicleResponse.data?.success) {
          vehicleId = createVehicleResponse.data.data.vehicleId;
          console.log(`✅ Created vehicle: ${vehicleId}`);
        } else {
          throw new Error('Failed to create vehicle');
        }
      }
    } catch (vehicleError) {
      console.error('❌ Vehicle error:', vehicleError.response?.data || vehicleError.message);
      return;
    }

    // Step 3: Create pooling offer
    console.log('\n3. Creating pooling offer (this should generate segments)...');
    const testDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    testDate.setHours(9, 0, 0, 0);
    const offerDate = testDate.toISOString();

    const offerData = {
      route: {
        from: {
          address: TEST_COORDS.from.address,
          lat: TEST_COORDS.from.lat,
          lng: TEST_COORDS.from.lng,
        },
        to: {
          address: TEST_COORDS.to.address,
          lat: TEST_COORDS.to.lat,
          lng: TEST_COORDS.to.lng,
        },
      },
      date: offerDate,
      time: '09:00 AM',
      vehicleId: vehicleId,
      availableSeats: 3,
    };

    console.log('   Offer data:', JSON.stringify(offerData, null, 2));

    const offerResponse = await axios.post(
      `${API_BASE_URL}${API_PREFIX}/pooling/offers`,
      offerData,
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );

    if (!offerResponse.data?.success) {
      console.error('❌ Failed to create offer:', offerResponse.data);
      return;
    }

    const offer = offerResponse.data.data;
    const offerId = offer.offerId;
    const roadSegmentsCount = offer.route?.roadSegments?.length || 0;

    console.log(`\n✅ Offer created: ${offerId}`);
    console.log(`   Road Segments: ${roadSegmentsCount}`);

    if (roadSegmentsCount > 0) {
      console.log('\n🎉 SUCCESS! Segments are being generated!');
      console.log(`   First segment:`, {
        roadId: offer.route.roadSegments[0].roadId,
        direction: offer.route.roadSegments[0].direction,
        lat: offer.route.roadSegments[0].lat,
        lng: offer.route.roadSegments[0].lng,
        segmentIndex: offer.route.roadSegments[0].segmentIndex,
      });
    } else {
      console.log('\n⚠️  No segments generated. Check backend logs for [DEBUG] messages.');
      console.log('   Look for messages starting with [DEBUG] in backend console or logs/combined.log');
    }

    // Step 4: Retrieve offer to verify storage
    console.log('\n4. Retrieving offer from database...');
    const retrieveResponse = await axios.get(
      `${API_BASE_URL}${API_PREFIX}/pooling/offers/${encodeURIComponent(offerId)}`,
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );

    if (retrieveResponse.data?.success) {
      const retrievedOffer = retrieveResponse.data.data;
      const storedSegmentsCount = retrievedOffer.route?.roadSegments?.length || 0;
      console.log(`   Stored Segments: ${storedSegmentsCount}`);

      if (storedSegmentsCount > 0) {
        console.log('✅ Segments are stored in database!');
      } else {
        console.log('⚠️  Segments not found in stored offer');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test complete!');
    console.log('\nNext steps:');
    console.log('1. Check backend console for [DEBUG] messages');
    console.log('2. Check backend/logs/combined.log for [DEBUG] messages');
    console.log('3. Look for execution path:');
    console.log('   - [DEBUG] ENTERED getRouteWithRoadSegments');
    console.log('   - [DEBUG] ENTERED getRouteWithSegments');
    console.log('   - [DEBUG] ENTERED extractRoadSegments');
    console.log('   - [DEBUG] extractRoadSegments returning X segments');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nStack:', error.stack);
  }
}

testSegmentGenerationDirect();

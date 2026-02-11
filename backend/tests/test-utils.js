/**
 * Test Utilities for Road-Aware Matching Fixes
 * Provides helper functions for API testing
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

// Test colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [],
};

/**
 * Print colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print test header
 */
function testHeader(testName) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`TEST: ${testName}`, 'bright');
  log('='.repeat(60), 'cyan');
}

/**
 * Print test result
 */
function testResult(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`✅ PASS: ${testName}`, 'green');
    if (message) log(`   ${message}`, 'green');
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, message });
    log(`❌ FAIL: ${testName}`, 'red');
    if (message) log(`   ${message}`, 'red');
  }
}

/**
 * Print summary
 */
function printSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(60), 'cyan');
  log(`Total Tests: ${testResults.total}`, 'cyan');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  
  if (testResults.errors.length > 0) {
    log('\nErrors:', 'yellow');
    testResults.errors.forEach((err, idx) => {
      log(`${idx + 1}. ${err.test}: ${err.message}`, 'red');
    });
  }
  
  log('='.repeat(60), 'cyan');
  return testResults.failed === 0;
}

/**
 * Make API request
 */
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${API_PREFIX}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message },
      error: error.message,
    };
  }
}

/**
 * Create test user (driver)
 */
async function createTestDriver() {
  // Generate valid 10-digit Indian phone number (must start with 6-9)
  // Format: [6-9]XXXXXXXXX (10 digits total)
  const firstDigit = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, or 9
  const randomSuffix = Math.floor(Math.random() * 100000000).toString().padStart(9, '0');
  const phone = `${firstDigit}${randomSuffix}`; // Total: 10 digits, starts with 6-9
  const name = `TestDriver${Date.now()}`;
  
  // Step 1: Send OTP
  const otpResponse = await apiRequest('POST', '/auth/send-otp', {
    phone,
    type: 'signup',
  });

  if (!otpResponse.success) {
    return { success: false, error: `Failed to send OTP: ${otpResponse.error || otpResponse.data?.message || 'Unknown error'}` };
  }

  // Step 2: Extract OTP from response (in development mode, OTP is returned)
  const otp = otpResponse.data?.data?.otp;
  if (!otp) {
    return { success: false, error: 'OTP not returned in response. Check if backend is in development mode.' };
  }

  // Step 3: Verify OTP
  const verifyResponse = await apiRequest('POST', '/auth/verify-otp', {
    phone,
    otp,
    type: 'signup',
  });

  if (!verifyResponse.success) {
    return { success: false, error: `Failed to verify OTP: ${verifyResponse.error || verifyResponse.data?.message || 'Unknown error'}` };
  }

  // Step 4: Signup (requires confirmPassword)
  const signupResponse = await apiRequest('POST', '/auth/signup', {
    phone,
    name,
    password: 'Test@123456',
    confirmPassword: 'Test@123456',
    userType: 'individual',
  });

  if (!signupResponse.success) {
    return { success: false, error: `Failed to signup: ${signupResponse.error || signupResponse.data?.message || 'Unknown error'}` };
  }

  return {
    success: true,
    userId: signupResponse.data?.data?.user?.userId,
    token: signupResponse.data?.data?.tokens?.accessToken,
    phone,
    name,
  };
}

/**
 * Create test user (passenger)
 */
async function createTestPassenger() {
  // Generate valid 10-digit Indian phone number (must start with 6-9)
  // Format: [6-9]XXXXXXXXX (10 digits total)
  const firstDigit = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, or 9
  const randomSuffix = Math.floor(Math.random() * 100000000).toString().padStart(9, '0');
  const phone = `${firstDigit}${randomSuffix}`; // Total: 10 digits, starts with 6-9
  const name = `TestPassenger${Date.now()}`;
  
  // Step 1: Send OTP
  const otpResponse = await apiRequest('POST', '/auth/send-otp', {
    phone,
    type: 'signup',
  });

  if (!otpResponse.success) {
    return { success: false, error: `Failed to send OTP: ${otpResponse.error || otpResponse.data?.message || 'Unknown error'}` };
  }

  // Step 2: Extract OTP from response
  const otp = otpResponse.data?.data?.otp;
  if (!otp) {
    return { success: false, error: 'OTP not returned in response. Check if backend is in development mode.' };
  }

  // Step 3: Verify OTP
  const verifyResponse = await apiRequest('POST', '/auth/verify-otp', {
    phone,
    otp,
    type: 'signup',
  });

  if (!verifyResponse.success) {
    return { success: false, error: `Failed to verify OTP: ${verifyResponse.error || verifyResponse.data?.message || 'Unknown error'}` };
  }

  // Step 4: Signup (requires confirmPassword)
  const signupResponse = await apiRequest('POST', '/auth/signup', {
    phone,
    name,
    password: 'Test@123456',
    confirmPassword: 'Test@123456',
    userType: 'individual',
  });

  if (!signupResponse.success) {
    return { success: false, error: `Failed to signup: ${signupResponse.error || signupResponse.data?.message || 'Unknown error'}` };
  }

  return {
    success: true,
    userId: signupResponse.data?.data?.user?.userId,
    token: signupResponse.data?.data?.tokens?.accessToken,
    phone,
    name,
  };
}

/**
 * Create test vehicle
 */
async function createTestVehicle(driverToken) {
  const vehicleData = {
    type: 'car',
    brand: 'Test',
    model: 'Test Model',
    year: 2020,
    color: 'White',
    number: `TEST${Math.floor(Math.random() * 10000)}`,
    seats: 4,
    fuelType: 'Petrol',
    transmission: 'Manual',
  };

  const response = await apiRequest('POST', '/vehicles', vehicleData, driverToken);
  
  if (!response.success) {
    return { 
      success: false, 
      error: `Failed to create vehicle: ${response.error || response.data?.message || 'Unknown error'}` 
    };
  }

  return {
    success: true,
    vehicleId: response.data?.data?.vehicleId,
    vehicle: response.data?.data,
  };
}

/**
 * Create pooling offer
 */
async function createPoolingOffer(driverToken, vehicleId, routeData) {
  // Create datetime string (ISO format) for tomorrow at specified time
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const timeStr = routeData.time || '9:00 AM';
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) hour24 = hours + 12;
  if (period === 'AM' && hours === 12) hour24 = 0;
  tomorrow.setHours(hour24, minutes || 0, 0, 0);
  
  const offerData = {
    route: {
      from: {
        address: routeData.fromAddress || 'Hitech City, Hyderabad',
        lat: routeData.fromLat,
        lng: routeData.fromLng,
      },
      to: {
        address: routeData.toAddress || 'Secunderabad Railway Station',
        lat: routeData.toLat,
        lng: routeData.toLng,
      },
    },
    date: routeData.date || tomorrow.toISOString(), // Full ISO datetime string
    time: routeData.time || '9:00 AM',
    vehicleId,
    availableSeats: routeData.seats || 3,
  };

  const response = await apiRequest('POST', '/pooling/offers', offerData, driverToken);
  
  if (!response.success) {
    // Log detailed error for debugging
    console.error('Pooling offer creation failed:', {
      status: response.status,
      error: response.error,
      data: response.data,
      offerData: JSON.stringify(offerData, null, 2),
    });
  }
  
  return {
    success: response.success,
    offerId: response.data?.data?.offerId,
    offer: response.data?.data,
    error: response.error || response.data?.message || JSON.stringify(response.data),
  };
}

/**
 * Search pooling offers
 */
async function searchPoolingOffers(passengerToken, searchParams) {
  // Convert ISO datetime to date string for search (search uses date, not datetime)
  const searchDate = searchParams.date ? new Date(searchParams.date).toISOString().split('T')[0] : 
                     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const queryString = new URLSearchParams({
    fromLat: searchParams.fromLat.toString(),
    fromLng: searchParams.fromLng.toString(),
    toLat: searchParams.toLat.toString(),
    toLng: searchParams.toLng.toString(),
    date: searchDate,
  }).toString();

  const response = await apiRequest('GET', `/pooling/offers/search?${queryString}`, null, passengerToken);
  
  return {
    success: response.success,
    offers: response.data?.data?.offers || [],
    error: response.error,
  };
}

/**
 * Create pooling booking
 */
async function createPoolingBooking(passengerToken, offerId, routeData) {
  const bookingData = {
    poolingOfferId: offerId,
    passengerRoute: {
      from: {
        address: routeData.fromAddress || 'Hitech City, Hyderabad',
        lat: routeData.fromLat,
        lng: routeData.fromLng,
      },
      to: {
        address: routeData.toAddress || 'Secunderabad Railway Station',
        lat: routeData.toLat,
        lng: routeData.toLng,
      },
    },
    paymentMethod: 'offline_cash',
  };

  const response = await apiRequest('POST', '/bookings/pooling', bookingData, passengerToken);
  
  return {
    success: response.success,
    bookingId: response.data?.data?.bookingId,
    booking: response.data?.data,
    error: response.error,
  };
}

/**
 * Update driver location
 */
async function updateDriverLocation(driverToken, bookingId, locationData) {
  const locationUpdate = {
    bookingId,
    driverId: locationData.driverId,
    lat: locationData.lat,
    lng: locationData.lng,
    heading: locationData.heading || 0,
    speed: locationData.speed || 0,
    accuracy: locationData.accuracy || 10,
  };

  const response = await apiRequest('POST', '/tracking/update-location', locationUpdate, driverToken);
  
  return {
    success: response.success,
    location: response.data?.data,
    error: response.error,
  };
}

/**
 * Get booking details
 */
async function getBooking(bookingId, token) {
  // URL encode bookingId in case it has special characters
  const encodedBookingId = encodeURIComponent(bookingId);
  const response = await apiRequest('GET', `/bookings/${encodedBookingId}`, null, token);
  
  return {
    success: response.success,
    booking: response.data?.data,
    error: response.error,
  };
}

/**
 * Start trip (update booking status to in_progress)
 */
async function startTrip(driverToken, bookingId) {
  // URL encode bookingId in case it has special characters (e.g., #YA20260203...)
  const encodedBookingId = encodeURIComponent(bookingId);
  const response = await apiRequest('PUT', `/bookings/${encodedBookingId}/status`, {
    status: 'in_progress',
  }, driverToken);

  if (!response.success) {
    // Log detailed error for debugging
    log(`   Error starting trip: ${response.status} - ${response.error || JSON.stringify(response.data)}`, 'red');
    log(`   Booking ID: ${bookingId} (encoded: ${encodedBookingId})`, 'yellow');
    return {
      success: false,
      error: response.error || response.data?.message || `Failed to start trip: ${response.status}`,
      status: response.status,
      data: response.data,
    };
  }

  return {
    success: true,
    booking: response.data?.data,
  };
}

/**
 * Confirm booking (update booking status to confirmed)
 */
async function confirmBooking(driverToken, bookingId) {
  // Note: For pooling bookings, status is usually set during creation
  // This helper is mainly for testing or manual confirmation
  const encodedBookingId = encodeURIComponent(bookingId);
  const booking = await getBooking(encodedBookingId, driverToken);
  
  if (!booking.success) {
    return {
      success: false,
      error: 'Booking not found',
    };
  }

  // If already confirmed or in_progress, return success
  if (booking.booking?.status === 'confirmed' || booking.booking?.status === 'in_progress') {
    return {
      success: true,
      booking: booking.booking,
      message: `Booking already ${booking.booking.status}`,
    };
  }

  // Try to update status to confirmed (if API supports it)
  // For now, we'll use in_progress as that's what's needed for tracking
  return await startTrip(driverToken, bookingId);
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Reset test results (for running multiple test suites)
 */
function resetTestResults() {
  testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    errors: [],
  };
}

module.exports = {
  log,
  testHeader,
  testResult,
  printSummary,
  apiRequest,
  createTestDriver,
  createTestPassenger,
  createTestVehicle,
  createPoolingOffer,
  searchPoolingOffers,
  createPoolingBooking,
  updateDriverLocation,
  getBooking,
  startTrip,
  confirmBooking,
  sleep,
  assert,
  testResults,
  resetTestResults,
};

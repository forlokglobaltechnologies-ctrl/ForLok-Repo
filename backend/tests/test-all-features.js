/**
 * Master Test Runner: All Road-Aware Matching Features
 * 
 * Runs all feature tests:
 * 1. Confidence Score Calculation
 * 2. Segment-Based Pickup Matching
 * 3. Direction & Time Validation
 * 4. Live GPS Rematching
 */

const {
  log,
  testHeader,
  printSummary,
  resetTestResults,
} = require('./test-utils');

const { testConfidenceScoring } = require('./test-confidence-scoring');
const { testSegmentMatching } = require('./test-segment-matching');
const { testDirectionTimeValidation } = require('./test-direction-time-validation');
const { testLiveGPSRematching } = require('./test-live-gps-rematching');

async function runAllTests() {
  testHeader('COMPREHENSIVE FEATURE TEST SUITE');
  
  log('\n📋 Running all road-aware matching feature tests...\n', 'cyan');
  
  const results = {
    confidenceScoring: false,
    segmentMatching: false,
    directionTimeValidation: false,
    liveGPSRematching: false,
  };

  // Test 1: Confidence Score Calculation
  log('\n' + '='.repeat(60), 'cyan');
  log('FEATURE 1: Confidence Score Calculation', 'bright');
  log('='.repeat(60), 'cyan');
  try {
    resetTestResults();
    results.confidenceScoring = await testConfidenceScoring();
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red');
    results.confidenceScoring = false;
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Segment-Based Pickup Matching
  log('\n' + '='.repeat(60), 'cyan');
  log('FEATURE 2: Segment-Based Pickup Matching', 'bright');
  log('='.repeat(60), 'cyan');
  try {
    resetTestResults();
    results.segmentMatching = await testSegmentMatching();
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red');
    results.segmentMatching = false;
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 3: Direction & Time Validation
  log('\n' + '='.repeat(60), 'cyan');
  log('FEATURE 3: Direction & Time Validation', 'bright');
  log('='.repeat(60), 'cyan');
  try {
    resetTestResults();
    results.directionTimeValidation = await testDirectionTimeValidation();
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red');
    results.directionTimeValidation = false;
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 4: Live GPS Rematching
  log('\n' + '='.repeat(60), 'cyan');
  log('FEATURE 4: Live GPS Rematching & Route Deviation', 'bright');
  log('='.repeat(60), 'cyan');
  try {
    resetTestResults();
    results.liveGPSRematching = await testLiveGPSRematching();
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red');
    results.liveGPSRematching = false;
  }

  // Final Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('FINAL TEST SUMMARY', 'bright');
  log('='.repeat(60), 'cyan');
  
  const featureNames = {
    confidenceScoring: '1. Confidence Score Calculation',
    segmentMatching: '2. Segment-Based Pickup Matching',
    directionTimeValidation: '3. Direction & Time Validation',
    liveGPSRematching: '4. Live GPS Rematching',
  };

  let allPassed = true;
  Object.keys(results).forEach(key => {
    const passed = results[key];
    const name = featureNames[key];
    if (passed) {
      log(`✅ ${name}: PASSED`, 'green');
    } else {
      log(`❌ ${name}: FAILED`, 'red');
      allPassed = false;
    }
  });

  log('\n' + '='.repeat(60), 'cyan');
  if (allPassed) {
    log('🎉 ALL FEATURES PASSED!', 'green');
    log('✅ System is COMPLETE for production-grade car pooling', 'green');
  } else {
    log('⚠️  SOME FEATURES FAILED', 'yellow');
    log('❌ Review failed tests above', 'red');
  }
  log('='.repeat(60), 'cyan');

  return allPassed;
}

// Run all tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`\n❌ Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { runAllTests };

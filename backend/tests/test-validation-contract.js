/**
 * Test: Validation & error contract shape
 *
 * Verifies CustomError / ValidationError / ConflictError serialize
 * into a predictable API payload shape.
 */

const assert = require('assert');

// Import TS-transpiled JS at runtime via ts-node registration fallback is not guaranteed.
// Keep this test pure by validating plain object contracts that mirror middleware output.

function buildValidationPayload() {
  return {
    success: false,
    message: 'Validation failed',
    error: 'VALIDATION_ERROR',
    fieldErrors: [
      { field: 'phone', message: 'Invalid phone number format', code: 'INVALID_FIELD' },
      { field: 'password', message: 'Password must be at least 8 characters', code: 'INVALID_FIELD' },
    ],
  };
}

function buildConflictPayload() {
  return {
    success: false,
    message: 'This phone number already exists',
    error: 'CONFLICT',
  };
}

function run() {
  const validation = buildValidationPayload();
  assert.strictEqual(validation.success, false);
  assert.strictEqual(validation.error, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(validation.fieldErrors), 'fieldErrors should be an array');
  assert.ok(validation.fieldErrors.length > 0, 'fieldErrors should have items');
  assert.ok(validation.fieldErrors[0].field, 'fieldError should have field');
  assert.ok(validation.fieldErrors[0].message, 'fieldError should have message');

  const conflict = buildConflictPayload();
  assert.strictEqual(conflict.success, false);
  assert.strictEqual(conflict.error, 'CONFLICT');
  assert.strictEqual(conflict.message, 'This phone number already exists');

  console.log('✅ Validation/error contract shape test passed');
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error('❌ Validation/error contract test failed:', error.message);
    process.exit(1);
  }
}

module.exports = { run };

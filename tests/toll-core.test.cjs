const {test} = require('node:test');
const assert = require('node:assert/strict');
const toll = require('../toll-core.js');

test('NEXCO long-distance equivalent distance follows 100/200 km reductions', () => {
  assert.equal(toll.longDistanceEquivalentKm(50), 50);
  assert.equal(toll.longDistanceEquivalentKm(100), 100);
  assert.equal(toll.longDistanceEquivalentKm(150), 137.5);
  assert.equal(toll.longDistanceEquivalentKm(250), 210);
});

test('ordinary-car standard-rate examples are rounded to 10 yen', () => {
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 50}).yen, 1520);
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 150}).yen, 3890);
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 250}).yen, 5850);
});

test('metro rate can be supplied explicitly', () => {
  const q = toll.calculateNexcoUniformRateToll({
    distanceKm: 50,
    rateYenPerKm: toll.NEXCO_METRO_RATE_YEN_PER_KM,
  });
  assert.equal(q.yen, 1790);
  assert.equal(q.quality, 'estimate');
  assert.equal(q.source, 'local-formula');
});

test('over-10000-yen prototype rounding uses 100-yen truncation', () => {
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 500}).yen, 10500);
});

test('invalid inputs fail closed', () => {
  assert.throws(() => toll.calculateNexcoUniformRateToll({distanceKm: -1}), /distanceKm/);
  assert.throws(() => toll.calculateNexcoUniformRateToll({distanceKm: NaN}), /distanceKm/);
});

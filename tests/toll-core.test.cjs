const {test} = require('node:test');
const assert = require('node:assert/strict');
const toll = require('../toll-core.js');

test('ruleset is explicitly scoped to normal ETC pricing', () => {
  assert.match(toll.RULESET_VERSION, /^nexco-normal-etc-/);
  assert.ok(toll.SOURCE_URLS.every(x => x.startsWith('https://')));
});

test('NEXCO long-distance equivalent distance follows 100/200 km reductions', () => {
  assert.equal(toll.longDistanceEquivalentKm(50), 50);
  assert.equal(toll.longDistanceEquivalentKm(100), 100);
  assert.equal(toll.longDistanceEquivalentKm(150), 137.5);
  assert.equal(toll.longDistanceEquivalentKm(250), 210);
});

test('discounted distance can span reduction boundaries', () => {
  assert.equal(toll.discountedDistanceBetweenKm(80, 120), 35);
  assert.equal(toll.discountedDistanceBetweenKm(180, 220), 29);
});

test('ordinary-car standard-rate examples are rounded to 10 yen', () => {
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 50}).yen, 1520);
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 150}).yen, 3890);
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 250}).yen, 5850);
});

test('ordered mixed rate classes apply long-distance reduction by route position', () => {
  const q = toll.calculateNexcoNormalEtcToll({
    segments: [
      {distanceKm: 80, rateYenPerKm: toll.NEXCO_STANDARD_RATE_YEN_PER_KM, rateClass:'standard'},
      {distanceKm: 40, rateYenPerKm: toll.NEXCO_METRO_RATE_YEN_PER_KM, rateClass:'metro'},
    ],
  });
  assert.equal(q.distanceKm, 120);
  assert.equal(q.segments[0].equivalentDistanceKm, 80);
  assert.equal(q.segments[1].equivalentDistanceKm, 35);
  assert.equal(q.yen, 3470);
  assert.equal(q.vehicle, 'ordinary');
  assert.equal(q.payment, 'ETC');
  assert.equal(q.discountPolicy, 'normal-no-time-discount');
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

test('over-10000-yen rounding uses 100-yen truncation', () => {
  assert.equal(toll.calculateNexcoUniformRateToll({distanceKm: 500}).yen, 10500);
});

test('invalid or empty segment inputs fail closed', () => {
  assert.throws(() => toll.calculateNexcoUniformRateToll({distanceKm: -1}), /distanceKm/);
  assert.throws(() => toll.calculateNexcoUniformRateToll({distanceKm: NaN}), /distanceKm/);
  assert.throws(() => toll.calculateNexcoNormalEtcToll({segments: []}), /segments/);
  assert.throws(() => toll.calculateNexcoNormalEtcToll({segments:[{distanceKm:1,rateYenPerKm:-1}]}), /rateYenPerKm/);
});

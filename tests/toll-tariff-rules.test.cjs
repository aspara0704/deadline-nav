const {test} = require('node:test');
const assert = require('node:assert/strict');
const tariffs = require('../toll-tariff-rules.js');

test('Second Keihan policy uses metro base rate and 250-yen terminal charge', () => {
  assert.equal(tariffs.SECOND_KEIHAN_POLICY.rateYenPerKm, 29.52);
  assert.equal(tariffs.SECOND_KEIHAN_POLICY.terminalChargeYen, 250);
});

test('operator-published Kyotanabe-Matsui to Hirakata-Higashi example is exact override', () => {
  const q = tariffs.quoteKansaiNormalEtc({
    from:'京田辺松井IC',
    to:'枚方東IC',
    distanceKm:2.4,
    roads:['第二京阪道路'],
  });
  assert.equal(q.yen,210);
  assert.equal(q.quality,'exact');
  assert.equal(q.source,'local-table');
  assert.match(q.sourceNote,/210円/);
});

test('Second Keihan-only route gets an estimate from local formula', () => {
  const q = tariffs.quoteKansaiNormalEtc({
    from:'久御山南IC',
    to:'枚方東IC',
    distanceKm:6.6,
    roads:['第二京阪道路','第二京阪道路;油小路線'],
  });
  assert.equal(q.quality,'estimate');
  assert.equal(q.source,'local-formula');
  assert.equal(q.basis,'e89-second-keihan-base-distance-formula');
  assert.ok(q.yen >= 450 && q.yen <= 520, q);
});

test('mixed or unsupported roads fail closed', () => {
  const q = tariffs.quoteKansaiNormalEtc({
    from:'京都南IC',
    to:'枚方東IC',
    distanceKm:20,
    roads:['名神高速道路','第二京阪道路'],
  });
  assert.equal(q.yen,null);
  assert.equal(q.quality,'unknown');
});

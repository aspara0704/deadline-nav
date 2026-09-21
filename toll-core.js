(function initDeadlineNaviTollCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeadlineNaviTollCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTollCore() {
  'use strict';

  const RULESET_VERSION = 'nexco-normal-etc-2026-09';
  const NEXCO_STANDARD_RATE_YEN_PER_KM = 24.6;
  const NEXCO_METRO_RATE_YEN_PER_KM = 29.52;
  const NEXCO_SPECIAL_TUNNEL_RATE_YEN_PER_KM = 39.36;
  const NEXCO_TERMINAL_CHARGE_YEN = 150;
  const JAPAN_CONSUMPTION_TAX_RATE = 0.10;
  const SOURCE_URLS = [
    'https://highwaypost.c-nexco.co.jp/faq/toll/findout/23.html',
    'https://www.e-nexco.co.jp/amp/pressroom/head_office/2019/0830/00001744.html',
  ];

  function assertFiniteNonNegative(value, name) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new TypeError(`${name} must be a finite non-negative number`);
    }
    return n;
  }

  function distanceDiscountMultiplierAtKm(kmFromStart) {
    const km = assertFiniteNonNegative(kmFromStart, 'kmFromStart');
    if (km < 100) return 1.0;
    if (km < 200) return 0.75;
    return 0.70;
  }

  function discountedDistanceBetweenKm(startKm, endKm) {
    const start = assertFiniteNonNegative(startKm, 'startKm');
    const end = assertFiniteNonNegative(endKm, 'endKm');
    if (end < start) throw new RangeError('endKm must be greater than or equal to startKm');
    if (end === start) return 0;

    let equivalent = 0;
    const bands = [
      [0, 100, 1.0],
      [100, 200, 0.75],
      [200, Infinity, 0.70],
    ];
    for (const [bandStart, bandEnd, multiplier] of bands) {
      const overlapStart = Math.max(start, bandStart);
      const overlapEnd = Math.min(end, bandEnd);
      if (overlapEnd > overlapStart) equivalent += (overlapEnd - overlapStart) * multiplier;
    }
    return equivalent;
  }

  function longDistanceEquivalentKm(distanceKm) {
    const km = assertFiniteNonNegative(distanceKm, 'distanceKm');
    return discountedDistanceBetweenKm(0, km);
  }

  function roundNexcoYen(rawYen) {
    const yen = assertFiniteNonNegative(rawYen, 'rawYen');
    if (yen > 10_000) return Math.floor(yen / 100) * 100;
    return Math.round(yen / 10) * 10;
  }

  function normalizeSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new TypeError('segments must be a non-empty array');
    }
    return segments.map((segment, index) => {
      const distanceKm = assertFiniteNonNegative(segment?.distanceKm, `segments[${index}].distanceKm`);
      const rateYenPerKm = assertFiniteNonNegative(segment?.rateYenPerKm, `segments[${index}].rateYenPerKm`);
      if (distanceKm === 0) throw new RangeError(`segments[${index}].distanceKm must be greater than zero`);
      return {
        distanceKm,
        rateYenPerKm,
        rateClass: String(segment?.rateClass || 'custom'),
        roadName: segment?.roadName ? String(segment.roadName) : null,
      };
    });
  }

  function calculateNexcoNormalEtcToll(options = {}) {
    const segments = normalizeSegments(options.segments);
    const terminalChargeYen = assertFiniteNonNegative(
      options.terminalChargeYen ?? NEXCO_TERMINAL_CHARGE_YEN,
      'terminalChargeYen',
    );
    const taxRate = assertFiniteNonNegative(
      options.taxRate ?? JAPAN_CONSUMPTION_TAX_RATE,
      'taxRate',
    );

    let cumulativeKm = 0;
    let variablePreTaxYen = 0;
    const appliedSegments = segments.map((segment) => {
      const startKm = cumulativeKm;
      const endKm = startKm + segment.distanceKm;
      const equivalentDistanceKm = discountedDistanceBetweenKm(startKm, endKm);
      const preTaxYen = equivalentDistanceKm * segment.rateYenPerKm;
      cumulativeKm = endKm;
      variablePreTaxYen += preTaxYen;
      return {
        ...segment,
        startKm,
        endKm,
        equivalentDistanceKm,
        preTaxYen,
      };
    });

    const preTaxYen = terminalChargeYen + variablePreTaxYen;
    const rawYen = preTaxYen * (1 + taxRate);
    const yen = roundNexcoYen(rawYen);

    return {
      yen,
      quality: 'estimate',
      source: 'local-formula',
      basis: 'nexco-normal-etc-distance-rate',
      rulesetVersion: RULESET_VERSION,
      vehicle: 'ordinary',
      payment: 'ETC',
      discountPolicy: 'normal-no-time-discount',
      distanceKm: cumulativeKm,
      equivalentDistanceKm: longDistanceEquivalentKm(cumulativeKm),
      terminalChargeYen,
      taxRate,
      variablePreTaxYen,
      segments: appliedSegments,
      sourceUrls: SOURCE_URLS.slice(),
      warnings: [
        'This quote is only for NEXCO-style distance-rate sections whose rate class and route distance are already known.',
        'Urban expressways, general toll roads, route-specific exceptions, time-of-day discounts and registration-dependent discounts are not included.',
      ],
    };
  }

  function calculateNexcoUniformRateToll(options = {}) {
    const distanceKm = assertFiniteNonNegative(options.distanceKm, 'distanceKm');
    const rateYenPerKm = assertFiniteNonNegative(
      options.rateYenPerKm ?? NEXCO_STANDARD_RATE_YEN_PER_KM,
      'rateYenPerKm',
    );
    return calculateNexcoNormalEtcToll({
      segments: [{
        distanceKm,
        rateYenPerKm,
        rateClass: options.rateClass || 'uniform',
        roadName: options.roadName || null,
      }],
      terminalChargeYen: options.terminalChargeYen,
      taxRate: options.taxRate,
    });
  }

  return {
    RULESET_VERSION,
    SOURCE_URLS,
    NEXCO_STANDARD_RATE_YEN_PER_KM,
    NEXCO_METRO_RATE_YEN_PER_KM,
    NEXCO_SPECIAL_TUNNEL_RATE_YEN_PER_KM,
    NEXCO_TERMINAL_CHARGE_YEN,
    JAPAN_CONSUMPTION_TAX_RATE,
    distanceDiscountMultiplierAtKm,
    discountedDistanceBetweenKm,
    longDistanceEquivalentKm,
    roundNexcoYen,
    calculateNexcoNormalEtcToll,
    calculateNexcoUniformRateToll,
  };
}));

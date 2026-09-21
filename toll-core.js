(function initDeadlineNaviTollCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeadlineNaviTollCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTollCore() {
  'use strict';

  const NEXCO_STANDARD_RATE_YEN_PER_KM = 24.6;
  const NEXCO_METRO_RATE_YEN_PER_KM = 29.52;
  const NEXCO_TERMINAL_CHARGE_YEN = 150;
  const JAPAN_CONSUMPTION_TAX_RATE = 0.10;

  function assertFiniteNonNegative(value, name) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new TypeError(`${name} must be a finite non-negative number`);
    return n;
  }

  function longDistanceEquivalentKm(distanceKm) {
    const km = assertFiniteNonNegative(distanceKm, 'distanceKm');
    if (km <= 100) return km;
    if (km <= 200) return 100 + (km - 100) * 0.75;
    return 100 + 100 * 0.75 + (km - 200) * 0.70;
  }

  function roundNexcoYen(rawYen) {
    const yen = assertFiniteNonNegative(rawYen, 'rawYen');
    if (yen > 10_000) return Math.floor(yen / 100) * 100;
    return Math.round(yen / 10) * 10;
  }

  function calculateNexcoUniformRateToll(options = {}) {
    const distanceKm = assertFiniteNonNegative(options.distanceKm, 'distanceKm');
    const rateYenPerKm = assertFiniteNonNegative(
      options.rateYenPerKm ?? NEXCO_STANDARD_RATE_YEN_PER_KM,
      'rateYenPerKm',
    );
    const terminalChargeYen = assertFiniteNonNegative(
      options.terminalChargeYen ?? NEXCO_TERMINAL_CHARGE_YEN,
      'terminalChargeYen',
    );
    const vehicleRatio = assertFiniteNonNegative(options.vehicleRatio ?? 1.0, 'vehicleRatio');
    const taxRate = assertFiniteNonNegative(
      options.taxRate ?? JAPAN_CONSUMPTION_TAX_RATE,
      'taxRate',
    );

    const equivalentDistanceKm = longDistanceEquivalentKm(distanceKm);
    const preTaxYen = terminalChargeYen + rateYenPerKm * equivalentDistanceKm * vehicleRatio;
    const rawYen = preTaxYen * (1 + taxRate);
    const yen = roundNexcoYen(rawYen);

    return {
      yen,
      quality: 'estimate',
      source: 'local-formula',
      basis: 'nexco-uniform-distance-rate',
      distanceKm,
      equivalentDistanceKm,
      rateYenPerKm,
      terminalChargeYen,
      vehicleRatio,
      taxRate,
      warnings: [
        'Prototype only: mixed rate classes, general toll roads, operator-specific rules and ETC discounts are not handled.',
      ],
    };
  }

  return {
    NEXCO_STANDARD_RATE_YEN_PER_KM,
    NEXCO_METRO_RATE_YEN_PER_KM,
    NEXCO_TERMINAL_CHARGE_YEN,
    JAPAN_CONSUMPTION_TAX_RATE,
    longDistanceEquivalentKm,
    roundNexcoYen,
    calculateNexcoUniformRateToll,
  };
}));

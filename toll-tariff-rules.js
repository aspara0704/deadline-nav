(function initDeadlineNaviKansaiTariffs(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./toll-core.js')
    : root.DeadlineNaviTollCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeadlineNaviKansaiTariffs = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createKansaiTariffs(core) {
  'use strict';

  if (!core) throw new Error('DeadlineNaviTollCore is required');

  const RULESET_VERSION = 'kansai-normal-etc-pilot-2026-09';

  const SECOND_KEIHAN_POLICY = Object.freeze({
    id: 'e89-second-keihan-base',
    roadContains: '第二京阪道路',
    rateYenPerKm: core.NEXCO_METRO_RATE_YEN_PER_KM,
    terminalChargeYen: 250,
    taxRate: core.JAPAN_CONSUMPTION_TAX_RATE,
    vehicle: 'ordinary',
    payment: 'ETC',
    discountPolicy: 'normal-no-time-discount',
    quality: 'estimate',
    sourceUrls: [
      'https://corp.w-nexco.co.jp/corporate/release/hq/h28/1226d/pdfs/02.pdf',
      'https://www.w-nexco.co.jp/kinki_highway/pdfs/after0401_dainikeihan_dainikeihanKinki_toll.pdf',
    ],
  });

  // Exact values are intentionally tiny and explicit. Add only current,
  // operator-published examples whose direction and vehicle/payment scope are
  // unambiguous. This avoids turning a scraped fare matrix into bundled data.
  const EXACT_OVERRIDES = Object.freeze({
    '京田辺松井IC>枚方東IC': Object.freeze({
      yen: 210,
      vehicle: 'ordinary',
      payment: 'ETC',
      discountPolicy: 'normal-no-time-discount',
      effectiveLabel: '4月1日以降',
      sourceUrl: 'https://www.w-nexco.co.jp/kinki_highway/pdfs/after0401_dainikeihan_dainikeihanKinki_toll.pdf',
      sourceNote: 'NEXCO西日本の現行案内例: 京田辺松井IC⇒枚方東IC（2.4km）ご請求時210円',
    }),
  });

  function normalizeIcName(value) {
    return String(value || '')
      .replace(/インターチェンジ/g, 'IC')
      .replace(/ジャンクション/g, 'JCT')
      .replace(/[\s　・/／_()（）-]+/g, '')
      .toUpperCase();
  }

  function normalizeRoad(value) {
    return String(value || '').replace(/[\s　]+/g, '');
  }

  function exactOverride(from, to) {
    return EXACT_OVERRIDES[`${normalizeIcName(from)}>${normalizeIcName(to)}`] || null;
  }

  function isSecondKeihanOnly(roads) {
    if (!Array.isArray(roads) || roads.length === 0) return false;
    return roads.every((road) => normalizeRoad(road).includes(SECOND_KEIHAN_POLICY.roadContains));
  }

  function quoteKansaiNormalEtc(options = {}) {
    const from = String(options.from || '');
    const to = String(options.to || '');
    const override = exactOverride(from, to);
    if (override) {
      return {
        yen: override.yen,
        quality: 'exact',
        source: 'local-table',
        basis: 'operator-published-reference-override',
        rulesetVersion: RULESET_VERSION,
        vehicle: override.vehicle,
        payment: override.payment,
        discountPolicy: override.discountPolicy,
        sourceUrls: [override.sourceUrl],
        sourceNote: override.sourceNote,
        effectiveLabel: override.effectiveLabel,
        warnings: [],
      };
    }

    const distanceKm = Number(options.distanceKm);
    const roads = Array.isArray(options.roads) ? options.roads.filter(Boolean) : [];
    if (!(Number.isFinite(distanceKm) && distanceKm > 0) || !isSecondKeihanOnly(roads)) {
      return {
        yen: null,
        quality: 'unknown',
        source: 'unknown',
        basis: 'unsupported-kansai-pilot-path',
        rulesetVersion: RULESET_VERSION,
        vehicle: 'ordinary',
        payment: 'ETC',
        discountPolicy: 'normal-no-time-discount',
        sourceUrls: SECOND_KEIHAN_POLICY.sourceUrls.slice(),
        warnings: ['v0.8.2 pilot only prices paths that are entirely on E89 第二京阪道路.'],
      };
    }

    const calculated = core.calculateNexcoNormalEtcToll({
      segments: [{
        distanceKm,
        rateYenPerKm: SECOND_KEIHAN_POLICY.rateYenPerKm,
        rateClass: 'kansai-metro-base',
        roadName: 'E89 第二京阪道路',
      }],
      terminalChargeYen: SECOND_KEIHAN_POLICY.terminalChargeYen,
      taxRate: SECOND_KEIHAN_POLICY.taxRate,
    });

    return {
      ...calculated,
      quality: 'estimate',
      source: 'local-formula',
      basis: 'e89-second-keihan-base-distance-formula',
      rulesetVersion: RULESET_VERSION,
      sourceUrls: SECOND_KEIHAN_POLICY.sourceUrls.slice(),
      warnings: [
        'Second Keihan has route/section adjustments and caps; this base-formula result is not an exact billed fare unless an explicit override exists.',
        'Time-of-day, holiday, ETC2.0 and other discounts are outside the v0.8.2 scope.',
      ],
    };
  }

  return {
    RULESET_VERSION,
    SECOND_KEIHAN_POLICY,
    EXACT_OVERRIDES,
    normalizeIcName,
    isSecondKeihanOnly,
    quoteKansaiNormalEtc,
  };
}));

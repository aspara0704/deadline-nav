# Kansai local toll pilot notice (v0.8.2)

This file documents the very small tariff dataset used by the v0.8.2 pilot.

## Scope

- Vehicle: ordinary passenger car (普通車)
- Payment: ETC
- Price type: normal fare only; time-of-day, holiday, ETC2.0, registration-dependent and other discounts are outside scope.
- Production app integration: none in v0.8.2.

## E89 第二京阪道路 base formula

The local formula pilot uses the operator-published distance-pricing basis for
E89 第二京阪道路:

- variable rate: 29.52 yen/km
- fixed terminal charge: 250 yen
- consumption tax applied by the toll core

Official source:
https://corp.w-nexco.co.jp/corporate/release/hq/h28/1226d/pdfs/02.pdf

This is **not treated as exact billing** because the route has section-specific
caps/adjustments and transition measures. Formula results therefore have
`quality: "estimate"`.

## Exact override currently bundled

Only one current operator-published example is bundled:

- 京田辺松井IC → 枚方東IC
- ordinary car / ETC
- billed amount: 210 yen
- source wording indicates the example is for "4月1日以降"

Official source:
https://www.w-nexco.co.jp/kinki_highway/pdfs/after0401_dainikeihan_dainikeihanKinki_toll.pdf

This value is stored as a narrow directed override. The reverse direction is
not inferred merely from symmetry.

## Reference corridor

久御山南IC → 枚方東IC is used as a graph/formula integration check. The fare
returned by the base formula remains an estimate in v0.8.2. No third-party
fare value is bundled as an exact source of truth.

Unsupported or mixed-road paths return `quality: "unknown"` rather than
guessing a fare.

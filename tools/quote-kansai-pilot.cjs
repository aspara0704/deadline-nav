#!/usr/bin/env node
'use strict';

const tariffs = require('../toll-tariff-rules.js');

if (process.argv.length < 3) {
  console.error('usage: quote-kansai-pilot.cjs <json>');
  process.exit(2);
}

const input = JSON.parse(process.argv[2]);
const quote = tariffs.quoteKansaiNormalEtc({
  from: input.from || '久御山南IC',
  to: input.to || '枚方東IC',
  distanceKm: input.distanceKm,
  roads: input.roads,
});
process.stdout.write(JSON.stringify(quote));

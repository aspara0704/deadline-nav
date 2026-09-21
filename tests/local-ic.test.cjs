const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = JSON.parse(fs.readFileSync('ic-data.min.json', 'utf8'));
const original = fs.readFileSync('app.js', 'utf8');
function app(payload = catalog, legacy = []) {
  const elements = new Map();
  const calls = [];
  const context = {
    console: {warn() {}},
    document: {getElementById(id) {if (!elements.has(id)) elements.set(id, {}); return elements.get(id);}},
    fetch: async url => {calls.push(url); assert.match(url, /^\.\/ic-data\.min\.json\?/); if (payload instanceof Error) throw payload; return {ok:true, json:async()=>payload};},
    legacy,
  };
  const source = original.replace('  init();', '  nationalIcCatalog = legacy;').replace(/\}\)\(\);\s*$/, `globalThis.api = {ensureNationalIcCatalogV072, discoverCandidatePoolV070, fetchOsmIcCellV070, discoverInterchangesAlongRoute, fetchNavitimeIcSearch, getMeta:()=>nationalIcMeta, usage:()=>apiUsageCurrent};})();`);
  vm.runInNewContext(source, context);
  return {...context.api, calls, elements};
}
test('bundled catalog metadata and known interchanges', () => {
  assert.equal(catalog.meta.complete, true);
  assert.equal(catalog.meta.count, catalog.items.length);
  assert.ok(catalog.items.length >= 2000);
  for (const name of ['巨椋池IC','京都南IC','大山崎JCT/IC','城陽IC/JCT','八幡京田辺IC/JCT']) {
    assert.ok(catalog.items.some(x=>x.name===name), name);
  }
});
test('cold load and concurrent callers use one bundled asset', async () => {
  const a = app();
  const [x,y] = await Promise.all([a.ensureNationalIcCatalogV072(),a.ensureNationalIcCatalogV072()]);
  assert.equal(x, y);
  assert.equal(x.length, catalog.items.length);
  assert.equal(a.getMeta().bundled, true);
  assert.match(a.elements.get('apiUsageDiag').textContent, /アプリ同梱/);
  assert.equal(a.calls.length, 1);
});
test('discovery waits for bundle even with legacy cache; Oguraike is local', async () => {
  const a = app(catalog, catalog.items.filter(x=>x.name!=='巨椋池IC'));
  const routePath = [{lat:34.908806,lng:135.7495333},{lat:34.899,lng:135.745}];
  const pool = await a.discoverCandidatePoolV070({routePath, discoveryPoints:[routePath[0]], includeBuiltins:false, destination:'大阪'});
  assert.ok(pool.some(x=>x.name==='巨椋池IC' && x.source==='NATIONAL'));
  assert.equal(a.getMeta().bundled, true);
  assert.equal(a.calls.length,1);
});
test('old network discovery entry points never fetch', async () => {
  const a=app();
  await a.fetchOsmIcCellV070({lat:35,lng:135});
  await a.discoverInterchangesAlongRoute([],18);
  await a.fetchNavitimeIcSearch({apiKey:'test',coord:{lat:35,lng:135}});
  assert.equal(a.calls.length,0);
  assert.equal(a.usage().overpass,0);
  assert.equal(a.usage().navitimeIc,0);
});
for (const [label,payload] of [
  ['missing file',new Error('404')],
  ['incomplete metadata',{...catalog,meta:{...catalog.meta,complete:false}}],
  ['count mismatch',{...catalog,meta:{...catalog.meta,count:1}}],
  ['invalid coordinate',{...catalog,items:catalog.items.map((x,i)=>i===0?{...x,lat:null}:x)}],
]) test(label+' does not claim bundled success', async () => {
  const a=app(payload);
  assert.equal((await a.ensureNationalIcCatalogV072()).length,0);
  assert.equal(a.getMeta().bundled,false);
  assert.match(a.elements.get('apiUsageDiag').textContent,/検証失敗/);
  assert.equal(a.calls.length,1);
});
test('failed bundle labels legacy fallback honestly', async () => {
  const a=app(new Error('offline'),catalog.items);
  assert.equal((await a.ensureNationalIcCatalogV072()).length,catalog.items.length);
  assert.equal(a.getMeta().bundled,false);
  assert.match(a.elements.get('apiUsageDiag').textContent,/端末キャッシュ/);
});

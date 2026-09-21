const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

function run(points, paths) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadline-toll-graph-'));
  const p = path.join(dir, 'points.geojson');
  const q = path.join(dir, 'paths.geojson');
  const o = path.join(dir, 'out.json');
  fs.writeFileSync(p, JSON.stringify({type:'FeatureCollection',features:points}));
  fs.writeFileSync(q, JSON.stringify({type:'FeatureCollection',features:paths}));
  const r = spawnSync('python3', ['tools/build-toll-graph.py', p, q, o], {encoding:'utf8'});
  // The production script intentionally refuses tiny datasets, so invoke its
  // build_graph function directly for synthetic unit fixtures.
  const py = [
    'import json,importlib.util,sys',
    "spec=importlib.util.spec_from_file_location('m','tools/build-toll-graph.py')",
    'm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)',
    `p=json.load(open(${JSON.stringify(p)}));q=json.load(open(${JSON.stringify(q)}))`,
    'print(json.dumps(m.build_graph(p,q),ensure_ascii=False))',
  ].join(';');
  const d = spawnSync('python3', ['-c', py], {encoding:'utf8'});
  assert.equal(d.status, 0, d.stderr);
  return JSON.parse(d.stdout);
}

function point(road, order, name, lng, lat, flags={}) {
  return {
    type:'Feature',
    properties:{road_name:road,order,name,kp:order*10,is_IC:flags.ic?1:0,is_SIC:0,is_JCT:flags.jct?1:0,is_SAPA:0},
    geometry:{type:'Point',coordinates:[lng,lat]},
  };
}
function edge(road, order, source, target, km) {
  return {type:'Feature',properties:{road_name:road,order,source,target,length:km},geometry:null};
}

test('builds ordered road edges from path lengths', () => {
  const g = run(
    [point('A道',0,'AIC',135,35,{ic:true}), point('A道',1,'AJCT',135.1,35,{jct:true}), point('A道',2,'BIC',135.2,35,{ic:true})],
    [edge('A道',0,'AIC','AJCT',12.3), edge('A道',1,'AJCT','BIC',9.8)],
  );
  assert.equal(g.meta.nodeCount,3);
  assert.equal(g.meta.roadEdgeCount,2);
  assert.equal(g.meta.unresolvedPathCount,0);
  assert.deepEqual(g.edges.filter(x=>x.kind==='road').map(x=>x.km),[12.3,9.8]);
  assert.ok(g.edges.filter(x=>x.kind==='road').every(x=>x.tariff==='unknown'));
});

test('connects same colocated JCT name across road names', () => {
  const g = run(
    [
      point('A道',0,'AIC',135,35,{ic:true}),
      point('A道',1,'共通JCT',135.1,35,{jct:true}),
      point('B道',0,'共通JCT',135.1002,35.0001,{jct:true}),
      point('B道',1,'BIC',135.2,35,{ic:true}),
    ],
    [edge('A道',0,'AIC','共通JCT',10), edge('B道',0,'共通JCT','BIC',11)],
  );
  assert.equal(g.meta.transferEdgeCount,1);
  assert.equal(g.meta.transferGroupCount,1);
  const t=g.edges.find(x=>x.kind==='junction-transfer');
  assert.equal(t.km,0);
});

test('does not connect same JCT label when coordinates are far apart', () => {
  const g = run(
    [
      point('A道',0,'同名JCT',135,35,{jct:true}),
      point('B道',0,'同名JCT',140,40,{jct:true}),
    ],
    [],
  );
  assert.equal(g.meta.transferEdgeCount,0);
});

test('unresolved path fails closed instead of inventing endpoints', () => {
  const g = run(
    [point('A道',0,'AIC',135,35,{ic:true})],
    [edge('A道',0,'AIC','不存在IC',5)],
  );
  assert.equal(g.meta.roadEdgeCount,0);
  assert.equal(g.meta.unresolvedPathCount,1);
});

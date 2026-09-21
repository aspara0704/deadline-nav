const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

function py(expr) {
  const src = [
    "import importlib.util,json",
    "spec=importlib.util.spec_from_file_location('m','tools/build-osm-toll-graph.py')",
    "m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)",
    expr,
  ].join(';');
  const r=spawnSync('python3',['-c',src],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  return JSON.parse(r.stdout);
}

test('normalizes Japanese interchange names', () => {
  assert.equal(py("print(json.dumps(m.normalize_name('久御山南インターチェンジ')))"), '久御山南IC');
  assert.equal(py("print(json.dumps(m.normalize_name('八幡京田辺JCT/IC')))"), '八幡京田辺JCTIC');
});

test('splits ways at junction/shared vertices and preserves direction', () => {
  const expr = String.raw`
ways=[
 {'id':1,'tags':{'highway':'motorway','name':'A道','oneway':'yes'},'nodes':[
  {'ref':1,'lat':35,'lng':135},{'ref':2,'lat':35,'lng':135.05},{'ref':3,'lat':35,'lng':135.1}]},
 {'id':2,'tags':{'highway':'motorway_link','oneway':'no'},'nodes':[
  {'ref':2,'lat':35,'lng':135.05},{'ref':4,'lat':35.02,'lng':135.05}]}
]
junctions={2:{'name':'中央IC','ref':'2'}}
g=m.build_graph_from_records(ways,junctions,{'fixture':True})
print(json.dumps(g,ensure_ascii=False))
`;
  const g=py(expr);
  assert.equal(g.meta.nodeCount,4);
  assert.equal(g.meta.completeForPricing,false);
  assert.equal(g.junctionIndex['中央IC'].length,1);
  const road=g.edges.filter(e=>e.osmWayId===1);
  assert.equal(road.length,2);
  assert.ok(road.every(e=>e.from!==e.to));
  const link=g.edges.filter(e=>e.osmWayId===2);
  assert.equal(link.length,2);
});

test('missing oneway is treated conservatively as forward only', () => {
  const expr = String.raw`
ways=[{'id':7,'tags':{'highway':'motorway'},'nodes':[
 {'ref':1,'lat':35,'lng':135},{'ref':2,'lat':35,'lng':135.1}]}]
g=m.build_graph_from_records(ways,{})
print(json.dumps(g,ensure_ascii=False))
`;
  const g=py(expr);
  assert.equal(g.edges.length,1);
  assert.equal(g.edges[0].onewayAssumed,true);
  assert.equal(g.meta.defaultOnewayWayCount,1);
});

test('shortest path uses directed edges', () => {
  const expr = String.raw`
g={'edges':[
 {'from':0,'to':1,'km':5},{'from':1,'to':2,'km':7},{'from':0,'to':2,'km':20}
]}
d,p=m.shortest_distance(g,[0],[2])
print(json.dumps({'d':d,'n':len(p)}))
`;
  const r=py(expr);
  assert.equal(r.d,12);
  assert.equal(r.n,2);
});


test('junction access neighborhood can represent both carriageways around an IC', () => {
  const expr = String.raw`
ways=[
 {'id':1,'tags':{'highway':'motorway','oneway':'yes'},'nodes':[
  {'ref':1,'lat':35,'lng':135},{'ref':2,'lat':35,'lng':135.01},{'ref':3,'lat':35,'lng':135.02}]},
 {'id':2,'tags':{'highway':'motorway','oneway':'yes'},'nodes':[
  {'ref':4,'lat':35.002,'lng':135.02},{'ref':5,'lat':35.002,'lng':135.01},{'ref':6,'lat':35.002,'lng':135}]}
]
junctions={2:{'name':'AIC','ref':'1'},5:{'name':'AIC','ref':'1'}}
g=m.build_graph_from_records(ways,junctions)
print(json.dumps({'ids':m.junction_access_ids(g,'AIC',0.5)},ensure_ascii=False))
`;
  const r=py(expr);
  assert.ok(r.ids.length >= 4);
});

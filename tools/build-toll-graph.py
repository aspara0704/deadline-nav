#!/usr/bin/env python3
import argparse
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

SOURCE_REVISION = "523b06097594e58d2004928b032951f69bd45398"


def normalize_name(name: str) -> str:
    return ''.join(
        ch for ch in str(name or '').upper()
        .replace('ＩＣ', 'IC')
        .replace('ＪＣＴ', 'JCT')
        .replace('ＳＩＣ', 'SIC')
        if ch not in ' \t\r\n・/／-_()（）'
    )


def coord(feature):
    g = feature.get('geometry') or {}
    c = g.get('coordinates')
    if not isinstance(c, list) or len(c) < 2:
        return None
    try:
        lng, lat = float(c[0]), float(c[1])
    except (TypeError, ValueError):
        return None
    if not (math.isfinite(lat) and math.isfinite(lng)):
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    return lat, lng


def haversine_km(a, b):
    lat1, lng1 = a
    lat2, lng2 = b
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1, math.sqrt(h)))


def point_type(p):
    labels = []
    if int(p.get('is_IC') or 0):
        labels.append('IC')
    if int(p.get('is_SIC') or 0):
        labels.append('SIC')
    if int(p.get('is_JCT') or 0):
        labels.append('JCT')
    if int(p.get('is_SAPA') or 0):
        labels.append('SAPA')
    return '+'.join(labels) or 'POINT'


def build_graph(points_data, paths_data):
    nodes = []
    by_road_order = {}
    by_road_name = defaultdict(list)
    by_normalized = defaultdict(list)

    point_features = points_data.get('features') or []
    for i, feature in enumerate(point_features):
        p = feature.get('properties') or {}
        c = coord(feature)
        road = str(p.get('road_name') or '').strip()
        name = str(p.get('name') or '').strip()
        try:
            order = int(p.get('order'))
        except (TypeError, ValueError):
            continue
        if not road or not name or not c:
            continue
        lat, lng = c
        node_id = len(nodes)
        node = {
            'id': node_id,
            'name': name,
            'road': road,
            'order': order,
            'kp': float(p['kp']) if p.get('kp') is not None else None,
            'lat': round(lat, 7),
            'lng': round(lng, 7),
            'type': point_type(p),
        }
        nodes.append(node)
        by_road_order[(road, order)] = node_id
        by_road_name[(road, name)].append(node_id)
        by_normalized[normalize_name(name)].append(node_id)

    edges = []
    unresolved = []
    path_features = paths_data.get('features') or []
    for feature in path_features:
        p = feature.get('properties') or {}
        road = str(p.get('road_name') or '').strip()
        source = str(p.get('source') or '').strip()
        target = str(p.get('target') or '').strip()
        try:
            order = int(p.get('order'))
            length_km = float(p.get('length'))
        except (TypeError, ValueError):
            unresolved.append({'road': road, 'source': source, 'target': target, 'reason': 'invalid order/length'})
            continue
        if not math.isfinite(length_km) or length_km <= 0:
            unresolved.append({'road': road, 'source': source, 'target': target, 'reason': 'non-positive length'})
            continue

        a = by_road_order.get((road, order))
        b = by_road_order.get((road, order + 1))
        if a is not None and nodes[a]['name'] != source:
            a = None
        if b is not None and nodes[b]['name'] != target:
            b = None

        if a is None:
            candidates = by_road_name.get((road, source), [])
            if len(candidates) == 1:
                a = candidates[0]
        if b is None:
            candidates = by_road_name.get((road, target), [])
            if len(candidates) == 1:
                b = candidates[0]

        if a is None or b is None:
            unresolved.append({'road': road, 'source': source, 'target': target, 'order': order, 'reason': 'endpoint not resolved'})
            continue

        edges.append({
            'a': a,
            'b': b,
            'km': round(length_km, 3),
            'road': road,
            'kind': 'road',
            'tariff': 'unknown',
        })

    # Cross-road transfers are created only when the same normalized JCT name is
    # represented at nearly the same coordinate. This deliberately fails closed:
    # ambiguous/renamed junctions are left disconnected until reviewed.
    transfer_seen = set()
    transfer_groups = 0
    for key, ids in by_normalized.items():
        if not key or len(ids) < 2:
            continue
        jct_ids = [i for i in ids if 'JCT' in nodes[i]['type']]
        if len(jct_ids) < 2:
            continue
        group_added = False
        for x in range(len(jct_ids)):
            for y in range(x + 1, len(jct_ids)):
                a, b = jct_ids[x], jct_ids[y]
                if nodes[a]['road'] == nodes[b]['road']:
                    continue
                d = haversine_km((nodes[a]['lat'], nodes[a]['lng']), (nodes[b]['lat'], nodes[b]['lng']))
                if d > 1.0:
                    continue
                pair = tuple(sorted((a, b)))
                if pair in transfer_seen:
                    continue
                transfer_seen.add(pair)
                edges.append({
                    'a': pair[0],
                    'b': pair[1],
                    'km': 0.0,
                    'road': None,
                    'kind': 'junction-transfer',
                    'tariff': 'transfer',
                })
                group_added = True
        if group_added:
            transfer_groups += 1

    payload = {
        'meta': {
            'source': 'HighwayOrderedDS highway_point/highway_path',
            'sourceRevision': SOURCE_REVISION,
            'sourceUrl': 'https://github.com/yH3PO4/HighwayOrderedDS',
            'generatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'nodeCount': len(nodes),
            'edgeCount': len(edges),
            'roadEdgeCount': sum(1 for e in edges if e['kind'] == 'road'),
            'transferEdgeCount': sum(1 for e in edges if e['kind'] == 'junction-transfer'),
            'transferGroupCount': transfer_groups,
            'unresolvedPathCount': len(unresolved),
            'tariffCoverage': 'unknown-until-reviewed',
            'completeForPricing': False,
        },
        'nodes': nodes,
        'edges': edges,
        'unresolved': unresolved[:500],
    }
    return payload


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('points')
    ap.add_argument('paths')
    ap.add_argument('output')
    args = ap.parse_args()
    points = json.loads(Path(args.points).read_text(encoding='utf-8-sig'))
    paths = json.loads(Path(args.paths).read_text(encoding='utf-8-sig'))
    payload = build_graph(points, paths)
    if payload['meta']['nodeCount'] < 300:
        raise SystemExit('unexpectedly small point graph; refusing output')
    if payload['meta']['roadEdgeCount'] < 200:
        raise SystemExit('unexpectedly small road graph; refusing output')
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps(payload['meta'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

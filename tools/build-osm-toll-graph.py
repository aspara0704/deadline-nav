#!/usr/bin/env python3
"""Build a compact directed expressway topology graph from an OSM PBF extract.

This is a topology/distance prototype, not a fare database. It deliberately
keeps tariff='unknown' so no user-visible price can be computed until each
road/operator/rate class is reviewed.
"""
import argparse
import json
import math
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

try:
    import osmium
except ImportError as exc:
    raise SystemExit("pyosmium package 'osmium' is required") from exc

SELECTED_HIGHWAYS = {"motorway", "motorway_link"}


def normalize_name(value):
    s = str(value or "").upper()
    for a, b in [
        ("ＩＣ", "IC"), ("ＪＣＴ", "JCT"), ("ＳＩＣ", "SIC"),
        ("インターチェンジ", "IC"), ("ジャンクション", "JCT"),
    ]:
        s = s.replace(a, b)
    return "".join(ch for ch in s if ch not in " \t\r\n・/／-_()（）")


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


def normalize_oneway(tags):
    raw = str(tags.get("oneway") or "").lower()
    if raw in {"-1", "reverse"}:
        return -1, False
    if raw in {"no", "false", "0"}:
        return 0, False
    if raw in {"yes", "true", "1"}:
        return 1, False
    # In Japanese OSM, motorway carriageways and most motorway_link ramps are
    # drawn in driving direction. Fail conservatively by not inventing the
    # reverse edge when oneway is omitted.
    return 1, True


def build_graph_from_records(ways, junctions, source_meta=None):
    node_use = Counter()
    locations = {}
    for way in ways:
        nodes = way["nodes"]
        for item in nodes:
            ref = int(item["ref"])
            node_use[ref] += 1
            locations[ref] = (float(item["lat"]), float(item["lng"]))

    vertex_refs = set()
    for way in ways:
        refs = [int(n["ref"]) for n in way["nodes"]]
        if refs:
            vertex_refs.add(refs[0])
            vertex_refs.add(refs[-1])
    vertex_refs.update(ref for ref, count in node_use.items() if count > 1)
    vertex_refs.update(ref for ref in junctions if ref in locations)

    ordered_refs = sorted(vertex_refs)
    id_by_ref = {ref: i for i, ref in enumerate(ordered_refs)}
    nodes = []
    junction_index = {}
    for ref in ordered_refs:
        lat, lng = locations[ref]
        j = junctions.get(ref)
        item = {
            "id": id_by_ref[ref],
            "osmNodeId": ref,
            "lat": round(lat, 7),
            "lng": round(lng, 7),
        }
        if j:
            name = str(j.get("name") or "").strip()
            item["junction"] = {
                "name": name or None,
                "ref": str(j.get("ref") or "").strip() or None,
            }
            key = normalize_name(name)
            if key:
                junction_index.setdefault(key, []).append(item["id"])
        nodes.append(item)

    edges = []
    default_oneway_count = 0
    for way in ways:
        wn = way["nodes"]
        if len(wn) < 2:
            continue
        tags = way.get("tags") or {}
        direction, assumed = normalize_oneway(tags)
        if assumed:
            default_oneway_count += 1
        start_i = 0
        for i in range(1, len(wn)):
            ref = int(wn[i]["ref"])
            if ref not in vertex_refs:
                continue
            start_ref = int(wn[start_i]["ref"])
            end_ref = ref
            if start_ref == end_ref or start_ref not in id_by_ref or end_ref not in id_by_ref:
                start_i = i
                continue
            km = 0.0
            valid = True
            for k in range(start_i + 1, i + 1):
                a = (float(wn[k - 1]["lat"]), float(wn[k - 1]["lng"]))
                b = (float(wn[k]["lat"]), float(wn[k]["lng"]))
                d = haversine_km(a, b)
                if not math.isfinite(d):
                    valid = False
                    break
                km += d
            if valid and km > 0:
                base = {
                    "km": round(km, 4),
                    "road": tags.get("name") or tags.get("name:ja") or None,
                    "operator": tags.get("operator") or None,
                    "ref": tags.get("ref") or None,
                    "highway": tags.get("highway"),
                    "tollTag": tags.get("toll") or None,
                    "tariff": "unknown",
                    "osmWayId": int(way.get("id") or 0),
                    "onewayAssumed": bool(assumed),
                }
                a_id = id_by_ref[start_ref]
                b_id = id_by_ref[end_ref]
                if direction >= 0:
                    edges.append({"from": a_id, "to": b_id, **base})
                if direction <= 0:
                    edges.append({"from": b_id, "to": a_id, **base})
            start_i = i

    meta = {
        "source": "OpenStreetMap / Geofabrik extract",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "license": "ODbL-1.0",
        "attribution": "© OpenStreetMap contributors",
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "junctionNameCount": len(junction_index),
        "wayCount": len(ways),
        "defaultOnewayWayCount": default_oneway_count,
        "tariffCoverage": "unknown-until-reviewed",
        "completeForPricing": False,
    }
    if source_meta:
        meta.update(source_meta)
    return {
        "meta": meta,
        "nodes": nodes,
        "edges": edges,
        "junctionIndex": junction_index,
    }


class OSMCollector(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.ways = []
        self.junctions = {}

    def node(self, n):
        if n.tags.get("highway") != "motorway_junction":
            return
        self.junctions[int(n.id)] = {
            "name": n.tags.get("name") or n.tags.get("name:ja") or "",
            "ref": n.tags.get("ref") or "",
        }

    def way(self, w):
        highway = w.tags.get("highway")
        if highway not in SELECTED_HIGHWAYS:
            return
        nodes = []
        for nr in w.nodes:
            if not nr.location.valid():
                return
            nodes.append({
                "ref": int(nr.ref),
                "lat": float(nr.location.lat),
                "lng": float(nr.location.lon),
            })
        if len(nodes) < 2:
            return
        tags = {k: v for k, v in w.tags if k in {
            "highway", "name", "name:ja", "ref", "operator", "toll", "oneway"
        }}
        self.ways.append({"id": int(w.id), "nodes": nodes, "tags": tags})


def junction_access_ids(graph, name, radius_km=0.9):
    key = normalize_name(name)
    anchors = graph.get("junctionIndex", {}).get(key) or []
    if not anchors:
        return []
    nodes = graph.get("nodes", [])
    by_id = {int(n["id"]): n for n in nodes}
    anchor_points = []
    for node_id in anchors:
        n = by_id.get(int(node_id))
        if n:
            anchor_points.append((float(n["lat"]), float(n["lng"])))
    if not anchor_points:
        return []

    incident = set()
    for e in graph.get("edges", []):
        incident.add(int(e["from"]))
        incident.add(int(e["to"]))

    out = []
    for n in nodes:
        node_id = int(n["id"])
        if node_id not in incident:
            continue
        p = (float(n["lat"]), float(n["lng"]))
        if min(haversine_km(p, a) for a in anchor_points) <= radius_km:
            out.append(node_id)
    return out


def shortest_distance_between_junctions(graph, start_name, goal_name, radius_km=0.9):
    start_ids = junction_access_ids(graph, start_name, radius_km)
    goal_ids = junction_access_ids(graph, goal_name, radius_km)
    if not start_ids or not goal_ids:
        return None, []
    return shortest_distance(graph, start_ids, goal_ids)


def shortest_distance(graph, start_ids, goal_ids):
    import heapq
    goals = set(int(x) for x in goal_ids)
    adj = {}
    for edge in graph.get("edges", []):
        adj.setdefault(int(edge["from"]), []).append((int(edge["to"]), float(edge["km"]), edge))
    pq = [(0.0, int(s), []) for s in start_ids]
    heapq.heapify(pq)
    best = {}
    while pq:
        dist, node, path = heapq.heappop(pq)
        if dist >= best.get(node, float("inf")):
            continue
        best[node] = dist
        if node in goals:
            return dist, path
        for nxt, km, edge in adj.get(node, []):
            nd = dist + km
            if nd < best.get(nxt, float("inf")):
                heapq.heappush(pq, (nd, nxt, path + [edge]))
    return None, []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_pbf")
    ap.add_argument("output_json")
    ap.add_argument("--source-label", default="")
    args = ap.parse_args()

    collector = OSMCollector()
    collector.apply_file(args.input_pbf, locations=True)
    graph = build_graph_from_records(
        collector.ways,
        collector.junctions,
        {
            "sourceLabel": args.source_label or Path(args.input_pbf).name,
            "sourceUrl": "https://download.geofabrik.de/asia/japan.html",
        },
    )
    if graph["meta"]["nodeCount"] < 100:
        raise SystemExit("unexpectedly small motorway graph; refusing output")
    if graph["meta"]["edgeCount"] < 100:
        raise SystemExit("unexpectedly small motorway graph; refusing output")
    Path(args.output_json).write_text(
        json.dumps(graph, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(json.dumps(graph["meta"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def normalize_name(name: str, typ: str) -> str:
    raw = (name or '').strip()
    if not raw:
        return ''
    upper = raw.upper()
    if upper.endswith(('IC', 'SIC', 'JCT/IC', 'JCT')):
        return raw
    return f'{raw}SIC' if typ == '2' else f'{raw}IC'


def normalize_key(name: str) -> str:
    return ''.join(ch for ch in name.upper().replace('ＩＣ','IC').replace('ＳＩＣ','SIC') if ch not in ' \t\r\n・/／-_()（）')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('output')
    args = ap.parse_args()
    data = json.loads(Path(args.source).read_text(encoding='utf-8'))
    by_key = {}
    for feature in data.get('features', []):
        p = feature.get('properties') or {}
        coords = (feature.get('geometry') or {}).get('coordinates')
        typ = str(p.get('N06_019') or '')
        if typ not in ('1','2') or str(p.get('N06_014')) != '9999' or not isinstance(coords, list) or len(coords) < 2:
            continue
        try:
            lng, lat = float(coords[0]), float(coords[1])
        except (TypeError, ValueError):
            continue
        name = normalize_name(str(p.get('N06_018') or ''), typ)
        key = normalize_key(name)
        if not key:
            continue
        by_key[key] = {
            'id': f"national-{p.get('N06_015') or key}",
            'name': name,
            'lat': round(lat, 7),
            'lng': round(lng, 7),
            'smart': typ == '2',
        }
    items = list(by_key.values())
    payload = {
        'meta': {
            'source': 'MLIT N06 derived / HighwayOrderedDS',
            'sourceUrl': 'https://github.com/yH3PO4/HighwayOrderedDS',
            'generatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),
            'complete': True,
            'count': len(items),
            'filter': 'active N06_014=9999; type N06_019 in {1,2}',
        },
        'items': items,
    }
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'generated {len(items)} IC entries -> {args.output}')
    if len(items) < 300:
        raise SystemExit('catalog unexpectedly small; refusing to publish')

if __name__ == '__main__':
    main()

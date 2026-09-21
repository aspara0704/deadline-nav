#!/usr/bin/env python3
"""Package only verified, already bundled assets; never download IC data."""
import json
from pathlib import Path
import subprocess
import sys
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
subprocess.run(['node', '--test', 'tests/local-ic.test.cjs'], cwd=root, check=True)
version = json.loads((root / 'version.json').read_text())['version']
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / f'deadline-nav-v{version}.zip'
files = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'version.json',
         'ic-data.min.json', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
         'README.md', 'DEPLOY.md', 'IC-DATA-NOTICE.md', 'tools/ic-supplement.json']
for name in files:
    if not (root / name).is_file():
        raise SystemExit(f'Missing release asset: {name}')
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as z:
    for name in files:
        z.write(root / name, name)
with ZipFile(output) as z:
    assert z.testzip() is None
    assert z.read('ic-data.min.json') == (root / 'ic-data.min.json').read_bytes()
print(output)

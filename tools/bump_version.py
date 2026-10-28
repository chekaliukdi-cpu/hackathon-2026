"""Піднімає версію сайту однією командою.

Запускати з кореня репозиторію перед комітом, якщо змінювали CSS/JS/HTML:
    python tools/bump_version.py

Що робить:
  • збільшує число у version.json
  • оновлює <meta name="site-version"> у всіх .html (додає, якщо немає)
  • оновлює ?v=… у підключеннях assets/*.css і assets/*.js
Завдяки цьому браузери відвідувачів самі підтягнуть нову версію сайту.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
vfile = ROOT / "version.json"
v = json.loads(vfile.read_text(encoding="utf-8")).get("v", 0) + 1 if vfile.exists() else 1
vfile.write_text(json.dumps({"v": v}) + "\n", encoding="utf-8")

for f in sorted(ROOT.glob("*.html")):
    s = f.read_text(encoding="utf-8")
    s = re.sub(r'(assets/(?:css|js)/[\w.-]+\.(?:css|js))\?v=\d+"', rf'\1?v={v}"', s)
    if 'name="site-version"' in s:
        s = re.sub(r'<meta name="site-version" content="\d+">', f'<meta name="site-version" content="{v}">', s)
    else:
        s = s.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n  <meta name="site-version" content="{v}">', 1)
    f.write_text(s, encoding="utf-8")

design = ROOT / "assets/css/DESIGN.md"
if design.exists():
    d = design.read_text(encoding="utf-8")
    design.write_text(re.sub(r'((?:style\.css|main\.js)\?v=)\d+', rf'\g<1>{v}', d), encoding="utf-8")

print(f"Site version: {v}")

"""Build a complete UTF-8/base64 Vercel deployment payload from this repository.
Never include private environment files or account data.
"""
import base64
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
paths = [ROOT / p for p in ("index.html", "manifest.webmanifest", "sw.js", "icon.svg")]
paths += sorted(p for p in (ROOT / "assets").rglob("*") if p.is_file() and p.suffix in {".js", ".css"})
paths += [ROOT / p for p in ("apple-touch-icon.png", "icon-192.png", "icon-512.png")]
files = []
for path in paths:
    if not path.exists():
        raise SystemExit(f"Missing deployment asset: {path.relative_to(ROOT)}")
    binary = path.suffix == ".png"
    files.append({
        "file": path.relative_to(ROOT).as_posix(),
        "encoding": "base64" if binary else "utf-8",
        "data": base64.b64encode(path.read_bytes()).decode("ascii") if binary else path.read_text(encoding="utf-8"),
    })
out = ROOT / ".deploy" / "payload.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({"files": files}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Bundled {len(files)} public web files, {out.stat().st_size} bytes")

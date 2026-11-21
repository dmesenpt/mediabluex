#!/usr/bin/env python3
"""
Registro de cambios del agente SEO (append-only, JSONL). Cada línea permite revertir el cambio.

Ejemplos:
  python3 seo-agent/log_change.py --site clinicacaracas --check META_DESC_PRESENT \
      --url https://clinicacaracas.es/aviso-legal/ --kind post_meta --target "123:_yoast_wpseo_metadesc" \
      --before "" --after "Aviso legal de Clínica Caracas..." \
      --revert "wp post meta delete 123 _yoast_wpseo_metadesc"

  # cambios largos: pasar before/after desde fichero
  python3 seo-agent/log_change.py ... --before-file /ruta/antes.txt --after-file /ruta/despues.txt

  python3 seo-agent/log_change.py --site clinicacaracas --list          # ver últimos cambios
"""
import argparse
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--check")
    ap.add_argument("--url")
    ap.add_argument("--kind", help="post_meta | option | option_edit | content_edit | attachment_alt | term_meta | other")
    ap.add_argument("--target", help="Identificador exacto: '<post_id>:<meta_key>', '<option_name>', etc.")
    ap.add_argument("--before", default=None)
    ap.add_argument("--after", default=None)
    ap.add_argument("--before-file")
    ap.add_argument("--after-file")
    ap.add_argument("--revert", default="", help="Comando/operación exacta para deshacer el cambio")
    ap.add_argument("--note", default="")
    ap.add_argument("--status", default="applied", help="applied | verified | failed | reverted")
    a = ap.parse_args()

    log = ROOT / "changelog" / f"{a.site}.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    if a.list:
        lines = log.read_text(encoding="utf-8").splitlines() if log.exists() else []
        for ln in lines[-50:]:
            e = json.loads(ln)
            print(f"{e['ts']} [{e['status']}] {e['check']} {e['kind']} {e['target']} — {e['url']}")
        return
    before = Path(a.before_file).read_text(encoding="utf-8") if a.before_file else a.before
    after = Path(a.after_file).read_text(encoding="utf-8") if a.after_file else a.after
    entry = {
        "ts": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "site": a.site, "check": a.check, "url": a.url, "kind": a.kind, "target": a.target,
        "before": before, "after": after, "revert": a.revert, "note": a.note, "status": a.status,
    }
    with log.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"registrado: {a.check} {a.target}")


if __name__ == "__main__":
    main()

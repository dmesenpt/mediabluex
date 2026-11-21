#!/usr/bin/env python3
"""
Auditor determinista de SEO Local para sitios WordPress.

Rastrea el sitio público (robots.txt -> sitemaps -> páginas), evalúa un conjunto
fijo de comprobaciones de SEO Local / on-page y genera:

  seo-agent/reports/<site_id>/<YYYY-MM-DD>.json   (máquina: lo consume el agente)
  seo-agent/reports/<site_id>/<YYYY-MM-DD>.md     (humano)
  seo-agent/reports/<site_id>/latest.json

Uso:
  python3 seo-agent/audit.py --config seo-agent/config/clinicacaracas.json
  python3 seo-agent/audit.py --config ... --urls https://x/a/ https://x/b/   # re-verificar URLs

Código de salida: 0 si la puntuación es 100, 1 si quedan incidencias, 2 si falla el rastreo.
Solo usa la biblioteca estándar de Python 3.9+.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import ssl
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 LocalSEOAudit/1.0")
LOCAL_TYPES = {"LocalBusiness", "Dentist", "MedicalClinic", "MedicalBusiness", "Physician",
               "HealthAndBeautyBusiness", "BeautySalon", "DaySpa", "ProfessionalService"}
WEIGHT = {"error": 3, "warning": 1}
ROOT = Path(__file__).resolve().parent


# --------------------------------------------------------------------------- utils
def norm_text(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().lower()


def norm_phone(s: str) -> str:
    d = re.sub(r"[^\d+]", "", s or "")
    if d.startswith("0034"):
        d = "+" + d[2:]
    if not d.startswith("+") and len(d) == 9:
        d = "+34" + d
    return d


def strip_url(u: str) -> str:
    return urllib.parse.urldefrag(u)[0]


class Fetcher:
    def __init__(self, timeout: int):
        self.timeout = timeout
        self.ctx = ssl.create_default_context()

    def get(self, url: str, method: str = "GET"):
        """Devuelve (status, final_url, headers, body_text). Sigue redirecciones."""
        req = urllib.request.Request(url, method=method, headers={
            "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9",
            "Cache-Control": "no-cache", "Pragma": "no-cache"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout, context=self.ctx) as r:
                body = r.read().decode("utf-8", "replace") if method == "GET" else ""
                return r.status, r.geturl(), dict(r.headers), body
        except urllib.error.HTTPError as e:
            return e.code, e.geturl() if hasattr(e, "geturl") else url, dict(e.headers or {}), ""
        except Exception as e:  # red, TLS, timeout
            return 0, url, {}, f"__ERROR__ {e}"


# --------------------------------------------------------------------------- HTML
class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None
        self.title = ""
        self._in_title = False
        self.meta = {}           # name/property -> content
        self.canonical = None
        self.h1 = []
        self._h1_depth = 0
        self._h1_buf = []
        self.imgs = []
        self.links = []
        self.iframes = []
        self.jsonld_raw = []
        self._in_jsonld = False
        self._jsonld_buf = []
        self._skip = 0           # dentro de script/style
        self.text = []

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key and key not in self.meta:
                self.meta[key] = a.get("content", "")
        elif tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonical = a.get("href")
        elif tag == "h1":
            self._h1_depth += 1
            self._h1_buf = []
        elif tag == "img":
            self.imgs.append(a)
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])
        elif tag == "iframe":
            self.iframes.append(a.get("src") or a.get("data-src") or "")
        elif tag == "script":
            self._skip += 1
            if "ld+json" in a.get("type", ""):
                self._in_jsonld = True
                self._jsonld_buf = []
        elif tag in ("style", "noscript"):
            self._skip += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "h1" and self._h1_depth:
            self._h1_depth -= 1
            self.h1.append(re.sub(r"\s+", " ", "".join(self._h1_buf)).strip())
        elif tag == "script":
            self._skip = max(0, self._skip - 1)
            if self._in_jsonld:
                self.jsonld_raw.append("".join(self._jsonld_buf))
                self._in_jsonld = False
        elif tag in ("style", "noscript"):
            self._skip = max(0, self._skip - 1)

    def handle_data(self, data):
        if self._in_jsonld:
            self._jsonld_buf.append(data)
            return
        if self._in_title:
            self.title += data
        if self._h1_depth:
            self._h1_buf.append(data)
        if not self._skip:
            self.text.append(data)


def jsonld_nodes(raw_list):
    """Devuelve (nodos_planos, errores_de_parseo)."""
    nodes, errors = [], []

    def walk(o):
        if isinstance(o, list):
            for x in o:
                walk(x)
        elif isinstance(o, dict):
            if "@graph" in o:
                walk(o["@graph"])
            if "@type" in o:
                nodes.append(o)
    for raw in raw_list:
        raw = raw.strip()
        if not raw:
            continue
        try:
            walk(json.loads(raw))
        except json.JSONDecodeError as e:
            errors.append(f"{e.msg} (línea {e.lineno})")
    return nodes, errors


def types_of(node):
    t = node.get("@type", [])
    return set(t if isinstance(t, list) else [t])


def hours_set(specs):
    out = set()
    if isinstance(specs, dict):
        specs = [specs]
    for s in specs or []:
        days = s.get("dayOfWeek", [])
        days = days if isinstance(days, list) else [days]
        for d in days:
            d = str(d).rsplit("/", 1)[-1]
            o, c = str(s.get("opens", ""))[:5], str(s.get("closes", ""))[:5]
            if o == c == "00:00":   # convención schema.org/Google para "cerrado"
                continue
            out.add((d, o, c))
    return out


# --------------------------------------------------------------------------- audit
class Audit:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.base = cfg["site_url"].rstrip("/")
        self.host = cfg["canonical_host"]
        self.f = Fetcher(cfg["crawl"]["timeout_s"])
        self.issues = []
        self.checks_run = defaultdict(int)   # check_id -> nº de instancias evaluadas
        self.pages = {}
        self.inconclusive = []

    # registra una evaluación; si ok es False añade incidencia
    def check(self, cid, ok, severity, url, msg, fix="manual", hint="", evidence=None):
        self.checks_run[(cid, severity)] += 1
        if not ok:
            self.issues.append({"check": cid, "severity": severity, "fixability": fix,
                                "url": url, "message": msg, "fix_hint": hint,
                                "evidence": evidence})

    # ---------------------------------------------------------------- site level
    def site_checks(self):
        c = self.cfg
        # HTTPS + host canónico
        for variant in (f"http://{self.host}/", f"https://www.{self.host}/", f"http://www.{self.host}/"):
            st, final, _, _ = self.f.get(variant)
            if st == 0:   # no alcanzable desde este entorno (DNS/proxy): no se puntúa
                self.inconclusive.append({"check": "SITE_CANONICAL_HOST", "url": variant,
                                          "message": "No verificable desde el entorno de ejecución"})
                continue
            ok = st == 200 and urllib.parse.urlparse(final).netloc == self.host and final.startswith("https://")
            self.check("SITE_CANONICAL_HOST", ok, "error", variant,
                       f"{variant} no redirige a https://{self.host}/ (final: {final}, HTTP {st})",
                       "manual", "Configurar redirección 301 en el hosting (SiteGround > Dominio > Redirecciones / HTTPS Enforce).")

        # robots.txt
        st, _, _, robots = self.f.get(self.base + "/robots.txt")
        self.check("ROBOTS_OK", st == 200, "error", self.base + "/robots.txt",
                   f"robots.txt devuelve HTTP {st}", "auto",
                   "Yoast > Herramientas > Editor de archivos o wp option.")
        blocked = False
        ua_all = False
        for line in robots.splitlines():
            l = line.split("#")[0].strip()
            if l.lower().startswith("user-agent:"):
                ua_all = l.split(":", 1)[1].strip() == "*"
            elif ua_all and re.fullmatch(r"(?i)disallow:\s*/", l):
                blocked = True
        self.check("ROBOTS_NOT_BLOCKING", not blocked, "error", self.base + "/robots.txt",
                   "robots.txt bloquea todo el sitio (Disallow: /)", "auto")
        sm_lines = re.findall(r"(?im)^sitemap:\s*(\S+)", robots)
        self.check("ROBOTS_SITEMAP", bool(sm_lines), "warning", self.base + "/robots.txt",
                   "robots.txt no declara el sitemap", "auto",
                   "Añadir 'Sitemap: <url>/sitemap_index.xml' en robots.txt.")

        # sitemaps
        idx_url = self.base + "/sitemap_index.xml"
        st, _, _, body = self.f.get(idx_url)
        self.check("SITEMAP_INDEX", st == 200 and "<sitemapindex" in body, "error", idx_url,
                   f"sitemap_index.xml no válido (HTTP {st})", "manual",
                   "Activar mapas del sitio XML en Yoast > Ajustes > Funciones del sitio.")
        urls = []
        try:
            root = ET.fromstring(body.encode()) if body else None
        except ET.ParseError:
            root = None
        ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
        child_maps = [e.text.strip() for e in root.iter(ns + "loc")] if root is not None else []
        for sm in child_maps:
            junk = any(j in sm for j in c["crawl"]["junk_sitemaps"])
            self.check("SITEMAP_NO_JUNK", not junk, "warning", sm,
                       f"El sitemap incluye un tipo de contenido que no debe indexarse: {sm}", "auto",
                       "Yoast: wpseo_titles -> noindex-<post_type>=true y post_types-<pt>-not_in_sitemap, "
                       "o desactivar 'Mostrar en resultados de búsqueda' para ese tipo de contenido.")
            if "geo-sitemap" in sm:
                continue
            st2, _, _, b2 = self.f.get(sm)
            try:
                r2 = ET.fromstring(b2.encode())
                for loc in r2.iter(ns + "loc"):
                    u = loc.text.strip()
                    if not any(p in u for p in c["crawl"]["exclude_url_patterns"]):
                        urls.append(u)
            except ET.ParseError:
                self.check("SITEMAP_PARSE", False, "error", sm, "Sitemap hijo no es XML válido", "manual")
        for u in urls:
            junk = any(p in u for p in c["crawl"]["junk_url_patterns"])
            self.check("SITEMAP_NO_JUNK_URL", not junk, "warning", u,
                       f"URL de poco valor en el sitemap: {u}", "auto",
                       "Poner noindex (Yoast) a la taxonomía/término o vaciar/eliminar la categoría 'uncategorized' "
                       "reasignando entradas.")
        return list(dict.fromkeys(urls))[: c["crawl"]["max_pages"]]

    # ---------------------------------------------------------------- page level
    def fetch_page(self, url):
        st, final, headers, body = self.f.get(url)
        p = PageParser()
        if st == 200 and body:
            try:
                p.feed(body)
            except Exception:
                pass
        return url, st, final, headers, body, p

    def page_checks(self, url, st, final, headers, body, p: PageParser):
        c, t = self.cfg, self.cfg["thresholds"]
        biz = c["business"]
        self.check("PAGE_STATUS_200", st == 200, "error", url,
                   f"La URL del sitemap devuelve HTTP {st}", "auto",
                   "Quitar la URL del sitemap (noindex/borrador) o crear redirección 301 (Yoast Premium > Redirecciones).")
        if st != 200:
            return
        self.check("PAGE_NO_REDIRECT", strip_url(final).rstrip("/") == url.rstrip("/"), "error", url,
                   f"La URL del sitemap redirige a {final}", "auto",
                   "Actualizar enlaces/sitemap a la URL final.")
        self.check("PAGE_LANG", (p.lang or "").lower().startswith(c["lang"]), "warning", url,
                   f"Atributo lang='{p.lang}' (esperado '{c['lang']}')", "manual")

        title = re.sub(r"\s+", " ", p.title).strip()
        self.check("TITLE_PRESENT", bool(title), "error", url, "Falta <title>", "auto",
                   "Escribir meta título Yoast (_yoast_wpseo_title).")
        if title:
            self.check("TITLE_LENGTH", t["title_min"] <= len(title) <= t["title_max"], "warning", url,
                       f"Título de {len(title)} caracteres (rango {t['title_min']}-{t['title_max']}): «{title}»",
                       "auto", "Reescribir _yoast_wpseo_title incluyendo servicio + zona.", title)
        desc = p.meta.get("description", "").strip()
        self.check("META_DESC_PRESENT", bool(desc), "error", url, "Falta meta description", "auto",
                   "Escribir _yoast_wpseo_metadesc.")
        if desc:
            self.check("META_DESC_LENGTH", t["description_min"] <= len(desc) <= t["description_max"], "warning", url,
                       f"Meta description de {len(desc)} caracteres (rango {t['description_min']}-{t['description_max']})",
                       "auto", "Reescribir _yoast_wpseo_metadesc.", desc)
        for term in c.get("forbidden_terms", []):
            rx = re.compile(r"\b" + re.escape(term) + r"\b")
            hits = [f for f, v in (("title", title), ("description", desc), ("og:description", p.meta.get("og:description", ""))) if rx.search(v or "")]
            self.check("BRAND_FOREIGN", not hits, "error", url,
                       f"Aparece la marca ajena «{term}» en: {hits}", "auto",
                       "Reescribir el texto con la marca correcta (Yoast meta / wpseo_taxonomy_meta).", hits)
        robots = p.meta.get("robots", "").lower()
        self.check("PAGE_INDEXABLE", "noindex" not in robots, "error", url,
                   f"Página del sitemap con meta robots '{robots}'", "auto",
                   "Quitar _yoast_wpseo_meta-robots-noindex o sacar del sitemap si debe ser noindex.")
        canon = (p.canonical or "").strip()
        self.check("CANONICAL_SELF", canon.rstrip("/") == url.rstrip("/"), "error", url,
                   f"Canonical '{canon}' no apunta a sí misma", "auto",
                   "Vaciar/corregir _yoast_wpseo_canonical.", canon)
        n_h1 = len([h for h in p.h1 if h])
        self.check("H1_SINGLE", n_h1 == 1, "warning" if n_h1 > 1 else "error", url,
                   f"La página tiene {n_h1} H1: {p.h1[:4]}", "auto",
                   "Elementor: cambiar header_size del widget heading (h1<->h2) vía _elementor_data.")
        self.check("OG_TAGS", bool(p.meta.get("og:title")) and bool(p.meta.get("og:image")), "warning", url,
                   "Faltan og:title u og:image", "auto", "Asignar imagen destacada / imagen social Yoast.")

        # imágenes
        missing = [i.get("src") or i.get("data-src") for i in p.imgs if "alt" not in i]
        self.check("IMG_ALT_PRESENT", not missing, "error", url,
                   f"{len(missing)} imágenes sin atributo alt", "auto",
                   "Rellenar _wp_attachment_image_alt del adjunto o el alt del widget Elementor.", missing[:15])
        empty = [i.get("src") or i.get("data-src") for i in p.imgs
                 if i.get("alt", None) == "" and "/uploads/" in (i.get("src") or i.get("data-src") or "")
                 and not (i.get("src") or "").endswith(".svg")
                 and i.get("role") != "presentation" and i.get("aria-hidden") != "true"]
        self.check("IMG_ALT_DESCRIPTIVE", not empty, "warning", url,
                   f"{len(empty)} imágenes de contenido con alt vacío", "auto",
                   "Rellenar _wp_attachment_image_alt con descripción + zona cuando proceda.", empty[:15])

        # JSON-LD
        nodes, errs = jsonld_nodes(p.jsonld_raw)
        self.check("SCHEMA_VALID_JSON", not errs, "error", url, f"JSON-LD inválido: {errs}", "auto",
                   "Corregir el bloque JSON-LD (Header & Footer scripts / Elementor HTML).")

        # NAP en la página
        text = norm_text(" ".join(p.text))
        tels = {norm_phone(h[4:]) for h in p.links if h.lower().startswith("tel:")}
        allowed = {norm_phone(v) for v in biz["phones"].values()}
        self.check("NAP_PHONE_LINK", bool(tels & allowed), "warning", url,
                   "La página no tiene enlace tel: al teléfono principal", "auto",
                   "Añadir enlace tel: en cabecera/pie (Elementor footer) o CTA.")
        self.check("NAP_PHONE_CONSISTENT", not (tels - allowed), "error", url,
                   f"Enlaces tel: con números no oficiales: {sorted(tels - allowed)}", "auto",
                   "Sustituir por el teléfono de config.", sorted(tels - allowed))
        found = {norm_phone(m) for m in re.findall(r"(?:\+34[\s.]?)?[6789]\d{2}[\s.]?\d{3}[\s.]?\d{3}", " ".join(p.text))}
        stray = sorted(found - allowed)
        self.check("NAP_PHONE_TEXT", not stray, "warning", url,
                   f"Teléfonos en el texto que no coinciden con los oficiales: {stray}", "auto",
                   "Sustituir por el teléfono oficial (content/edit).", stray)
        street_key = norm_text(biz["address"]["streetAddress"]).replace("calle ", "")
        self.check("NAP_ADDRESS_VISIBLE", street_key in text and biz["address"]["postalCode"] in text, "warning", url,
                   f"La dirección ({biz['address']['streetAddress']}, {biz['address']['postalCode']}) no es visible en la página",
                   "auto", "Incluir dirección completa en el pie de página global de Elementor/tema.")

        # landing local: la zona del slug debe aparecer en título y H1
        slug = urllib.parse.urlparse(url).path.strip("/")
        for kw in c["local_landing_keywords"]:
            if kw in slug.split("/")[-1]:
                place = kw.replace("-", " ")
                self.check("LOCAL_LANDING_KEYWORD", place in norm_text(title), "warning", url,
                           f"Landing local '{slug}': la zona «{place}» no aparece en el título",
                           "auto", "Incluir la zona en _yoast_wpseo_title (servicio + zona + marca).",
                           {"title": title, "h1": p.h1})
                break

        self.pages[url] = {"title": title, "desc": desc, "nodes": nodes, "links": p.links,
                           "iframes": p.iframes, "meta": p.meta, "text": text}

    # ---------------------------------------------------------------- local schema
    def local_schema_checks(self, home):
        biz = self.cfg["business"]
        pg = self.pages.get(home) or self.pages.get(home.rstrip("/") + "/")
        if not pg:
            self.check("SCHEMA_LOCALBUSINESS", False, "error", home, "No se pudo analizar la portada", "manual")
            return
        local = [n for n in pg["nodes"] if types_of(n) & LOCAL_TYPES and n.get("address")]
        ids = sorted({n.get("@id", f"(sin @id #{i})") for i, n in
                      enumerate(x for x in pg["nodes"] if types_of(x) & LOCAL_TYPES)})
        self.check("SCHEMA_LOCALBUSINESS", bool(local), "error", home,
                   "La portada no tiene schema LocalBusiness/MedicalClinic/Dentist con dirección", "auto",
                   "Completar Yoast Local SEO (wpseo_local) o el bloque JSON-LD.")
        self.check("SCHEMA_SINGLE_ENTITY", len(ids) <= 1, "error", home,
                   f"Hay {len(ids)} entidades de negocio local distintas en la portada: {ids}. "
                   "Google puede interpretarlas como negocios diferentes.", "auto",
                   f"Unificar: el bloque manual debe usar \"@id\": \"{biz['primary_entity_id']}\" "
                   "(se fusiona con el de Yoast) o eliminar el duplicado.", ids)
        if not local:
            return
        # se evalúa la entidad principal (o la primera)
        main = next((n for n in local if n.get("@id") == biz["primary_entity_id"]), local[0])
        merged = {}
        for n in pg["nodes"]:   # si comparten @id, Google las fusiona: combinamos campos
            if n.get("@id") != main.get("@id"):
                continue
            for k, v in n.items():
                if not v:
                    continue
                if k in merged and isinstance(merged[k], list) and isinstance(v, list):
                    merged[k] = merged[k] + [x for x in v if x not in merged[k]]
                else:
                    merged.setdefault(k, v) if k in ("openingHoursSpecification",) and merged.get(k) else merged.__setitem__(k, v)
        main = merged or main
        by_id = {n.get("@id"): n for n in pg["nodes"] if n.get("@id")}
        a = main.get("address") or {}
        if isinstance(a, list):
            a = a[0] if a else {}
        if isinstance(a, dict) and set(a) == {"@id"}:
            a = by_id.get(a["@id"], {})
        for k, v in biz["address"].items():
            ok = norm_text(str(a.get(k, ""))) == norm_text(v)
            self.check("SCHEMA_NAP_ADDRESS", ok, "error", home,
                       f"address.{k} = «{a.get(k)}» (esperado «{v}»)", "auto",
                       "Corregir en Yoast Local SEO (wpseo_local) o en el JSON-LD.")
        tels = main.get("telephone", "")
        tels = [norm_phone(str(x)) for x in (tels if isinstance(tels, list) else [tels]) if x]
        mainp = norm_phone(biz["phones"]["main"])
        self.check("SCHEMA_NAP_PHONE", mainp in tels, "error", home,
                   f"telephone = «{main.get('telephone')}» no incluye el principal {biz['phones']['main']}", "auto",
                   "Yoast Local SEO: wpseo_local -> location_phone.")
        if mainp in tels:
            self.check("SCHEMA_PHONE_PRIMARY_FIRST", tels[0] == mainp, "warning", home,
                       f"El teléfono principal {biz['phones']['main']} no es el primero en telephone: {tels}", "auto",
                       "Yoast Local SEO: location_phone = principal, location_phone_2nd = WhatsApp.")
        pr = str(main.get("priceRange", ""))
        if pr:
            self.check("SCHEMA_PRICE_CURRENCY", "$" not in pr, "warning", home,
                       f"priceRange = «{pr}» usa '$' en un negocio en euros", "auto",
                       "Yoast Local SEO: location_price_range = €€.")
        self.check("SCHEMA_NAME", norm_text(str(main.get("name", ""))) == norm_text(biz["name"]), "error", home,
                   f"name = «{main.get('name')}» (esperado «{biz['name']}»)", "auto")
        g = main.get("geo") or {}
        try:
            ok = abs(float(g.get("latitude")) - biz["geo"]["latitude"]) < 0.001 and \
                 abs(float(g.get("longitude")) - biz["geo"]["longitude"]) < 0.001
        except (TypeError, ValueError):
            ok = False
        self.check("SCHEMA_GEO", ok, "error", home, f"geo = {g} no coincide con config", "auto")
        want = hours_set([{"dayOfWeek": h["days"], "opens": h["opens"], "closes": h["closes"]}
                          for h in biz["opening_hours"]])
        have = hours_set(main.get("openingHoursSpecification"))
        self.check("SCHEMA_HOURS", have == want, "error", home,
                   f"Horario en schema no coincide. Sobra: {sorted(have - want)} Falta: {sorted(want - have)}", "auto")
        for fld in ("url", "image", "priceRange"):
            self.check("SCHEMA_RECOMMENDED", bool(main.get(fld)), "warning", home,
                       f"Falta la propiedad recomendada '{fld}' en la entidad local", "auto")
        same = main.get("sameAs") or []
        same = same if isinstance(same, list) else [same]
        self.check("SCHEMA_SAMEAS_GBP", any("cid=" in s or "g.page" in s or "maps.app" in s or "share.google" in s
                                            for s in same), "warning", home,
                   "sameAs no enlaza la ficha de Google Business Profile", "auto",
                   f"Añadir {biz['gbp_url']} a sameAs.")
        # meta geo
        region = pg["meta"].get("geo.region")
        if region is not None:
            self.check("GEO_META_REGION", region == biz["geo_region"], "warning", home,
                       f"<meta name=geo.region> = «{region}» (debe ser código ISO 3166-2 «{biz['geo_region']}»)",
                       "manual", "Lo genera Yoast Local a partir del país (no configurable). Google ignora geo.*; "
                       "solo se corrige con un filtro PHP (WPCode, requiere aprobación). Prioridad baja.")
        # mapa en portada o página de contacto
        cands = [home] + [u for u in self.pages if any(cp in u for cp in self.cfg["contact_page_patterns"])]
        has_map = any(any("google.com/maps" in (s or "") or "maps.google" in (s or "") for s in self.pages[u]["iframes"] + self.pages[u]["links"])
                      for u in cands if u in self.pages)
        self.check("MAP_PRESENT", has_map, "warning", home,
                   "No hay mapa/enlace de Google Maps en portada ni en contacto", "auto",
                   "Añadir widget Google Maps (Elementor) o enlace a la ficha.")

    # ---------------------------------------------------------------- duplicados
    def duplicate_checks(self):
        for field, cid in (("title", "TITLE_UNIQUE"), ("desc", "META_DESC_UNIQUE")):
            seen = defaultdict(list)
            for u, pg in self.pages.items():
                if pg[field]:
                    seen[pg[field].lower()].append(u)
            for u, pg in self.pages.items():
                dups = [x for x in seen.get((pg[field] or "").lower(), []) if x != u]
                self.check(cid, not dups, "warning", u,
                           f"{'Título' if field == 'title' else 'Meta description'} duplicado con: {dups}",
                           "auto", "Reescribir para que sea único (servicio + zona).", dups)

    # ---------------------------------------------------------------- enlaces
    def link_checks(self):
        if not self.cfg["crawl"]["check_internal_links"]:
            return
        sources = defaultdict(set)
        for u, pg in self.pages.items():
            for h in pg["links"]:
                full = strip_url(urllib.parse.urljoin(u, h))
                pr = urllib.parse.urlparse(full)
                if pr.scheme in ("http", "https") and pr.netloc.replace("www.", "") == self.host \
                        and "/wp-content/" not in full and "/wp-admin/" not in full and "?" not in full:
                    sources[full].add(u)
        targets = list(sources)[: self.cfg["crawl"]["max_link_checks"]]
        known = {u.rstrip("/"): 200 for u in self.pages}

        def probe(t):
            if t.rstrip("/") in known:
                return t, 200
            st, _, _, _ = self.f.get(t)
            return t, st
        with ThreadPoolExecutor(8) as ex:
            for t, st in ex.map(probe, targets):
                ok = 200 <= st < 400
                self.check("INTERNAL_LINK_OK", ok, "error", t,
                           f"Enlace interno roto (HTTP {st}) enlazado desde {len(sources[t])} página(s)", "auto",
                           "Corregir el href en origen (content/edit) o crear redirección 301 en Yoast Premium.",
                           sorted(sources[t])[:10])

    # ---------------------------------------------------------------- run
    def run(self, only_urls=None):
        urls = self.site_checks() if not only_urls else only_urls
        home = self.base + "/"
        if home not in urls:
            urls = [home] + urls
        with ThreadPoolExecutor(6) as ex:
            for res in ex.map(self.fetch_page, urls):
                self.page_checks(*res)
        if not only_urls:
            self.local_schema_checks(home)
            self.duplicate_checks()
            self.link_checks()
        return self.report(urls)

    def report(self, urls):
        total = sum(WEIGHT[sev] * n for (_, sev), n in self.checks_run.items())
        lost = sum(WEIGHT[i["severity"]] for i in self.issues)
        score = round(100 * (1 - lost / total), 1) if total else 0.0
        by_check = defaultdict(int)
        for i in self.issues:
            by_check[i["check"]] += 1
        return {
            "site": self.cfg["site_url"], "site_id": self.cfg["site_id"],
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "pages_crawled": len(urls), "checks_evaluated": sum(self.checks_run.values()),
            "score": score,
            "summary": {
                "errors": sum(1 for i in self.issues if i["severity"] == "error"),
                "warnings": sum(1 for i in self.issues if i["severity"] == "warning"),
                "auto_fixable": sum(1 for i in self.issues if i["fixability"] == "auto"),
                "manual": sum(1 for i in self.issues if i["fixability"] == "manual"),
                "by_check": dict(sorted(by_check.items(), key=lambda kv: -kv[1])),
            },
            "inconclusive": self.inconclusive,
            "issues": sorted(self.issues, key=lambda i: (i["severity"] != "error", i["check"], i["url"])),
        }


def to_markdown(r):
    s = r["summary"]
    out = [f"# Auditoría SEO Local — {r['site']}",
           f"_Generada: {r['generated_at']}_\n",
           f"**Puntuación: {r['score']} / 100** · Páginas: {r['pages_crawled']} · Comprobaciones: {r['checks_evaluated']}",
           f"· Errores: {s['errors']} · Avisos: {s['warnings']} · Auto-reparables: {s['auto_fixable']} · Manuales: {s['manual']}\n",
           "## Resumen por comprobación", "| Comprobación | Incidencias |", "|---|---|"]
    out += [f"| `{k}` | {v} |" for k, v in s["by_check"].items()]
    out.append("\n## Incidencias")
    for i in r["issues"]:
        icon = "🔴" if i["severity"] == "error" else "🟡"
        out.append(f"- {icon} **{i['check']}** ({i['fixability']}) — {i['url']}\n  - {i['message']}"
                   + (f"\n  - _Cómo arreglar:_ {i['fix_hint']}" if i["fix_hint"] else ""))
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--urls", nargs="*", help="Re-verificar solo estas URLs (comprobaciones por página)")
    ap.add_argument("--out", default=str(ROOT / "reports"))
    ap.add_argument("--no-save", action="store_true")
    a = ap.parse_args()
    cfg = json.loads(Path(a.config).read_text(encoding="utf-8"))
    rep = Audit(cfg).run(a.urls)
    if rep["pages_crawled"] == 0:
        print("ERROR: no se pudo rastrear ninguna página", file=sys.stderr)
        sys.exit(2)
    if not a.no_save and not a.urls:
        d = Path(a.out) / cfg["site_id"]
        d.mkdir(parents=True, exist_ok=True)
        day = rep["generated_at"][:10]
        (d / f"{day}.json").write_text(json.dumps(rep, ensure_ascii=False, indent=2), encoding="utf-8")
        (d / f"{day}.md").write_text(to_markdown(rep), encoding="utf-8")
        (d / "latest.json").write_text(json.dumps(rep, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Informe: {d / (day + '.md')}")
    s = rep["summary"]
    print(f"Puntuación {rep['score']}/100 · errores {s['errors']} · avisos {s['warnings']} · "
          f"auto {s['auto_fixable']} · manual {s['manual']}")
    for k, v in s["by_check"].items():
        print(f"  {k:28s} {v}")
    if a.urls:
        print(json.dumps(rep["issues"], ensure_ascii=False, indent=1))
    sys.exit(0 if rep["score"] == 100 else 1)


if __name__ == "__main__":
    main()

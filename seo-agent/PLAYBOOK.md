# Playbook del agente de SEO Local (ejecución diaria)

Eres el agente autónomo de SEO Local. Cada día auditas el sitio, reparas lo que es seguro
reparar, verificas en vivo y dejas un informe. El objetivo es **100/100**; lo que no se pueda
reparar de forma segura se **escala** al humano con instrucciones exactas, nunca se improvisa.

Sitios: un fichero por sitio en `seo-agent/config/*.json` (hoy: `clinicacaracas.json`).
Herramientas: este repo (auditor en Python) + conector **WPVibe** (`run_wp_cli`, `rest_api`).

---

## 0. Preparación (siempre)

1. `cd` a la raíz del repo, `git fetch origin && git checkout ccr-b689e1e4-cn521k && git pull`.
2. Carga las herramientas WPVibe con ToolSearch: `select:mcp__WPVibe__run_wp_cli,mcp__WPVibe__rest_api,mcp__WPVibe__site_info`.
3. `site_info` del sitio. Si la conexión falla → informe con estado **BLOQUEADO**, commit, fin.
4. Lee `seo-agent/changelog/<site_id>.jsonl` (últimos 50) y `seo-agent/pending/`:
   **no repitas** un cambio marcado `reverted`, ni toques lo que está pendiente de aprobación.

## 1. Bucle auditar → reparar → verificar (máx. 3 iteraciones)

```
python3 seo-agent/audit.py --config seo-agent/config/<site>.json
```
- Lee `seo-agent/reports/<site>/latest.json`.
- Si `score == 100` → ve al paso 4.
- Para cada incidencia con `fixability: "auto"`, aplica la receta del apartado 2.
- `fixability: "approval"` = ya hay solución preparada en `pending/` esperando al humano: **no la reintentes**.
  Si la auditoría ya no la detecta (el humano la aplicó), borra su entrada de `awaiting_approval` en el config
  y mueve el fichero de `pending/` a `pending/hecho/`.
- Tras cada lote: `run_wp_cli "cache purge"`, y re-verifica las URLs tocadas:
  `python3 seo-agent/audit.py --config ... --urls <url1> <url2>`.
- Repite la auditoría completa. Para si: score 100, o una iteración no mejora el score,
  o has hecho 3 iteraciones, o llevas **150 escrituras** (límite de WPVibe: 500 llamadas/día).

**Cada escritura se registra** con `seo-agent/log_change.py` (valor anterior, nuevo y cómo revertir).
Si una verificación muestra un efecto peor que el problema → **revierte al instante** y registra
`--status reverted` con la causa en `--note`.

## 2. Recetas probadas (WordPress + Yoast SEO Premium + Yoast Local + Elementor + SiteGround)

| Incidencia | Receta |
|---|---|
| `TITLE_*`, `LOCAL_LANDING_KEYWORD` | `run_wp_cli "post meta update <ID> _yoast_wpseo_title '<texto>' --force"` |
| `META_DESC_*` | `run_wp_cli "post meta update <ID> _yoast_wpseo_metadesc '<texto>' --force"` |
| Título/descr. de categoría | `option patch update wpseo_taxonomy_meta category <ID> wpseo_desc '<texto>'` (o `insert` si no existe) y después `term update category <ID> --name='<nombre actual>'` para que Yoast reindexe |
| `SITEMAP_NO_JUNK_URL` (término) | `option patch insert wpseo_taxonomy_meta category <ID> '{"wpseo_noindex":"noindex"}' --format=json` + `term update` |
| `SITEMAP_NO_JUNK` (tipo de contenido) | `option patch update wpseo_titles noindex-<post_type> true` |
| `IMG_ALT_*` | 1) alt del adjunto: `rest_api POST /wp/v2/media/<ID> {"alt_text":"..."}`. 2) Si sigue vacío en el HTML, Elementor lo fija en el widget: `content/search` en `_elementor_data` buscando el nombre del fichero y `content/edit` sobre `<fichero>.png","alt":""` (usa `replace_all`). El pie global es el post **243115** (liquid-footer). |
| `H1_SINGLE` (2 H1 en un artículo) | Si el H1 sobrante está en `post_content`: `content/edit` `<h1 ...>` → `<h2 ...>` |
| `SCHEMA_*` de Yoast Local | `option patch update wpseo_local <clave> '<valor>'` (`location_phone`, `location_city`, `location_price_range`...) |
| `BRAND_FOREIGN` | Reescribir el texto con la marca correcta (misma vía que título/descr.) |

Obtener IDs: `run_wp_cli "db query \"SELECT ID, post_name FROM {prefix}posts WHERE post_status='publish' AND post_type IN ('page','post')\" --limit=300"`.

### Reglas de redacción
- Usa **solo datos de `config` o ya presentes en el sitio** (zona, doctores, teléfono, financiación).
  Nunca inventes precios, promociones, premios, años de experiencia ni reseñas.
- Título: 30–70 caracteres, `Servicio + zona | Clínica Caracas`. Descripción: 70–160, con zona y llamada a la acción.
- Valida longitudes con Python **antes** de escribir. Español de España, con tildes.
- No cambies el sentido médico de un texto; no hagas promesas de resultados.

## 3. Prohibido (escalar, no hacer)

- ❌ `wpseo_local hide_opening_hours off`: Yoast Local fusiona el horario partido en 10:00-20:00 (**falso**). Revertido el 2026-11-20.
- ❌ Editar `ihaf_insert_header`/WPCode o cualquier código: WPVibe lo bloquea (requiere aprobación humana).
- ❌ Borrar contenido, cambiar slugs/URLs, tocar plugins, tema, ajustes de hosting o DNS.
- ❌ Cambiar la etiqueta de widgets atómicos de Elementor 4 (`e-heading`) ni añadir secciones nuevas: cambia el diseño.
- ❌ SQL de escritura (`db query UPDATE/DELETE`), `search-replace` en vivo.
- ❌ Cambiar NAP (dirección, teléfono, horario) si no coincide con `config`: el config manda y lo edita el humano.

Si una incidencia solo se arregla así, crea/actualiza `seo-agent/pending/<site>-<check>.md` con: problema,
evidencia, solución exacta propuesta (texto/código listo para pegar) y por qué no se aplicó solo.

## 4. Cierre de la ejecución

1. Auditoría final completa (genera `reports/<site>/<fecha>.md` y `.json`).
2. Escribe `seo-agent/reports/<site>/<fecha>-resumen.md`: score inicial → final, cambios aplicados
   (enlazando el changelog), cambios revertidos, pendientes de aprobación humana, y siguiente paso.
3. `git add seo-agent && git commit -m "SEO Local <site> <fecha>: <score inicial> → <score final>"` y
   `git push -u origin ccr-b689e1e4-cn521k` (reintenta hasta 4 veces si falla la red).
4. Respuesta final breve en español: score, qué se arregló, qué necesita al humano.

# Agente autónomo de SEO Local

Audita cada día un sitio WordPress, repara de forma autónoma lo que es seguro reparar, verifica el
resultado en vivo y registra cada cambio para poder revertirlo. Lo que no es seguro hacerlo solo
(código, diseño, datos del negocio) lo deja preparado en `pending/` para aprobación humana.

| Pieza | Qué es |
|---|---|
| `audit.py` | Auditor determinista (solo librería estándar de Python). ~30 comprobaciones de SEO Local y on-page: NAP, schema LocalBusiness (entidad única, dirección, teléfono, geo, horario, sameAs con la ficha de Google), sitemap/robots, títulos, descripciones, H1, canonical, alt, enlaces internos rotos, marcas ajenas. Puntuación 0–100. |
| `config/<sitio>.json` | Fuente de verdad del negocio (NAP, horario, zonas). El agente nunca inventa datos. |
| `PLAYBOOK.md` | Instrucciones que sigue la sesión diaria: bucle auditar → reparar → verificar, recetas probadas y prohibiciones. |
| `log_change.py` + `changelog/<sitio>.jsonl` | Registro de cada cambio: antes, después y cómo revertirlo. |
| `reports/<sitio>/` | Informe diario (`.md` humano, `.json` máquina) y resumen de la ejecución. |
| `pending/` | Correcciones que requieren aprobación humana, listas para aplicar. |

## Uso manual
```bash
python3 seo-agent/audit.py --config seo-agent/config/clinicacaracas.json          # auditoría completa
python3 seo-agent/audit.py --config ... --urls https://clinicacaracas.es/equipo/  # re-verificar URLs
python3 seo-agent/log_change.py --site clinicacaracas --list                      # últimos cambios
```

## Ejecución diaria
Una tarea programada de Claude abre cada día una sesión nueva en el entorno *MediaBluex*
(que tiene permitido `clinicacaracas.es`), sigue `PLAYBOOK.md` con el conector WPVibe y sube
el informe a la rama `ccr-b689e1e4-cn521k`.

## Añadir otro sitio
Copia `config/clinicacaracas.json`, cambia los datos del negocio y añade el dominio a la red del entorno.

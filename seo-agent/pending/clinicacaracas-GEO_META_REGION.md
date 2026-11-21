# Pendiente (prioridad baja): `<meta name="geo.region" content="España">`

Lo genera Yoast Local SEO a partir del país y no es configurable. Debería ser `ES-MD`.
Google **ignora** las etiquetas `geo.*`, así que el impacto es nulo. Solo se corrige con un filtro PHP
(WPCode → snippet PHP, requiere aprobación). Recomendación: dejarlo así.

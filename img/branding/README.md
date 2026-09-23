# Marca: Ad Astra Mentis

Identidad propuesta el 2026-09-23 (docs/21 y docs/22). Todo lo de esta carpeta
sale de `branding.png` (la lamina generada) y de `trace.svg` (el trazado de
Gabino sobre el logo, un solo path). Los SVG de abajo son recortes de ese
trazado, trasladados al origen y con `fill="currentColor"`: el color lo pone
quien lo usa (CSS `color`), asi que sirven en oscuro, en claro y en monocromo.

| Archivo | Que es | Para que |
|---|---|---|
| `isotipo.svg` | simbolo completo: paginas, estrella, arco y destellos | cabeceras, marca en pantalla, a partir de 48 px |
| `isotipo-mini.svg` | solo paginas y estrella, sin arco ni destellos | favicon, icono de app, sello en fichas: a 24 px el arco y los destellos se vuelven ruido |
| `wordmark.svg` | AD ASTRA (con reglas) + MENTIS + ornamento | textos de marca sin simbolo |
| `logo-vertical.svg` | isotipo + wordmark apilados | portada, presentaciones |
| `logo-horizontal.svg` | isotipo + wordmark en fila | barra superior, pie, correo |
| `icono-app-512.png` | isotipo sobre Cosmic Black, relleno Starlight | icono de la app (Expo), Play |
| `favicon-32.png`, `favicon-16.png` | isotipo-mini sobre Cosmic Black | favicon de la web |

Lo que NO esta aqui y hace falta si la marca se adopta: el tagline ("Worlds
born from imagination") no se recorto porque el trazado rompio las letras
pequeñas; se compone como texto. Y el trazado es automatico: para registro,
imprenta o tamaños grandes conviene que una persona lo redibuje en vector
limpio (menos nodos, curvas simetricas). Para pantalla, tal como esta, vale.

Paleta (docs/22): Cosmic Black #0B0B12, Graphite #1F1F2E, Violet #7C3AED,
Nebula #A78BFA, Starlight #E5E7FF, Ivory #F8F7F4. El trazado original venia en
#362E66; en producto se usa Starlight sobre oscuro y Cosmic Black sobre claro.

## Propuesta de Home (`hero.png`, 23-09)

Lamina generada por GPT con la estructura del Home (hero, propuesta de valor,
mundos destacados, como funciona, comunidad, CTA final) y su version movil.
**Es direccion de arte y wireframe, no material de produccion**: los iconos se
hacen como SVG propios con el sistema geometrico de docs/22 (lo pidio el propio
GPT), el texto tiene erratas de generador ("AASTRA", "ASTRIA"), y hay contenido
que no puede ir en el Home publico: la tarjeta "Teyvat" es el mundo de Genshin
Impact (docs/07 y docs/22 lo prohiben), los personajes del hero recuerdan a esa
franquicia, y "La Boticaria" y "La Mascarada" son packs privados con contenido
de terceros que no se enseñan con su arte. Lo que se conserva: el orden de
secciones, la frase, los CTA y la idea de tarjetas de mundos.

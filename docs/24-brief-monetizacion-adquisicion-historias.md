# 24 - Brief de producto: monetización, adquisición y economía de historias

## Estado

**Brief de producto para análisis arquitectónico y de negocio.**

Este documento no pretende cerrar arquitectura, pricing ni estrategia comercial. Es un brief de intención para que **Claude, como arquitecto del proyecto, lo analice, cuestione y formalice** cuando una idea requiera consecuencias técnicas.

Fecha: 2026-09-23.

---

## 1. La hipótesis central

La hipótesis comercial que queremos explorar es que **Ad Astra Mentis no debe venderse principalmente como "un RPG con IA"**.

La tecnología subyacente sí es un motor RPG agnóstico, con reglas, eventos, campañas, Content Packs y Narrative Providers.

Pero la promesa que puede entender una audiencia mucho mayor es:

> **Una historia donde tú decides qué sucede.**

Una formulación de marketing especialmente importante para explorar:

> **"Una novela ligera donde tú eres la protagonista."**

Esto puede abrir la puerta a personas que no conocen D&D, no se consideran jugadores de RPG y, sin embargo, consumen:

- anime;
- manga;
- novelas ligeras;
- visual novels;
- otome;
- fantasía;
- romance;
- misterio;
- terror;
- roleplay;
- historias interactivas.

No se debe convertir esta hipótesis en una decisión de producto antes de validarla.

---

## 2. No confundir producto, tecnología y categoría

Queremos mantener separadas tres capas:

### Tecnología

**RPG engine + rulesets + narrative providers + Content Packs + campaign/event model.**

### Producto

**Ad Astra Mentis / Mentis:** una plataforma para vivir historias interactivas persistentes, solo o con amigos.

### Comunicación

Diferentes puertas de entrada a la misma tecnología:

- "Vive una historia que responde a tus decisiones."
- "Una novela donde tú decides."
- "Una aventura que recuerda lo que hiciste."
- "Juega una historia con tus amigos."
- "Crea tu propio mundo."

La arquitectura no debe depender de una única categoría de marketing.

---

## 3. Monetización: hipótesis inicial

El modelo actual tiene:

- créditos/turnos de prepago;
- el anfitrión paga los turnos;
- los invitados consumen el saldo;
- BYOK/API propia;
- Content Packs / mundos como unidad potencial de contenido.

Queremos estudiar un modelo con tres fuentes principales:

### A. Créditos / turnos

El usuario paga por la capacidad de ejecutar narrativa asistida por un proveedor.

La economía debe seguir el principio:

> El coste de inferencia escala con los eventos narrativos, no con el número de jugadores que reciben la misma proyección.

### B. Mundos premium

El usuario no compra un archivo .rpgpack.

Compra acceso/propiedad de un **World/Product** presentado como producto:

- portada;
- título;
- descripción;
- género;
- número de jugadores;
- duración estimada;
- dificultad;
- idioma;
- autor;
- capturas;
- personajes;
- lugares;
- tags;
- sinopsis sin spoilers;
- versión;
- historial de actualización;
- compatibilidad;
- precio;
- estado de disponibilidad.

El .rpgpack es el artefacto técnico detrás del producto.

### C. Marketplace de creadores

En una fase posterior, autores externos pueden publicar mundos.

El modelo debe separar:

**World/Product**
de
**Pack Version**

y mantener versiones de pack inmutables para que una campaña existente no cambie de significado.

La monetización del marketplace puede incluir comisión de plataforma, pero el porcentaje concreto no debe cerrarse en este brief.

---

## 4. BYOK / API de terceros

La capacidad existente de permitir que un usuario utilice su propia API debe analizarse como una **opción avanzada**, no necesariamente como un problema de monetización.

Hipótesis:

- usuario normal: usa proveedores administrados por Mentis y consume créditos;
- usuario avanzado: puede usar BYOK;
- BYOK reduce nuestro coste variable porque el usuario paga directamente al proveedor;
- BYOK puede aumentar adopción entre creadores, usuarios técnicos y experimentadores;
- BYOK no debería obligar a conocer conceptos técnicos para jugar.

Por tanto:

> **No eliminar BYOK simplemente para forzar monetización.**

Claude debe analizar:

- si BYOK necesita límites;
- qué capacidades pueden quedar excluidas de BYOK;
- si algún contenido premium debe requerir infraestructura administrada;
- cómo se evita que BYOK destruya la economía del producto;
- cómo se comunican los costes al usuario;
- qué datos siguen pasando por Mentis aunque el LLM sea pagado por el usuario.

---

## 5. "El mundo" y "los turnos" son productos diferentes

Una hipótesis comercial importante:

> **El mundo es el objeto emocional. Los turnos son el combustible.**

Un usuario puede querer comprar:

- una historia;
- un universo;
- personajes;
- una campaña;
- una experiencia temática.

Y posteriormente consumir créditos para vivirla.

No debemos tratar el marketplace como un simple repositorio de archivos.

Conceptualmente:

    World / Product
          |
          +-- Pack Version
          |
          +-- Product metadata
          |
          +-- Pricing / ownership
          |
          +-- Collection
          |
          +-- Campaigns created from it

Una campaña debe quedar vinculada a una versión inmutable del contenido.

---

## 6. Catálogo como tienda/comunidad, no como "RPGPack catalog"

El catálogo actual debe analizarse desde esta perspectiva.

El usuario debería descubrir:

- mundos;
- autores;
- géneros;
- etiquetas;
- populares;
- nuevos;
- recomendados;
- gratuitos;
- premium.

Y tener conceptos diferenciados:

- **Añadir a mi colección**
- **Favorito**
- **Lista de deseos**
- **Compartir con amigos**
- **Jugar**
- eventualmente **Comprar**

No queremos convertir inicialmente Mentis en una red social generalista.

La unidad social principal debería ser:

> **un mundo + la intención de jugarlo.**

Funciones sociales futuras pueden incluir:

- compartir un mundo con amigos;
- ver que amigos quieren jugarlo;
- crear una mesa a partir de un mundo;
- invitar directamente desde el mundo;
- eventualmente reseñas de personas que realmente jugaron.

---

## 7. Contenido generado por las partidas como motor de adquisición

Existe una oportunidad que debe analizarse arquitectónicamente:

Una sesión de Mentis produce una narración.

Una narración puede convertirse, con consentimiento, en contenido publicable.

Propuesta conceptual:

### Historias Ad Astra Mentis

Un canal propio donde se publican las mejores historias surgidas de partidas reales.

Formatos posibles:

- historia narrada;
- episodio de 10–30 minutos;
- resumen cinematográfico;
- Shorts;
- clips de decisiones;
- escenas ilustradas;
- "¿qué habrías hecho tú?";
- compilaciones temáticas.

La idea no es publicar todas las sesiones.

Debe existir selección editorial o automática de sesiones/momentos con interés narrativo.

---

## 8. El flywheel de contenido

Hipótesis:

    Jugar
      |
      v
    Ocurre una historia memorable
      |
      v
    Jugadores autorizan compartirla
      |
      v
    Historia Ad Astra Mentis
      |
      v
    YouTube / Shorts / redes
      |
      v
    Nuevo usuario descubre Mentis
      |
      v
    Juega su propia historia
      |
      v
    Produce nuevo contenido

Esto podría convertir parte del uso del producto en marketing.

Claude debe analizar qué capacidades técnicas hacen falta para soportarlo sin convertirlo prematuramente en una plataforma de publicación.

---

## 9. Exportación de narración

Existe actualmente una deuda/capacidad pendiente relacionada con una crónica pública de campaña.

Queremos estudiar una funcionalidad formal de:

**Export / Chronicle**

que permita generar una representación presentable de una sesión o campaña.

Debe distinguir:

- exportación privada para el jugador;
- enlace compartible;
- publicación pública;
- selección de sesiones para el canal oficial.

Debe contemplar:

- consentimiento de todos los participantes cuando corresponda;
- atribución;
- anonimización opcional;
- eliminación de información privada;
- spoilers;
- personajes;
- contenido creado por usuarios;
- derechos sobre el contenido;
- retirada posterior;
- contenido generado por IA;
- moderación.

No debe exponerse directamente el event store ni una proyección interna sin sanitización.

---

## 10. YouTube y vídeo como parte del producto, no solo publicidad

Queremos estudiar una estrategia de contenido propio.

No se debe asumir que necesitamos inmediatamente una gran inversión publicitaria.

La primera fase puede validar:

- si las historias son interesantes para terceros;
- qué géneros generan más clics;
- qué duración funciona;
- qué thumbnails funcionan;
- qué porcentaje llega a probar Mentis;
- qué porcentaje vuelve a jugar.

La producción puede comenzar de forma ligera:

1. narración;
2. imágenes/arte;
3. música/ambiente;
4. edición;
5. subtítulos.

La generación de ilustraciones puede apoyarse en herramientas externas durante la fase de validación.

No se debe convertir la producción audiovisual en una dependencia técnica del producto.

---

## 11. Público objetivo y geografía

La observación de que México puede tener menor familiaridad con RPG debe tratarse como **hipótesis de mercado**, no como hecho establecido.

La hipótesis que queremos validar es distinta:

> El producto podría tener una audiencia inicial más accesible en mercados donde ya existe una cultura fuerte de RPG, gaming, anime, fantasy y contenido digital de pago.

Estados Unidos es una hipótesis especialmente relevante por:

- tamaño de mercado;
- cultura de gaming;
- familiaridad con RPG;
- capacidad de gasto potencial;
- ecosistemas de Steam/PC;
- creadores de contenido.

Pero también deben considerarse otros mercados internacionales.

México puede funcionar como:

- mercado de validación cercano;
- comunidad inicial;
- mercado de habla hispana;
- fuente de creadores y feedback.

**No se debe diseñar la estrategia comercial asumiendo que México es demasiado pequeño ni que Estados Unidos necesariamente funcionará. Ambas son hipótesis que necesitan datos.**

Claude debe separar:

- mercado inicial;
- idioma;
- adquisición;
- pricing por región;
- costes de pago;
- impuestos;
- localización;
- soporte;
- distribución.

---

## 12. Steam y Epic: distribución, no solución mágica de adquisición

El brief docs/23-brief-distribucion-pc.md ya plantea el análisis de Steam y Epic.

Este documento añade una advertencia de negocio:

> No debemos asumir que entrar en Steam/Epic automáticamente resuelve la adquisición de usuarios.

Las tiendas pueden ampliar distribución, pero también implican:

- trabajo de integración;
- builds;
- QA;
- assets;
- certificación/revisión;
- soporte;
- potenciales comisiones;
- integración de identidad;
- requisitos legales;
- mantenimiento.

Por tanto:

**Steam/Epic deben entrar cuando la economía y el producto justifiquen el coste, no como condición previa para demostrar product-market fit.**

---

## 13. Adquisición: primero demostrar conversión, después comprar tráfico

No queremos establecer todavía una meta arbitraria de 3,000 MAU como criterio de éxito.

La primera pregunta es:

> ¿Puede Mentis conseguir usuarios que prueben el producto, terminen una historia y quieran volver?

Métricas iniciales a estudiar:

- visitante → registro;
- registro → primera mesa;
- primera mesa → primer turno;
- primera sesión → segunda sesión;
- sesiones por usuario;
- jugadores invitados por usuario;
- conversión a compra;
- créditos consumidos;
- mundos añadidos a colección;
- wishlist → compra;
- sesiones compartidas;
- historias publicadas;
- contenido generado por usuario;
- coste de adquisición;
- ingreso por usuario;
- margen de contribución.

Un grupo pequeño de usuarios recurrentes puede ser más informativo que una gran cantidad de registros sin actividad.

---

## 14. Fases propuestas para validación

### Fase A — Validar la fantasía

Objetivo:

> ¿Una persona entiende el producto y quiere probarlo aunque nunca haya jugado D&D?

Crear:

- varios mundos muy distintos;
- landing orientada a historia;
- demos de turnos;
- vídeos cortos;
- primeras historias.

No invertir fuerte en publicidad.

### Fase B — Validar retención y monetización

Objetivo:

> ¿Una persona juega otra historia y está dispuesta a pagar?

Probar:

- créditos;
- mundos premium;
- bundles;
- colección;
- wishlist;
- BYOK;
- precios.

### Fase C — Validar contenido comunitario

Objetivo:

> ¿Los usuarios quieren compartir sus mundos e historias?

Probar:

- publicación de crónicas;
- compartir sesiones;
- catálogo;
- favoritos/wishlist;
- autores.

### Fase D — Escalar adquisición

Solo después de encontrar señales claras:

- creadores;
- YouTube;
- Shorts/TikTok;
- campañas pagadas;
- Steam;
- Epic;
- partnerships.

---

## 15. Lo que NO debemos construir todavía

Este brief no debe provocar una explosión de alcance.

Claude debe identificar explícitamente qué queda fuera.

Hipótesis de cosas que no debemos construir solo por esta idea:

- red social completa;
- chat social general;
- feed infinito;
- sistema de followers complejo;
- marketplace financiero completo antes de validar ventas;
- producción profesional de vídeo como infraestructura;
- integración simultánea profunda con todas las tiendas;
- sistema de reseñas sofisticado antes de tener suficientes usuarios;
- publicidad propia;
- recomendador ML complejo;
- programa de creadores completo;
- herramientas avanzadas de edición audiovisual.

---

## 16. Arquitectura conceptual que debemos proteger

Queremos mantener estas separaciones:

    PRODUCTO
      |
      +-- World / Product
      |      |
      |      +-- Pack Version (immutable)
      |
      +-- Collection / Wishlist
      |
      +-- Campaign
      |
      +-- Chronicle / Export
      |
      +-- Credits / Commerce
      |
      +-- Creator / Attribution

Y:

    DISTRIBUCIÓN
      |
      +-- Web
      +-- Mobile
      +-- Steam
      +-- Epic

Y:

    NARRATIVE PROVIDERS
      |
      +-- Managed providers
      +-- BYOK
      +-- Future providers

Ninguna de estas capas debería convertirse accidentalmente en la otra.

---

## 17. Preguntas que Claude debe responder

1. ¿El modelo actual de créditos sigue siendo compatible con mundos premium?
2. ¿Cómo debe modelarse World/Product frente a Pack Version?
3. ¿Qué significa "ownership" de un mundo?
4. ¿Cómo funciona la colección del usuario?
5. ¿Cómo funcionan wishlist y favoritos sin crear una red social prematura?
6. ¿Cómo puede un usuario compartir un mundo con amigos?
7. ¿Qué cambia si un mundo es gratuito, premium o creado por la comunidad?
8. ¿Cómo se puede introducir revenue share para creadores posteriormente?
9. ¿BYOK perjudica o mejora la economía unitaria?
10. ¿Qué límites o condiciones debería tener BYOK?
11. ¿Cómo se registra y exporta una crónica sin exponer el event store?
12. ¿Cómo se obtiene consentimiento para publicar una sesión multijugador?
13. ¿Qué datos deben anonimizarse?
14. ¿Cómo se retira una historia publicada?
15. ¿Cómo puede una historia convertirse en contenido de YouTube sin crear una dependencia fuerte del producto?
16. ¿Qué parte de esta visión requiere cambios en API, web, engine o modelo de datos?
17. ¿Qué puede validarse con el sistema actual?
18. ¿Qué debe esperar hasta después de product-market fit?
19. ¿Qué mercados deben investigarse primero?
20. ¿Qué métricas debemos instrumentar antes de invertir en marketing?
21. ¿Qué modelo de monetización permite pagar infraestructura, servicios de IA, legal, contabilidad, impuestos y una remuneración sostenible del creador del producto?
22. ¿Qué supuestos económicos actuales necesitan medición real antes de usarse para decidir?

---

## 18. Resultado esperado

Claude debe devolver una propuesta que diferencie claramente:

- visión;
- hipótesis;
- decisiones ya tomadas;
- decisiones abiertas;
- arquitectura necesaria;
- cambios de datos/API;
- UX;
- monetización;
- métricas;
- legal;
- marketing;
- contenido;
- fases.

Y debe ser libre de decir:

> **"Esta parte de la idea no tiene suficiente evidencia o no compensa su coste."**

No queremos convertir cada idea interesante en una feature.

Queremos identificar cuáles pueden formar un sistema económico coherente.

---

## 19. Criterio de éxito

Este brief estará correctamente procesado cuando podamos explicar con precisión:

> **Cómo Ad Astra Mentis puede convertir una historia jugada en una experiencia que atrae a otro jugador, cómo ese jugador descubre un mundo, cómo lo juega, cómo vuelve, cómo paga y cómo una parte de esas historias puede alimentar el crecimiento del producto.**

Sin asumir todavía que sabemos cuál será el mercado ganador, el precio final, el canal de adquisición principal ni el volumen de usuarios.

**Este documento autoriza análisis y formalización. No autoriza todavía la construcción de todas las capacidades descritas.**

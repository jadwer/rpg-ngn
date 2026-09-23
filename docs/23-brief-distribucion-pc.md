# 23 - Brief de distribución PC: Steam y Epic Games Store

## Estado

**Brief de producto para análisis arquitectónico.**

Este documento no pretende cerrar la arquitectura ni dictar implementación. Es un brief de intención de producto para que **Claude, como arquitecto del proyecto, lo analice, cuestione, formalice y convierta en decisiones técnicas cuando corresponda**.

Fecha: 2026-09-23.

## 1. Objetivo

Queremos preparar **Ad Astra Mentis / Mentis** (actualmente el producto conocido como RPG Worlds dentro del proyecto) para poder distribuir el juego en PC mediante:

- **Steam**
- **Epic Games Store**

La intención es que ambas sean **canales de distribución del mismo producto**, no productos ni arquitecturas independientes.

La **web sigue siendo el producto principal**. Steam y Epic deben consumir una experiencia de producto coherente con ella, sin desplazar la web como centro del diseño.

No se solicita implementar Steam/Epic en este cambio. Se solicita analizar qué debemos preparar para que el producto pueda llegar a esas tiendas sin hipotecar la arquitectura actual.

## 2. Principio rector

> **El producto es Mentis; Web, Steam y Epic son canales de distribución.**

La arquitectura debería evitar que la lógica central del producto quede acoplada a una tienda concreta.

El motor continúa siendo agnóstico:

- setting / Content Pack
- sistema / Ruleset
- Narrative Provider
- cliente

La distribución PC debe ser otro eje de infraestructura/producto, no una modificación del dominio RPG.

## 3. Punto de partida que el arquitecto debe respetar

El proyecto ya tiene:

- Motor TypeScript puro.
- Monorepo pnpm.
- Separación entre engine, packages y clientes.
- Laravel como plataforma SaaS en repo separado.
- PostgreSQL.
- Engine invocado por turno.
- DMProvider con adapters.
- Next.js como cliente web principal.
- Expo como superficie móvil.
- Identidad/cuenta propia del servicio.
- Partidas persistidas en la plataforma.
- Sistema de créditos/turnos donde el anfitrión paga y los jugadores consumen.
- Invitaciones con enlace y tope de plazas.
- UX con dos composiciones: móvil y escritorio.
- La jerarquía se diseña a 390 px, pero el acabado prioritario es web.
- El coste no se muestra durante la partida.
- La arquitectura de secretos/visibilidad está en proceso de maduración y debe seguir siendo una preocupación independiente del canal.

El documento más reciente antes de este brief es docs/22-brand-guidelines.md, que define la identidad de Ad Astra Mentis / Mentis. Este brief debe convivir con esa dirección de marca y no redefinirla.

## 4. Cliente de PC

Necesitamos determinar si el cliente de PC debe ser:

- una aplicación web empaquetada;
- un cliente desktop basado en una tecnología como Tauri;
- otra solución que Claude considere técnicamente más apropiada.

Como hipótesis de producto, **Tauri es una opción a evaluar**, no una decisión tomada.

La primera plataforma objetivo sería:

> **Windows x64**

macOS y Linux pueden quedar como extensiones posteriores si la arquitectura permite agregarlos sin coste desproporcionado.

No se solicita rehacer el frontend para PC. La intención es reutilizar la experiencia web donde tenga sentido y agregar únicamente las capacidades necesarias para una distribución desktop de calidad.

## 5. Identidad de usuario

La cuenta de Mentis debe ser la identidad canónica.

Conceptualmente:

    Mentis Account
         |
         +-- Web
         |
         +-- Steam
         |
         +-- Epic

La integración con Steam o Epic no debería convertir el Steam ID o Epic Account ID en la identidad primaria de Mentis.

Claude debe determinar:

- cómo se vinculan cuentas externas;
- qué ocurre en el primer inicio desde Steam/Epic;
- cómo se resuelve una cuenta ya existente;
- qué sucede si un usuario juega primero en web y después instala desde una tienda;
- qué sucede si el usuario tiene ambas cuentas de tienda;
- cómo evitar cuentas duplicadas;
- qué datos deben permanecer en Mentis y cuáles pertenecen a la plataforma.

## 6. Integraciones de plataforma

Analizar por separado.

### Steam

Determinar qué servicios de Steamworks realmente necesitamos, por ejemplo:

- autenticación/identidad;
- achievements;
- estadísticas;
- cloud saves;
- overlay;
- instalación/actualización;
- ramas de distribución;
- eventual soporte de Steam Deck;
- cualquier otra capacidad relevante.

No integrar servicios solo porque estén disponibles.

### Epic

Determinar qué servicios de Epic Games Store / Epic Online Services realmente necesitamos, por ejemplo:

- autenticación/identidad;
- achievements;
- cloud saves;
- overlay;
- distribución;
- eventual uso de EOS.

Tampoco se debe introducir EOS como dependencia general del producto sin justificarlo.

## 7. Distribución y builds

Necesitamos un proceso reproducible para generar builds de release.

Hipótesis inicial:

    development
        |
        v
    staging
        |
        v
    production
        |
        +--> Web
        +--> Steam
        +--> Epic

Claude debe definir:

- qué artefactos produce CI/CD;
- versionado;
- canales/branches de release;
- firma de binarios;
- actualizaciones;
- rollback;
- configuración por entorno;
- secretos;
- telemetría;
- diagnóstico de errores;
- cómo probar una build antes de publicarla;
- qué parte del pipeline pertenece al repo público y cuál al entorno privado.

## 8. Modelo comercial

Antes de implementar compras de tienda, revisar el modelo actual:

- créditos/turnos de prepago;
- el propietario de la mesa paga;
- los invitados consumen turnos del propietario;
- un turno fallido por error del sistema no debe consumir crédito.

Necesitamos analizar las implicaciones de:

- compras en Steam;
- compras en Epic;
- compras en web;
- saldo compartido entre plataformas;
- DLC / Content Packs;
- suscripciones futuras, si alguna vez existen;
- restricciones de cada store sobre productos digitales y pagos externos;
- reembolsos;
- ownership de contenido;
- diferencias entre "crédito de servicio" y "contenido comprado".

**No asumir que el modelo actual puede copiarse literalmente a Steam/Epic.** Claude debe identificar las restricciones reales y proponer una arquitectura que no nos obligue a duplicar el sistema comercial.

## 9. Multiplayer y servidor

El juego no debe convertirse en un multiplayer propiedad de Steam o Epic.

La partida canónica sigue viviendo en Mentis:

- cuenta;
- mesa;
- campaña;
- personajes;
- eventos;
- turnos;
- narración;
- créditos;
- contenido.

Steam/Epic deben funcionar como canales de identidad/distribución y, solo si resulta conveniente, aportar servicios concretos.

Analizar especialmente:

- qué ocurre si un usuario juega con Steam y otro desde web;
- qué ocurre si una mesa tiene jugadores mezclando Web/Steam/Epic;
- cómo se resuelven invitaciones;
- cómo se mantiene la identidad;
- qué ocurre cuando un servicio externo no está disponible.

## 10. Cloud saves

Analizar si realmente necesitamos cloud saves de plataforma.

El estado canónico de una campaña ya existe en el backend de Mentis.

Por tanto, un "save" local de Steam/Epic podría ser redundante.

La pregunta para Claude es:

> ¿Qué dato local, si alguno, justificaría utilizar Steam Cloud o Epic Cloud Saves?

No implementar cloud saves solo por cumplir una expectativa de tienda si el modelo server-authoritative hace que no sean necesarios.

## 11. Achievements

Analizar una estrategia de achievements que no rompa el modelo multiplataforma.

Idealmente los logros deberían derivarse de hechos canónicos de Mentis y luego proyectarse hacia:

- Steam achievements;
- Epic achievements;
- eventualmente otros canales.

Conceptualmente:

    Campaign / Event
           |
           v
    Mentis achievement state
           |
       +---+---+
       |       |
     Steam    Epic

Claude debe determinar si esta abstracción vale la complejidad para V1 o debe dejarse para una fase posterior.

## 12. Contenido generado por IA

Esto es especialmente importante para Mentis.

El producto utiliza un Narrative Provider / DM asistido por IA.

La distribución PC debe considerar:

- contenido generado dinámicamente;
- contenido potencialmente inesperado;
- moderación;
- reportes;
- términos de uso;
- clasificación por edades;
- requisitos de las tiendas;
- divulgación de uso de IA cuando corresponda;
- privacidad;
- datos enviados a proveedores LLM;
- controles para evitar abuso/coste.

No convertir la IA en el centro de la identidad de marca. Es una capacidad del producto.

## 13. Legal y privacidad

Ya existe docs/19-legal-aviso-y-terminos.md.

Este brief no reemplaza ese documento.

Claude debe identificar qué nuevos puntos aparecen al distribuir en stores, especialmente:

- términos de Steam/Epic;
- cuentas externas;
- compras dentro/fuera de la tienda;
- reembolsos;
- privacidad;
- transferencias internacionales;
- datos enviados al proveedor de IA;
- contenido generado por usuarios;
- contenido generado por IA;
- edad mínima;
- moderación;
- propiedad/licencias de Content Packs.

Cualquier requisito legal definitivo debe quedar como decisión explícita y, cuando corresponda, validarse jurídicamente.

## 14. Seguridad

Analizar como mínimo:

- autenticación desde clientes desktop;
- tokens;
- vinculación de cuentas;
- manipulación del cliente;
- fraude de créditos;
- replay;
- llamadas falsificadas al backend;
- abuso de endpoints;
- extracción de secretos;
- manipulación de builds;
- actualización segura;
- integridad de Content Packs;
- rate limiting;
- protección del proveedor LLM.

Principio:

> **El cliente nunca es autoridad sobre el estado de una partida ni sobre el saldo.**

## 15. Store assets y publicación

Además de código, necesitaremos preparar para cada tienda:

- nombre;
- descripción corta;
- descripción larga;
- logo;
- icono;
- cápsulas;
- screenshots;
- trailer;
- información de clasificación;
- requisitos de sistema;
- idiomas;
- información de contenido;
- información sobre IA, si la plataforma la solicita;
- soporte;
- política de privacidad;
- términos;
- datos de contacto.

La identidad debe seguir docs/21-brand-rationale.md y docs/22-brand-guidelines.md.

## 16. Steam y Epic no son necesariamente simultáneos

La intención es poder llegar a ambos.

No se exige que el lanzamiento ocurra simultáneamente.

Claude debe analizar si conviene:

1. preparar abstracciones para ambas desde el principio;
2. implementar primero una plataforma;
3. dejar la segunda como adapter posterior.

La decisión debe considerar coste, riesgo de arquitectura y velocidad de lanzamiento, no una preferencia arbitraria por una tienda.

## 17. Qué esperamos de Claude

Este documento es un **brief**, no un ADR.

Claude debe:

1. Revisar este brief contra la arquitectura existente.
2. Identificar contradicciones con docs/00-22, especialmente:
   - docs/11-adr-stack-saas.md
   - docs/17-estado-del-proyecto.md
   - docs/18-decisiones-ux.md
   - docs/19-legal-aviso-y-terminos.md
   - docs/21-brand-rationale.md
   - docs/22-brand-guidelines.md
3. Identificar riesgos que no estamos contemplando.
4. Separar:
   - decisiones de producto;
   - decisiones de arquitectura;
   - requisitos de store;
   - trabajo legal;
   - trabajo de infraestructura;
   - trabajo de contenido/marketing.
5. Proponer la arquitectura formal que corresponda.
6. Crear ADRs o actualizar documentos existentes donde una decisión quede cerrada.
7. Proponer fases de implementación.
8. Indicar qué NO debemos construir todavía.
9. Verificar los requisitos actuales de Steam y Epic antes de convertirlos en requisitos técnicos definitivos.

## 18. Resultado esperado

Después del análisis de Claude deberíamos poder responder con precisión:

- ¿Qué es exactamente Mentis en PC?
- ¿Necesitamos un cliente desktop propio?
- ¿Qué parte reutiliza la web?
- ¿Cómo se autentica un usuario desde Steam/Epic?
- ¿Cómo se vinculan cuentas?
- ¿Dónde vive el estado canónico?
- ¿Cómo funciona una mesa con jugadores de diferentes canales?
- ¿Cómo se manejan compras y créditos?
- ¿Necesitamos Steamworks?
- ¿Necesitamos EOS?
- ¿Qué servicios externos son opcionales?
- ¿Qué necesitamos para publicar?
- ¿Qué debemos tener listo antes de solicitar/revisar cada store?
- ¿Qué queda para V2?

## 19. Criterio de éxito de este brief

Este cambio se considera terminado cuando Claude tenga suficiente contexto para producir una propuesta arquitectónica concreta sin tener que adivinar:

- cuál es el producto;
- cuál es la prioridad de la web;
- cuál es la identidad canónica;
- cómo funciona el modelo de partida;
- cómo funciona el coste;
- qué papel deben jugar Steam y Epic;
- qué decisiones siguen abiertas.

**Este documento no autoriza todavía la implementación de Steam/Epic. Autoriza el análisis arquitectónico y la formalización posterior.**

# UX v1 — RPG Worlds: experiencia móvil

Estado: propuesta para validación antes de implementación.

## Objetivo

Diseñar la experiencia móvil web desde el flujo de juego, no adaptar el dashboard de escritorio.

RPG Worlds no debe comportarse como un VTT simplificado. El producto es una mesa narrativa donde el motor ocupa la silla del director de juego. La interfaz debe desaparecer cuando no aporta a la decisión del jugador.

## Principios

1. **Narrativa primero.** Durante la partida, la narración es el contenido principal.
2. **Una decisión por momento.** El jugador debe saber qué puede hacer ahora sin estudiar la interfaz.
3. **Revelación progresiva.** Ficha, jugadores, mapa, historial y reglas están disponibles bajo demanda.
4. **Potencia sin obligación.** La configuración avanzada existe, pero no se exige al novato.
5. **Mobile-first.** 390×844 es el viewport de referencia. Desktop se compone después.
6. **El anfitrión juega.** Sus controles son overrides, no tareas administrativas obligatorias.
7. **El dado es un momento.** Cuando hay una tirada relevante, debe sentirse y verse.
8. **El ruleset define la ficha.** No codificar una ficha D&D en la interfaz común.
9. **El mapa es contexto narrativo.** No convertirlo en tablero táctico.
10. **No competir con la historia.** Ningún panel secundario debe ocupar permanentemente la atención durante un turno.

## Modelo mental

La partida se percibe como:

NARRACIÓN → DECISIÓN → ACCIÓN → ESPERA → RESOLUCIÓN → NUEVA NARRACIÓN

No como:

DASHBOARD → CARDS → CONFIGURACIÓN → CHAT → ESTADÍSTICAS.

## Flujo de jugador nuevo

### 1. Entrada
Objetivo: entrar a una aventura, no aprender el producto.

### 2. Personaje
Presentar personajes como identidades jugables: nombre, retrato, personalidad, objetivo y capacidades relevantes. Los atributos específicos dependen del ruleset.

### 3. Mesa
Mostrar que los amigos están presentes y que la aventura está a punto de comenzar. Evitar configuración innecesaria para invitados.

### 4. Primer turno
La pantalla responde únicamente:
- qué está ocurriendo;
- qué se espera del jugador;
- cómo declarar una acción.

El input debe aceptar lenguaje libre. Una ayuda opcional puede sugerir una acción sin convertirla en menú.

### 5. Espera
Mostrar quién ya respondió y quién está escribiendo. El anfitrión puede resolver o esperar; cuando todos respondieron, el sistema debe permitir resolución automática.

### 6. Resolución
Si el motor requiere una tirada, representar visualmente el dado y luego devolver el resultado a la narrativa.

### 7. Herramientas secundarias
Personaje, jugadores, mapa, historial y reglas se abren como superficies independientes/fullscreen cuando su tamaño lo requiera.

## Pantalla central: sesión móvil

Prioridad visual:

1. título/contexto de escena;
2. narración;
3. estado del turno;
4. compositor de acción;
5. progreso de jugadores;
6. navegación secundaria.

No mostrar permanentemente HP, seis atributos, inventario, mapa, historial y controles de anfitrión.

## Configuración de mesa

Usar tres niveles:

- **Recomendada:** RPG Worlds decide detalles.
- **Personalizada:** el usuario decide las variables que cambian la experiencia.
- **Avanzada:** acceso a configuración completa.

La complejidad no se elimina; se revela cuando el usuario la solicita.

## Superficies móviles

- **Sesión:** narración y acción.
- **Personaje:** ficha específica del ruleset.
- **Jugadores:** estado individual: listo, escribiendo, pensando.
- **Más:** mapa, historial, reglas, configuración.

Estas superficies no deben convertirse en un pie permanente lleno de tarjetas.

## Estados de sesión que deben diseñarse

1. Mesa recién creada.
2. Primer mensaje del DM.
3. Jugador escribiendo.
4. Jugador ya respondió.
5. Esperando al resto.
6. Todos respondieron.
7. Resolviendo.
8. Tirada.
9. Resultado.
10. Nueva narración.
11. Jugador ausente.
12. Fin de sesión.

## Fuera de esta propuesta

- tablero táctico;
- ficha D&D fija;
- chat privado con el DM como concepto principal;
- dashboard permanente durante el juego;
- configuración avanzada obligatoria;
- copiar patrones de Alchemy o Quest Portal por similitud visual.

## Criterio de aceptación

Un jugador que nunca haya jugado RPG debe poder:

1. entrar;
2. identificar su personaje;
3. leer la primera escena;
4. entender que debe declarar una acción;
5. escribir una acción libre;
6. saber si ya respondió;
7. entender el resultado de una tirada;

sin tutorial externo ni explicación verbal del anfitrión.

## Implementación

Separar composición por cliente:

SessionMobile
SessionTablet
SessionDesktop

compartiendo estado, dominio y componentes funcionales, pero no obligando a compartir la misma composición visual.

# Modelo de dominio

## Jerarquia narrativa

```
Campana -> Arco -> Mision -> Escena -> Turno
```

Una sesion de mesa es un corte transversal: puede cerrar a mitad de una escena (cliffhanger) y la siguiente retoma exactamente ahi.

## Entidades

### Contenido canonico (estatico, versionado en Git)

| Entidad | Descripcion |
|---|---|
| ContentPack | Un setting completo o una campana: manifiesto + colecciones de entidades |
| CharacterTemplate | Personaje pregenerado o arquetipo jugable |
| Npc | Personaje no jugador con objetivos propios, ubicacion y conocimiento |
| Location | Lugar con descripcion, conexiones y que sabe de el un recien llegado |
| Faction | Grupo con intereses, miembros y relaciones |
| Rumor | Informacion circulante, cierta o falsa, con origen |
| Timeline | Cronologia fija del mundo sobre la que ocurre la campana |

### Estado vivo (muta durante el juego)

| Entidad | Descripcion |
|---|---|
| Campaign | Instancia jugable de un content pack, con su propio canon |
| Player | Persona real; su asistencia varia por sesion |
| Character | Instancia de un template asignada a un player, con HP, XP, inventario, relaciones y fortuna |
| Session | Registro de una sesion: asistentes, resumen, decisiones, tiradas, estado al cierre, cabos sueltos |
| Quest | Mision activa, completada o fallida, con objetivos |
| Event | Hecho ocurrido en la campana, con visibilidad por capa de conocimiento |
| Roll | Tirada registrada e inmutable: dado, resultado, modificador, contexto |

## Capas de conocimiento

Toda pieza de informacion pertenece a una capa (ver [04-narrative-context.md](04-narrative-context.md)):

1. **Canon**: lo que es cierto en el mundo del content pack.
2. **Campaign canon**: lo que ha ocurrido en esta campana concreta.
3. **Player knowledge**: lo que cada personaje sabe (por personaje, no por mesa).
4. **DM knowledge**: lo que el sistema sabe y los jugadores no (secretos, tramas, identidades).

Regla derivada: un Event registra quien lo presencio; una Location distingue su ficha completa de "lo que sabria un recien llegado".

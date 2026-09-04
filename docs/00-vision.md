# Vision

## Que es

rpg-ngn es un motor para jugar campanas de rol de mesa persistentes donde el Dungeon Master es un LLM asistido por herramientas deterministas. El motor mantiene la continuidad narrativa, el estado de campana y las reglas del juego; el modelo solo narra encima de ese estado.

## Que problema resuelve

Un LLM sin motor es un narrador encantador y un DM desastroso a mediano plazo: contradice su propio canon, revela secretos, cede ante los jugadores y pierde el tono. La calidad de un DM IA no depende del modelo sino de la ingenieria alrededor: contexto controlado, estado externo, tiradas fuera del modelo y una separacion estricta entre lo que el mundo sabe y lo que cada jugador sabe.

## Definicion del PMV

Una experiencia de RPG de mesa donde un DM asistido por IA dirige aventuras para 3 a 6 jugadores con asistencia variable, mantiene continuidad entre sesiones episodicas (2 a 3 horas, con cliffhangers) y registra el estado de la campana de forma consultable por todos.

## Principios

1. **Agnostico al setting.** El mundo es un content pack versionado. El motor no conoce Valdoria ni ningun otro lugar. El setting responde "donde estamos y que existe".
2. **Agnostico al sistema de juego.** El core contiene primitivas (dados, checks, recursos, efectos); un ruleset define como se combinan. D&D, un sistema tipo Vampire o uno elemental son rulesets distintos, no motores distintos. El ruleset responde "como funciona este juego".
3. **Agnostico al proveedor.** El DM narra a traves de una interfaz; cambiar de modelo es cambiar un adapter. La eleccion de modelo se decide con blind tests, no por lealtad.
4. **Agnostico al cliente.** Web, Expo o CLI consumen los mismos packages y la misma API futura.
5. **El estado vive fuera del modelo.** Git para el contenido canonico, archivos (y despues DB) para el estado vivo. La memoria conversacional del LLM nunca es fuente de verdad. El modelo propone; el engine valida; el estado persiste.
6. **Local-first.** Nada se convierte en servidor hasta que exista algo que sincronizar.
7. **La narrativa manda.** Ver [06-reality-contract.md](06-reality-contract.md); ese documento tiene prioridad sobre cualquier implementacion.

La composicion que define una partida:

```
Content Pack + Ruleset + Narrative Provider + Campaign = RPG Session
```

Advertencia contra la sobreingenieria: el PMV implementa un solo ruleset concreto (fantasy d20 simplificado) contra estas interfaces. La generalidad se valida cuando exista el segundo ruleset real, no antes.

## Fuera de alcance (por ahora)

- Settings con IP ajena en cualquier cosa publica o comercial. Para mesas privadas cada quien su responsabilidad; el producto usa mundos propios.
- Mapas tacticos, grid de combate, VTT. El combate es narrativo con soporte de tiradas.
- Voz y tiempo real. El piloto es presencial; el motor asiste, no reemplaza la mesa.

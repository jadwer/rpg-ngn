# apps/mobile

Superficie del jugador (docs/09) en Expo, en modo offline: el pack piloto y su log viajan dentro de la app, se reducen en el telefono con `@rpg-ngn/campaign` y no hay servidor ni DM. Es la entrega 3 del ROADMAP y el spike de pnpm aislado con Expo (docs/10, IA2).

## Que hace

- Selector de sesion (001, 002, 003) con briefing, fecha y quien esta en la mesa.
- Vista de sesion con dos formas de pintar los mismos bloques: **narrativa** (prosa completa con dialogos intercalados) y **dialogo** (intervenciones con retrato, prosa comprimida a un extracto que se expande al tocarlo).
- **Fichas** de toda la party como modal sobre la narracion, con HP, Fortuna, inventario y condiciones del estado reducido. En la sesion 003 los seis viajeros sin dueño salen velados (sin bio, objetivo, cita ni capacidades), igual que en `apps/sheets`.
- **Narracion por voz** con `expo-speech`, bloque a bloque. Tocar un bloque empieza a leer desde ahi. En Android no hay pausa nativa: Pausa detiene y Seguir salta al bloque siguiente (docs/09). Si el telefono no tiene voz en español instalada, la app lo dice.
- **Bandera de narrador** local: interruptor "alguien mas esta narrando" que quita el aviso; el aviso se puede descartar para mesas que juegan leyendo.

Tema pergamino por defecto (serif del sistema: Georgia en iOS, la serif de Android). Los componentes viven aqui, en `src/`; la logica (bloques, vistas, velado, cola de TTS) esta en `packages/ui-logic` y no importa React.

## Estructura

| Ruta | Contenido |
|---|---|
| `scripts/bundle-pack.ts` | Empaqueta `content/packs/<pack>` y `campaigns/<pack>/events.jsonl` en `src/generated/` y copia los retratos a `assets/pack/` (Metro solo ve el workspace, no `content/`) |
| `src/generated/` | Generado, versionado para que `start` y `typecheck` funcionen sin pasos previos. El test `src/pack/offline.test.ts` falla si esta desactualizado |
| `src/pack/offline.ts` | Carga el pack desde memoria (`memorySource`), valida el log y reduce con `fantasy-d20-lite`. Sin React: se prueba con vitest |
| `src/speech/expoSpeechEngine.ts` | `SpeechEngine` de ui-logic sobre `expo-speech`; `pause`/`resume` solo fuera de Android |
| `src/hooks/useTts.ts` | La cola de TTS de ui-logic como hook |
| `src/state/narrator.tsx` | Bandera de narrador (contexto local) |
| `src/screens/` | `SessionPicker`, `SessionScreen`, `SheetsModal` |
| `src/components/` | `BlockGroups` (las dos vistas), `Sheet`, `TtsBar`, `NarratorBanner`, `Portrait` |

Sin libreria de navegacion a proposito: dos pantallas y un modal no la necesitan, y cada dependencia nativa es un punto fragil del spike.

## Comandos

```bash
pnpm install                          # desde la raiz del monorepo
pnpm build                            # compila packages/*; la app importa dist/
pnpm --filter mobile bundle-pack      # regenerar tras cambiar el pack o el log
pnpm --filter mobile typecheck
pnpm --filter mobile test             # solo el test puro del pack empaquetado
pnpm --filter mobile start            # Metro; escanear el QR con Expo Go
pnpm --filter mobile doctor           # expo-doctor
```

## Probar en el telefono

1. Instalar **Expo Go** (SDK 57) en el Android o iPhone.
2. Desde la raiz: `pnpm build` y luego `pnpm --filter mobile start`.
3. Mientras WSL no este en modo espejo de red, el telefono no ve la IP de WSL: arrancar con tunel, `pnpm --filter mobile start -- --tunnel` (instala `@expo/ngrok` la primera vez y pide confirmar). Con `networkingMode=mirrored` en `.wslconfig` basta el modo LAN, con el telefono en el mismo wifi.
4. Escanear el QR con Expo Go (Android) o con la camara (iOS).
5. Para que suene sin datos en Android, descargar la voz en español en Ajustes, Texto a voz. La app avisa si no hay ninguna.

Exportar el bundle sin telefono, como hace el CI: `pnpm --filter mobile exec expo export --platform android`.

## Lo que no hace todavia

- No habla con la plataforma (`rpg-ngn-api`): eso es la entrega 5, con `@rpg-ngn/api-client` y el token en `expo-secure-store`.
- La bandera de narrador es local; compartirla entre telefonos necesita la plataforma.
- El tema lo fija la app; el pack todavia no declara el suyo.

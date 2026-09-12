# Runbook local

Levantar todo en la laptop y probar la app desde telefonos en la misma Wi-Fi. Estado al 2026-09-12: WSL en modo espejo (la IP del Wi-Fi la asigna DHCP y cambia; hoy `192.168.100.11`), Postgres 16 como servicio, engine y API en desarrollo.

Puertos del proyecto: engine `3100`, API `8010`, web `3010`, Expo `8081`. El `8000` queda libre para api-base y otros proyectos de Atomo; el `80` es de Apache.

Variables: cada servicio lee su propio `.env` (gitignored, no viaja con el repo). `apps/engine/.env` trae `ENGINE_TOKEN`, `HOST` y `PORT`; `rpg-ngn-api/.env` trae la base, `ENGINE_URL` y `ENGINE_TOKEN`. Si falta alguno, copiar el `.env.example` de al lado. No hace falta pasar variables en la linea de comandos.

## 1. Servicios (tres terminales)

```bash
# Terminal 1: engine (Node). Health en http://127.0.0.1:3100/health
cd ~/dev/rpg-ngn && pnpm --filter engine dev

# Terminal 2: API (Laravel)
cd ~/dev/rpg-ngn-api && php artisan serve --host 0.0.0.0 --port 8010

# Terminal 3: web (Next.js), la mesa principal. Escucha en 0.0.0.0:3010 y reenvia /api/* a la API local
cd ~/dev/rpg-ngn && pnpm --filter web dev

# Terminal 4 (solo si la API tiene QUEUE_CONNECTION=database): worker que resuelve los turnos
cd ~/dev/rpg-ngn-api && php artisan queue:work --queue=turns,default --timeout=600

# Terminal 5 (opcional): app (Expo). Sin --tunnel: WSL ya comparte la IP del Wi-Fi
cd ~/dev/rpg-ngn && pnpm --filter mobile start
```

Cola: el `.env` de la API esta en `QUEUE_CONNECTION=sync` a proposito: "Cerrar turno y narrar" espera al modelo dentro de la peticion (20 a 35 s con Sonnet) y no depende de que alguien recuerde levantar el worker. Para pasar a `database` (la peticion responde 202 al instante y el worker narra): cambiar `QUEUE_CONNECTION=database` en `rpg-ngn-api/.env`, correr `php artisan config:clear` si hay cache de config, y dejar la terminal 4 arriba antes de la partida. El job es unico por turno y no reintenta: si el modelo falla, el turno vuelve a `open` con el motivo (la web lo muestra) y la mesa vuelve a cerrar cuando quiera. Si el worker no esta corriendo, el turno se queda en `closing` y la web dice "El DM esta narrando..." hasta que arranque; `php artisan queue:failed` lista los jobs que murieron.

La web en produccion (mas rapida en la LAN): `pnpm --filter web build && pnpm --filter web start`.

Si algo no arranca:

- `pnpm install && pnpm build` en `rpg-ngn` (el engine importa los packages construidos).
- `composer install && php artisan migrate --seed` en `rpg-ngn-api` si la base esta vacia.
- Postgres: `systemctl status postgresql`; rol `rpg`, base `rpg_ngn`.
- Firewall de Windows con WSL en modo espejo: la red del Wi-Fi debe ser "Private" y los puertos abiertos para WSL en el firewall de Hyper-V (PowerShell como administrador, una sola vez):

  ```powershell
  Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
  New-NetFirewallHyperVRule -Name 'rpg-ngn-dev' -DisplayName 'rpg-ngn dev' -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 8081,8010,3100,3010 -Action Allow
  New-NetFirewallRule -DisplayName 'rpg-ngn dev' -Direction Inbound -Protocol TCP -LocalPort 8081,8010,3100,3010 -Action Allow -Profile Private
  ```

  Si la regla ya existe sin el 3010: `Set-NetFirewallHyperVRule -Name 'rpg-ngn-dev' -LocalPorts 8081,8010,3100,3010` y `Set-NetFirewallRule -DisplayName 'rpg-ngn dev' -LocalPort 8081,8010,3100,3010`.

Comprobacion rapida:

```bash
curl -s http://127.0.0.1:3100/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8010/api/v1/system-health/ping
```

## 2. Mesa lista para jugar

```bash
cd ~/dev/rpg-ngn && bash tools/smoke/turn.sh
```

Crea una mesa nueva con Jaz (Zahira) y Armando (Calder), abre la sesion 003, resuelve el turno 1 con el DM scripted y deja el turno 2 abierto. Imprime cada paso con su codigo HTTP; el final debe mostrar `"number": 2` y `"status": "open"`.

## 3. Telefonos

1. Expo Go en cada telefono, misma Wi-Fi que la laptop. Escanear el QR de la terminal 3.
2. "Jugar en mesa": el campo servidor ya trae la IP de la laptop con el puerto 8010 (la toma del QR de Metro). Si el telefono guardo una IP vieja, borrarla y escribir la nueva una vez.
3. Telefono A: `jaz@example.com` / `password`. Telefono B: `armando@example.com` / `password`.
4. Entrar a la mesa mas reciente. Cada uno escribe su accion; cuando los dos respondieron, cualquiera cierra el turno. En dos o tres segundos ambos ven los bloques nuevos y el turno siguiente abierto.

El anfitrion es `gabino@example.com` / `password` (abre y cierra sesiones, invita, fuerza cierres, y juega con su personaje). El DM es la IA.

## 3a. El DM (entrega 6)

La API elige el proveedor con `DM_PROVIDER` en `rpg-ngn-api/.env`: `anthropic` (el de la partida, `ANTHROPIC_MODEL=claude-sonnet-5`, `ANTHROPIC_API_KEY`), `openai`, `deepseek`, `ollama` (M1 en la LAN, `OLLAMA_URL`, `OLLAMA_MODEL`) o `scripted` (sin modelo; las mesas con guion en `settings.provider` siguen usando scripted aunque el default sea otro). Comprobar sin gastar:

```bash
cd ~/dev/rpg-ngn-api && php artisan dm:probe          # ok=si modelo=claude-sonnet-5
```

Un turno con Sonnet 5 tarda de 20 a 35 s y cuesta alrededor de un centavo de dolar; con la cola en `sync`, "Cerrar turno y narrar" espera esa respuesta dentro de la peticion y la web muestra "El DM esta narrando...". La premisa de la mesa (al crearla) y la nota de la sesion (al abrirla) llegan al DM como contexto. Si el engine se reinicia, el probe lo confirma; si el turno vuelve a `open` con un bloque de sistema, el error esta en la terminal del engine.

## 3b. Web (laptops e iPhone por Safari)

1. En cada dispositivo, misma Wi-Fi, abrir `http://<IP de la laptop>:3010` (hoy `http://192.168.100.11:3010`). Sale la landing; "Entrar" o "Crear cuenta". La sesion va en una cookie httpOnly y las peticiones pasan por el proxy de Next: no hace falta CORS. Solo si alguien pulsa "Cambiar servidor" y escribe la API directa (`:8010`) hay que tener el origen en `CORS_ALLOWED_ORIGINS` de `rpg-ngn-api/.env`.
2. Jugadora nueva desde el iPhone: abrir la URL en Safari, "Crear cuenta", escribir nombre, correo, contraseña (8 caracteres o mas) y repetirla, "Crear cuenta". Entra directo a "Tus mesas" (la API tiene `ATOMO_REQUIRE_EMAIL_VERIFICATION=false`; no llega ningun correo). Le dice su correo al anfitrion y espera la invitacion; al recargar "Tus mesas" ya ve la mesa. Si cierra Safari, la sesion sigue (30 dias); "Salir" la borra.
3. Anfitrion: `gabino@example.com` / `password`. "Crear mesa": nombre, tu personaje, director de juego (por defecto el del servidor, Anthropic) y premisa opcional. Amistad antes de invitar: en "Invitados" (o en "Amigos" al pie de "Tus mesas") escribe el correo de la jugadora, "Buscar" y "Enviar solicitud de amistad"; ella la acepta en "Amigos" al pie de su "Tus mesas" (o al reves: ella busca `gabino@example.com` y manda la solicitud, y el anfitrion acepta). Con amistad aceptada, en "Invitados" buscar el correo otra vez e "Invitar a la mesa" con personaje. Entrar a la mesa y "Abrir sesion" en el mando del anfitrion (codigo sugerido, nota de la sesion opcional). Antes de abrir, pestaña "DM" del mando y "Probar": debe decir "Listo: Anthropic: Claude Sonnet 5 disponible".
4. Jugadores: entrar a la mesa, escribir la accion y Enviar (Ctrl+Enter). Cuando no falta nadie, cualquiera pulsa "Cerrar turno y narrar"; el anfitrion puede "Forzar cierre". Jaz y Armando siguen siendo `jaz@example.com` y `armando@example.com`, `password`.
5. Pantalla compartida: en la laptop del anfitrion, "Pantalla" o tecla `F` deja solo narrativa y dialogos en grande; `Esc` sale. La voz sale del dispositivo que pulse Leer (o tenga "Leer lo nuevo"); en iPhone hay que tocar Leer una vez antes de que suene sola. Voz, idioma y velocidad se eligen en "Ajustes" (barra superior) y quedan en ese navegador.

## 4. Verificacion sin telefonos

```bash
cd ~/dev/rpg-ngn && pnpm check                 # motor, contrato, engine, app, web (incluye next build)
cd ~/dev/rpg-ngn-api && composer test          # API en SQLite, 51 tests
cd ~/dev/rpg-ngn-api && composer test:pgsql    # lo mismo contra Postgres
cd ~/dev/rpg-ngn && pnpm --filter mobile smoke-api   # turno completo con el cliente de la app
```

## 5. Si algo se rompe

- 401 en la app o en la web: token caducado o servidor mal escrito; volver a iniciar sesion.
- "Petición rechazada: falta la cabecera de la web" (403 del proxy): algo llamo a `/api/*` sin la cabecera `X-Requested-With: rpg-ngn-web`; la web la pone sola, un curl contra el 3010 debe añadirla o ir directo al 8010 con Bearer.
- Una jugadora no aparece al buscar por correo: se registro con otro correo o con espacios; el lookup es exacto (sin distinguir mayusculas).
- "El preset X no está configurado": falta la clave en `rpg-ngn-api/.env`; la pestaña DM solo deja elegir presets con clave.
- La web no carga desde otro dispositivo: `pnpm --filter web dev` escucha en `0.0.0.0`; revisar firewall del 3010 y que la IP sea la actual (`hostname -I`).
- Voz muda en Safari: tocar Leer una vez (iOS exige un gesto) y elegir una voz `es` en el selector.
- 409 al cerrar: alguien cerro antes; refrescar.
- El turno vuelve a `open` con un bloque de sistema: el engine fallo; ver la terminal 1.
- `graphify update .` en `rpg-ngn-api` refresca el grafo de codigo tras cambios grandes.

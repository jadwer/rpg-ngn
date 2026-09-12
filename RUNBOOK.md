# Runbook local

Levantar todo en la laptop y probar la app desde telefonos en la misma Wi-Fi. Estado al 2026-09-11: WSL en modo espejo (la IP del Wi-Fi la asigna DHCP y cambia; hoy `192.168.100.11`), Postgres 16 como servicio, engine y API en desarrollo.

Puertos del proyecto: engine `3100`, API `8010`, web `3010`, Expo `8081`. El `8000` queda libre para api-base y otros proyectos de Atomo; el `80` es de Apache.

Variables: cada servicio lee su propio `.env` (gitignored, no viaja con el repo). `apps/engine/.env` trae `ENGINE_TOKEN`, `HOST` y `PORT`; `rpg-ngn-api/.env` trae la base, `ENGINE_URL` y `ENGINE_TOKEN`. Si falta alguno, copiar el `.env.example` de al lado. No hace falta pasar variables en la linea de comandos.

## 1. Servicios (tres terminales)

```bash
# Terminal 1: engine (Node). Health en http://127.0.0.1:3100/health
cd ~/dev/rpg-ngn && pnpm --filter engine dev

# Terminal 2: API (Laravel)
cd ~/dev/rpg-ngn-api && php artisan serve --host 0.0.0.0 --port 8010

# Terminal 3: web (Next.js). Escucha en 0.0.0.0:3010 y reenvia /api/* a la API local
cd ~/dev/rpg-ngn && pnpm --filter web dev

# Terminal 4 (opcional): app (Expo). Sin --tunnel: WSL ya comparte la IP del Wi-Fi
cd ~/dev/rpg-ngn && pnpm --filter mobile start
```

La web en produccion (mas rapida en la LAN): `pnpm --filter web build && pnpm --filter web start`.

Si algo no arranca:

- `pnpm install && pnpm build` en `rpg-ngn` (el engine importa los packages construidos).
- `composer install && php artisan migrate --seed` en `rpg-ngn-api` si la base esta vacia.
- Postgres: `systemctl status postgresql`; rol `rpg`, base `rpg_ngn`.
- El Firewall de Windows pregunta la primera vez por los puertos 8010, 3010, 8081 y 3100: aceptar.

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

El DM es `gabino@example.com` / `password` (abre y cierra sesiones, fuerza cierres; no tiene personaje, no responde).

## 3b. Web (laptops e iPhone por Safari)

1. En cada dispositivo, misma Wi-Fi, abrir `http://<IP de la laptop>:3010` (hoy `http://192.168.100.11:3010`). El campo "Servidor de la API" ya trae esa misma direccion: las peticiones pasan por el proxy de Next y no hace falta CORS. Solo si se escribe la API directa (`:8010`) hay que tener el origen en `CORS_ALLOWED_ORIGINS` de `rpg-ngn-api/.env`.
2. Anfitrion: `gabino@example.com` / `password`. "Crear mesa": nombre, tu personaje, premisa opcional; despues invita a Jaz y Armando (ya son amigos) eligiendo personaje. Entrar a la mesa y "Abrir sesion" en el mando del anfitrion (codigo sugerido, nota de la sesion opcional).
3. Jugadores: `jaz@example.com` y `armando@example.com`, `password`. Entrar a la mesa, escribir la accion y Enviar (Ctrl+Enter). Cuando no falta nadie, cualquiera pulsa "Cerrar turno y narrar"; el anfitrion puede "Forzar cierre".
4. Pantalla compartida: en la laptop del anfitrion, "Pantalla" o tecla `F` deja solo narrativa y dialogos en grande; `Esc` sale. La voz sale del dispositivo que pulse Leer (o tenga "Leer lo nuevo"); en iPhone hay que tocar Leer una vez antes de que suene sola.

## 4. Verificacion sin telefonos

```bash
cd ~/dev/rpg-ngn && pnpm check                 # motor, contrato, engine, app, web (incluye next build)
cd ~/dev/rpg-ngn-api && composer test          # API en SQLite, 27 tests
cd ~/dev/rpg-ngn-api && composer test:pgsql    # lo mismo contra Postgres
cd ~/dev/rpg-ngn && pnpm --filter mobile smoke-api   # turno completo con el cliente de la app
```

## 5. Si algo se rompe

- 401 en la app o en la web: token caducado o servidor mal escrito; volver a iniciar sesion.
- La web no carga desde otro dispositivo: `pnpm --filter web dev` escucha en `0.0.0.0`; revisar firewall del 3000 y que la IP sea la actual (`hostname -I`).
- Voz muda en Safari: tocar Leer una vez (iOS exige un gesto) y elegir una voz `es` en el selector.
- 409 al cerrar: alguien cerro antes; refrescar.
- El turno vuelve a `open` con un bloque de sistema: el engine fallo; ver la terminal 1.
- `graphify update .` en `rpg-ngn-api` refresca el grafo de codigo tras cambios grandes.

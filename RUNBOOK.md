# Runbook local

Levantar todo en la laptop y probar la app desde telefonos en la misma Wi-Fi. Estado al 2026-09-07: WSL en modo espejo (IP `192.168.100.16`), Postgres 16 como servicio, engine y API en desarrollo.

## 1. Servicios (tres terminales)

```bash
# Terminal 1: engine (Node). Health en http://127.0.0.1:3100/health
cd ~/dev/rpg-ngn && ENGINE_TOKEN=devtoken HOST=0.0.0.0 pnpm --filter engine dev

# Terminal 2: API (Laravel). ENGINE_TOKEN=devtoken ya esta en su .env
cd ~/dev/rpg-ngn-api && php artisan serve --host 0.0.0.0 --port 8000

# Terminal 3: app (Expo). Sin --tunnel: WSL ya comparte la IP del Wi-Fi
cd ~/dev/rpg-ngn && pnpm --filter mobile start
```

Si algo no arranca:

- `pnpm install && pnpm build` en `rpg-ngn` (el engine importa los packages construidos).
- `composer install && php artisan migrate --seed` en `rpg-ngn-api` si la base esta vacia.
- Postgres: `systemctl status postgresql`; rol `rpg`, base `rpg_ngn`.
- El Firewall de Windows pregunta la primera vez por los puertos 8000, 8081 y 3100: aceptar.

Comprobacion rapida:

```bash
curl -s http://127.0.0.1:3100/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/api/v1/system-health/ping
```

## 2. Mesa lista para jugar

```bash
cd ~/dev/rpg-ngn && bash tools/smoke/turn.sh
```

Crea una mesa nueva con Jaz (Zahira) y Armando (Calder), abre la sesion 003, resuelve el turno 1 con el DM scripted y deja el turno 2 abierto. Imprime cada paso con su codigo HTTP; el final debe mostrar `"number": 2` y `"status": "open"`.

## 3. Telefonos

1. Expo Go en cada telefono, misma Wi-Fi que la laptop. Escanear el QR de la terminal 3.
2. "Jugar en mesa" > servidor `http://192.168.100.16:8000`.
3. Telefono A: `jaz@example.com` / `password`. Telefono B: `armando@example.com` / `password`.
4. Entrar a la mesa mas reciente. Cada uno escribe su accion; cuando los dos respondieron, cualquiera cierra el turno. En dos o tres segundos ambos ven los bloques nuevos y el turno siguiente abierto.

El DM es `gabino@example.com` / `password` (abre y cierra sesiones, fuerza cierres; no tiene personaje, no responde).

## 4. Verificacion sin telefonos

```bash
cd ~/dev/rpg-ngn && pnpm check                 # motor, contrato, engine, app: 161 tests
cd ~/dev/rpg-ngn-api && composer test          # API en SQLite, 27 tests
cd ~/dev/rpg-ngn-api && composer test:pgsql    # lo mismo contra Postgres
cd ~/dev/rpg-ngn && pnpm --filter mobile smoke-api   # turno completo con el cliente de la app
```

## 5. Si algo se rompe

- 401 en la app: token caducado o servidor mal escrito; volver a iniciar sesion.
- 409 al cerrar: alguien cerro antes; refrescar.
- El turno vuelve a `open` con un bloque de sistema: el engine fallo; ver la terminal 1.
- `graphify update .` en `rpg-ngn-api` refresca el grafo de codigo tras cambios grandes.

# ROADMAP

Lo que falta, en un solo lugar. Compactado el 2026-10-11: cada pendiente se
verifico contra el codigo y el servidor ese dia; lo hecho y la historia de
cada entrega estan en [docs/archivo/28](docs/archivo/28-historial-roadmap.md).
El orden de arquitectura sigue en [docs/11](docs/11-adr-stack-saas.md) y el
resumen de lo que funciona en [docs/17](docs/17-estado-del-proyecto.md).

Regla: lo que se termina se borra de aqui (queda en git y en el historial);
lo nuevo entra en su grupo con dueño. Si algo no tiene dueño ni fecha, va a
"Despues del 15-11".

## Lanzamiento: 15 de noviembre de 2026

| Semana | Que se cierra | Estado al 11-10 |
|---|---|---|
| 1 (02 al 08-10) | Comunidad v1 | Hecho |
| 2 (09 al 15-10) | Voz del narrador, Google Play, prueba cerrada a mas tardar el 15-10 | Voz hecha; AAB v26 y 7 productos en la consola; **la prueba cerrada espera a los testers** |
| 3 (16 al 22-10) | Video de la sesion v1 | Hecho (02-10) |
| 4 (23 al 29-10) | Antes de abrir: correo, vigilancia, claves rotadas, copias fuera | Pendiente (abajo) |
| 5 (30-10 al 05-11) | Legales, Plata/Oro/Diamante, medir paquetes con cuatro, temporada. Se pide produccion a Google | Pendiente |
| 6 (06 al 12-11) | Congelado de funciones el 06-11: solo errores | |
| 13 y 14-11 | Version candidata y despliegue final | |

Regla de Google para cuentas personales nuevas: 12 testers inscritos 14 dias
seguidos antes de pedir produccion, y luego hasta una semana de revision. Si
la prueba cerrada arranca despues del 22-10, Android no llega al 15-11 y se
lanza solo en web.

## 1. Bloqueos de Gabino (nadie mas los puede hacer)

- [ ] **12 testers** (mejor 14 o 15) inscritos en la prueba cerrada y jugando: al 23-10, 5 de 12 inscritos en Google y 10 de los 17 sin cuenta en el juego (Gabino les escribe)
- [ ] **Visto bueno a la etiqueta del narrador** en la web a 390 px (colores mios: dorado, violeta, gris, blanco)
- [ ] **Credito de AI Studio** ("MXN 26 disponible"): ver si es prepago. Si lo es, recargar o activar recarga automatica, y yo agrego al vigilante una prueba de Gemini (al llegar a cero las ilustraciones fallan sin aviso)
- [ ] **Claves de imagen rotadas**: subir las nuevas de Gemini y OpenAI con `read -rs` y revocar las viejas (siguen activas desde el 24-09)
- [ ] **Copias fuera del servidor** (29-10): NAS o Storage Box de Hetzner. Hoy la copia diaria vive en la misma maquina y solo lleva las bases (pg_dump). La copia de fuera debe llevar tambien los archivos privados: los del juego (`storage/app/private`: escenas, voz) y las fotos del inventario (`/srv/inventario/shared/storage/app/private`, pedido de la sesion del inventario 23-10); de paso sumarlos al respaldo local de 7 dias
- [ ] **Plata, Oro y Diamante** (31-10): que incluyen, o se retiran de la venta (siguen anunciados)
- [ ] **Legales con el abogado** (05-11): version en ingles, terceros que faltan en el aviso (Gemini y OpenAI por las imagenes, push de Google y Apple), estado del INAI, "no es una suscripcion", clausula de la Bendicion
- [ ] **Jugar en produccion**: el one-shot del medico completo, y un mundo inspirado con amigos (Persefone pide de 4 a 6; Coronas, para ver el combate con la vida rebajada de los jefes)
- [ ] **Arte**: tema de la temporada, retrato de Bren (guardia) y punto de "La corte exterior" en el mapa de la boticaria
- [ ] **Marca**: busqueda en Marcanet hecha el 22-10, "Ad Astra Mentis" libre. Falta presentar la solicitud en Marca en Linea (IMPI): nominativa, una sola solicitud con clases 9 y 41 (42 opcional), antes del 15-11. Despues: cuentas en redes (Discord, YouTube y X siguen en gris en la portada) y logo redibujado para imprenta
- [ ] **Pase de descubridor**: sigue provisional desde el 29-09. Lista de logros (y los narrativos), premios de cada bloque, su arte y donde va el pase en la navegacion. Precio del pase y umbrales del camino, con las metricas de la beta
- [ ] Decisiones de negocio sin fecha: revenue share de creadores (tras la primera venta), ritmo de mundos originales por temporada (minimo dos), herramientas de Diamante para streamers, contenido para menores (con el abogado), y si el catalogo publico de mundos de la gente entra en la primera version o solo la subida privada (docs/15)
- [ ] Decidir el A/B de la apertura con GPT (hace falta una clave de OpenAI con credito en local) o darlo por cerrado con Claude

## 2. Antes de abrir (semana 4; lo hace Opus sin esperar a nadie)

- [ ] **Quitar PHP 8.3 del servidor** (~29-10): desde el 22-10 todo corre en 8.4.27 y `php8.3-fpm` esta detenido y deshabilitado; si una semana no hubo que volver atras, `apt purge php8.3-*` y borrar `/root/.rpg/corte-php84-20261022/`

- [ ] **HSTS en el nginx del inventario** (pedido de la sesion del inventario, 23-10): Gabino vio "No seguro" en Chrome con `http://inventario.atomosoluciones.com`. El 301 a https y el certificado estan bien, pero falta HSTS. En el server de 443 (el que agrego certbot) `add_header Strict-Transport-Security "max-age=31536000" always;` sin `includeSubDomains` (otros subdominios viven en JettHost), repetido en los `location` con `add_header` propio (`/assets` e index), `nginx -t` y reload. Despues pasar el archivo instalado a la sesion del inventario para versionarlo en `deploy/nginx-inventario.conf` (el del repo solo tiene el bloque 80 de antes de certbot). Vale revisar lo mismo en adastramentis.com y dashboard
- [ ] **Verificacion de correo**: `ATOMO_REQUIRE_EMAIL_VERIFICATION=false`. Ser anfitrion ya pide correo confirmado (29-09); decidir si se enciende para todos (añade un paso al registro) o se queda asi y se documenta
- [ ] **Limpiar `/root/.rpg`**: quedan `dev-gabino-password` y `dev-god-password` de cuentas que se borraron el 24-09, y seis respaldos viejos del `.env`. Borrar con Gabino enterado
- [ ] Rotacion de secretos con procedimiento escrito (S7), junto con las claves de imagen
- [ ] **AAB v30** con la etiqueta del narrador (y lo que se junte), con la lista de [releases de Play] verificada antes de pedirle a Gabino que lo suba
- [ ] La boticaria **se queda** en el catalogo de la beta (decision de Gabino, 11-10: es la unica con IP ajena pero genera interes). Revisarlo de nuevo antes de abrir el catalogo al publico

## 3. Panel de administracion (dashboard.adastramentis.com)

Hecho: entrar, salud, auditoria, usuarios y roles, mesas, turnos atascados,
pagos, cupos, pases, trabajos fallidos, revision de mundos, catalogo, soporte,
dar cupo, reembolsar, suspender. Lo que falta contra el plan de
[docs/25](docs/25-plan-administracion.md) y contra los comandos que hoy solo
existen por SSH:

- [ ] **Campañas** con su registro de eventos y proyecciones (el plan las pedia en lectura; hoy solo hay mesas)
- [ ] **Revisar una mesa**: `tables:review`, `turns:notices` y el lector critico (`critic.mts`) desde el detalle de la mesa, sin SSH
- [ ] **Temporadas** (E12): hoy `season:open` y `season:rewards` son comandos. Programar la temporada, su camino y su arte desde el panel
- [ ] **Regalar Bendicion** (`blessing:grant`) y excepciones a mano (clave propia sin suscripcion, clave nuestra con limites)
- [ ] Cronicas: voz y video (`speech:chronicle`, `video:chronicle`) con su estimacion de costo antes de generar
- [ ] Adjuntar capturas a un reporte de soporte (atomo-media)
- [ ] El formulario de login de `@atomo/auth-ui` sale en ingles
- [ ] Ajustes del sistema sin SSH (atomo-app-config, sin instalar)

## 4. Juego y contenido

- [ ] Probar el piloto (fantasy-d20-lite, combate) con tres jugadores y el modelo real
- [ ] **Medir los paquetes con una sesion de cuatro jugadores**: los numeros de turnos por paquete salen de un jugador y el factor de cuatro esta extrapolado (semana 5)
- [ ] Panel del anfitrion con el diagnostico del turno (docs/27; hoy solo por comando)
- [ ] Piloto, mascarada y boticaria sin `canon`, `npcs` por sesion ni `scene` de cierre (campos nuevos y opcionales); ponerlos al tocar cada mundo
- [ ] Costo, si hace falta mas: medir Haiku como narrador con `tables:review` y el lector critico
- [ ] Repo `rpg-packs/inspirados` en Gitea para los documentos de diseño (hoy solo local)
- [ ] App: la Guia de como jugar (solo esta en la web)

### Escalera del narrador (decision de Gabino, 12-10)

El modelo lo decide lo que tiene pagado el anfitrion. Hecho en la API el
12-10 (`QuotaService::narratorFor`, `quotas.paid_turns`): turnos comprados,
Sonnet (se gastan antes que la cubeta); cuenta nueva, Sonnet sus primeros 20;
Bendicion activa, `QUOTA_BLESSING_MODEL` (Haiku); lo demas, `QUOTA_MODEL`
(hoy Haiku; DeepSeek si pasa la prueba). `/gm` devuelve `tier` para la
etiqueta. Antes de esto, quien compraba turnos narraba con Haiku al pasar sus
primeros 20.

Etiquetas (las del narrador hechas el 22-10, 93f69c9; la app las lleva en el siguiente AAB): nombres propios con el modelo en letra
chica, que tambien es el aviso legal. Narrador aprendiz (gratis, DeepSeek),
de oficio (Bendicion, Haiku), maestro (turnos, Sonnet); arriba, voz de bardo
(ElevenLabs), ilustraciones de galeria y cronica de cine (Veo o Kling) para
Plata, Oro y Diamante. Se ven en la cabecera de la mesa y en la pantalla de
fin, nunca en medio de la narracion, y cada mejora lleva a algo que se puede
comprar ya. Midjourney no: no tiene API y sus terminos prohiben automatizarlo.

- [ ] Medir costo de ElevenLabs y de un video corto con Veo o Kling, para la tabla de Plata, Oro y Diamante

- [ ] Gabino: cuenta en platform.deepseek.com con 5 USD y su clave al `.env` local con `read -rs`
- [ ] Prueba de calidad: la misma mascarada de tres con DeepSeek, Haiku y Sonnet; lector critico, costo real, tiempo por turno y textos lado a lado. Si DeepSeek no sigue el formato o narra mal en español, no entra
- [ ] Si pasa: DeepSeek como modelo barato del cupo (hoy Haiku, despues de los 20 primeros turnos de cada cuenta en Sonnet); aviso visible al crear la mesa y al unirse; aviso de privacidad (tercero nuevo, transferencia a China, entrenamiento) y formulario de seguridad de datos de Google Play; pregunta para el abogado

## 5. Deuda tecnica

- [ ] **Reserva de cupo** (S8 del VAM del 19-09): el descuento por CAS al cerrar y la devolucion solo si el modelo no llego a responder. Hoy funciona, pero la regla de cuando cuesta un turno no esta escrita en el codigo
- [ ] Libro de cupo por transaccion (E4): el reembolso ya retira turnos, pero no hay registro por compra
- [ ] App: borrador de respuesta y vuelta a la misma mesa tras reautenticar (E5); migracion de la URL guardada y errores del keychain visibles (S11)
- [ ] Web: `PACK_OPTIONS` sigue en `apps/web/src/lib/pack.ts` (S12 a medias); `csrfOk` del proxy con un test por rama (A1)
- [ ] `resolveRuleset` exige version (R1)
- [ ] `campaign:import` solo trae eventos: una campaña importada llega sin turnos ni bloques
- [ ] Traer `legacy` a `dev` antes del primer merge de `dev` a `main` (y `veiledFields`, `veilNote`, `hideChronicle` en `Session`); de paso "El DM interpreta" en las reglas de sus sesiones
- [ ] Un solo comando que levante los servicios locales (engine, API, web, worker)
- [ ] Partir `TableScreen` (web y app, unas 850 lineas cada una) la proxima vez que se toque a fondo (A8)
- [ ] Catalogo comercial generico a `atomo/catalog` cuando un segundo producto lo use (A4)

Riesgos aceptados (dueño Gabino): E3, reembolsar el pase deja los mundos
ganados; E6, sin engine se puede crear mesa y el primer turno falla.

## Despues del 15-11 (fuera del lanzamiento a proposito)

- Quitar "(Inspirado en ...)" de inutiles, persefone, barrio y coronas y publicarlos como propios: revisar antes el parecido del arte (Chispa con Megumin), `provenance` a `original`, catalogo abierto. La boticaria no
- Mesas abiertas a desconocidos (necesita moderacion); reseñas publicas con moderacion
- Anuncios con premio solo en el plan gratuito ("mira un anuncio y recarga un turno"), sin banners ni intersticiales; condicionado a la prueba de DeepSeek, porque solo con el narrador barato el anuncio paga el turno
- Campañas y Personajes (hoy "Pronto"); avisos de mesa ("es tu turno", "abrieron sesion")
- Narrador estandar o premium (10e); afinidad con NPC (10f); rehacer la ultima accion (de paga)
- Dados 3D con fisicas (entra como otro `DiceRoller`) y sonido ambiental por escena (docs/14)
- Voz del narrador dentro de la mesa (hoy solo en la cronica de la web); elegir la voz definitiva
- Constructor de historias (E13): editor de packs, validador de propiedad intelectual y de calidad
- App de iPhone; colaboraciones con streamers
- Packs de prueba de contenido: coqueteo sugerente (fijar la frontera), terror de anomalias, niveles liminales, terror psicologico propio
- Mas one-shots de un jugador por genero; variante femenina del protagonista del medico; limite de tiempo por respuesta en sesiones cortas
- v2: GM humano y modo remoto; SSE si el polling deja de bastar

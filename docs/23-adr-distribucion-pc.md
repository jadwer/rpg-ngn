# ADR: distribucion en PC (Steam y Epic), diferida

Decidido el 2026-09-23 por Gabino sobre el brief que GPT dejo con este mismo
numero (commit `4a4f0fd`, en el historial). Ese brief era una lista de
preguntas; este documento las contesta en corto y cierra la decision. Manda
sobre cualquier mencion de Steam o Epic en el ROADMAP.

## Contexto

Ad Astra Mentis es una web (Next.js) con una app de telefono detras, sobre
una plataforma Laravel que es la unica dueña del estado ([11](11-adr-stack-saas.md)).
La web es el producto principal (directriz del 2026-09-06). Hoy no hay
usuarios que no seamos nosotros, Stripe esta en modo prueba y el catalogo
tiene tres mundos. GPT propuso preparar la llegada a Steam y a Epic Games
Store sin hipotecar la arquitectura.

Hechos verificados el 23-09 (fuentes al final):

- **Steam**: 100 USD por aplicacion (Steam Direct), reembolsables cuando la
  aplicacion supera 1,000 USD de ingreso. Comision del 30% hasta 10 millones.
  Antes de publicar: identidad, datos bancarios y formulario fiscal de
  EE. UU. (W-8BEN para quien no es de alli); unos 30 dias entre el alta y
  poder lanzar, mas la revision de Valve.
- **Compras dentro del cliente de Steam** pasan por Steam Wallet con la API de
  microtransacciones; vender creditos por fuera desde dentro del juego es
  terreno gris que el acuerdo de distribucion (bajo NDA) regula.
- **IA generada en vivo**: Valve exige describir por escrito los controles
  que impiden contenido ilegal, lo publica en la pagina de la tienda y desde
  enero de 2026 el overlay trae un boton para denunciar. Sin esa declaracion
  la aplicacion se retira.
- **Epic Games Store**: 0% sobre el primer millon por producto y año, 12%
  despues; el pago propio dentro del juego se permite al 0%. Su trafico para
  productos pequeños es bajo.

## Decision

**La distribucion en Steam y Epic se difiere hasta tener product-market fit.**
No se construye cliente de PC, no se integran SDK de tienda y no se
reserva trabajo en el ROADMAP para ello. El producto sigue siendo la web.

Se reabre este ADR cuando se cumplan **todas** estas condiciones:

1. Embudo medido con retencion: gente ajena que llega a la segunda sesion
   (docs/24, metricas).
2. Stripe en modo real con compras de desconocidos.
3. Catalogo con al menos seis mundos originales o licenciados (docs/07): lo
   derivado de obra ajena no puede ir a una tienda.
4. Entidad o persona con documentacion fiscal para el W-8BEN y los pagos.

## Lo que ya queda contestado (para no volver a preguntarlo)

| Pregunta del brief | Respuesta |
|---|---|
| Cliente de PC | Tauri envolviendo la web, solo Windows x64. Ni Electron ni frontend nuevo. Riesgo conocido: Valve rechaza aplicaciones que son "una pagina web en una ventana"; habra que aportar algo nativo (overlay de mesa, notificaciones, modo pantalla) |
| Identidad | La cuenta de Mentis es la canonica. Steam y Epic se vinculan por OAuth de tienda a una cuenta existente o crean una con correo pedido en el primer arranque; el Steam ID nunca es la clave primaria |
| Compras | Dentro del cliente de Steam solo por Steam Wallet, al 30%; la web no se enlaza desde dentro. En Epic, pago propio. Los creditos comprados en cualquier canal son el mismo saldo en el servidor |
| Mesas mixtas | No cambia nada: la mesa vive en el servidor y el canal es solo por donde entra cada quien |
| Cloud saves | No. El estado es del servidor; no hay dato local que valga la pena sincronizar |
| Logros | Fuera de la primera version. Si algun dia entran, se derivan de eventos del servidor y se proyectan a la tienda |
| Steamworks y EOS | Solo autenticacion y distribucion. Nada mas mientras no haya un motivo escrito |
| IA en vivo | Se declara. Los controles que ya existen: el contrato de realidad (docs/06), el lint de conocimiento y la moderacion de packs (docs/15). Falta un mecanismo de denuncia en el producto antes de cualquier tienda |
| Legal | Lo de docs/19 mas: terminos de cada tienda, reembolsos de tienda, clasificacion por edad (hoy solo 18+) |
| Orden Steam / Epic | Primero Steam si algun dia se hace; Epic es un adapter de identidad y pago despues, no una segunda arquitectura |

## Consecuencias

- El equipo no gasta sesiones en Steam ni en Epic. Cualquier propuesta nueva
  sobre tiendas se contesta con este documento.
- El ROADMAP mantiene una sola linea: "Steam y Epic: diferidos (docs/23)".
- Las cuatro condiciones de reapertura son medibles y coinciden con lo que
  el producto necesita de todos modos (embudo, Stripe, catalogo original,
  fiscalidad); prepararlas no es trabajo de tienda, es trabajo del producto.
- Lo que si se protege desde ya, porque cuesta cero: ningun package bajo
  `packages/` importa nada del navegador ni de Node (ya vigilado por eslint),
  el saldo y el estado siguen siendo solo del servidor, y la identidad es la
  cuenta propia.

## Fuentes

- Steam Direct, cuota y requisitos: https://partner.steamgames.com/doc/gettingstarted/appfee
- Microtransacciones dentro del cliente de Steam: https://partner.steamgames.com/doc/features/microtransactions
- Declaracion de IA en Steam (aclaracion de enero de 2026): https://biggo.com/news/202601171220_Steam_AI_Disclosure_Update_Focuses_on_Player_Content
- Reparto de ingresos en Epic Games Store: https://store.epicgames.com/distribution/revenue-programs/revenue-share

# 15. Packs de la comunidad: subir, revisar y activar

Estado: diseño, sin construir. Fecha: 2026-09-21. Decide Gabino.

Idea suya: que cualquiera pueda subir su pack a su cuenta, que haya un
repositorio publico donde se publiquen, y que tener **coleccion** se pague.
Este documento fija lo que ya esta decidido del diseño, lo que se descarto y
por que, y lo que falta por decidir. No es un plan de trabajo con fechas.

## Por que encaja con lo que ya existe

El motor ya trata el contenido como datos: `packages/content` valida cada
coleccion con schemas estrictos (zod `strictObject`, una clave desconocida es
un error), `tools/validate` lo corre en CI y el engine carga cada pack por su
id desde disco (docs/05). Un pack de un desconocido entra por el mismo
embudo que La Mascarada. No hay nada que ejecutar: son JSON y WebP.

Eso ya se probo dos veces a mano. Los packs privados de Gitea (la boticaria,
La Mascarada) son exactamente este caso resuelto para un solo autor.

## Las cuatro decisiones de Gabino y su lectura

1. **Repositorio publico de publicacion.** Si, pero es un catalogo dentro del
   producto, no un repo de git de cara al usuario. Git es la herramienta del
   autor, no del jugador.
2. **Instalador de packs, tipo mods.** Aqui conviene cambiar la palabra. Ver
   "Activar, no instalar".
3. **Vender espacio para varios packs.** El limite si, el espacio no. Ver
   "Que se cobra".
4. **Instalar desde el repositorio, no del zip, para poder revisar antes de
   liberar.** Es la mejor de las cuatro y la que sostiene el resto.

## Activar, no instalar

La decision 4 de Gabino, llevada hasta el final: **el servidor nunca ejecuta
nada de un pack, y nunca lo "instala"**. Un `.rpgpack` es un sobre de
transporte (un zip con la misma estructura de carpetas que ya define docs/05).
Al subirlo se descomprime en un area de cuarentena, se valida con los schemas
del motor y se guarda como contenido. Activar un pack en una cuenta es una
fila en una tabla, no una copia de archivos.

Consecuencias que valen la pena:

- **No hay superficie de ejecucion.** El unico riesgo de "virus" seria una
  imagen: por eso se recomprime toda imagen al ingerirla (ya hay estandar de
  retrato en docs/05: 512x512 WebP q82) y **se rechaza SVG**, que si ejecuta
  script. Un zip de 4000 archivos o con rutas `../` se rechaza en la
  descompresion.
- **Desactivar es instantaneo** y no rompe partidas cerradas: los eventos
  jugados siguen en el log, que es la fuente de verdad (docs/08).
- **Se puede retirar un pack del catalogo** sin entrar en la maquina de nadie,
  que es lo que hace falta cuando llega una reclamacion de derechos.

Queda un problema real por resolver: **una mesa en curso sobre un pack que se
retira o se edita**. El estado se reduce contra el pack (`reduce(events, {pack,
ruleset})`), asi que cambiar el contenido bajo una campana viva puede dejar
eventos que ya no validan. La salida coherente con lo que ya hay es que la
mesa fije la **version** del pack (el `pack.json` ya la declara y las mesas ya
guardan `packVersion`) y que una version publicada sea **inmutable**: subir
una correccion crea 0.1.1, no reescribe 0.1.0.

## Que se cobra

Aqui es donde discrepo de la propuesta inicial, y el motivo importa.

**Vender espacio en disco no es el negocio.** Un pack son unos cientos de KB
de JSON mas retratos: el almacenamiento no cuesta practicamente nada, y un
precio cuyo coste es cero es dificil de defender ante el usuario. La
comparacion con aternos.org despista porque aternos vende **computo** (un
servidor corriendo); aqui el computo ya se cobra aparte, por turnos.

**Lo escaso es la revision, no los megabytes.** Por eso:

| Que | Gratis | Plan |
|---|---|---|
| Packs privados (solo tus mesas) | 3 | sin limite |
| Jugar un pack ajeno del catalogo | si | si |
| Publicar al catalogo | revision en cola | revision con prioridad |

Y el cobro principal sigue siendo el que ya esta medido y funciona: **turnos**
(docs/09 y el modelo de negocio en la memoria del proyecto). Un pack ajeno que
se juega mucho consume turnos, que es margen conocido, sin inventar un precio
nuevo. Eso ademas rellena el hueco de Plata/Oro/Diamante, que llevan dias
declarados y vacios.

## Revision: privado al instante, publico en cola

La promesa "revisamos antes de liberar" no se puede cumplir a mano si aplica a
cada subida: con diez packs al dia se convierte en un trabajo diario de
Gabino. Se sostiene si se separa:

- **Privado**: valida y queda jugable **al momento**, sin revision humana. Es
  tu contenido para tus mesas, como hoy con los packs de Gitea.
- **Publico en el catalogo**: pasa por revision antes de aparecer. El trabajo
  manual escala con lo que se publica, no con lo que se sube.

Asi el autor nunca espera para usar lo suyo, y la cola solo crece cuando
alguien quiere audiencia.

Lo que la revision mira, en este orden: procedencia (ver abajo), contenido
sexual o de odio, menores, y datos personales de terceros. Es un criterio
publicado, no un gusto: si se rechaza, el autor tiene que poder leer por que.

## Procedencia: el agujero que hay que tapar antes de abrir

Esto no estaba en la propuesta y es el riesgo mas serio de toda la idea.

`docs/07` establece que el repo publico solo admite contenido original o
licenciado redistribuible, y por eso los packs basados en obra ajena viven en
Gitea, privados. **Abrir subidas publicas rompe ese equilibrio**: el primer
pack que suba alguien va a ser de un mundo con dueño. Entre amigos y en
privado, es su problema. En un catalogo publico con la marca del producto y
dinero de por medio, es el problema de Gabino. Es el mismo caso que ya se
decidio sobre Faerun en el mockup (docs/14), pero a escala y con reincidencia.

Lo minimo, y va antes de la primera subida publica:

- El pack **ya declara `provenance`** con clase, autores, fuentes y licencia
  (docs/05, docs/07). En una subida ese campo pasa de documentacion a
  **declaracion del autor**, y es obligatorio.
- **Terminos de subida**: el autor declara que tiene derecho, y responde de
  ello. Va junto a los terminos y el aviso de privacidad que ya faltan
  (ROADMAP, "Antes de abrir a usuarios reales").
- **Via de retirada**: un correo de contacto y la capacidad de despublicar.

Un pack privado con contenido de terceros puede seguir siendo tolerado, como
hoy. Lo que no puede es entrar al catalogo publico.

## Lo que falta decidir (de Gabino)

1. Si el catalogo publico entra en la primera version o si se abre solo la
   subida privada, que es la mitad del valor con una fraccion del riesgo.
2. Cuanto de la revision quiere hacer el mismo.
3. Que incluye cada plan, que sigue pendiente desde hace dias.

## Cuando

No ahora. Hay cuatro cosas que bloquean abrir a usuarios reales (recuperar
contraseña roto por `MAIL_MAILER=log`, cero documentacion de usuario, sin
terminos ni aviso de privacidad mientras se cobra, Stripe en modo prueba) y
esta pendiente **medir con gente real** que no haya jugado rol antes
(docs/14). Un catalogo de contenido ajeno multiplica la superficie del
producto y todavia no se sabe si una persona nueva llega al tercer turno.

Es la **entrega 8** del ROADMAP, que ya la nombra ("packs subibles"), con este
documento como diseño y la construccion despues de medir.

Relacionado: `docs/05` (formato), `docs/07` (procedencia), `docs/09` (alcance
SaaS y cobro), `docs/14` (medir antes de añadir).

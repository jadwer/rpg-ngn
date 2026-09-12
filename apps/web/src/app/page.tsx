import Link from 'next/link'
import { SessionCta } from '../components/SessionCta'

/**
 * Landing publica: que es rpg-ngn, como se juega y por donde se entra. Es
 * estatica; el unico trozo con sesion es el bloque de botones, que cambia
 * a "Tus mesas" si el navegador ya tiene sesion.
 */
export default function LandingPage() {
  return (
    <main className="page landing">
      <header className="hero">
        <p className="motto">&ldquo;Extraños hoy, quizás una leyenda mañana.&rdquo;</p>
        <h1>rpg-ngn</h1>
        <p className="tagline">La mesa de rol con DM de inteligencia artificial</p>
      </header>
      <hr className="rule" />

      <section className="pitch">
        <p className="lead">
          Junta a tus amigos, elige un personaje y deja que el director de juego narre. Cada quien juega desde su propio navegador, en la misma sala o a distancia; el DM lee lo que la mesa decide, tira los dados con
          ustedes y recuerda lo que pasó.
        </p>
        <SessionCta />
      </section>

      <section className="features">
        <article className="card feature">
          <h2>Un DM que no se cansa</h2>
          <p>El director de juego es un modelo de lenguaje con reglas claras: propone, el motor valida y el estado de la campaña se guarda. Nunca inventa tus tiradas ni cambia tu ficha por su cuenta.</p>
        </article>
        <article className="card feature">
          <h2>Cada quien con su pantalla</h2>
          <p>Narrativa y diálogos en el teléfono o la laptop de cada jugador, con las fichas de la party a un toque. El turno se cierra cuando todos respondieron; nadie ve la respuesta de los demás antes de tiempo.</p>
        </article>
        <article className="card feature">
          <h2>Voz y modo pantalla</h2>
          <p>La narración se lee en voz alta con la voz del navegador, bloque a bloque. Con la tecla F la mesa queda en grande, solo texto y diálogos, lista para compartir pantalla o transmitir.</p>
        </article>
      </section>

      <section className="demo" aria-label="Así se ve un turno">
        <div className="label">Así se ve un turno</div>
        <div className="demo-frame">
          <div className="demo-head">
            <span className="t">Los Nueve Viajeros</span>
            <span className="s">Sesión 003 &middot; Valdoria, al caer la noche &middot; Turno 2</span>
          </div>
          <p className="demo-prose">
            La posada huele a estofado y a leña húmeda. Afuera, la campana del pueblo suena tres veces, aunque nadie la está tocando. Los parroquianos callan; el posadero deja la jarra a medio servir.
          </p>
          <div className="demo-line">
            <span className="demo-portrait" aria-hidden />
            <div>
              <div className="demo-speaker">Posadero</div>
              <div>&ldquo;Si van a bajar a la mina, lleven una luz que no sea de aceite. Allá abajo el aire se la come.&rdquo;</div>
            </div>
          </div>
          <div className="demo-roll">
            <span className="demo-die">17</span>
            <span>Zahira, Percepción: escuchas pasos bajo el suelo de madera, como si alguien caminara al mismo ritmo que la campana.</span>
          </div>
          <div className="demo-foot">Faltan: Calder. Cuando todos respondan, cualquiera cierra el turno y el DM narra.</div>
        </div>
      </section>

      <section className="how">
        <div className="label">Cómo se juega</div>
        <ol>
          <li>
            <b>Crea tu cuenta</b> con tu nombre, correo y contraseña. Con eso basta para sentarte en una mesa.
          </li>
          <li>
            <b>El anfitrión crea la mesa</b>, elige el mundo y su personaje, escribe una premisa e invita a sus amigos por correo.
          </li>
          <li>
            <b>Cada jugador entra a la mesa</b> desde su navegador, lee, escribe lo que hace su personaje y envía.
          </li>
          <li>
            <b>El DM narra</b> cuando todos respondieron, en voz alta si quieren, y abre el siguiente turno.
          </li>
        </ol>
      </section>

      <footer className="landing-foot">
        <p className="hint">El mundo es más grande cuando se comparte.</p>
        <p className="hint">
          Motor de rol de mesa de código abierto con contenido original. <Link href="/entrar">Entrar</Link> &middot; <Link href="/crear-cuenta">Crear cuenta</Link>
        </p>
      </footer>
    </main>
  )
}

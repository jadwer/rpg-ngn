import Link from 'next/link'
import { Isotipo, LogoHorizontal, LogoVertical } from '../components/Brand'
import { SessionCta } from '../components/SessionCta'

const REPO = 'https://github.com/jadwer/rpg-ngn'

/** Iconos propios, de linea geometrica (docs/22): los de la lamina eran solo direccion de arte. */
const ICON = {
  mundos: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c-3 3-3 15 0 18m0-18c3 3 3 15 0 18M3 12h18M5 7.5h14M5 16.5h14',
  reglas: 'M12 2.5 21 7.5v9L12 21.5 3 16.5v-9zM12 7l5 3v4l-5 3-5-3v-4z',
  amigos: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7-1a2.5 2.5 0 1 0 0-5M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1m2-6h1a4 4 0 0 1 4 4v2',
  crear: 'M4 5.5C7 4 9.5 4 12 6c2.5-2 5-2 8-.5V19c-3-1.5-5.5-1.5-8 .5-2.5-2-5-2-8-.5zM12 6v13.5',
  estrella: 'M12 2.5 13.8 9 20 12l-6.2 3-1.8 6.5L10.2 15 4 12l6.2-3z',
  dado: 'M12 2.5 21 7.5v9L12 21.5 3 16.5v-9zM12 21.5v-9m9-5-9 5-9-5',
  libro: 'M4 5.5C7 4 9.5 4 12 6c2.5-2 5-2 8-.5V19c-3-1.5-5.5-1.5-8 .5-2.5-2-5-2-8-.5zM12 6v13.5',
  orbita: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M2.5 9.5c2-4 17-4 19 0 1.2 2.4-2 5-7 6.5M21.5 14.5c-2 4-17 4-19 0-1.2-2.4 2-5 7-6.5',
  enlace: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5',
  pluma: 'M20 4c-6 0-11 3-13 9l-3 7 7-3c6-2 9-7 9-13zM5 19l7-7',
}

/** Redes del proyecto: las que aun no existen van en gris hasta que haya cuenta (Gabino, 23-09). Glifos propios, rellenos. */
const REDES: ReadonlyArray<{ nombre: string; href: string | null; d: string }> = [
  { nombre: 'Discord', href: null, d: 'M19.5 5.5A16 16 0 0 0 15.6 4l-.5 1a15 15 0 0 0-6.2 0l-.5-1a16 16 0 0 0-3.9 1.5C2 9.3 1.4 13 1.7 16.6A16 16 0 0 0 6.5 19l1-1.6a10 10 0 0 1-1.6-.8l.4-.3a11.4 11.4 0 0 0 11.4 0l.4.3a10 10 0 0 1-1.6.8l1 1.6a16 16 0 0 0 4.8-2.4c.4-4.2-.7-7.8-2.8-11.1zM8.7 14.4c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2zm6.6 0c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2z' },
  { nombre: 'GitHub', href: REPO, d: 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.6 4.9.4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z' },
  { nombre: 'YouTube', href: null, d: 'M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.8 12 4.8 12 4.8s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2C1 8.9 1 12 1 12s0 3.1.5 4.8a2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2c.5-1.7.5-4.8.5-4.8s0-3.1-.5-4.8zM9.8 15.1V8.9L15.5 12z' },
  { nombre: 'X', href: null, d: 'M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.5 3h6.4l4.4 5.9zm-1.1 16.2h1.7L6.9 4.7H5.1z' },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d={d} />
    </svg>
  )
}

/**
 * La portada (docs/22, "Home Hero"; propuesta de GPT en img/branding/hero.png):
 * primero asombro, luego que es, luego como se juega. Estatica salvo los
 * botones, que cambian a "tus mesas" si el navegador ya tiene sesion.
 */
export default function LandingPage() {
  return (
    <main className="home">
      <header className="home-nav">
        <Link href="/" className="brand-mark" aria-label="Ad Astra Mentis">
          <LogoHorizontal height={36} title="Ad Astra Mentis" />
        </Link>
        <nav className="links" aria-label="Secciones">
          <a href="#mundos">Mundos</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href={`${REPO}/tree/dev/docs`} target="_blank" rel="noreferrer">
            Docs
          </a>
        </nav>
        <div className="acciones">
          <SessionCta variant="nav" />
        </div>
      </header>

      <section className="home-hero" aria-label="Ad Astra Mentis">
        <picture>
          <source media="(max-width: 700px)" srcSet="/branding/hero-movil.webp" />
          <img src="/branding/hero.webp" alt="" fetchPriority="high" />
        </picture>
        <div className="velo" aria-hidden />
        <div className="contenido">
          <LogoVertical className="marca" height={260} title="Ad Astra Mentis" />
          <p className="lema">Worlds born from imagination</p>
          <p className="frase">Tu imaginación también es un mundo.</p>
          <SessionCta variant="hero" />
        </div>
        <ul className="pilares" aria-label="Lo que ofrece">
          <li>
            <Icon d={ICON.mundos} />
            <span>Múltiples escenarios</span>
          </li>
          <li>
            <Icon d={ICON.reglas} />
            <span>Sistemas de reglas distintos</span>
          </li>
          <li>
            <Icon d={ICON.amigos} />
            <span>Juega con IA o con amigos</span>
          </li>
          <li>
            <Icon d={ICON.crear} />
            <span>Crea tus propias historias</span>
          </li>
        </ul>
      </section>

      <section className="home-motor" aria-labelledby="motor">
        <div className="texto">
          <h2 id="motor">Un motor. Infinitos mundos.</h2>
          <p>
            Ad Astra Mentis es una mesa de rol donde el director de juego es un modelo de lenguaje con reglas claras: propone, el motor valida y la historia se guarda. Fantasía épica, intriga cortesana, misterio o
            comedia de máscaras: el mundo lo eliges tú, las reglas cambian con él y nosotros ponemos la mesa.
          </p>
          <div className="row">
            <a href="#mundos" className="btn primary">
              Explora los mundos
            </a>
            <a href="#como-funciona" className="btn">
              Cómo funciona
            </a>
          </div>
        </div>
        <div className="tarjetas" aria-hidden>
          <img src="/branding/mundo-valdoria.webp" alt="" loading="lazy" />
          <img src="/branding/mundo-boticaria.webp" alt="" loading="lazy" />
          <img src="/branding/mundo-mascarada.webp" alt="" loading="lazy" />
        </div>
      </section>

      <section className="home-mundos" id="mundos" aria-labelledby="mundos-titulo">
        <div className="cabeza">
          <h2 id="mundos-titulo">Mundos</h2>
          <p className="hint">Tres formas de jugar con las que ya se juega hoy. Las tuyas, pronto.</p>
        </div>
        <div className="grid">
          <article className="mundo">
            <img src="/branding/mundo-valdoria.webp" alt="Un castillo sobre cascadas, en un valle de montaña" loading="lazy" />
            <h3>Fantasía medieval</h3>
            <p>Un pueblo minero, una mina cerrada y nueve viajeros a los que nadie recuerda. Dados, riesgo y aventura.</p>
            <ul className="tags">
              <li>Fantasía</li>
              <li>Aventura</li>
            </ul>
          </article>
          <article className="mundo">
            <img src="/branding/mundo-boticaria.webp" alt="Un palacio imperial de noche" loading="lazy" />
            <h3>China antigua</h3>
            <p>Intriga en el palacio interior: crédito, sospecha y pistas en lugar de golpes. Nadie saca un arma.</p>
            <ul className="tags">
              <li>Intriga</li>
              <li>Misterio</li>
            </ul>
          </article>
          <article className="mundo">
            <img src="/branding/mundo-mascarada.webp" alt="Un baile de máscaras" loading="lazy" />
            <h3>Baile de máscaras</h3>
            <p>Una noche de salón donde lo que cambia son las relaciones: prestigio, escándalo, rumores y vínculos.</p>
            <ul className="tags">
              <li>Romance</li>
              <li>Drama</li>
            </ul>
          </article>
          <a className="mundo propio" href={`${REPO}/blob/dev/docs/05-content-pack-spec.md`} target="_blank" rel="noreferrer">
            <Isotipo mini height={64} />
            <h3>Crea tu propio mundo</h3>
            <p>Un mundo es un pack de datos: personajes, lugares, secretos y sesiones. El formato es público.</p>
            <ul className="tags">
              <li>Sin límites</li>
              <li>Tu historia</li>
            </ul>
          </a>
        </div>
      </section>

      <section className="home-como" id="como-funciona" aria-labelledby="como-titulo">
        <h2 id="como-titulo">Cómo funciona</h2>
        <ol className="pasos">
          <li>
            <Icon d={ICON.libro} />
            <b>Elige un mundo y tu personaje</b>
            <span>Crea la mesa, escoge el mundo y quién eres en él. El director lo lee todo.</span>
          </li>
          <li>
            <Icon d={ICON.enlace} />
            <b>Invita con un enlace</b>
            <span>Mándalo por donde quieras. Quien lo abre entra, elige personaje y se sienta.</span>
          </li>
          <li>
            <Icon d={ICON.pluma} />
            <b>Cada quien escribe lo que hace</b>
            <span>En su teléfono o su laptop, en la misma sala o a distancia. Nadie ve la respuesta de los demás antes de tiempo.</span>
          </li>
          <li>
            <Icon d={ICON.dado} />
            <b>El director narra y tira los dados</b>
            <span>Cuando todos respondieron, narra las consecuencias, en voz alta si quieren, y abre el siguiente turno.</span>
          </li>
        </ol>
      </section>

      <section className="home-pilares" aria-label="Juega, explora, crea, comparte">
        <div>
          <Icon d={ICON.dado} />
          <h3>Juega</h3>
          <p>Con IA o con tus amigos.</p>
        </div>
        <div>
          <Icon d={ICON.estrella} />
          <h3>Explora</h3>
          <p>Mundos distintos con reglas distintas.</p>
        </div>
        <div>
          <Icon d={ICON.libro} />
          <h3>Crea</h3>
          <p>Tus propias historias y campañas.</p>
        </div>
        <div>
          <Icon d={ICON.orbita} />
          <h3>Comparte</h3>
          <p>Una mesa que cabe en un enlace.</p>
        </div>
      </section>

      <section className="home-cierre" aria-labelledby="cierre">
        <img src="/branding/mesa.webp" alt="" loading="lazy" />
        <div className="velo" aria-hidden />
        <div className="contenido">
          <blockquote>
            <p id="cierre">&ldquo;Todas las grandes historias comienzan en la mente.&rdquo;</p>
            <cite>Ad Astra Mentis</cite>
          </blockquote>
          <div className="llamada">
            <span>¿Listo para tu próximo mundo?</span>
            <SessionCta variant="hero" />
          </div>
        </div>
      </section>

      <footer className="home-pie">
        <div className="marca">
          <LogoHorizontal height={40} title="Ad Astra Mentis" />
          <span className="hint">Worlds born from imagination</span>
        </div>
        <nav className="links" aria-label="Pie">
          <a href={`${REPO}/tree/dev/docs`} target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
        </nav>
        <nav className="redes" aria-label="Redes">
          {REDES.map((r) => (
            <a key={r.nombre} href={r.href ?? '#'} target={r.href ? '_blank' : undefined} rel={r.href ? 'noreferrer' : undefined} aria-label={r.href ? r.nombre : `${r.nombre}, pronto`} title={r.href ? r.nombre : `${r.nombre}: pronto`} className={r.href ? undefined : 'pronto'}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d={r.d} />
              </svg>
            </a>
          ))}
        </nav>
        <p className="hint">Motor de rol de mesa de código abierto con contenido original. Antes se llamaba rpg-worlds.</p>
      </footer>
    </main>
  )
}

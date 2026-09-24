import Link from 'next/link'
import type { Metadata } from 'next'

/**
 * Guia del anfitrion (ROADMAP, B3): crear la mesa, invitar, abrir sesion,
 * jugar turnos, cerrar y retirar. En texto y sin capturas a proposito, para
 * que el rediseño de la mesa no la deje vieja; los nombres de botones y
 * paneles son los de la interfaz y hay que tocarlos aqui si cambian alla.
 */
export const metadata: Metadata = {
  title: 'Guía del anfitrión',
  description: 'Cómo crear una mesa en Ad Astra Mentis, invitar a tu grupo, abrir una sesión y jugar los turnos con el director de juego.',
}

export default function GuiaPage() {
  return (
    <main className="page narrow legal">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">Guía del anfitrión</p>
      </header>
      <hr className="rule" />

      <p>
        El anfitrión es quien crea la mesa: elige el mundo, invita a su grupo, abre las sesiones y paga los turnos. El director de juego lo pone Ad Astra Mentis; tú solo tienes que reunir a la gente.
      </p>

      <h2>1. Crea la mesa</h2>
      <ol>
        <li>
          Entra en <Link href="/mesas">Mesas</Link> y pulsa <b>Crear mesa</b> (también está en el menú como <b>Nueva mesa</b>).
        </li>
        <li>Ponle nombre y elige el mundo. Los que añadiste en Mis mundos aparecen en la lista.</li>
        <li>Elige tu personaje si vas a jugar, o déjalo sin personaje si solo quieres dirigir la mesa.</li>
        <li>La premisa es opcional: una frase sobre el tono o lo que quieren jugar.</li>
      </ol>

      <h2>2. Invita a tu grupo</h2>
      <ol>
        <li>
          Dentro de la mesa abre <b>Jugadores</b> en la barra del juego y pulsa <b>Crear enlace</b>.
        </li>
        <li>
          Cópialo y compártelo por donde hablen. <b>Solo se muestra una vez</b>: si lo pierdes, crea otro (el anterior deja de valer).
        </li>
        <li>Sirve para 5 personas y caduca en una semana. Quien lo abre sin cuenta se registra y vuelve directo a tu mesa para elegir personaje.</li>
      </ol>

      <h2>3. Abre la sesión</h2>
      <ol>
        <li>
          En <b>Anfitrión</b> elige qué sesión juegan y pulsa <b>Abrir sesión</b>.
        </li>
        <li>El director presenta la escena y a cada personaje. Nadie tiene que adivinar qué hacer.</li>
        <li>
          Si la sesión trae tirada de <b>Fortuna</b>, cada jugador ve su dado: se mantiene presionado y se suelta. El número lo saca el servidor, así que nadie puede escribir el suyo.
        </li>
      </ol>

      <h2>4. Jugar un turno</h2>
      <ol>
        <li>
          Cada quien escribe qué hace su personaje y pulsa <b>Enviar</b>. En <b>Jugadores</b> se ve quién ya respondió y quién está escribiendo.
        </li>
        <li>
          Cuando responden todos, empieza una cuenta atrás de 10 segundos y el director narra. Cualquiera puede pulsar <b>Cancelar</b> si quiere corregir algo; luego <b>Cerrar y narrar</b> sigue la partida.
        </li>
        <li>
          Si alguien no contesta, el anfitrión puede usar <b>Forzar cierre</b>. Si alguien tuvo que irse, márcalo como ausente en <b>Jugadores</b> para que la mesa no lo espere.
        </li>
        <li>Si el director falla, el turno se reabre solo y no se cobra.</li>
      </ol>

      <h2>5. Quién paga los turnos</h2>
      <ul>
        <li>
          <b>Los turnos los paga el anfitrión</b>, no cada jugador. Los invitados juegan gratis.
        </li>
        <li>
          Cada cuenta empieza con turnos de cortesía. Después se compran créditos en <Link href="/perfil">Mi cuenta y créditos</Link>, o puedes usar tu propia clave del proveedor en los ajustes del director.
        </li>
        <li>
          En <b>Anfitrión</b>, los ajustes del director dicen con qué modelo narra la mesa y de dónde sale el pago.
        </li>
      </ul>

      <h2>6. Cierra la sesión</h2>
      <p>
        En <b>Anfitrión</b>, pulsa <b>Cerrar sesión</b>. Puedes dejar un cliffhanger para la próxima: el director lo retoma al abrir la siguiente.
      </p>

      <h2>7. Comparte la crónica</h2>
      <p>
        En <b>Lectura</b> cualquiera de la mesa puede pedir un enlace público de la crónica. No se publica hasta que lo aceptan todos los miembros, se puede ocultar quién jugó y cualquiera puede retirarlo.
      </p>

      <h2>8. Retira la mesa</h2>
      <ul>
        <li>
          En <Link href="/mesas">Mesas</Link>, <b>Retirar</b> la archiva: sale de tu lista y la crónica se conserva, porque también es de quien jugó contigo. <b>Recuperar</b> la devuelve.
        </li>
        <li>
          <b>Borrar del todo</b> solo aparece si la mesa nunca se jugó.
        </li>
        <li>
          Si eres invitado, <b>Salir de la mesa</b> te quita de ella.
        </li>
      </ul>

      <p className="hint">
        ¿Algo no funciona como dice aquí? Escríbenos a <a href="mailto:soporte@adastramentis.com">soporte@adastramentis.com</a>.
      </p>
    </main>
  )
}

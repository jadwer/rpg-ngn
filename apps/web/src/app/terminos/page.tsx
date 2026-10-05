import Link from 'next/link'
import type { Metadata } from 'next'
import { Bilingual, ConvenienceNote } from '../../components/Bilingual'

/**
 * Terminos y condiciones. El texto completo, con su razonamiento y las
 * preguntas pendientes para el abogado, vive en
 * `docs/19-legal-aviso-y-terminos.md`; esta pagina es su publicacion.
 */
export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Las condiciones de uso de Ad Astra Mentis (rpg-worlds): créditos, contenido, responsabilidad y cancelación.',
}

const ACTUALIZADO = '22 de septiembre de 2026'

function TermsEs() {
  return (
    <main className="page narrow legal">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">Términos y condiciones</p>
      </header>
      <hr className="rule" />

      <p className="hint">Última actualización: {ACTUALIZADO}.</p>

      <h2>1. Qué es esto y quién lo ofrece</h2>
      <p>
        Ad Astra Mentis, antes rpg-worlds, es un servicio en línea para jugar partidas de rol narrativo en las que <b>la dirección del juego la realiza un sistema de inteligencia artificial</b> en lugar de una
        persona.
      </p>
      <p>Lo ofrece Gabino Ramírez, persona física con actividad empresarial.</p>
      <p>Al crear una cuenta aceptas estos términos. Si no estás de acuerdo con ellos, no uses el Servicio.</p>

      <h2>2. Quién puede usarlo</h2>
      <p>
        Debes ser <b>mayor de 18 años</b> y tener capacidad legal para obligarte. Al registrarte declaras que cumples ambos requisitos.
      </p>
      <p>Eres responsable de la actividad que ocurra en tu cuenta y de mantener tu contraseña en secreto. Avísanos si crees que alguien más accedió a ella.</p>

      <h2>3. Cómo funcionan los créditos</h2>
      <p>
        El Servicio se paga con <b>créditos de prepago medidos en turnos</b>. No es una suscripción: no se renueva solo ni se te cobra de forma periódica.
      </p>
      <ul>
        <li>
          Un <b>turno</b> es una intervención del GM (el director de juego de la plataforma): se consume cuando la mesa cierra el turno y el sistema genera la narración.
        </li>
        <li>
          <b>Los turnos los paga quien crea la mesa</b>, no cada jugador. Si invitas a alguien a tu mesa, sus intervenciones consumen tus turnos.
        </li>
        <li>
          Si un turno <b>falla por un error del sistema</b>, no se te cobra.
        </li>
        <li>Los créditos no caducan mientras tu cuenta exista.</li>
        <li>Los créditos no son transferibles ni canjeables por dinero.</li>
      </ul>
      <p>Los precios se muestran antes de cada compra. Podemos modificarlos en el futuro; los cambios no afectan a los créditos que ya compraste.</p>

      <h2>4. Devoluciones</h2>
      <p>
        Si los créditos no funcionaron por un fallo atribuible al Servicio, escríbenos a <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a> y te devolvemos el importe
        correspondiente.
      </p>
      <p>
        <b>Los créditos ya consumidos no son reembolsables</b>, porque cada turno gastado representa un coste real ya incurrido.
      </p>

      <h2>5. Contenido: tuyo, nuestro y generado por la máquina</h2>
      <p>
        <b>Lo que tú escribes es tuyo.</b> Conservas los derechos sobre el texto que escribes en tus partidas. Nos concedes únicamente la licencia necesaria para almacenarlo, mostrarlo a los
        demás jugadores de tu mesa y transmitirlo al proveedor del modelo para generar la narración.
      </p>
      <p>Los mundos de juego que ofrecemos son de sus respectivos autores, y se usan dentro del Servicio conforme a lo que cada uno permita.</p>
      <p>
        <b>Sobre la narración que genera la inteligencia artificial</b>, y es importante que lo entiendas:
      </p>
      <ul>
        <li>
          El texto que produce el GM <b>lo genera un modelo de lenguaje</b>, y puede contener errores, incoherencias o contenido inesperado.
        </li>
        <li>
          <b>No garantizamos que la narración sea original ni única.</b> Dos partidas distintas pueden recibir textos parecidos.
        </li>
        <li>
          <b>No respondemos del contenido narrativo generado</b> más allá de retirar lo que resulte manifiestamente inapropiado cuando se nos informe.
        </li>
      </ul>
      <p>Si algo generado por el sistema te parece inaceptable, avísanos.</p>
      <p>
        <b>Los mundos que subes</b> (packs con personajes, lugares, historias e imágenes) siguen siendo tuyos. Al subir uno declaras que tienes derecho sobre su contenido, sea propio o con una licencia que lo
        permita, y respondes de ello; nos concedes la licencia necesaria para guardarlo, validarlo, mostrarlo en tus mesas y, si pides publicarlo y lo aprobamos, en el catálogo con tu nombre. Podemos
        retirar del catálogo cualquier mundo ante una reclamación de derechos o si incumple estos términos; para reclamar sobre un mundo ajeno escribe a{' '}
        <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
      </p>

      <h2>6. Lo que no puedes hacer</h2>
      <ul>
        <li>Usar el Servicio para actividades ilegales, o para producir contenido que promueva el odio, la violencia real contra personas, el abuso sexual infantil o el acoso.</li>
        <li>Intentar acceder a cuentas o partidas ajenas, o eludir los límites de créditos.</li>
        <li>Automatizar el uso del Servicio para consumir recursos de forma masiva.</li>
        <li>Revender el acceso al Servicio sin nuestro permiso.</li>
        <li>Subir o introducir contenido sobre el que no tengas derechos.</li>
      </ul>
      <p>Podemos suspender una cuenta que incumpla estos puntos. Si la suspensión no está justificada, se restituye.</p>

      <h2>7. Disponibilidad del Servicio</h2>
      <p>
        El Servicio se ofrece <b>&quot;tal cual&quot;</b>. Trabajamos para que esté disponible, pero <b>no garantizamos que funcione de forma ininterrumpida ni libre de errores</b>. Puede haber
        interrupciones por mantenimiento, por fallos de nuestros proveedores o por causas ajenas a nosotros.
      </p>
      <p>
        <b>Dependemos de servicios de terceros</b> (el proveedor del modelo de inteligencia artificial, el procesador de pagos y el alojamiento). Una interrupción en cualquiera de ellos puede
        afectar al Servicio.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la medida que permita la ley, nuestra responsabilidad total frente a ti por cualquier reclamación relacionada con el Servicio <b>no excederá el importe que hayas pagado en los tres
        meses anteriores</b> al hecho que la origine.
      </p>
      <p>No respondemos de daños indirectos, pérdida de datos de partidas por causas ajenas a nuestro control, ni de lo que otros usuarios escriban en tus mesas.</p>
      <p>Nada de lo anterior limita la responsabilidad que por ley no puede limitarse.</p>

      <h2>9. Cancelación</h2>
      <p>
        <b>Puedes dejar de usar el Servicio cuando quieras</b> y solicitar la cancelación de tu cuenta escribiendo a{' '}
        <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>. La cancelación implica la pérdida de los créditos no consumidos.
      </p>
      <p>Podemos suspender o cancelar tu cuenta si incumples estos términos, avisándote del motivo salvo que la ley lo impida.</p>
      <p>
        Podemos dejar de ofrecer el Servicio. Si lo hacemos, te avisaremos con antelación razonable y <b>te devolveremos los créditos no consumidos</b>.
      </p>

      <h2>10. Cambios a estos términos</h2>
      <p>
        Podemos modificar estos términos. Publicaremos la versión nueva en esta misma dirección. Si el cambio es sustancial, te avisaremos por correo con antelación. Seguir usando el Servicio
        después de un cambio significa que lo aceptas.
      </p>

      <h2>11. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes de la Ciudad de México,
        renunciando a cualquier otro fuero.
      </p>

      <hr className="rule" />
      <p className="hint">
        <Link href="/privacidad">Aviso de privacidad</Link> &middot; <Link href="/">Inicio</Link>
      </p>
    </main>
  )
}

export default function TerminosPage() {
  return <Bilingual es={<TermsEs />} en={<TermsEn />} />
}

/** Traduccion de cortesia al ingles. Manda la version en español; revisar con el abogado (docs/19). */
function TermsEn() {
  return (
    <main className="page narrow legal">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">Terms and conditions</p>
      </header>
      <hr className="rule" />

      <ConvenienceNote>This English version is a courtesy translation. The Spanish version is the one that governs; if they differ, the Spanish text prevails.</ConvenienceNote>
      <p className="hint">Last updated: September 22, 2026.</p>

      <h2>1. What this is and who offers it</h2>
      <p>
        Ad Astra Mentis, formerly rpg-worlds, is an online service for playing narrative roleplaying games in which <b>the game is run by an artificial intelligence system</b> instead of a person.
      </p>
      <p>It is offered by Gabino Ramírez, an individual with business activity in Mexico.</p>
      <p>By creating an account you accept these terms. If you do not agree with them, do not use the Service.</p>

      <h2>2. Who can use it</h2>
      <p>
        You must be <b>18 years of age or older</b> and have the legal capacity to enter into agreements. By signing up you declare that you meet both requirements.
      </p>
      <p>You are responsible for the activity on your account and for keeping your password secret. Let us know if you believe someone else accessed it.</p>

      <h2>3. How credits work</h2>
      <p>
        The Service is paid with <b>prepaid credits measured in turns</b>. It is not a subscription: it does not renew on its own and you are not charged periodically.
      </p>
      <ul>
        <li>
          A <b>turn</b> is one intervention of the game master: it is used when the table closes the turn and the system generates the narration.
        </li>
        <li>
          <b>Turns are paid by whoever creates the table</b>, not by each player. If you invite someone to your table, their interventions use your turns.
        </li>
        <li>
          If a turn <b>fails because of a system error</b>, you are not charged.
        </li>
        <li>Credits do not expire while your account exists.</li>
        <li>Credits are not transferable and cannot be exchanged for money.</li>
      </ul>
      <p>Prices are shown before each purchase. We may change them in the future; changes do not affect credits you already bought.</p>

      <h2>4. Refunds</h2>
      <p>
        If credits did not work because of a failure attributable to the Service, write to us at <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a> and we will refund the
        corresponding amount.
      </p>
      <p>
        <b>Credits already used are not refundable</b>, because each turn spent represents a real cost already incurred.
      </p>

      <h2>5. Content: yours, ours and machine-generated</h2>
      <p>
        <b>What you write is yours.</b> You keep the rights to the text you write in your games. You grant us only the license needed to store it, show it to the other players at your table and
        send it to the model provider to generate the narration.
      </p>
      <p>The game worlds we offer belong to their respective authors and are used within the Service as each of them allows.</p>
      <p>
        <b>About the narration generated by artificial intelligence</b>, and it is important that you understand this:
      </p>
      <ul>
        <li>
          The text produced by the game master <b>is generated by a language model</b> and may contain errors, inconsistencies or unexpected content.
        </li>
        <li>
          <b>We do not guarantee that the narration is original or unique.</b> Two different games may receive similar texts.
        </li>
        <li>
          <b>We are not liable for the generated narrative content</b> beyond removing what is clearly inappropriate once we are informed.
        </li>
      </ul>
      <p>If something generated by the system seems unacceptable to you, let us know.</p>
      <p>
        <b>The worlds you upload</b> (packs with characters, places, stories and images) remain yours. By uploading one you declare that you hold the rights to its content, whether your own or under a
        license that allows it, and you are responsible for it; you grant us the license needed to store it, validate it, show it at your tables and, if you ask to publish it and we approve it, in the
        catalog under your name. We may remove any world from the catalog after a rights claim or if it breaches these terms; to claim about someone else’s world write to{' '}
        <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
      </p>

      <h2>6. What you may not do</h2>
      <ul>
        <li>Use the Service for illegal activities, or to produce content that promotes hatred, real violence against people, child sexual abuse or harassment.</li>
        <li>Try to access other people’s accounts or games, or get around credit limits.</li>
        <li>Automate the use of the Service to consume resources massively.</li>
        <li>Resell access to the Service without our permission.</li>
        <li>Upload or enter content you do not hold the rights to.</li>
      </ul>
      <p>We may suspend an account that breaches these points. If the suspension is not justified, it is lifted.</p>

      <h2>7. Availability of the Service</h2>
      <p>
        The Service is provided <b>&quot;as is&quot;</b>. We work to keep it available, but <b>we do not guarantee that it will run uninterrupted or error-free</b>. There may be interruptions for
        maintenance, because of failures of our providers or for reasons beyond our control.
      </p>
      <p>
        <b>We depend on third-party services</b> (the artificial intelligence model provider, the payment processor and hosting). An interruption in any of them may affect the Service.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent permitted by law, our total liability to you for any claim related to the Service <b>will not exceed the amount you paid in the three months prior</b> to the event giving rise to
        it.
      </p>
      <p>We are not liable for indirect damages, loss of game data for reasons beyond our control, or what other users write at your tables.</p>
      <p>Nothing above limits liability that cannot be limited by law.</p>

      <h2>9. Cancellation</h2>
      <p>
        <b>You can stop using the Service whenever you want</b> and request the cancellation of your account by writing to <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
        Cancellation means losing unused credits.
      </p>
      <p>We may suspend or cancel your account if you breach these terms, telling you the reason unless the law prevents it.</p>
      <p>
        We may stop offering the Service. If we do, we will give you reasonable notice and <b>refund your unused credits</b>.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may change these terms. We will publish the new version at this same address. If the change is substantial, we will notify you by email in advance. Continuing to use the Service after a
        change means you accept it.
      </p>

      <h2>11. Governing law and jurisdiction</h2>
      <p>
        These terms are governed by the laws of the United Mexican States. For any dispute, the parties submit to the competent courts of Mexico City, waiving any other venue.
      </p>

      <hr className="rule" />
      <p className="hint">
        <Link href="/privacidad">Privacy notice</Link> &middot; <Link href="/">Home</Link>
      </p>
    </main>
  )
}

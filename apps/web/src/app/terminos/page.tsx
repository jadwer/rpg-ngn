import Link from 'next/link'
import type { Metadata } from 'next'

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

export default function TerminosPage() {
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
          Un <b>turno</b> es una intervención del director de juego: se consume cuando la mesa cierra el turno y el sistema genera la narración.
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
          El texto que produce el director de juego <b>lo genera un modelo de lenguaje</b>, y puede contener errores, incoherencias o contenido inesperado.
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

import Link from 'next/link'
import type { Metadata } from 'next'
import { Bilingual, ConvenienceNote } from '../../components/Bilingual'

/**
 * Aviso de privacidad. El texto completo, con su razonamiento y las preguntas
 * pendientes para el abogado, vive en `docs/19-legal-aviso-y-terminos.md`; esta
 * pagina es su publicacion.
 *
 * Gabino decidio publicarlo antes de la revision legal (22-09): tener algo
 * publicado protege mas que no tener nada mientras se espera al abogado. Por
 * eso lleva el aviso de version 1 y la fecha visible.
 */
export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description: 'Que datos recoge Ad Astra Mentis (rpg-worlds), para que los usa y como ejercer tus derechos.',
}

const ACTUALIZADO = '22 de septiembre de 2026'
const ACTUALIZADO_EN = 'September 22, 2026'

function PrivacyEs() {
  return (
    <main className="page narrow legal">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">Aviso de privacidad</p>
      </header>
      <hr className="rule" />

      <p className="hint">Última actualización: {ACTUALIZADO}.</p>

      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        Gabino Ramírez, persona física con actividad empresarial, es responsable del tratamiento de los datos personales que nos proporcionas al usar Ad Astra Mentis, antes rpg-worlds
        (https://adastramentis.com), en adelante &quot;el Servicio&quot;.
      </p>
      <p>Este aviso se emite conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento.</p>
      <p>
        Para cualquier asunto relacionado con tus datos, escríbenos a <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
      </p>

      <h2>2. Qué datos recogemos</h2>
      <p>
        <b>Los que nos das al crear tu cuenta:</b> nombre y correo electrónico.
      </p>
      <p>
        <b>Los que generas al jugar:</b> el texto que escribes en tus partidas, la descripción que hagas de tu personaje y el historial de las mesas en las que participas.
      </p>
      <p>
        <b>Los que genera tu actividad:</b> fecha y hora de tus accesos, tu saldo de turnos y tu historial de compras.
      </p>
      <p>
        <b>Si compras créditos:</b> la marca de tu tarjeta y sus últimos cuatro dígitos. <b>Nunca recibimos ni almacenamos el número completo de tu tarjeta, su fecha de vencimiento ni su
        código de seguridad</b>: esos datos los captura directamente nuestro procesador de pagos en tu navegador y no pasan por nuestros servidores.
      </p>
      <p>
        <b>Si usas tu propia clave</b> de un proveedor de inteligencia artificial: esa credencial, que guardamos cifrada y no volvemos a mostrarte completa.
      </p>
      <p>Tu contraseña se guarda transformada mediante un algoritmo de cifrado irreversible. Nadie, incluido el responsable, puede leerla.</p>
      <p>No recogemos datos personales sensibles.</p>

      <h2>3. Para qué los usamos</h2>
      <p>Usamos tus datos para las siguientes finalidades, todas necesarias para prestarte el Servicio:</p>
      <ul>
        <li>Crear y mantener tu cuenta, y permitirte iniciar sesión.</li>
        <li>Hacer funcionar las partidas: mostrar a los demás jugadores de tu mesa lo que ocurre en la ficción y generar la narración.</li>
        <li>Cobrarte los créditos que compres y llevar tu saldo.</li>
        <li>Enviarte correos imprescindibles: recuperación de contraseña y confirmación de tu registro.</li>
        <li>Atender lo que nos pidas y cumplir obligaciones legales, incluidas las fiscales.</li>
      </ul>
      <p>
        <b>Finalidad adicional, que puedes rechazar</b> sin que afecte a tu uso del Servicio: enviarte avisos sobre tus mesas (por ejemplo, que es tu turno). Puedes oponerte escribiendo a{' '}
        <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
      </p>
      <p>
        <b>No vendemos tus datos, no los cedemos con fines publicitarios y no hacemos perfiles comerciales contigo.</b>
      </p>

      <h2>4. Con quién los compartimos</h2>
      <p>Para que el Servicio funcione, algunos datos se transmiten a proveedores que actúan por nuestra cuenta:</p>
      <div className="tabla-legal">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Qué recibe</th>
              <th>Para qué</th>
              <th>País</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Anthropic PBC</td>
              <td>el texto de tu partida y las fichas de los personajes</td>
              <td>generar la narración</td>
              <td>Estados Unidos</td>
            </tr>
            <tr>
              <td>Stripe, Inc.</td>
              <td>tu correo y los datos del cobro</td>
              <td>procesar el pago</td>
              <td>Estados Unidos</td>
            </tr>
            <tr>
              <td>Resend, Inc.</td>
              <td>tu correo y el contenido del mensaje</td>
              <td>enviarte correos</td>
              <td>Estados Unidos</td>
            </tr>
            <tr>
              <td>Hetzner Online GmbH</td>
              <td>alojamiento de la información</td>
              <td>servidores</td>
              <td>Alemania</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <b>Esto implica transferencias internacionales de datos.</b> Al usar el Servicio consientes dichas transferencias, que se realizan únicamente para las finalidades descritas en este
        aviso.
      </p>
      <p>
        <b>Sobre la inteligencia artificial que dirige tus partidas:</b> el texto que escribes se transmite al proveedor del modelo exclusivamente para generar la respuesta de ese turno.{' '}
        <b>Ese contenido no se utiliza para entrenar modelos de inteligencia artificial.</b> Si prefieres usar tu propia cuenta con un proveedor, puedes hacerlo, y en ese caso la relación con
        ese proveedor es tuya y se rige por sus condiciones.
      </p>
      <p>No compartimos tus datos con ninguna otra persona o empresa, salvo requerimiento de autoridad competente.</p>

      <h2>5. Tus derechos</h2>
      <p>
        Tienes derecho a <b>acceder</b> a tus datos, <b>rectificarlos</b> si son inexactos, <b>cancelarlos</b> cuando consideres que no son necesarios y <b>oponerte</b> a un uso concreto.
        También puedes revocar tu consentimiento en cualquier momento.
      </p>
      <p>
        Para ejercerlos, escribe a <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a> desde el correo de tu cuenta, indicando qué solicitas y aportando un documento
        que acredite tu identidad. <b>Te responderemos en un plazo máximo de 20 días hábiles</b>, y si procede, se hará efectivo dentro de los 15 días hábiles siguientes.
      </p>
      <p>
        <b>Cómo funciona la cancelación, en concreto:</b> al cancelar tu cuenta eliminamos tu nombre, tu correo y tus credenciales. El registro de las partidas que jugaste se conserva{' '}
        <b>disociado de tu identidad</b>, porque una partida es una obra colectiva y borrarla afectaría a los demás jugadores de esa mesa. A partir de ese momento, ese registro ya no permite
        identificarte.
      </p>
      <p>
        <b>Lo que conservamos aunque canceles:</b> los comprobantes de las compras que hayas realizado, durante el plazo que exige la legislación fiscal.
      </p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <ul>
        <li>
          <b>Datos de tu cuenta:</b> mientras la cuenta exista.
        </li>
        <li>
          <b>Partidas:</b> mientras existan, o de forma disociada si cancelas tu cuenta.
        </li>
        <li>
          <b>Datos de facturación:</b> el plazo que exija la legislación fiscal aplicable.
        </li>
        <li>
          <b>Registros de acceso:</b> los necesarios para la seguridad del Servicio.
        </li>
      </ul>

      <h2>7. Cómo los protegemos</h2>
      <p>
        La información viaja cifrada entre tu dispositivo y nuestros servidores. Las contraseñas se guardan cifradas de forma irreversible y las credenciales de proveedores externos se guardan
        cifradas. El acceso a los servidores está restringido y se realizan copias de seguridad periódicas.
      </p>
      <p>Ningún sistema es invulnerable. Si ocurriera una vulneración que afecte de forma significativa a tus datos, te lo comunicaremos.</p>

      <h2>8. Edad mínima</h2>
      <p>
        <b>El Servicio está dirigido exclusivamente a mayores de 18 años.</b> No recogemos datos de menores de edad de forma consciente. Si detectamos una cuenta de una persona menor de edad, la
        cancelaremos y eliminaremos sus datos.
      </p>

      <h2>9. Cambios a este aviso</h2>
      <p>
        Si modificamos este aviso, publicaremos la nueva versión en esta misma dirección y actualizaremos la fecha. Si el cambio afecta de forma sustancial a cómo usamos tus datos, te lo
        avisaremos por correo.
      </p>

      <h2>10. Autoridad</h2>
      <p>
        Si consideras que tu derecho a la protección de datos ha sido vulnerado, puedes acudir al INAI (Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos
        Personales): <a href="https://www.inai.org.mx">www.inai.org.mx</a>.
      </p>

      <hr className="rule" />
      <p className="hint">
        <Link href="/terminos">Términos y condiciones</Link> &middot; <Link href="/">Inicio</Link>
      </p>
    </main>
  )
}

export default function PrivacidadPage() {
  return <Bilingual es={<PrivacyEs />} en={<PrivacyEn />} />
}

/** Traduccion de cortesia al ingles. Manda la version en español; revisar con el abogado (docs/19). */
function PrivacyEn() {
  return (
    <main className="page narrow legal">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">Privacy notice</p>
      </header>
      <hr className="rule" />

      <ConvenienceNote>This English version is a courtesy translation. The Spanish version is the one that governs; if they differ, the Spanish text prevails.</ConvenienceNote>
      <p className="hint">Last updated: {ACTUALIZADO_EN}.</p>

      <h2>1. Who is responsible for your data</h2>
      <p>
        Gabino Ramírez, an individual with business activity, is responsible for processing the personal data you give us when using Ad Astra Mentis, formerly rpg-worlds
        (https://adastramentis.com), hereinafter &quot;the Service&quot;.
      </p>
      <p>This notice is issued under Mexico’s Federal Law on the Protection of Personal Data Held by Private Parties and its Regulations.</p>
      <p>
        For anything related to your data, write to us at <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
      </p>

      <h2>2. What data we collect</h2>
      <p>
        <b>What you give us when creating your account:</b> name and email address.
      </p>
      <p>
        <b>What you generate when playing:</b> the text you write in your games, the description you give of your character and the history of the tables you take part in.
      </p>
      <p>
        <b>What your activity generates:</b> date and time of your sign-ins, your turn balance and your purchase history.
      </p>
      <p>
        <b>If you buy credits:</b> your card brand and its last four digits. <b>We never receive or store your full card number, its expiration date or its security code</b>: that data is captured
        directly by our payment processor in your browser and does not go through our servers.
      </p>
      <p>
        <b>If you use your own key</b> from an artificial intelligence provider: that credential, which we store encrypted and never show you in full again.
      </p>
      <p>Your password is stored transformed with an irreversible hashing algorithm. Nobody, including the data controller, can read it.</p>
      <p>We do not collect sensitive personal data.</p>

      <h2>3. What we use it for</h2>
      <p>We use your data for the following purposes, all needed to provide the Service:</p>
      <ul>
        <li>Creating and keeping your account, and letting you sign in.</li>
        <li>Running the games: showing the other players at your table what happens in the fiction and generating the narration.</li>
        <li>Charging you for the credits you buy and keeping your balance.</li>
        <li>Sending you essential emails: password recovery and sign-up confirmation.</li>
        <li>Handling your requests and complying with legal obligations, including tax ones.</li>
      </ul>
      <p>
        <b>Additional purpose, which you may refuse</b> without affecting your use of the Service: sending you notices about your tables (for example, that it is your turn). You can object by writing to{' '}
        <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a>.
      </p>
      <p>
        <b>We do not sell your data, we do not share it for advertising and we do not build commercial profiles of you.</b>
      </p>

      <h2>4. Who we share it with</h2>
      <p>For the Service to work, some data is sent to providers acting on our behalf:</p>
      <div className="tabla-legal">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What it receives</th>
              <th>What for</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Anthropic PBC</td>
              <td>the text of your game and the character sheets</td>
              <td>generating the narration</td>
              <td>United States</td>
            </tr>
            <tr>
              <td>Stripe, Inc.</td>
              <td>your email and the payment data</td>
              <td>processing the payment</td>
              <td>United States</td>
            </tr>
            <tr>
              <td>Resend, Inc.</td>
              <td>your email and the content of the message</td>
              <td>sending you emails</td>
              <td>United States</td>
            </tr>
            <tr>
              <td>Hetzner Online GmbH</td>
              <td>hosting of the information</td>
              <td>servers</td>
              <td>Germany</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <b>This involves international data transfers.</b> By using the Service you consent to those transfers, which are made only for the purposes described in this notice.
      </p>
      <p>
        <b>About the artificial intelligence that runs your games:</b> the text you write is sent to the model provider solely to generate that turn’s response.{' '}
        <b>That content is not used to train artificial intelligence models.</b> If you prefer to use your own account with a provider, you can, and in that case the relationship with that provider is
        yours and is governed by its terms.
      </p>
      <p>We do not share your data with any other person or company, except when required by a competent authority.</p>

      <h2>5. Your rights</h2>
      <p>
        You have the right to <b>access</b> your data, <b>rectify</b> it if it is inaccurate, <b>cancel</b> it when you consider it is not necessary and <b>object</b> to a specific use. You can also
        revoke your consent at any time.
      </p>
      <p>
        To exercise them, write to <a href="mailto:privacidad@adastramentis.com">privacidad@adastramentis.com</a> from your account’s email, stating what you request and providing a document that proves
        your identity. <b>We will answer within a maximum of 20 business days</b>, and if it applies, it will take effect within the following 15 business days.
      </p>
      <p>
        <b>How cancellation works, specifically:</b> when you cancel your account we delete your name, your email and your credentials. The record of the games you played is kept{' '}
        <b>dissociated from your identity</b>, because a game is a collective work and deleting it would affect the other players at that table. From that moment on, that record can no longer identify you.
      </p>
      <p>
        <b>What we keep even if you cancel:</b> the receipts of the purchases you made, for the period required by tax law.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>
          <b>Account data:</b> while the account exists.
        </li>
        <li>
          <b>Games:</b> while they exist, or dissociated if you cancel your account.
        </li>
        <li>
          <b>Billing data:</b> the period required by the applicable tax law.
        </li>
        <li>
          <b>Access logs:</b> those needed for the security of the Service.
        </li>
      </ul>

      <h2>7. How we protect it</h2>
      <p>
        Information travels encrypted between your device and our servers. Passwords are stored with irreversible hashing and credentials for external providers are stored encrypted. Access to the servers
        is restricted and periodic backups are made.
      </p>
      <p>No system is invulnerable. If a breach occurred that significantly affected your data, we would let you know.</p>

      <h2>8. Minimum age</h2>
      <p>
        <b>The Service is intended only for people 18 or older.</b> We do not knowingly collect data from minors. If we detect an account belonging to a minor, we will cancel it and delete its data.
      </p>

      <h2>9. Changes to this notice</h2>
      <p>
        If we change this notice, we will publish the new version at this same address and update the date. If the change substantially affects how we use your data, we will notify you by email.
      </p>

      <h2>10. Authority</h2>
      <p>
        If you believe your right to data protection has been violated, you may turn to Mexico’s data protection authority (INAI): <a href="https://www.inai.org.mx">www.inai.org.mx</a>.
      </p>

      <hr className="rule" />
      <p className="hint">
        <Link href="/terminos">Terms and conditions</Link> &middot; <Link href="/">Home</Link>
      </p>
    </main>
  )
}

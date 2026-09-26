'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RequireSession } from '../../../components/RequireSession'
import { AppShell } from '../../../components/shell/AppShell'

/**
 * Lo que el tablero de Gabino ya enseña y todavia no existe (26-09). Dice que
 * sera, sin fecha, y devuelve a lo que si hay.
 */
const SECCIONES: Record<string, { titulo: string; texto: string }> = {
  comunidad: { titulo: 'Comunidad', texto: 'Historias compartidas, creadores de mundos y mesas abiertas para unirse. Por ahora, invita con un enlace desde tu mesa y comparte la crónica desde Lectura.' },
  campanas: { titulo: 'Campañas', texto: 'Tus campañas largas en un solo lugar: sesiones jugadas, lo que falta y a dónde va la historia. Mientras tanto, cada mesa guarda su campaña entera.' },
  personajes: { titulo: 'Personajes', texto: 'Los personajes que has jugado en todos los mundos, con su historia y sus vínculos. Mientras tanto, los ves en Fichas dentro de cada mesa.' },
  avisos: { titulo: 'Avisos', texto: 'Aquí llegarán los avisos de tus mesas: es tu turno, abrieron sesión, alguien te invitó.' },
}

export default function ProntoPage() {
  const { seccion } = useParams<{ seccion: string }>()
  const s = SECCIONES[seccion] ?? { titulo: 'Pronto', texto: 'Esta sección todavía no está lista.' }
  return (
    <RequireSession>
      {({ user, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <section className="pronto">
            <p className="sello">Pronto</p>
            <h1>{s.titulo}</h1>
            <p>{s.texto}</p>
            <div className="row">
              <Link href="/mesas" className="btn primary">
                Ir a tus mesas
              </Link>
              <Link href="/mundos/explorar" className="btn">
                Explorar mundos
              </Link>
            </div>
          </section>
        </AppShell>
      )}
    </RequireSession>
  )
}

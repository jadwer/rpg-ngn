import type { Metadata } from 'next'
import { GuideContent } from '../../components/GuideContent'

/**
 * Guia del anfitrion (ROADMAP, B3): crear la mesa, invitar, abrir sesion,
 * jugar turnos, cerrar y retirar. En texto y sin capturas a proposito, para
 * que el rediseño de la mesa no la deje vieja; los nombres de botones y
 * paneles son los de la interfaz y hay que tocarlos aqui si cambian alla.
 */
export const metadata: Metadata = {
  title: 'Guía del anfitrión',
  description: 'Cómo crear una mesa en Ad Astra Mentis, invitar a tu grupo, abrir una sesión y jugar los turnos con el GM.',
}

export default function GuiaPage() {
  return <GuideContent />
}

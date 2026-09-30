'use client'

import { t } from '@rpg-ngn/i18n'
import Link from 'next/link'

/** El cuerpo de la guia del anfitrion, en el idioma de la interfaz (i18n). La pagina conserva su metadata. */
export function GuideContent() {
  return (
    <main className="page narrow legal">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">{t('guide.guiaDelAnfitrion')}</p>
      </header>
      <hr className="rule" />

      <p>{t('guide.elAnfitrionEsQuien')}</p>

      <h2>{t('guide.1CreaLaMesa')}</h2>
      <ol>
        <li>
          {t('guide.entraEn')} <Link href="/mesas">{t('guide.mesas')}</Link> {t('guide.yPulsa')} <b>{t('guide.crearMesa')}</b> {t('guide.tambienEstaEnEl')} <b>{t('guide.nuevaMesa')}</b>).
        </li>
        <li>{t('guide.ponleNombreYElige')}</li>
        <li>{t('guide.eligeTuPersonajeSi')}</li>
        <li>{t('guide.laPremisaEsOpcional')}</li>
      </ol>

      <h2>{t('guide.2InvitaATu')}</h2>
      <ol>
        <li>
          {t('guide.dentroDeLaMesa')} <b>{t('guide.jugadores')}</b> {t('guide.enLaBarraDel')} <b>{t('guide.crearEnlace')}</b>.
        </li>
        <li>
          {t('guide.copialoYComparteloPor')} <b>{t('guide.soloSeMuestraUna')}</b>: si lo pierdes, crea otro (el anterior deja de valer).
        </li>
        <li>{t('guide.sirveParaLasPlazas')}</li>
      </ol>

      <h2>{t('guide.3AbreLaSesion')}</h2>
      <ol>
        <li>
          {t('guide.en')} <b>{t('guide.anfitrion')}</b> {t('guide.eligeQueSesionJuegan')} <b>{t('guide.abrirSesion')}</b>.
        </li>
        <li>{t('guide.elDirectorPresentaLa')}</li>
        <li>
          {t('guide.siLaSesionTrae')} <b>{t('guide.fortuna')}</b>{t('guide.cadaJugadorVeSu')}
        </li>
      </ol>

      <h2>{t('guide.4JugarUnTurno')}</h2>
      <ol>
        <li>
          {t('guide.cadaQuienEscribeQue')} <b>{t('guide.enviar')}</b>{t('guide.en2')} <b>{t('guide.jugadores')}</b> {t('guide.seVeQuienYa')}
        </li>
        <li>
          {t('guide.countdown')} <b>{t('guide.cancelar')}</b> {t('guide.fixThen')} <b>{t('guide.cerrarYNarrar')}</b> {t('guide.sigueLaPartida')}
        </li>
        <li>
          {t('guide.siAlguienNoContesta')} <b>{t('guide.forzarCierre')}</b>{t('guide.siAlguienTuvoQue')} <b>{t('guide.jugadores')}</b> {t('guide.paraQueLaMesa')}
        </li>
        <li>{t('guide.siElDirectorFalla')}</li>
      </ol>

      <h2>{t('guide.5QuienPagaLos')}</h2>
      <ul>
        <li>
          <b>{t('guide.losTurnosLosPaga')}</b>{t('guide.noCadaJugadorLos')}
        </li>
        <li>
          {t('guide.cadaCuentaTieneTurnos')} <Link href="/perfil">{t('guide.miCuentaYCreditos')}</Link>{t('guide.oPuedesUsarTu')}
        </li>
        <li>
          {t('guide.en')} <b>{t('guide.anfitrion')}</b>{t('guide.losAjustesDelDirector')}
        </li>
      </ul>

      <h2>{t('guide.6CierraLaSesion')}</h2>
      <p>
        {t('guide.en')} <b>{t('guide.anfitrion')}</b>{t('guide.pulsa')} <b>{t('guide.cerrarSesion')}</b>{t('guide.puedesDejarUnCliffhanger')}
      </p>

      <h2>{t('guide.7ComparteLaCronica')}</h2>
      <p>
        {t('guide.en')} <b>{t('guide.lectura')}</b> {t('guide.cualquieraDeLaMesa')}
      </p>

      <h2>{t('guide.8RetiraLaMesa')}</h2>
      <ul>
        <li>
          {t('guide.en')} <Link href="/mesas">{t('guide.mesas')}</Link>, <b>{t('guide.retirar')}</b> {t('guide.laArchivaSaleDe')} <b>{t('guide.recuperar')}</b> {t('guide.laDevuelve')}
        </li>
        <li>
          <b>{t('guide.borrarDelTodo')}</b> {t('guide.soloApareceSiLa')}
        </li>
        <li>
          {t('guide.siEresInvitado')} <b>{t('guide.salirDeLaMesa')}</b> {t('guide.teQuitaDeElla')}
        </li>
      </ul>

      <p className="hint">
        {t('guide.algoNoFuncionaComo')} <a href="mailto:soporte@adastramentis.com">soporte@adastramentis.com</a>.
      </p>
    </main>
  )
}

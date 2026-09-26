'use client'

import type { TableState, TurnView } from '@rpg-ngn/api-client'
import { appendRoll, countdownLine, moreIdeasButton, QUICK_DICE, rollLabel, turnLine, type Countdown, type DiceMode, type TurnProgress } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { DiceRoller, type RollOutcome } from './dice'
import { HoldDie } from './HoldDie'

interface Props {
  turn: TurnView | null
  progress: TurnProgress
  nameOf: (characterId: string) => string
  busy: boolean
  /** Ultimo aviso de una accion (409, 422, 403). */
  notice: string | null
  hasCharacter: boolean
  /** Quien tira en esta mesa; con `engine` los dados de aqui no pintan nada. */
  diceMode: DiceMode
  /** La cuenta atras del cierre (docs/18, D-UX-3). */
  countdown: Countdown
  /** La espera como ficcion mientras el DM narra; null si no narra. */
  waiting: string | null
  onRespond: (text: string) => Promise<boolean>
  onClose: (force: boolean) => void
  onHold: (held: boolean) => void
  /** Se teclea (true) o se dejo de teclear (false); el aviso lo ven los demas. */
  onTyping: (typing: boolean) => void
  /** Si a este jugador le falta tirar la Fortuna de la sesion. */
  fortunePending: boolean
  /** Pide la tirada a la API; devuelve el numero que saco el servidor. */
  onFortune: () => Promise<number>
  /** Suelta el dado de la tirada que el DM pidio (`progress.mustRoll`); el numero lo pone el servidor. */
  onRoll: () => Promise<RollOutcome>
  /** El dado ya aterrizo: la mesa se refresca sin esperar al sondeo. */
  onRolled: () => void
  /** El anfitrion se quedo sin turnos: el aviso lleva a recargar antes de chocar con el cierre. */
  outOfTurns: boolean
  /** Ideas de accion del DM para este personaje (E10b); el cuadro sigue libre. */
  suggestions: string[]
  /** Si puede pedir "Otras" ideas y en que condiciones. */
  ideas: TableState['ideas']
  /** Pide dos ideas nuevas al director; devuelve las que sustituyen a las de arriba. */
  onMoreIdeas: () => Promise<string[]>
  /**
   * El cuadro se abre solo cuando quien lee llego al final y el director ya
   * no narra ni habla; mientras tanto queda una barra que lo abre al tocarla
   * (Gabino, 24-09: las respuestas se comian el espacio de la escena).
   */
  autoOpen: boolean
}

/**
 * Cuadro de respuesta (docs/09): que pasa ahora en una linea, el cuadro para
 * escribir si toca (Ctrl+Enter envia), y el cierre. Quien respondio y quien
 * falta ya no se lista aqui: esta en "Jugadores", con estado por persona.
 * Cuando no falta nadie, cuenta atras cancelable por cualquiera; en espera,
 * se cierra a mano.
 */
export function TurnPanel({ turn, progress, nameOf, busy, notice, hasCharacter, diceMode, countdown, waiting, onRespond, onClose, onHold, onTyping, fortunePending, onFortune, onRoll, onRolled, outOfTurns, suggestions, ideas, onMoreIdeas, autoOpen }: Props) {
  const [opened, setOpened] = useState(false)
  // Plegado a mano: manda sobre la apertura sola hasta el turno siguiente.
  const [folded, setFolded] = useState(false)
  // Cada turno nuevo empieza plegado: primero se lee lo que paso.
  useEffect(() => {
    setOpened(false)
    setFolded(false)
  }, [turn?.id])
  const [showIdeas, setShowIdeas] = useState(() => readShowIdeas())
  // "Otras" ideas: las nuevas se enseñan al momento, sin esperar al sondeo.
  const [freshIdeas, setFreshIdeas] = useState<string[] | null>(null)
  const [askingIdeas, setAskingIdeas] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  useEffect(() => {
    setFreshIdeas(null)
    setIdeasError(null)
  }, [turn?.id])
  const shownIdeas = freshIdeas ?? suggestions
  const moreButton = moreIdeasButton(ideas.more)
  const askMore = async () => {
    if (askingIdeas) return
    setAskingIdeas(true)
    setIdeasError(null)
    try {
      setFreshIdeas(await onMoreIdeas())
      setShowIdeas(true)
    } catch (error) {
      setIdeasError(error instanceof Error ? error.message : 'No se pudieron pedir más ideas.')
    } finally {
      setAskingIdeas(false)
    }
  }
  const [fortuneError, setFortuneError] = useState<string | null>(null)
  // Tras caer el dado el cuadro se va sin esperar al siguiente sondeo, que
  // es el que confirma que ya no toca; si vuelve a tocar (sesion nueva), vuelve.
  const [fortuneLanded, setFortuneLanded] = useState(false)
  useEffect(() => {
    if (!fortunePending) setFortuneLanded(false)
  }, [fortunePending])
  const [text, setText] = useState('')
  const composing = !folded && (opened || autoOpen || text.length > 0)
  // La tirada pedida: el numero se queda en pantalla hasta que el sondeo
  // trae el bloque y la peticion deja de estar pendiente.
  const [rollError, setRollError] = useState<string | null>(null)
  const [landed, setLanded] = useState<{ die: string; outcome: RollOutcome } | null>(null)
  // La peticion se recuerda hasta que cambia el turno: el sondeo la quita en
  // cuanto el servidor registra la tirada, y eso pasa a media animacion; si
  // la tarjeta se fuera con ella, el dado se desmontaria antes de aterrizar.
  const [activeRoll, setActiveRoll] = useState<TurnProgress['mustRoll']>(null)
  // Este dado ya se solto: aunque el sondeo diga "respondio" antes de que
  // aterrice, la tarjeta se queda para enseñar el numero.
  const [started, setStarted] = useState(false)
  useEffect(() => {
    setLanded(null)
    setRollError(null)
    setActiveRoll(null)
    setStarted(false)
  }, [turn?.id])
  useEffect(() => {
    if (progress.mustRoll) setActiveRoll(progress.mustRoll)
  }, [progress.mustRoll])
  // Respondio por otro lado (otro dispositivo) sin soltar este dado: no hay nada que enseñar.
  useEffect(() => {
    if (progress.hasResponded && !started && !progress.mustRoll) setActiveRoll(null)
  }, [progress.hasResponded, progress.mustRoll, started])

  const toggleIdeas = (on: boolean) => {
    setShowIdeas(on)
    try {
      localStorage.setItem(IDEAS_KEY, on ? '1' : '0')
    } catch {
      // Sin almacenamiento el ajuste dura lo que la pagina.
    }
  }

  const send = async () => {
    const value = text.trim()
    if (!value || busy) return
    onTyping(false)
    if (await onRespond(value)) setText('')
  }

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void send()
    }
  }

  const open = turn?.status === 'open'

  return (
    <div className="turn">
      {progress.narrating ? (
        <div className="waiting" role="status">
          <span className="spinner" aria-hidden />
          <span className="phrase">{waiting ?? 'El director narra...'}</span>
        </div>
      ) : countdown.active ? (
        <div className="countdown" role="status">
          <span className="ring" aria-hidden>
            {countdown.remaining}
          </span>
          <span className="text">{countdownLine(countdown)}</span>
          <button type="button" className="btn small" disabled={busy} onClick={() => onHold(true)} title="Un momento: la mesa espera hasta que alguien cierre">
            Cancelar
          </button>
        </div>
      ) : countdown.held ? (
        <div className="countdown held" role="status">
          <span className="text">{countdownLine(countdown)}</span>
          <button type="button" className="btn small primary" disabled={busy} onClick={() => onClose(false)}>
            Cerrar y narrar
          </button>
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => onHold(false)}>
            Reanudar
          </button>
        </div>
      ) : (
        <div className="status">{turnLine(turn, progress, nameOf)}</div>
      )}

      {outOfTurns ? (
        <div className="error">
          La mesa se quedó sin turnos. <Link href="/perfil">Recarga en Mi cuenta y créditos</Link> o usa tu propia clave en los ajustes del director.
        </div>
      ) : null}
      {turn?.error ? <div className="error">El DM tuvo un problema y el turno se reabrió: {turn.error}</div> : null}
      {notice && notice !== turn?.error ? <div className="error">{notice}</div> : null}

      {/* El DM pidio una tirada: el turno de este personaje es soltar el dado,
          no escribir (Gabino, 25-09). Sin cuadro, sin ideas, sin dados rapidos. */}
      {open && hasCharacter && activeRoll ? (
        <div className="roll-card" role="group" aria-label="Te toca tirar">
          <DiceRoller
            die={activeRoll.die}
            label={rollLabel(activeRoll)}
            large
            disabled={busy || landed !== null}
            resolve={() => {
              setStarted(true)
              return onRoll()
            }}
            onLanded={(outcome) => {
              setRollError(null)
              setLanded({ die: activeRoll.die, outcome })
              onRolled()
            }}
            onFailed={(error) => setRollError(error instanceof Error ? error.message : 'No se pudo tirar; prueba otra vez.')}
          />
          <span className="text">
            {landed ? (
              <>
                <b>Sacaste {landed.outcome.result}.</b> El director narra lo que pasa cuando cierre el turno.
              </>
            ) : (
              <>
                <b>{activeRoll.reason ? `${activeRoll.reason.charAt(0).toUpperCase()}${activeRoll.reason.slice(1)}.` : 'El director te pide una tirada.'}</b> Tira {rollLabel(activeRoll)}: mantén presionado el dado y suéltalo.
              </>
            )}
          </span>
          {rollError ? <span className="error">{rollError}</span> : null}
        </div>
      ) : null}

      {/* La Fortuna la tira cada jugador con su dado; el numero lo saca el
          servidor, asi que no hay texto que editar ni dado fisico que creer. */}
      {open && hasCharacter && fortunePending && !fortuneLanded && composing ? (
        <div className="fortune" role="group" aria-label="Tu Fortuna de esta sesión">
          <DiceRoller
            die="1d20"
            label="Fortuna"
            large
            disabled={busy}
            resolve={() => onFortune().then((result) => ({ result }))}
            onLanded={() => {
              setFortuneError(null)
              setTimeout(() => setFortuneLanded(true), 1500)
            }}
            onFailed={(error) => setFortuneError(error instanceof Error ? error.message : 'No se pudo tirar; prueba otra vez.')}
          />
          <span className="text">
            <b>Tira tu Fortuna.</b> Mantén presionado el dado y suéltalo. No se te dice para qué sirve.
          </span>
          {fortuneError ? <span className="error">{fortuneError}</span> : null}
        </div>
      ) : null}

      {progress.canRespond && !composing ? (
        <button
          type="button"
          className="compose-bar"
          onClick={() => {
            setFolded(false)
            setOpened(true)
          }}
        >
          <span>¿Qué hace tu personaje?</span>
          {fortunePending && !fortuneLanded ? <span className="count">Tira tu Fortuna</span> : shownIdeas.length > 0 ? <span className="count">{shownIdeas.length} ideas</span> : null}
        </button>
      ) : null}
      {progress.canRespond && composing ? (
        <>
          <button
            type="button"
            className="compose-hide"
            onClick={() => {
              setOpened(false)
              setFolded(true)
            }}
          >
            Ocultar
          </button>
          {/* Ideas del DM para quien no sabe que espera el narrador. Tocar una la
              copia al cuadro, donde se edita; escribir otra cosa siempre vale. */}
          {shownIdeas.length > 0 || moreButton ? (
            showIdeas ? (
              <div className="ideas" role="group" aria-label="Ideas para tu personaje">
                <span className="label">Ideas</span>
                {shownIdeas.map((idea) => (
                  <button key={idea} type="button" className="idea" disabled={busy} onClick={() => setText(idea)}>
                    {idea}
                  </button>
                ))}
                {/* "Otras": una llamada aparte al director. La primera ronda del turno es gratis. */}
                {moreButton ? (
                  <button type="button" className="idea more" disabled={busy || askingIdeas || !moreButton.enabled} onClick={() => void askMore()} title={moreButton.hint ?? undefined}>
                    {askingIdeas ? <span className="spinner" aria-hidden /> : null}
                    {moreButton.label}
                  </button>
                ) : null}
                {moreButton && !moreButton.enabled ? <span className="ideas-hint">{moreButton.hint}</span> : null}
                {ideasError ? <span className="ideas-hint error">{ideasError}</span> : null}
                <button type="button" className="ideas-toggle" onClick={() => toggleIdeas(false)}>
                  Ocultar ideas
                </button>
              </div>
            ) : (
              <button type="button" className="ideas-toggle" onClick={() => toggleIdeas(true)}>
                Ver ideas
              </button>
            )
          ) : null}
          <textarea
            className="textarea"
            name="respuesta"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onTyping(e.target.value.trim().length > 0)
            }}
            onBlur={() => {
              if (text.trim().length === 0) onTyping(false)
            }}
            onKeyDown={onKey}
            placeholder="¿Qué haces? Escribe tu acción o di que no haces nada."
            disabled={busy}
            rows={3}
          />
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void send()} disabled={busy || text.trim().length === 0}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              Enviar
            </button>
            {/* Dados rapidos solo en la mesa presencial: el numero va en el
                texto y cuenta. Con el servidor tirando (engine, dice) se
                ignoraria. */}
            {diceMode !== 'table' ? null : (
              <span className="dice-row" aria-label="Dados: mantén presionado y suelta">
                {QUICK_DICE.map((d) => (
                  <HoldDie key={d} die={d} disabled={busy} onRolled={(roll) => setText((current) => appendRoll(current, roll))} />
                ))}
              </span>
            )}
            <span className="hint">Ctrl+Enter también envía.</span>
          </div>
        </>
      ) : null}
      {open && !hasCharacter ? <div className="hint">Miras la mesa sin personaje: puedes leer y cerrar el turno, pero no responder.</div> : null}
      {open && progress.hasResponded && !countdown.active && !countdown.held ? <div className="sent">Tu respuesta está enviada.</div> : null}

      {/* Sin cuenta atras (falta gente, o la API no manda completedAt): el cierre a mano de siempre. */}
      {(progress.canClose && !countdown.active && !countdown.held) || progress.canForceClose ? (
        <div className="actions">
          {progress.canClose ? (
            <button type="button" className="btn" onClick={() => onClose(false)} disabled={busy}>
              Cerrar turno y narrar
            </button>
          ) : null}
          {progress.canForceClose ? (
            <button type="button" className="btn ghost small force-close" onClick={() => onClose(true)} disabled={busy} title="Solo el anfitrión: cierra aunque falte alguien">
              Forzar cierre
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const IDEAS_KEY = 'rpg:ideas'

/** Las ideas se ven salvo que este jugador las haya ocultado en este navegador. */
function readShowIdeas(): boolean {
  try {
    return typeof localStorage === 'undefined' || localStorage.getItem(IDEAS_KEY) !== '0'
  } catch {
    return true
  }
}

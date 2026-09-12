'use client'

import { proseExcerpt, type DialogueGroup, type ProseGroup, type RollGroup, type SystemGroup, type ViewGroup } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { Portrait } from './Portrait'

/**
 * Pinta los grupos que ui-logic decide para la vista activa. Tocar un
 * bloque pide leerlo en voz alta desde ahi; el bloque en curso va resaltado.
 * Cada bloque lleva `data-block` para el autoscroll.
 */
interface Props {
  groups: ViewGroup[]
  currentBlockId: string | null
  onPressBlock?: ((blockId: string) => void) | undefined
}

export function Blocks({ groups, currentBlockId, onPressBlock }: Props) {
  return (
    <>
      {groups.map((group) => {
        switch (group.kind) {
          case 'prose':
            return <Prose key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'dialogue':
            return <Dialogue key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'roll':
            return <Roll key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'system':
            return <System key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
        }
      })}
    </>
  )
}

type GroupProps<G> = { group: G; currentBlockId: string | null; onPressBlock?: ((blockId: string) => void) | undefined }

function Prose({ group, currentBlockId, onPressBlock }: GroupProps<ProseGroup>) {
  const [expanded, setExpanded] = useState(false)
  const speakingHere = group.blocks.some((b) => b.id === currentBlockId)

  if (group.compressed && !expanded && !speakingHere) {
    const { excerpt, remaining } = proseExcerpt(group)
    return (
      <div className="prose" data-block={group.blocks[0]?.id}>
        <button type="button" className="excerpt" onClick={() => setExpanded(true)}>
          {excerpt}
          {remaining > 0 ? <span className="more">({remaining} más)</span> : null}
        </button>
      </div>
    )
  }

  return (
    <div className="prose">
      {group.blocks.map((block) => (
        <div key={block.id} data-block={block.id} className={`block${block.id === currentBlockId ? ' current' : ''}`} onClick={() => onPressBlock?.(block.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPressBlock?.(block.id)}>
          {block.text.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ))}
      {group.compressed ? (
        <button type="button" className="btn ghost small fold" onClick={() => setExpanded(false)}>
          Comprimir
        </button>
      ) : null}
    </div>
  )
}

function Dialogue({ group, currentBlockId, onPressBlock }: GroupProps<DialogueGroup>) {
  return (
    <div className="dialogue">
      {group.blocks.map((block) => (
        <div key={block.id} data-block={block.id} className={`block line${block.id === currentBlockId ? ' current' : ''}`} onClick={() => onPressBlock?.(block.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPressBlock?.(block.id)}>
          <Portrait path={block.speaker.portrait} name={block.speaker.name} />
          <div className="bubble">
            <div className="speaker">{block.speaker.name}</div>
            <p className="text">{block.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Roll({ group, currentBlockId, onPressBlock }: GroupProps<RollGroup>) {
  const { block } = group
  return (
    <div data-block={block.id} className={`block roll${block.id === currentBlockId ? ' current' : ''}`} onClick={() => onPressBlock?.(block.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPressBlock?.(block.id)}>
      {block.actor ? <Portrait path={block.actor.portrait} name={block.actor.name} /> : <span style={{ width: 34 }} />}
      <div className="body">
        <div className="kind">{block.label}</div>
        <p className="text">{block.text}</p>
      </div>
      <span className="die">{block.result}</span>
    </div>
  )
}

function System({ group, currentBlockId, onPressBlock }: GroupProps<SystemGroup>) {
  const { block } = group
  return (
    <div data-block={block.id} className={`block system${block.id === currentBlockId ? ' current' : ''}`} onClick={() => onPressBlock?.(block.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPressBlock?.(block.id)}>
      {block.title ? <div className="title">{block.title}</div> : null}
      {block.text ? <p>{block.text}</p> : null}
      {block.items.length > 0 ? (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

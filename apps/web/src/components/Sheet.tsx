import { abilityUsage, humanizeId, type SheetView } from '@rpg-ngn/ui-logic'
import { VEIL_NOTE } from '../lib/sheets'
import { Portrait } from './Portrait'

/** Ficha completa a partir del modelo de vista de ui-logic, ya velado; mismo acabado que apps/sheets. */
export function Sheet({ sheet }: { sheet: SheetView }) {
  return (
    <article className="sheet">
      <div className="hero-row">
        <Portrait path={sheet.portrait} name={sheet.name} />
        <div>
          <h2>{sheet.name}</h2>
          <p className="sub">
            {sheet.race} &middot; {sheet.class} &middot; {sheet.age}
          </p>
        </div>
      </div>

      {sheet.quote ? <p className="quote">&ldquo;{sheet.quote}&rdquo;</p> : null}
      {sheet.veiled ? <p className="veil">{VEIL_NOTE}</p> : null}

      <div className="vitals">
        <Vital value={`${sheet.hp.current}/${sheet.hp.max}`} label="Vida" />
        <Vital value={String(sheet.ac)} label="Armadura" />
        <Vital value={sheet.fortune ? String(sheet.fortune.result) : '?'} label={sheet.fortune ? sheet.fortune.tier : 'Fortuna'} />
      </div>

      <div className="stats">
        {sheet.stats.map((stat) => (
          <div key={stat.key} className="stat">
            <div className="l">{stat.label}</div>
            <div className="v">{stat.value}</div>
            <div className="m">{stat.modifier}</div>
          </div>
        ))}
      </div>

      {sheet.conditions.length > 0 ? (
        <>
          <div className="label">Estado</div>
          <div className="chips">
            {sheet.conditions.map((c) => (
              <span key={c} className="accent">
                {c}
              </span>
            ))}
          </div>
        </>
      ) : null}

      <div className="label">Con qué peleas</div>
      <div className="kit">
        {sheet.attacks.map((attack) => (
          <div key={attack.id} className="item">
            <div className="top">
              <span className="nm">{attack.name}</span>
              <span className="dmg">{attack.damage}</span>
              <span className="meta">
                {attack.damageType} &middot; {attack.range}
              </span>
            </div>
          </div>
        ))}
      </div>

      {sheet.abilities && sheet.abilities.length > 0 ? (
        <>
          <div className="label">Qué sabes hacer</div>
          <div className="kit">
            {sheet.abilities.map((ability) => (
              <div key={ability.id} className="item">
                <div className="top">
                  <span className="nm">{ability.name}</span>
                  {ability.damage ? <span className="dmg">{ability.damage}</span> : null}
                  <span className="meta">{[ability.type, ability.damageType, ability.range, abilityUsage(ability)].filter(Boolean).join(' · ')}</span>
                </div>
                <p className="eff">{ability.effect}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="label">Eres bueno en</div>
      <div className="chips">
        {sheet.skills.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>

      <div className="label">Rol en el grupo</div>
      <p className="roles">{sheet.roles.join(' / ')}</p>

      {sheet.inventory.length > 0 || sheet.memoriesRecovered > 0 ? (
        <>
          <div className="label">Lo que llevas</div>
          {sheet.inventory.map((item) => (
            <p key={item.id}>
              {humanizeId(item.id)}
              {item.note ? <span className="muted"> ({item.note})</span> : null}
            </p>
          ))}
          {sheet.memoriesRecovered > 0 ? <p>Recuerdos recuperados: {sheet.memoriesRecovered}</p> : null}
        </>
      ) : null}

      {sheet.bio ? (
        <>
          <div className="label">Quién eres</div>
          <p>{sheet.bio}</p>
        </>
      ) : null}
      {sheet.goal ? (
        <>
          <div className="label">Tu objetivo</div>
          <p>{sheet.goal}</p>
        </>
      ) : null}
    </article>
  )
}

function Vital({ value, label }: { value: string; label: string }) {
  return (
    <div className="vital">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  )
}

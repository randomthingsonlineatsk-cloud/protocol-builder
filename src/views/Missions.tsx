import { useStore } from '../state'
import { missionById, submit, grade } from '../domain/missions'
import { Btn, Panel, Pill, Select } from './ui'

export function MissionBar() {
  const { p, act } = useStore()
  if (!p?.mission) return null
  const m = missionById(p.mission.id), r = p.mission
  const live = grade(p)
  return (
    <Panel className="mb-4 border-lab-ema/50" title={<span><span className="text-lab-ema">Mission {m.id}</span> · {m.title}</span>} sub={m.brief}
      right={r.submittedUtc ? <Pill tone={r.level === 'expert' ? 'purple' : r.level === 'pass' ? 'green' : 'amber'}>Submitted: {r.score} · {r.level}</Pill> : <Pill tone="grey">Pass {m.pass} · expert {m.expert}</Pill>}>
      <ol className="list-decimal pl-5 text-xs space-y-0.5">{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {m.questions && (
        <div className="grid md:grid-cols-2 gap-x-4 gap-y-2">
          {m.questions.map((q, i) => (
            <label key={q.id} className="text-xs text-lab-text-muted">{i + 1}. {q.q}
              <Select value={r.answers?.[q.id] ?? ''} onChange={(e) => act((x) => { x.mission!.answers = { ...x.mission!.answers, [q.id]: e.target.value } })} options={[{ value: '', label: '(choose)' }, ...q.options.map((o) => ({ value: o, label: o }))]} />
              {r.submittedUtc && <span className={r.answers?.[q.id] === q.answer ? 'text-lab-cdsco' : 'text-lab-amber'}>{r.answers?.[q.id] === q.answer ? 'Right' : `Answer: ${q.answer}`} (section {q.section})</span>}
            </label>))}
        </div>)}
      <div className="flex flex-wrap items-center gap-3">
        <Btn tone="purple" onClick={() => act((x) => { submit(x) })}>{r.submittedUtc ? 'Submit again' : 'Submit'}</Btn>
        {!m.questions && <span className="text-xs text-lab-text-muted">Score now: {live.score} of 100</span>}
      </div>
      {r.detail && (
        <ul className="text-xs space-y-0.5 max-h-56 overflow-y-auto">{r.detail.map((x, i) => <li key={i} className={x.got >= x.of && x.of > 0 ? 'text-lab-cdsco' : x.got < 0 ? 'text-lab-red' : 'text-lab-text-muted'}>{x.of > 0 ? `${x.got}/${x.of}` : x.got} · {x.label}</li>)}</ul>)}
    </Panel>
  )
}

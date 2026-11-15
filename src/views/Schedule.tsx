import { useStore } from '../state'
import { current } from '../domain/project'
import { findings } from '../domain/rules'
import { burden, m3Target } from '../domain/missions'
import type { ProtocolData, Procedure, Visit } from '../domain/types'
import { Btn, Panel, Select, Stat, inputCls } from './ui'

const PURPOSES = ['endpoint', 'safety', 'eligibility', 'conduct'] as const

export default function Schedule() {
  const { p, act } = useStore()
  const d = current(p!)
  const A = (fn: (d: ProtocolData) => void) => act((x) => fn(x.versions[x.versions.length - 1].data))
  const vs = d.visits.slice().sort((a, b) => a.day - b.day)
  const fs = findings(d).filter((f) => !p!.marks[f.id] && (f.rule.startsWith('PB-A') || f.rule.startsWith('PB-P0') || f.rule === 'PB-I03' || f.rule === 'PB-S04'))
  const b = burden(d)
  const setV = (id: string, k: keyof Visit, v: unknown) => A((x) => { const t = x.visits.find((y) => y.id === id)!; (t as unknown as Record<string, unknown>)[k] = v })
  const setP = (id: string, k: keyof Procedure, v: unknown) => A((x) => { const t = x.procedures.find((y) => y.id === id)!; (t as unknown as Record<string, unknown>)[k] = v })
  const toggle = (pid: string, vid: string) => A((x) => { const t = x.procedures.find((y) => y.id === pid)!; if (t.visits === 'continuous') return; t.visits = t.visits.includes(vid) ? t.visits.filter((z) => z !== vid) : [...t.visits, vid] })
  const used = (pid: string) => [...d.endpoints.filter((e) => e.procedureIds.includes(pid)).map((e) => e.id), ...d.criteria.filter((c) => c.procedureIds.includes(pid)).map((c) => c.code)]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Visits" value={b.visits} /><Stat label="Procedure slots" value={b.slots} />
        <Stat label="Time on site per participant" value={`${b.minutes} min`} tone={p!.mission?.id === 'M3' && b.minutes > m3Target() * 1.1 ? 'red' : 'grey'} />
        <Stat label="Blood per participant" value={`${b.blood} mL`} />
      </div>
      {p!.mission?.id === 'M3' && <p className="text-xs text-lab-text-muted">Mission target: at most {Math.round(m3Target() * 1.1)} minutes on site per participant.</p>}
      {fs.length > 0 && <Panel title="Open findings here"><ul className="space-y-1">{fs.map((f) => <li key={f.id} className="text-xs"><span className="font-mono text-lab-red">{f.rule}</span> {f.text} <i className="text-lab-text-muted">{f.fix}</i></li>)}</ul></Panel>}
      <Panel title="Schedule of activities (1.3)" sub="Tick a procedure at each visit where it is done. Continuous procedures (adverse events, medications) run from the visit chosen.">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead><tr><th className="text-left px-2 py-1 sticky left-0 bg-lab-panel">Procedure</th><th className="px-1">Serves</th>{vs.map((v) => <th key={v.id} className="px-1 font-mono font-normal text-[10px] text-lab-text-muted whitespace-nowrap">{v.id}<br />d{v.day}</th>)}</tr></thead>
            <tbody>
              {d.procedures.map((pr) => (
                <tr key={pr.id} className="border-t border-lab-line/60">
                  <td className="px-2 py-1 sticky left-0 bg-lab-panel min-w-56"><span className="font-mono text-lab-text-muted">{pr.id}</span> {pr.name}</td>
                  <td className="px-1 text-[10px] text-lab-text-muted whitespace-nowrap">{[...used(pr.id), ...pr.purpose.filter((x) => x !== 'endpoint' && x !== 'eligibility')].join(', ') || <span className="text-lab-red">nothing</span>}</td>
                  {vs.map((v) => (
                    <td key={v.id} className="text-center px-1">
                      {pr.visits === 'continuous'
                        ? <span aria-label={`${pr.name} at ${v.id}`} className="text-lab-text-muted">{v.day >= (d.visits.find((x) => x.id === pr.from)?.day ?? 1) ? '●' : ''}</span>
                        : <input type="checkbox" aria-label={`${pr.name} at ${v.name}`} checked={pr.visits.includes(v.id)} onChange={() => toggle(pr.id, v.id)} />}
                    </td>))}
                </tr>))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid xl:grid-cols-2 gap-4">
        <Panel title="Visits and windows" sub="Study day of the visit and its window; Day 1 is the first dose. Windows must not overlap.">
          <div className="space-y-1">
            {vs.map((v) => (
              <div key={v.id} className="grid grid-cols-[4rem_1fr_4rem_4rem_4rem_7rem_7rem_auto] gap-1 items-center">
                <span className="font-mono text-xs">{v.id}</span>
                <input aria-label="Visit name" className={inputCls} value={v.name} onChange={(e) => setV(v.id, 'name', e.target.value)} />
                <input aria-label="Day" type="number" className={inputCls} value={v.day} onChange={(e) => setV(v.id, 'day', Number(e.target.value))} />
                <input aria-label="Window from" type="number" className={inputCls} value={v.lo} onChange={(e) => setV(v.id, 'lo', Number(e.target.value))} />
                <input aria-label="Window to" type="number" className={inputCls} value={v.hi} onChange={(e) => setV(v.id, 'hi', Number(e.target.value))} />
                <Select aria-label="Epoch" value={v.epoch} onChange={(e) => setV(v.id, 'epoch', e.target.value)} options={d.epochs.map((x) => ({ value: x.name, label: x.name }))} />
                <Select aria-label="Visit type" value={v.type} onChange={(e) => setV(v.id, 'type', e.target.value)} options={['On site', 'Remote', 'Phone', 'Home nurse'].map((x) => ({ value: x, label: x }))} />
                <Btn tone="red" onClick={() => A((x) => { x.visits = x.visits.filter((y) => y.id !== v.id); for (const q of x.procedures) if (q.visits !== 'continuous') q.visits = q.visits.filter((z) => z !== v.id) })}>✕</Btn>
              </div>))}
            <p className="text-[10px] text-lab-text-muted">Columns: ID, name, day, window from, window to, epoch, type.</p>
            <Btn onClick={() => A((x) => { let n = x.visits.length + 1; while (x.visits.some((y) => y.id === `V${n}`)) n++; const last = Math.max(1, ...x.visits.map((y) => y.day)); x.visits.push({ id: `V${n}`, name: `Visit ${n}`, day: last + 28, lo: last + 25, hi: last + 31, epoch: 'Treatment', type: 'On site' }) })}>Add a visit</Btn>
          </div>
        </Panel>
        <Panel title="Procedures" sub="What each procedure is for, where section 8 describes it, and its burden.">
          <div className="space-y-2">
            {d.procedures.map((pr) => (
              <div key={pr.id} className="rounded border border-lab-line p-2 grid md:grid-cols-[1fr_6rem] gap-2 text-xs">
                <div className="space-y-1">
                  <input aria-label="Procedure name" className={inputCls} value={pr.name} onChange={(e) => setP(pr.id, 'name', e.target.value)} />
                  <div className="flex flex-wrap gap-2 items-center">
                    {PURPOSES.map((x) => <label key={x} className="flex items-center gap-1"><input type="checkbox" checked={pr.purpose.includes(x)} onChange={() => setP(pr.id, 'purpose', pr.purpose.includes(x) ? pr.purpose.filter((y) => y !== x) : [...pr.purpose, x])} />{x}</label>)}
                    <label className="flex items-center gap-1"><input type="checkbox" checked={pr.visits === 'continuous'} onChange={(e) => setP(pr.id, 'visits', e.target.checked ? 'continuous' : [])} />continuous</label>
                    {pr.visits === 'continuous' && <label className="flex items-center gap-1">from<Select aria-label="Collected from" className="py-0.5 w-24" value={pr.from ?? ''} onChange={(e) => setP(pr.id, 'from', e.target.value)} options={[{ value: '', label: 'Day 1' }, ...vs.map((v) => ({ value: v.id, label: v.id }))]} /></label>}
                  </div>
                  <input aria-label="Footnote" className={inputCls} value={pr.footnote ?? ''} placeholder="Footnote" onChange={(e) => setP(pr.id, 'footnote', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="block">Minutes<input type="number" className={inputCls} value={pr.minutes ?? 5} onChange={(e) => setP(pr.id, 'minutes', Number(e.target.value))} /></label>
                  <label className="block">Blood mL<input type="number" className={inputCls} value={pr.bloodMl ?? 0} onChange={(e) => setP(pr.id, 'bloodMl', Number(e.target.value))} /></label>
                  <Btn tone="red" onClick={() => A((x) => { x.procedures = x.procedures.filter((y) => y.id !== pr.id) })}>Remove</Btn>
                </div>
              </div>))}
            <Btn onClick={() => A((x) => { let n = x.procedures.length + 1; while (x.procedures.some((y) => y.id === `P${String(n).padStart(2, '0')}`)) n++; x.procedures.push({ id: `P${String(n).padStart(2, '0')}`, name: 'New procedure', section: '8', concept: 'New procedure', form: '', visits: [], purpose: [] }) })}>Add a procedure</Btn>
          </div>
        </Panel>
      </div>
    </div>
  )
}

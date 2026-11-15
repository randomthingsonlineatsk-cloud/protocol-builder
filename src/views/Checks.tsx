import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { current } from '../domain/project'
import { findings, GROUPS, RULES } from '../domain/rules'
import { checkUsdm, usdmOf } from '../domain/usdm'
import { Btn, Panel, Pill, Select, Table, inputCls } from './ui'

export default function Checks() {
  const { p, act } = useStore(), { go } = useNav()
  const d = current(p!)
  const all = findings(d)
  const [sev, setSev] = useState('all'), [group, setGroup] = useState('all'), [note, setNote] = useState<Record<string, string>>({})
  const shown = all.filter((f) => (sev === 'all' || f.severity === sev) && (group === 'all' || RULES.find((r) => r.id === f.rule)!.group === group))
  const usdm = checkUsdm(usdmOf(d))
  const target = (s: string) => (['1.3'].includes(s) ? () => go('schedule') : s.startsWith('3') ? () => go('estimands') : () => go('sections', s))
  return (
    <div className="space-y-4">
      <Panel title={`Consistency checks: ${all.length} finding${all.length === 1 ? '' : 's'}`} sub="40 rules read the synopsis and the body together. Fix a finding at its source; justify it only when the difference is intended (a justified high finding still blocks the hand-off)."
        right={<div className="flex gap-2"><Select aria-label="Severity" value={sev} onChange={(e) => setSev(e.target.value)} options={[{ value: 'all', label: 'All severities' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} /><Select aria-label="Group" value={group} onChange={(e) => setGroup(e.target.value)} options={[{ value: 'all', label: 'All groups' }, ...GROUPS.map((g) => ({ value: g, label: g }))]} /></div>}>
        {shown.length === 0 ? <p className="text-sm text-lab-cdsco">No findings{all.length ? ' with these filters' : ''}.</p> : (
          <ul className="space-y-2">
            {shown.map((f) => { const m = p!.marks[f.id]; return (
              <li key={f.id} className={`rounded border p-2 text-sm ${m ? 'border-lab-line opacity-70' : f.severity === 'high' ? 'border-lab-red/60' : f.severity === 'medium' ? 'border-lab-amber/60' : 'border-lab-line'}`}>
                <div className="flex flex-wrap items-center gap-2"><Pill tone={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'amber' : 'grey'}>{f.severity}</Pill><span className="font-mono text-xs">{f.rule}</span><span className="text-xs text-lab-text-muted">{RULES.find((r) => r.id === f.rule)!.title}</span>
                  <span className="ml-auto flex gap-1">{f.sections.map((s) => <Btn key={s} tone="grey" className="px-2 py-0.5" onClick={target(s)}>{s === 'TP' ? 'Title page' : s}</Btn>)}</span></div>
                <p className="mt-1">{f.text}</p><p className="text-xs text-lab-text-muted">Fix: {f.fix}</p>
                {m ? <p className="text-xs mt-1">Justified: {m.note} <button className="underline text-lab-fda" onClick={() => act((x) => { delete x.marks[f.id] })}>Undo</button></p> : (
                  <div className="flex gap-2 mt-1"><input className={inputCls + ' text-xs'} placeholder="Why the difference is intended" value={note[f.id] ?? ''} onChange={(e) => setNote({ ...note, [f.id]: e.target.value })} />
                    <Btn tone="grey" disabled={!(note[f.id] ?? '').trim()} onClick={() => act((x) => { x.marks[f.id] = { status: 'justified', note: note[f.id].trim(), utc: new Date().toISOString() } })}>Justify</Btn></div>)}
              </li>) })}
          </ul>)}
      </Panel>
      <Panel title="USDM v4 export checks" sub="Identifiers, references, the main timeline and the estimand links, modelled on the DDF conformance rules.">
        <Table head={['Check', 'Level', 'Where', 'Finding']} empty="The USDM export passes every check." rows={usdm.map((i) => [i.id, <Pill tone={i.level === 'error' ? 'red' : 'amber'}>{i.level}</Pill>, <span className="font-mono text-[10px]">{i.path}</span>, i.text])} />
      </Panel>
      <Panel title="The rules">
        <Table head={['Rule', 'Group', 'Severity', 'Checks that']} rows={RULES.map((r) => [r.id, r.group, r.severity, r.title])} />
      </Panel>
    </div>
  )
}

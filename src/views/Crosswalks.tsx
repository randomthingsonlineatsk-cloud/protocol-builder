import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { current } from '../domain/project'
import { FRAMEWORKS, coverage, type FrameworkId, type Status } from '../domain/crosswalk'
import { Btn, Panel, Pill, Tabs } from './ui'

const TONE: Record<Status, 'green' | 'red' | 'grey' | 'amber'> = { covered: 'green', gap: 'red', optional: 'amber', 'n/a': 'grey' }
const LABEL: Record<Status, string> = { covered: 'covered', gap: 'gap', optional: 'if applicable', 'n/a': 'not applicable' }

export default function Crosswalks() {
  const { p } = useStore(), { go } = useNav()
  const d = current(p!)
  const [fw, setFw] = useState<FrameworkId>('spirit'), [only, setOnly] = useState(false)
  const all = FRAMEWORKS.map((f) => coverage(d, f.id)), c = all.find((x) => x.id === fw)!, def = FRAMEWORKS.find((f) => f.id === fw)!
  const open = (m: string) => { const [num] = m.split(':'); if (num === '1.3') go('schedule'); else if (/^3(\.|$)/.test(num) || num === '1.1.1') go('estimands'); else go('sections', num) }
  const groups = [...new Set(c.results.map((r) => r.item.group))]
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {all.map((x) => (
          <button key={x.id} onClick={() => setFw(x.id)} className={`text-left rounded-lg border p-3 ${fw === x.id ? 'border-lab-fda' : 'border-lab-line'} bg-lab-panel`}>
            <p className="font-mono text-xs text-lab-text-muted">{x.name}</p>
            <p className="text-2xl font-semibold">{x.pct}%</p>
            <p className="text-xs text-lab-text-muted">{x.covered} of {x.scored} items covered{x.gaps.length ? ` · ${x.gaps.length} gap${x.gaps.length === 1 ? '' : 's'}` : ''}</p>
          </button>))}
      </div>
      <Panel title={def.name} sub={`${def.source}. Each item is mapped to the M11 sections that satisfy it, and the protocol is read to see whether they do.`}
        right={<label className="text-xs flex items-center gap-1"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Gaps only</label>}>
        <Tabs tabs={FRAMEWORKS.map((f) => ({ id: f.id, label: f.short }))} value={fw} onChange={setFw} />
        {groups.map((g) => { const rows = c.results.filter((r) => r.item.group === g && (!only || r.status === 'gap')); return rows.length ? (
          <div key={g} className="mt-3">
            <h3 className="font-mono text-xs text-lab-text-muted mb-1">{g}</h3>
            <ul className="space-y-1">
              {rows.map(({ item, status }) => (
                <li key={item.id} className={`rounded border p-2 text-sm ${status === 'gap' ? 'border-lab-red/60' : 'border-lab-line'}`}>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs w-14">{item.id}</span><Pill tone={TONE[status]}>{LABEL[status]}</Pill><span className="flex-1 min-w-48">{item.text}</span>
                    <span className="flex flex-wrap gap-1">{item.m11.map((m) => <Btn key={m} tone="grey" className="px-2 py-0.5 text-xs" onClick={() => open(m)}>{m.startsWith('TP') ? `Title page${m.includes(':') ? `: ${m.split(':')[1]}` : ''}` : m.includes(':') ? `${m.split(':')[0]}: ${m.split(':')[1]}` : m}</Btn>)}</span></div>
                  {status !== 'covered' && status !== 'n/a' && <p className="text-xs text-lab-text-muted mt-1 ml-16">{item.hint}</p>}
                </li>))}
            </ul>
          </div>) : null })}
        {only && !c.gaps.length && <p className="text-sm text-lab-cdsco mt-3">No gaps.</p>}
        <p className="text-xs text-lab-text-muted mt-3">The checks look for the content each item asks for (a section with text, a title page element, or the words that show the point is made). They show where to look; a reviewer still reads what is written. Items marked “if applicable” are not scored.</p>
      </Panel>
    </div>
  )
}

import { useState } from 'react'
import { LESSONS } from '../domain/learn'
import { TOC } from '../domain/m11'
import { Btn, Panel, Pill } from './ui'

const KEY = 'protocol-builder:quiz'
const load = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }

export default function Learn() {
  const [id, setId] = useState(LESSONS[0].id)
  const [ans, setAns] = useState<Record<string, number>>({})
  const [passed, setPassed] = useState(load)
  const l = LESSONS.find((x) => x.id === id)!
  const check = () => {
    const ok = l.quiz.every((q, i) => ans[`${l.id}-${i}`] === q.answer)
    const next = { ...passed, [l.id]: ok }
    setPassed(next); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
  }
  return (
    <div className="grid lg:grid-cols-[16rem_1fr] gap-4">
      <Panel title="Lessons"><ul className="space-y-0.5">{LESSONS.map((x, i) => <li key={x.id}><button onClick={() => { setId(x.id); setAns({}) }} aria-current={id === x.id ? 'true' : undefined} className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between gap-1 ${id === x.id ? 'bg-lab-fda-soft text-lab-fda' : 'hover:bg-lab-panel-strong'}`}><span>{i + 1}. {x.title}</span>{passed[x.id] && <span className="text-lab-cdsco">✓</span>}</button></li>)}</ul>
        <p className="text-[10px] text-lab-text-muted pt-2">Sections 6 to 14, amendments and the regional requirements come with the next lessons.</p></Panel>
      <div className="space-y-3">
        <Panel title={l.title} sub={l.sections.length ? `M11 ${l.sections.map((s) => (s === 'TP' ? 'title page' : s)).join(', ')}` : undefined}>
          <div className="text-sm space-y-2 max-w-3xl">{l.paras.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="rounded border border-lab-cdsco/50 bg-lab-cdsco-soft/30 p-3 text-sm max-w-3xl"><p className="font-mono text-xs text-lab-cdsco mb-1">Worked example: VERDANT-1 (HRP-301)</p>{l.example}</div>
          {l.sections.length > 1 && <p className="text-xs text-lab-text-muted">Sections: {l.sections.map((s) => `${s} ${TOC.find((t) => t.num === s)?.title ?? ''}`).join(' · ')}</p>}
        </Panel>
        <Panel title="Check yourself" right={passed[l.id] !== undefined && <Pill tone={passed[l.id] ? 'green' : 'amber'}>{passed[l.id] ? 'passed' : 'not yet'}</Pill>}>
          <ol className="space-y-3 text-sm list-decimal pl-5">{l.quiz.map((q, i) => { const k = `${l.id}-${i}`, picked = ans[k]; return (
            <li key={k}><p>{q.q}</p><div className="flex flex-col gap-1 mt-1">{q.options.map((o, j) => <label key={j} className="flex items-center gap-2 text-xs"><input type="radio" name={k} checked={picked === j} onChange={() => setAns({ ...ans, [k]: j })} />{o}</label>)}</div>
              {passed[l.id] !== undefined && picked !== undefined && <p className={`text-xs mt-1 ${picked === q.answer ? 'text-lab-cdsco' : 'text-lab-amber'}`}>{picked === q.answer ? 'Right. ' : 'Not quite. '}{q.why}</p>}</li>) })}</ol>
          <Btn disabled={l.quiz.some((_, i) => ans[`${l.id}-${i}`] === undefined)} onClick={check}>Check answers</Btn>
        </Panel>
      </div>
    </div>
  )
}

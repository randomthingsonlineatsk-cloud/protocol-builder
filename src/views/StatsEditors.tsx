import { useState } from 'react'
import type { ProtocolData, MultiplicityPlan } from '../domain/types'
import { SIZE_KINDS, FIELD_LABEL, sizeFromFacts, planProblems, presetPlan, testPlan, boundaries } from '../domain/stats'
import { Btn, Select, TextArea, inputCls } from './ui'

type Act = (fn: (d: ProtocolData) => void) => void
const Num = ({ label, value, set, step = 1 }: { label: string; value?: number; set: (n: number) => void; step?: number }) => (
  <label className="text-xs text-lab-text-muted">{label}<input type="number" step={step} className={inputCls} value={value !== undefined && Number.isFinite(value) ? value : ''} onChange={(e) => set(Number(e.target.value))} /></label>
)

// The efficacy hypotheses a protocol tests: each non-exploratory efficacy estimand against each
// investigational arm.
export function hypothesisLabels(d: ProtocolData) {
  const inv = d.arms.filter((a) => a.type === 'Investigational')
  const ests = d.estimands.filter((e) => { const o = d.objectives.find((x) => x.id === e.objectiveId); return o && o.kind === 'Efficacy' && o.level !== 'Exploratory' })
  return ests.flatMap((e) => (inv.length ? inv : [{ name: 'active' }]).map((a) => `${e.id} · ${a.name}`))
}

export function SampleEditor({ d, act }: { d: ProtocolData; act: Act }) {
  const f = d.facts, a = f.assumption, kind = SIZE_KINDS.find((k) => k.kind === a.kind)!
  let res: ReturnType<typeof sizeFromFacts> | null = null, err = ''
  try { res = sizeFromFacts(f) } catch (e) { err = (e as Error).message }
  const groups = a.kind === 'single' ? 1 : a.kind === 'crossover' ? 2 : d.arms.length || 2
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <label className="text-xs text-lab-text-muted md:col-span-2">Design<Select value={a.kind} onChange={(e) => act((x) => { x.facts.assumption = { ...x.facts.assumption, kind: e.target.value as typeof a.kind } })} options={SIZE_KINDS.map((k) => ({ value: k.kind, label: k.label }))} /></label>
        {kind.fields.map((k) => <Num key={k} label={FIELD_LABEL[k]!} step={0.01} value={a[k] as number} set={(n) => act((x) => { (x.facts.assumption as unknown as Record<string, number>)[k] = n })} />)}
        <Num label="Power" step={0.05} value={f.power} set={(n) => act((x) => { x.facts.power = n })} />
        <Num label="Alpha" step={0.005} value={f.alpha} set={(n) => act((x) => { x.facts.alpha = n })} />
        <label className="text-xs text-lab-text-muted">Sides<Select value={String(f.sided)} onChange={(e) => act((x) => { x.facts.sided = Number(e.target.value) as 1 | 2 })} options={[{ value: '2', label: 'Two-sided' }, { value: '1', label: 'One-sided' }]} /></label>
        <Num label="Dropout (%)" value={f.dropoutPct} set={(n) => act((x) => { x.facts.dropoutPct = n })} />
        <Num label={a.kind === 'crossover' ? 'Per sequence (stated)' : a.kind === 'single' ? 'Participants (stated)' : 'Per arm (stated)'} value={f.perArm} set={(n) => act((x) => { x.facts.perArm = n })} />
        <Num label="Total participants (stated)" value={f.participants} set={(n) => act((x) => { x.facts.participants = n })} />
      </div>
      {res ? <div className="rounded border border-lab-line bg-lab-panel-strong/50 p-2 text-xs font-mono space-y-1"><p>{res.formula}</p><p>{res.working}</p><p>× {groups} {a.kind === 'crossover' ? 'sequences' : a.kind === 'single' ? 'group' : 'arms'} = {res.perArm * groups} participants{res.events ? `; ${res.events} events needed` : ''}{res.critical ? `; success if at least ${res.critical} responders` : ''}</p></div> : <p className="text-xs text-lab-red">{err}</p>}
      <Btn tone="grey" disabled={!res} onClick={() => act((x) => { if (!res) return; x.facts.perArm = res.perArm; x.facts.participants = res.perArm * groups })}>Use these numbers</Btn>
      <label className="block text-xs text-lab-text-muted">Sample size statement (10.11), as it appears in the protocol<TextArea value={d.statements['10.11'] ?? ''} onChange={(e) => act((x) => { x.statements['10.11'] = e.target.value; x.narrative['10.11'] = e.target.value })} /></label>
      <Btn tone="grey" disabled={!res} onClick={() => act((x) => {
        const A = x.facts.assumption, eff = A.kind === 'proportions' || A.kind === 'single' ? `a response of ${Math.round((A.p1 ?? 0) * 100)}% against ${Math.round((A.p0 ?? 0) * 100)}%` : A.kind === 'tte' ? `a hazard ratio of ${A.hr} (${res!.events} events)` : A.kind.startsWith('ni') ? `non-inferiority with a margin of ${A.margin}` : `a difference of ${A.delta} (standard deviation ${A.sd})`
        const s = `A sample size of ${x.facts.participants} participants (${x.facts.perArm} ${A.kind === 'crossover' ? 'per sequence' : 'per arm'}) gives ${Math.round(x.facts.power * 100)}% power to show ${eff} (${x.facts.sided === 2 ? 'two' : 'one'}-sided alpha ${x.facts.alpha}; ${kind.label.toLowerCase()}), allowing for ${x.facts.dropoutPct}% dropout.`
        x.statements['10.11'] = s; x.narrative['10.11'] = s
      })}>Write the statement from the numbers</Btn>
    </div>
  )
}

// The multiplicity graph: hypotheses on a circle, weights in the nodes, transitions on the arrows.
function Graph({ m }: { m: MultiplicityPlan }) {
  const n = m.hypotheses.length, R = 120, cx = 180, cy = 150
  const pos = m.hypotheses.map((_, i) => ({ x: cx + R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), y: cy + R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2) }))
  return (
    <svg viewBox="0 0 360 300" className="w-full max-w-md" role="img" aria-label="Multiplicity graph">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" /></marker></defs>
      {m.transitions.flatMap((row, i) => row.map((g, j) => {
        if (!g || i === j) return null
        const a = pos[i], b = pos[j], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ox = (-dy / L) * 8, oy = (dx / L) * 8
        const x1 = a.x + (dx / L) * 30 + ox, y1 = a.y + (dy / L) * 30 + oy, x2 = b.x - (dx / L) * 30 + ox, y2 = b.y - (dy / L) * 30 + oy
        return <g key={`${i}-${j}`} className="text-lab-text-muted"><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.2" markerEnd="url(#arr)" /><text x={(x1 + x2) / 2 + ox} y={(y1 + y2) / 2 + oy} fontSize="9" fill="currentColor" textAnchor="middle">{Math.round(g * 100) / 100}</text></g>
      }))}
      {m.hypotheses.map((h, i) => <g key={h.id}><circle cx={pos[i].x} cy={pos[i].y} r="28" className="fill-lab-panel-strong stroke-lab-fda" strokeWidth="1.5" /><text x={pos[i].x} y={pos[i].y - 3} fontSize="9" textAnchor="middle" className="fill-lab-text">{h.label.split(' · ')[0]}</text><text x={pos[i].x} y={pos[i].y + 8} fontSize="8" textAnchor="middle" className="fill-lab-text-muted">{h.label.split(' · ')[1] ?? ''}</text><text x={pos[i].x} y={pos[i].y + 20} fontSize="9" textAnchor="middle" className="fill-lab-fda">w {Math.round(h.weight * 1000) / 1000}</text></g>)}
    </svg>
  )
}

export function MultiplicityEditor({ d, act }: { d: ProtocolData; act: Act }) {
  const m = d.multiplicityPlan, labels = hypothesisLabels(d)
  const [p, setP] = useState<string>('')
  const set = (fn: (m: MultiplicityPlan) => void) => act((x) => { if (x.multiplicityPlan) fn(x.multiplicityPlan) })
  const probs = m ? planProblems(m) : []
  const pv = p.split(/[\s,]+/).filter(Boolean).map(Number)
  const result = m && pv.length === m.hypotheses.length && pv.every((x) => Number.isFinite(x)) ? testPlan(m, pv, d.facts.alpha / (d.facts.sided === 2 ? 2 : 1)) : null
  return (
    <div className="space-y-2">
      <p className="text-xs text-lab-text-muted">{labels.length} efficacy hypotheses: {labels.join('; ') || 'none yet (add efficacy estimands)'}. The familywise error rate is controlled at one-sided {d.facts.alpha / (d.facts.sided === 2 ? 2 : 1)}.</p>
      <div className="flex flex-wrap gap-2">{(['fixed-sequence', 'holm', 'hochberg', 'bonferroni', 'graphical'] as const).map((k) => <Btn key={k} tone={m?.method === k ? 'solid' : 'grey'} disabled={!labels.length} onClick={() => act((x) => { x.multiplicityPlan = presetPlan(k, labels) })}>{k === 'fixed-sequence' ? 'Fixed sequence' : k[0].toUpperCase() + k.slice(1)}</Btn>)}
        {m && <Btn tone="red" onClick={() => act((x) => { delete x.multiplicityPlan })}>Remove plan</Btn>}</div>
      {m && (
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="space-y-2 text-xs">
            <table className="text-xs"><thead><tr><th className="text-left pr-2">Hypothesis</th><th>Weight</th>{m.method === 'graphical' && m.hypotheses.map((h) => <th key={h.id} className="px-1">→ {h.id}</th>)}</tr></thead>
              <tbody>{m.hypotheses.map((h, i) => <tr key={h.id}>
                <td className="pr-2"><span className="font-mono">{h.id}</span> {h.label}</td>
                <td><input aria-label={`Weight of ${h.id}`} type="number" step={0.05} className={inputCls + ' w-20'} value={Math.round(h.weight * 10000) / 10000} onChange={(e) => set((x) => { x.hypotheses[i].weight = Number(e.target.value) })} /></td>
                {m.method === 'graphical' && m.hypotheses.map((_, j) => <td key={j}><input aria-label={`Transition from ${h.id} to H${j + 1}`} type="number" step={0.1} disabled={i === j} className={inputCls + ' w-16'} value={m.transitions[i][j]} onChange={(e) => set((x) => { x.transitions[i][j] = Number(e.target.value) })} /></td>)}
              </tr>)}</tbody></table>
            {probs.length ? <ul className="text-lab-red">{probs.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-lab-cdsco">The plan is valid: the familywise error rate is controlled.</p>}
            <label className="block text-lab-text-muted">Try it with p-values (one per hypothesis, in order)<input className={inputCls} value={p} onChange={(e) => setP(e.target.value)} placeholder="0.001 0.03 0.02 0.2" /></label>
            {result && <ul className="space-y-0.5">{result.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>}
            <Btn tone="grey" onClick={() => act((x) => {
              const mm = x.multiplicityPlan!; const name = { 'fixed-sequence': 'a fixed-sequence procedure', holm: 'the Holm procedure', hochberg: 'the Hochberg procedure', bonferroni: 'a Bonferroni split', graphical: 'a graphical approach (Bretz et al., 2009)', none: 'no adjustment' }[mm.method]
              const order = mm.method === 'fixed-sequence' ? ` in the order ${mm.hypotheses.map((h) => h.label).join(', then ')}; testing stops at the first non-significant result` : mm.method === 'graphical' ? `: initial weights ${mm.hypotheses.map((h) => `${h.label} ${Math.round(h.weight * 1000) / 1000}`).join(', ')}; when a hypothesis is rejected its weight passes along the transitions shown in the graph` : ''
              x.multiplicity = `The familywise type I error rate is controlled at one-sided ${x.facts.alpha / (x.facts.sided === 2 ? 2 : 1)} across ${mm.hypotheses.length} hypotheses by ${name}${order}.`
              x.narrative['10.10'] = x.multiplicity
            })}>Write 10.10 from the plan</Btn>
          </div>
          <Graph m={m} />
        </div>
      )}
    </div>
  )
}

export function InterimEditor({ d, act }: { d: ProtocolData; act: Act }) {
  const it = d.interim
  const b = it && it.fractions.length ? boundaries(it.fractions, d.facts.alpha, it.spending) : []
  return (
    <div className="space-y-2 text-xs">
      {!it ? <Btn tone="grey" onClick={() => act((x) => { x.interim = { fractions: [0.5, 1], spending: 'obrien-fleming', purpose: 'Efficacy and safety review by the data monitoring committee' } })}>Plan an interim analysis</Btn> : <>
        <div className="grid md:grid-cols-3 gap-2">
          <label className="text-lab-text-muted">Information fractions (the last is 1)<input className={inputCls} value={it.fractions.join(', ')} onChange={(e) => { const f = e.target.value.split(/[\s,]+/).map(Number).filter((x) => x > 0 && x <= 1); act((x) => { if (x.interim && f.length) x.interim.fractions = f }) }} /></label>
          <label className="text-lab-text-muted">Alpha spending (Lan-DeMets)<Select value={it.spending} onChange={(e) => act((x) => { x.interim!.spending = e.target.value as 'pocock' })} options={[{ value: 'obrien-fleming', label: "O'Brien-Fleming type" }, { value: 'pocock', label: 'Pocock type' }]} /></label>
          <label className="text-lab-text-muted">Purpose<input className={inputCls} value={it.purpose} onChange={(e) => act((x) => { x.interim!.purpose = e.target.value })} /></label>
        </div>
        <table><thead><tr><th className="text-left pr-3">Look</th><th className="pr-3">Information</th><th className="pr-3">Boundary |z|</th><th className="pr-3">Nominal two-sided p</th><th>Cumulative α spent</th></tr></thead>
          <tbody>{b.map((x, i) => <tr key={i}><td>{i + 1}</td><td className="text-center">{x.t}</td><td className="text-center">{x.z}</td><td className="text-center">{x.nominalP}</td><td className="text-center">{x.cumAlpha}</td></tr>)}</tbody></table>
        <div className="flex gap-2"><Btn tone="grey" onClick={() => act((x) => {
          const t = `One interim analysis${it.fractions.length > 2 ? 's' : ''} at ${it.fractions.slice(0, -1).map((f) => `${Math.round(f * 100)}%`).join(', ')} of the information (${it.purpose.toLowerCase()}). The two-sided type I error of ${x.facts.alpha} is spent with a Lan-DeMets ${it.spending === 'pocock' ? 'Pocock' : "O'Brien-Fleming"}-type function; the efficacy boundaries are |z| ≥ ${b.map((y) => y.z).join(', ')} (nominal p ${b.map((y) => y.nominalP).join(', ')}). The independent data monitoring committee reviews the results; the sponsor stays blinded.`
          x.narrative['10.9'] = t.replace(/^One interim analysiss/, 'Interim analyses')
        })}>Write 10.9 from the plan</Btn><Btn tone="red" onClick={() => act((x) => { delete x.interim })}>Remove</Btn></div>
      </>}
    </div>
  )
}

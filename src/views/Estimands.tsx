import { dataForEdit } from '../domain/amend'
import { useStore } from '../state'
import { current } from '../domain/project'
import { findings } from '../domain/rules'
import type { ProtocolData, Objective, Endpoint, Estimand, Strategy, Summary, VariableType, Level } from '../domain/types'
import { Btn, Panel, Select, TextArea, inputCls } from './ui'

const LEVELS: Level[] = ['Primary', 'Secondary', 'Exploratory']
const STRATS: Strategy[] = ['Treatment policy', 'Hypothetical', 'Composite variable', 'While on treatment', 'Principal stratum']
const SUMS: Summary[] = ['Difference in means', 'Difference in proportions', 'Odds ratio', 'Risk ratio', 'Hazard ratio', 'Rate ratio', 'Difference in medians', 'Descriptive']
const VTYPES: VariableType[] = ['continuous', 'binary', 'time-to-event', 'count', 'ordinal']
const opts = (xs: readonly string[], blank = false) => [...(blank ? [{ value: '', label: '(choose)' }] : []), ...xs.map((x) => ({ value: x, label: x }))]
const multi = (e: React.ChangeEvent<HTMLSelectElement>) => [...e.target.selectedOptions].map((o) => o.value)

export default function Estimands() {
  const { p, act } = useStore()
  const d = current(p!)
  const A = (fn: (d: ProtocolData) => void) => act((x) => fn(dataForEdit(x)))
  const fs = findings(d).filter((f) => !p!.marks[f.id] && (f.rule.startsWith('PB-E') || f.rule === 'PB-A01' || f.rule === 'PB-A03' || f.rule === 'PB-I04'))
  const setO = (i: number, k: keyof Objective, v: unknown) => A((x) => { (x.objectives[i] as unknown as Record<string, unknown>)[k] = v })
  const setE = (i: number, k: keyof Endpoint, v: unknown) => A((x) => { (x.endpoints[i] as unknown as Record<string, unknown>)[k] = v })
  const setS = (i: number, k: keyof Estimand, v: unknown) => A((x) => { (x.estimands[i] as unknown as Record<string, unknown>)[k] = v })
  const nextId = (pre: string, xs: { id: string }[]) => { let n = xs.length + 1; while (xs.some((x) => x.id === `${pre}${n}`)) n++; return `${pre}${n}` }
  return (
    <div className="space-y-4">
      {fs.length > 0 && <Panel title="Open findings here"><ul className="space-y-1">{fs.map((f) => <li key={f.id} className="text-xs"><span className="font-mono text-lab-red">{f.rule}</span> {f.text} <i className="text-lab-text-muted">{f.fix}</i></li>)}</ul></Panel>}
      <Panel title="Objectives (section 3)" sub="Each objective has at least one endpoint at the same level.">
        <div className="space-y-2">
          {d.objectives.map((o, i) => (
            <div key={o.id} className="grid md:grid-cols-[5rem_8rem_8rem_1fr_16rem_auto] gap-2 items-start">
              <span className="font-mono text-xs pt-2">{o.id}</span>
              <Select aria-label="Level" value={o.level} onChange={(e) => setO(i, 'level', e.target.value)} options={opts(LEVELS)} />
              <Select aria-label="Kind" value={o.kind} onChange={(e) => setO(i, 'kind', e.target.value)} options={opts(['Efficacy', 'Safety', 'Pharmacokinetic', 'Other'])} />
              <TextArea aria-label="Objective" className="min-h-10" value={o.text} onChange={(e) => setO(i, 'text', e.target.value)} />
              <select multiple aria-label="Endpoints of this objective" className={inputCls + ' h-20'} value={o.endpointIds} onChange={(e) => setO(i, 'endpointIds', multi(e))}>{d.endpoints.map((x) => <option key={x.id} value={x.id}>{x.id} {x.text.slice(0, 50)}</option>)}</select>
              <Btn tone="red" onClick={() => A((x) => { x.objectives.splice(i, 1) })}>Remove</Btn>
            </div>))}
          <Btn onClick={() => A((x) => { x.objectives.push({ id: nextId('OBJ', x.objectives), level: x.objectives.length ? 'Secondary' : 'Primary', kind: 'Efficacy', text: '', endpointIds: [] }) })}>Add an objective</Btn>
        </div>
      </Panel>
      <Panel title="Endpoints" sub="Link each endpoint to the procedures that measure it and the visits where it is measured; the schedule is checked against these links.">
        <div className="space-y-2">
          {d.endpoints.map((e, i) => (
            <div key={e.id} className="grid md:grid-cols-[5rem_7.5rem_8rem_1fr_13rem_9rem_auto] gap-2 items-start">
              <span className="font-mono text-xs pt-2">{e.id}</span>
              <Select aria-label="Level" value={e.level} onChange={(x) => setE(i, 'level', x.target.value)} options={opts(LEVELS)} />
              <Select aria-label="Variable type" value={e.variableType} onChange={(x) => setE(i, 'variableType', x.target.value)} options={opts(VTYPES)} />
              <TextArea aria-label="Endpoint" className="min-h-10" value={e.text} onChange={(x) => setE(i, 'text', x.target.value)} />
              <select multiple aria-label="Procedures that measure it" className={inputCls + ' h-20'} value={e.procedureIds} onChange={(x) => setE(i, 'procedureIds', multi(x))}>{d.procedures.map((q) => <option key={q.id} value={q.id}>{q.id} {q.name.slice(0, 40)}</option>)}</select>
              <select multiple aria-label="Visits where it is measured" className={inputCls + ' h-20'} value={e.visitIds} onChange={(x) => setE(i, 'visitIds', multi(x))}>{d.visits.map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}</select>
              <Btn tone="red" onClick={() => A((x) => { x.endpoints.splice(i, 1) })}>Remove</Btn>
            </div>))}
          <Btn onClick={() => A((x) => { x.endpoints.push({ id: nextId('END', x.endpoints), level: 'Secondary', text: '', variableType: 'continuous', procedureIds: [], visitIds: [], purpose: 'Efficacy' }) })}>Add an endpoint</Btn>
        </div>
      </Panel>
      <Panel title="Estimands (ICH E9(R1))" sub="Population, treatment condition, variable, intercurrent events with a strategy each, and the population-level summary; then the estimator, missing data and sensitivity analysis for section 10.">
        <div className="space-y-3">
          {d.estimands.map((s, i) => (
            <div key={s.id} className="rounded border border-lab-line p-3 space-y-2">
              <div className="flex justify-between"><p className="font-mono text-sm text-lab-fda">{s.id}</p><Btn tone="red" onClick={() => A((x) => { x.estimands.splice(i, 1) })}>Remove</Btn></div>
              <div className="grid md:grid-cols-3 gap-2 text-xs text-lab-text-muted">
                <label>Objective<Select value={s.objectiveId} onChange={(e) => setS(i, 'objectiveId', e.target.value)} options={[{ value: '', label: '(choose)' }, ...d.objectives.map((o) => ({ value: o.id, label: `${o.id} ${o.text.slice(0, 40)}` }))]} /></label>
                <label>Variable (endpoint)<Select value={s.endpointId} onChange={(e) => setS(i, 'endpointId', e.target.value)} options={[{ value: '', label: '(choose)' }, ...d.endpoints.map((o) => ({ value: o.id, label: `${o.id} ${o.text.slice(0, 40)}` }))]} /></label>
                <label>Analysis set<Select value={s.analysisSetId} onChange={(e) => setS(i, 'analysisSetId', e.target.value)} options={[{ value: '', label: '(choose)' }, ...d.analysisSets.map((o) => ({ value: o.id, label: o.name }))]} /></label>
                <label className="md:col-span-3">Population<input className={inputCls} value={s.population} onChange={(e) => setS(i, 'population', e.target.value)} /></label>
                <label className="md:col-span-2">Treatment condition<input className={inputCls} value={s.treatment} onChange={(e) => setS(i, 'treatment', e.target.value)} /></label>
                <label>Population-level summary<Select value={s.summary} onChange={(e) => setS(i, 'summary', e.target.value)} options={opts(SUMS, true)} /></label>
              </div>
              <p className="font-mono text-xs">Intercurrent events</p>
              {s.intercurrentEvents.map((ie, j) => (
                <div key={ie.id} className="grid md:grid-cols-[1fr_12rem_1fr_auto] gap-2">
                  <input aria-label="Intercurrent event" className={inputCls} value={ie.name} onChange={(e) => A((x) => { x.estimands[i].intercurrentEvents[j].name = e.target.value })} />
                  <Select aria-label="Strategy" value={ie.strategy} onChange={(e) => A((x) => { x.estimands[i].intercurrentEvents[j].strategy = e.target.value as Strategy })} options={opts(STRATS, true)} />
                  <input aria-label="How it is handled" className={inputCls} value={ie.description} onChange={(e) => A((x) => { x.estimands[i].intercurrentEvents[j].description = e.target.value })} />
                  <Btn tone="red" onClick={() => A((x) => { x.estimands[i].intercurrentEvents.splice(j, 1) })}>✕</Btn>
                </div>))}
              <Btn tone="grey" onClick={() => A((x) => { x.estimands[i].intercurrentEvents.push({ id: `${s.id}-IE${s.intercurrentEvents.length + 1}`, name: '', strategy: '', description: '' }) })}>Add an intercurrent event</Btn>
              <div className="grid md:grid-cols-3 gap-2 text-xs text-lab-text-muted">
                <label>Main estimator (10.4.1.1)<TextArea value={s.estimator} onChange={(e) => setS(i, 'estimator', e.target.value)} /></label>
                <label>Missing data (10.4.1.3)<TextArea value={s.missing} onChange={(e) => setS(i, 'missing', e.target.value)} /></label>
                <label>Sensitivity analysis (10.4.1.4)<TextArea value={s.sensitivity} onChange={(e) => setS(i, 'sensitivity', e.target.value)} /></label>
              </div>
            </div>))}
          <Btn onClick={() => A((x) => { x.estimands.push({ id: nextId('EST', x.estimands), objectiveId: '', endpointId: '', population: '', analysisSetId: '', treatment: '', intercurrentEvents: [], summary: '', estimator: '', missing: '', sensitivity: '' }) })}>Add an estimand</Btn>
        </div>
      </Panel>
    </div>
  )
}

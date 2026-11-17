import { dataForEdit } from '../domain/amend'
import { useState } from 'react'
import { useStore } from '../state'
import { itemsFor } from '../domain/crosswalk'
import { STANDARD_TEXT, textState } from '../domain/standard'
import { ADAPTATIONS, ADAPTIVE_FIELDS, adaptiveFindings, adaptiveText, blankAdaptive } from '../domain/adaptive'
import { useNav } from '../App'
import { current } from '../domain/project'
import { TOC, TITLE_ELEMENTS, DESIGN_ELEMENTS, CODELISTS, type ElementDef, type SectionDef } from '../domain/m11'
import { findings, REQUIRED_TEXT } from '../domain/rules'
import { SampleEditor, MultiplicityEditor, InterimEditor } from './StatsEditors'
import { soaGrid } from '../domain/print'
import type { ProtocolData, Arm, Intervention, Criterion, AnalysisSet } from '../domain/types'
import { Btn, Panel, Pill, Select, TextArea, Table, inputCls } from './ui'

type Act = (fn: (d: ProtocolData) => void) => void
const confTone = (c: string) => (c === 'R' ? 'red' : c === 'C' ? 'amber' : 'grey') as 'red'

function Elements({ els, vals, set }: { els: ElementDef[]; vals: Record<string, string>; set: (term: string, v: string) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-x-3 gap-y-2">
      {els.map((e) => (
        <label key={e.term} className="text-xs text-lab-text-muted">
          <span className="flex items-center gap-1">{e.term} <Pill tone={confTone(e.conf)}>{e.conf}</Pill>{e.list && <span className="font-mono text-[10px]">{CODELISTS[e.list].id}</span>}</span>
          {e.list ? <Select value={vals[e.term] ?? ''} onChange={(x) => set(e.term, x.target.value)} options={[{ value: '', label: '(not set)' }, ...CODELISTS[e.list].values.map((c) => ({ value: c.decode, label: `${c.decode} (${c.code})` }))]} />
            : <input className={inputCls} value={vals[e.term] ?? ''} onChange={(x) => set(e.term, x.target.value)} placeholder={e.hint ?? ''} />}
          {e.conf === 'C' && e.when && <span className="text-[10px]">Needed {e.when}.</span>}
        </label>
      ))}
    </div>
  )
}
const Num = ({ label, value, set, step = 1 }: { label: string; value: number; set: (n: number) => void; step?: number }) => (
  <label className="text-xs text-lab-text-muted">{label}<input type="number" step={step} className={inputCls} value={Number.isFinite(value) ? value : ''} onChange={(e) => set(Number(e.target.value))} /></label>
)

function Facts({ d, act }: { d: ProtocolData; act: Act }) {
  const f = d.facts
  return (
    <div className="space-y-2">
      <p className="text-xs text-lab-text-muted">Key facts are entered once and reused in the synopsis, the design, the statistics and the checks.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Num label="Minimum age (years)" value={f.ageMin} set={(n) => act((x) => { x.facts.ageMin = n })} />
        <Num label="Maximum age (years)" value={f.ageMax} set={(n) => act((x) => { x.facts.ageMax = n })} />
        <Num label="Treatment period (weeks)" value={f.treatmentWeeks} set={(n) => act((x) => { x.facts.treatmentWeeks = n })} />
        <Num label="Follow-up after treatment (weeks)" value={f.followUpWeeks} set={(n) => act((x) => { x.facts.followUpWeeks = n })} />
      </div>
      <Btn tone="grey" onClick={() => act((x) => {
        x.design['Population Age (Minimum and Maximum)'] = `${x.facts.ageMin} to ${x.facts.ageMax}`; x.design['Number of Arms'] = String(x.arms.length)
        if (x.facts.participants) { x.design['Target/Maximum Number of Participants'] = String(x.facts.participants); if (x.design['Intervention Assignment Method'] === 'Randomisation') x.design['Number of Participants Randomly Assigned'] = String(x.facts.participants) }
        if (x.facts.treatmentWeeks) x.design['Total Planned Duration of Trial Intervention'] = `${x.facts.treatmentWeeks} weeks`
      })}>Fill the reused elements from the key facts</Btn>
    </div>
  )
}

function Criteria({ d, act, cat }: { d: ProtocolData; act: Act; cat: Criterion['category'] }) {
  const list = d.criteria.filter((c) => c.category === cat), pre = cat === 'Inclusion' ? 'IN' : 'EX'
  return (
    <div className="space-y-2">
      {list.map((c) => { const i = d.criteria.indexOf(c); return (
        <div key={i} className="grid md:grid-cols-[5rem_1fr_14rem_auto] gap-2 items-start">
          <input aria-label="Code" className={inputCls} value={c.code} onChange={(e) => act((x) => { x.criteria[i].code = e.target.value })} />
          <TextArea aria-label="Criterion" className="min-h-10" value={c.text} onChange={(e) => act((x) => { x.criteria[i].text = e.target.value })} />
          <select multiple aria-label="Procedures that verify it" className={inputCls + ' h-20'} value={c.procedureIds} onChange={(e) => { const v = [...e.target.selectedOptions].map((o) => o.value); act((x) => { x.criteria[i].procedureIds = v }) }}>
            {d.procedures.map((p) => <option key={p.id} value={p.id}>{p.id} {p.name}</option>)}
          </select>
          <Btn tone="red" onClick={() => act((x) => { x.criteria.splice(i, 1) })}>Remove</Btn>
        </div>) })}
      <p className="text-[11px] text-lab-text-muted">The list on the right is the procedures that verify each criterion (Ctrl or Cmd to choose more than one); each must be done at screening.</p>
      <Btn onClick={() => act((x) => { const n = x.criteria.filter((c) => c.category === cat).length + 1; x.criteria.push({ code: `${pre}${String(n).padStart(2, '0')}`, category: cat, text: '', procedureIds: [] }) })}>Add an {cat.toLowerCase()} criterion</Btn>
    </div>
  )
}

function Interventions({ d, act }: { d: ProtocolData; act: Act }) {
  const setA = (i: number, k: keyof Arm, v: string | number) => act((x) => { (x.arms[i] as unknown as Record<string, unknown>)[k] = v })
  const setI = (i: number, k: keyof Intervention, v: string | number) => act((x) => { (x.interventions[i] as unknown as Record<string, unknown>)[k] = v })
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs">Arms</p>
      {d.arms.map((a, i) => (
        <div key={i} className="grid md:grid-cols-[10rem_10rem_1fr_5rem_auto] gap-2">
          <input aria-label="Arm name" className={inputCls} value={a.name} onChange={(e) => setA(i, 'name', e.target.value)} />
          <Select aria-label="Arm type" value={a.type} onChange={(e) => setA(i, 'type', e.target.value)} options={['Investigational', 'Placebo', 'Active comparator', 'No intervention'].map((v) => ({ value: v, label: v }))} />
          <input aria-label="What the arm receives" className={inputCls} value={a.intervention} onChange={(e) => setA(i, 'intervention', e.target.value)} />
          <input aria-label="Allocation ratio" type="number" className={inputCls} value={a.ratio} onChange={(e) => setA(i, 'ratio', Number(e.target.value))} />
          <Btn tone="red" onClick={() => act((x) => { x.arms.splice(i, 1) })}>Remove</Btn>
        </div>))}
      <Btn onClick={() => act((x) => { x.arms.push({ id: `ARM${x.arms.length + 1}`, name: '', type: 'Investigational', intervention: '', ratio: 1 }) })}>Add an arm</Btn>
      <p className="font-mono text-xs pt-2">Interventions (6.1)</p>
      <Table head={['Name', 'Role', 'Dose', 'Value', 'Unit', 'Route', 'Frequency', 'Weeks', '']} rows={d.interventions.map((v, i) => [
        <input aria-label="Name" className={inputCls} value={v.name} onChange={(e) => setI(i, 'name', e.target.value)} />,
        <Select aria-label="Role" value={v.role} onChange={(e) => setI(i, 'role', e.target.value)} options={['Investigational', 'Placebo', 'Rescue', 'Auxiliary'].map((x) => ({ value: x, label: x }))} />,
        <input aria-label="Dose" className={inputCls} value={v.dose} onChange={(e) => setI(i, 'dose', e.target.value)} />,
        <input aria-label="Dose value" type="number" className={inputCls + ' w-20'} value={v.doseValue} onChange={(e) => setI(i, 'doseValue', Number(e.target.value))} />,
        <input aria-label="Unit" className={inputCls + ' w-20'} value={v.doseUnit} onChange={(e) => setI(i, 'doseUnit', e.target.value)} />,
        <input aria-label="Route" className={inputCls + ' w-24'} value={v.route} onChange={(e) => setI(i, 'route', e.target.value)} />,
        <input aria-label="Frequency" className={inputCls + ' w-28'} value={v.frequency} onChange={(e) => setI(i, 'frequency', e.target.value)} />,
        <input aria-label="Duration in weeks" type="number" className={inputCls + ' w-16'} value={v.durationWeeks} onChange={(e) => setI(i, 'durationWeeks', Number(e.target.value))} />,
        <Btn tone="red" onClick={() => act((x) => { x.interventions.splice(i, 1) })}>✕</Btn>])} />
      <Btn onClick={() => act((x) => { x.interventions.push({ id: `INT${x.interventions.length + 1}`, name: '', role: 'Investigational', dose: '', doseValue: 0, doseUnit: 'mg', route: 'Oral', frequency: 'once daily', durationWeeks: x.facts.treatmentWeeks }) })}>Add an intervention</Btn>
      <label className="block text-xs text-lab-text-muted pt-2">Rescue therapy (6.9.2)<TextArea value={d.rescue} onChange={(e) => act((x) => { x.rescue = e.target.value })} /></label>
    </div>
  )
}

function Analysis({ d, act }: { d: ProtocolData; act: Act }) {
  const set = (i: number, k: keyof AnalysisSet, v: string) => act((x) => { x.analysisSets[i][k] = v })
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs">Analysis sets (10.2)</p>
      {d.analysisSets.map((a, i) => (
        <div key={i} className="grid md:grid-cols-[6rem_12rem_1fr_auto] gap-2">
          <input aria-label="ID" className={inputCls} value={a.id} onChange={(e) => set(i, 'id', e.target.value)} />
          <input aria-label="Name" className={inputCls} value={a.name} onChange={(e) => set(i, 'name', e.target.value)} />
          <input aria-label="Definition" className={inputCls} value={a.text} onChange={(e) => set(i, 'text', e.target.value)} />
          <Btn tone="red" onClick={() => act((x) => { x.analysisSets.splice(i, 1) })}>Remove</Btn>
        </div>))}
      <Btn onClick={() => act((x) => { x.analysisSets.push({ id: `AS${x.analysisSets.length + 1}`, name: '', text: '' }) })}>Add an analysis set</Btn>
      <p className="font-mono text-xs pt-2">Interim analyses (10.9)</p>
      <InterimEditor d={d} act={act} />
      <p className="font-mono text-xs pt-2">Multiplicity (10.10)</p>
      <MultiplicityEditor d={d} act={act} />
      <label className="block text-xs text-lab-text-muted">Multiplicity strategy as written in 10.10<TextArea value={d.multiplicity} onChange={(e) => act((x) => { x.multiplicity = e.target.value })} /></label>
    </div>
  )
}

const Sample = SampleEditor

function Structured({ s, d, act }: { s: SectionDef; d: ProtocolData; act: Act }) {
  const { go } = useNav()
  if (s.editor === 'title') return <Elements els={TITLE_ELEMENTS} vals={d.title} set={(t, v) => act((x) => { x.title[t] = v })} />
  if (s.editor === 'design') return <div className="space-y-3"><Facts d={d} act={act} /><Elements els={DESIGN_ELEMENTS} vals={d.design} set={(t, v) => act((x) => { x.design[t] = v })} /></div>
  if (s.editor === 'objectives') return <div className="space-y-2"><Table head={['Level', 'Objective', 'Endpoints', 'Estimand']} rows={d.objectives.map((o) => [o.level, o.text, d.endpoints.filter((e) => o.endpointIds.includes(e.id)).map((e) => e.text).join('; '), d.estimands.filter((e) => e.objectiveId === o.id).map((e) => e.id).join(', ') || '—'])} /><Btn onClick={() => go('estimands')}>Edit objectives and estimands</Btn></div>
  if (s.editor === 'schema') return <Table head={['Arm', ...d.epochs.map((e) => e.name)]} rows={d.arms.map((a) => [a.name, ...d.epochs.map((e) => (e.type === 'Treatment' ? a.intervention : e.name))])} empty="Add arms in section 6." />
  if (s.editor === 'soa') return <div className="space-y-2"><div className="overflow-x-auto text-xs [&_table]:w-full [&_td]:border [&_td]:border-lab-line [&_th]:border [&_th]:border-lab-line [&_td]:px-1 [&_th]:px-1 [&_th]:whitespace-pre-line" dangerouslySetInnerHTML={{ __html: soaGrid(d) }} /><Btn onClick={() => go('schedule')}>Edit the schedule</Btn></div>
  if (s.editor === 'criteria') return <Criteria d={d} act={act} cat={s.num === '5.2' ? 'Inclusion' : 'Exclusion'} />
  if (s.editor === 'interventions') return <Interventions d={d} act={act} />
  if (s.editor === 'analysis') return <Analysis d={d} act={act} />
  if (s.editor === 'sample') return <Sample d={d} act={act} />
  if (s.editor === 'amendments') return <p className="text-sm">{d.title['Original Protocol Indicator'] === 'No' ? `${CODELISTS.priorAmend.values[2].decode} (${CODELISTS.priorAmend.values[2].code})` : `${CODELISTS.priorAmend.values[0].decode} (${CODELISTS.priorAmend.values[0].code})`} Amendments, tracked changes and their classification come in a later version.</p>
  return null
}

export default function Sections() {
  const { p, act } = useStore(), { arg } = useNav()
  const [num, setNum] = useState(arg ?? 'TP')
  const d = current(p!)
  const fs = findings(d).filter((f) => !p!.marks[f.id])
  const s = TOC.find((x) => x.num === num)!
  const actD: Act = (fn) => act((x) => fn(dataForEdit(x)))
  const mark = (n: string) => { const has = fs.some((f) => f.sections.includes(n)); const empty = REQUIRED_TEXT.includes(n) && !(d.narrative[n] ?? '').trim(); return has ? 'bg-lab-red' : empty ? 'bg-lab-amber' : 'bg-lab-cdsco' }
  const mine = fs.filter((f) => f.sections.includes(num) || (num !== 'TP' && f.sections.some((x) => x.startsWith(num + '.'))))
  return (
    <div className="grid lg:grid-cols-[20rem_1fr] gap-4">
      <Panel title="M11 table of contents" className="lg:sticky lg:top-28 lg:max-h-[75vh] overflow-y-auto">
        <ul className="space-y-0.5">{TOC.map((x) => (
          <li key={x.num} style={{ paddingLeft: `${x.num === 'TP' ? 0 : (x.num.split('.').length - 1) * 0.75}rem` }}>
            <button onClick={() => setNum(x.num)} aria-current={num === x.num ? 'true' : undefined} className={`w-full text-left px-1.5 py-0.5 rounded text-xs flex items-start gap-1.5 ${num === x.num ? 'bg-lab-fda-soft text-lab-fda' : 'hover:bg-lab-panel-strong'}`}>
              <span className={`mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${mark(x.num)}`} aria-hidden /><span className="font-mono shrink-0">{x.num === 'TP' ? '' : x.num}</span><span>{x.title}</span>
            </button></li>))}</ul>
        <p className="text-[10px] text-lab-text-muted pt-2">Red: open findings. Amber: required text not written. Green: no open findings.</p>
      </Panel>
      <div className="space-y-3">
        <Panel title={`${s.num === 'TP' ? '' : s.num + ' '}${s.title}`} right={<Pill tone={confTone(s.conf)}>{s.conf === 'R' ? 'Required' : s.conf === 'C' ? `Conditional: ${s.when}` : 'Optional'}</Pill>}>
          <p className="text-xs text-lab-text-muted">{s.guidance}</p>
          {s.num === '4.2.5' && d.design['Adaptive Trial Design Indicator'] === 'Yes' && <AdaptivePanel />}
          {STANDARD_TEXT[s.num] && (() => { const st = textState(d, s.num); return (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Pill tone={st === 'reviewed' ? 'green' : st === 'edited' ? 'blue' : st === 'standard' ? 'amber' : 'grey'}>{st === 'reviewed' ? 'standard text reviewed for this trial' : st === 'edited' ? 'edited from the standard text' : st === 'standard' ? 'standard text, not yet reviewed' : 'standard text available'}</Pill>
              {st === 'none' && <Btn tone="grey" className="px-2 py-0.5 text-xs" onClick={() => actD((x) => { x.narrative[s.num] = STANDARD_TEXT[s.num] })}>Insert the standard text</Btn>}
              {st === 'standard' && <Btn tone="grey" className="px-2 py-0.5 text-xs" onClick={() => actD((x) => { x.reviewedText = [...new Set([...(x.reviewedText ?? []), s.num])] })}>Mark as reviewed for this trial</Btn>}
              {st === 'reviewed' && <button className="underline text-lab-fda" onClick={() => actD((x) => { x.reviewedText = (x.reviewedText ?? []).filter((y) => y !== s.num) })}>Undo</button>}
              {st === 'edited' && <button className="underline text-lab-fda" onClick={() => { if (window.confirm('Replace this section with the standard text?')) actD((x) => { x.narrative[s.num] = STANDARD_TEXT[s.num] }) }}>Restore the standard text</button>}
            </div>) })()}
          {(() => { const it = itemsFor(s.num); return it.length ? <p className="text-xs text-lab-text-muted flex flex-wrap gap-1 items-center">Also serves: {it.map((x) => <span key={x.fw + x.id} title={x.text} className="rounded border border-lab-line px-1 font-mono">{x.fw} {x.id}</span>)}</p> : null })()}
          {mine.length > 0 && <ul className="space-y-1">{mine.map((f) => <li key={f.id} className="text-xs rounded border border-lab-red/40 bg-lab-red-soft/40 px-2 py-1"><span className="font-mono">{f.rule}</span> {f.text} <i className="text-lab-text-muted">{f.fix}</i></li>)}</ul>}
          <Structured s={s} d={d} act={actD} />
          {s.num !== 'TP' && s.editor !== 'sample' && (
            <label className="block text-xs text-lab-text-muted">Text of section {s.num}
              <TextArea className="min-h-32" value={d.narrative[s.num] ?? ''} onChange={(e) => actD((x) => { x.narrative[s.num] = e.target.value })} placeholder={s.guidance} />
            </label>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ICH E20 (draft) adaptive design fields, shown at 4.2.5 when the design is adaptive.
function AdaptivePanel() {
  const { p, act } = useStore()
  const d = current(p!), a = d.adaptive ?? blankAdaptive(), fs = adaptiveFindings(d)
  const set = (fn: (x: NonNullable<ProtocolData['adaptive']>) => void) => act((x) => { const dd = dataForEdit(x); dd.adaptive ??= blankAdaptive(); fn(dd.adaptive) })
  return (
    <div className="rounded border border-lab-amber/60 p-2 space-y-2 text-sm">
      <p className="font-semibold">Adaptive design <Pill tone="amber">ICH E20 draft</Pill></p>
      <p className="text-xs text-lab-text-muted">E20 reached Step 2 in June 2025; Step 4 is planned for February 2027. These fields follow the draft and may change.</p>
      <div className="grid sm:grid-cols-2 gap-1">{ADAPTATIONS.map((x) => <label key={x.id} className="flex gap-2 text-xs"><input type="checkbox" checked={a.types.includes(x.id)} onChange={(e) => set((y) => { y.types = e.target.checked ? [...y.types, x.id] : y.types.filter((z) => z !== x.id) })} />{x.label}</label>)}</div>
      {ADAPTIVE_FIELDS.map((f) => <label key={f.k} className="block text-xs text-lab-text-muted">{f.label}<TextArea className="min-h-16" placeholder={f.hint} value={a[f.k]} onChange={(e) => set((y) => { y[f.k] = e.target.value })} /></label>)}
      {fs.length > 0 && <ul className="text-xs text-lab-amber list-disc pl-5">{fs.map((f) => <li key={f.id}>{f.text}</li>)}</ul>}
      <Btn tone="grey" onClick={() => act((x) => { const dd = dataForEdit(x); dd.narrative['4.2.5'] = adaptiveText(dd.adaptive ?? blankAdaptive()) })}>Write 4.2.5 from these fields</Btn>
    </div>
  )
}

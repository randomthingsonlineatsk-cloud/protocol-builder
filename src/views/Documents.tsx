// Documents generated from the protocol: the informed consent form (checked for the US, the EU and
// India), a SAP outline, the registry entries (and what to update after an amendment), a per-visit
// site budget and an RTSM specification. The protocol stays the source: regenerate after changes.
import { useState } from 'react'
import { useStore } from '../state'
import { current, protocolId } from '../domain/project'
import { icfSections, icfChecks, icfRegions, GAP, type DocSection } from '../domain/icf'
import { sapOutline } from '../domain/sap'
import { registries, registryIssues, registriesFor, registryUpdates, REGISTRIES, type RegistryId } from '../domain/registry'
import { siteBudget, budgetCsv, DEFAULTS, type BudgetKey } from '../domain/budget'
import { rtsmSpec } from '../domain/rtsm'
import { download } from '../domain/store'
import { Btn, Panel, Pill, Table, Tabs, TextArea, inputCls } from './ui'

type Tab = 'icf' | 'sap' | 'registry' | 'budget' | 'rtsm'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const docHtml = (title: string, secs: DocSection[]) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;max-width:46em;margin:2em auto;line-height:1.5}h1{font-size:1.4em}h2{font-size:1.1em;margin-top:1.4em}p{white-space:pre-wrap}.gap{background:#fff3c4}</style></head><body><h1>${esc(title)}</h1>${secs.map((s) => `<h2>${esc(s.heading)}</h2><p>${esc(s.text).replace(/(\[(To be written|Site to complete):[^\]]*\])/g, '<span class="gap">$1</span>')}</p>`).join('')}</body></html>`

function Sections({ secs, edit, reset }: { secs: DocSection[]; edit?: (id: string, v: string) => void; reset?: (id: string) => void }) {
  return <div className="space-y-3">{secs.map((s) => (
    <div key={s.id}>
      <p className="font-semibold text-sm flex items-center gap-2">{s.heading}{s.text.includes(GAP) && <Pill tone="amber">to write</Pill>}{reset && <button className="text-[11px] text-lab-text-muted underline" onClick={() => reset(s.id)}>regenerate</button>}</p>
      {edit ? <TextArea className="min-h-24 text-sm" value={s.text} onChange={(e) => edit(s.id, e.target.value)} /> : <p className="text-sm whitespace-pre-wrap">{s.text}</p>}
    </div>))}</div>
}

export default function Documents() {
  const { p, act } = useStore()
  const d = current(p!), id = protocolId(p!).replace(/[^\w.-]+/g, '_')
  const [tab, setTab] = useState<Tab>('icf')
  return (
    <div className="space-y-3">
      <Tabs tabs={[{ id: 'icf', label: 'Informed consent form' }, { id: 'sap', label: 'SAP outline' }, { id: 'registry', label: 'Registry entries' }, { id: 'budget', label: 'Site budget' }, { id: 'rtsm', label: 'Randomisation and supply (RTSM)' }]} value={tab} onChange={setTab} />
      {tab === 'icf' && <Icf />}
      {tab === 'sap' && <Panel title="Statistical analysis plan: outline" sub="Headings follow the published guidance on SAP content (Gamble et al., JAMA 2017) with ICH E9 and E9(R1). The estimands, analysis sets, sample size and multiplicity come from the protocol." right={<Btn tone="grey" onClick={() => download(`${id}_SAP_outline.html`, docHtml(`${d.title['Trial Acronym'] ?? id}: statistical analysis plan (outline)`, sapOutline(d)), 'text/html')}>Download</Btn>}><Sections secs={sapOutline(d)} /></Panel>}
      {tab === 'registry' && <Registries />}
      {tab === 'budget' && <BudgetGrid />}
      {tab === 'rtsm' && <Panel title="RTSM specification" sub="The randomisation and trial supply system’s requirements, drafted from the design, the arms, the dosing and the dispensing visits." right={<Btn tone="grey" onClick={() => download(`${id}_RTSM_specification.html`, docHtml(`${d.title['Trial Acronym'] ?? id}: RTSM specification`, rtsmSpec(d)), 'text/html')}>Download</Btn>}><Sections secs={rtsmSpec(d)} /></Panel>}
    </div>
  )
}

function useDoc() {
  const { p, act } = useStore()
  return { p, act, d: current(p!), id: protocolId(p!).replace(/[^\w.-]+/g, '_') }
}

function Icf() {
    const { p, act, d, id } = useDoc()
    const secs = icfSections(p!), checks = icfChecks(p!), regions = icfRegions(d)
    const set = (sid: string, v: string) => act((x) => { (x.docs ??= {}).icf ??= {}; x.docs.icf![sid] = v })
    const reset = (sid: string) => act((x) => { if (x.docs?.icf) delete x.docs.icf[sid] })
    const R: { r: 'US' | 'EU' | 'IN'; name: string }[] = [{ r: 'US', name: 'US: 21 CFR 50.25' }, { r: 'EU', name: 'EU: CTR Article 29' }, { r: 'IN', name: 'India: NDCT Rules, Third Schedule Table 3' }]
    return (
      <div className="grid lg:grid-cols-[1fr_24rem] gap-4">
        <Panel title="Participant information and consent form" sub="Generated from the protocol in plain words. Edit any section; “regenerate” returns it to the generated text. Marked gaps are for you; site details are for the site." right={<Btn tone="grey" onClick={() => download(`${id}_ICF.html`, docHtml(`${d.title['Trial Acronym'] ?? id}: participant information and consent form`, secs), 'text/html')}>Download</Btn>}>
          <Sections secs={secs} edit={set} reset={reset} />
        </Panel>
        <div className="space-y-3">{R.map(({ r, name }) => { const cs = checks.filter((c) => c.el.region === r), ok = cs.filter((c) => c.ok).length
          return (
            <Panel key={r} title={name} right={<span className="flex gap-1">{!regions.includes(r) && <Pill>not a trial region</Pill>}<Pill tone={ok === cs.length ? 'green' : 'amber'}>{ok}/{cs.length}</Pill></span>}>
              <ul className="text-xs space-y-1">{cs.map((c) => <li key={c.el.id} className={c.ok ? '' : 'text-lab-amber'}>{c.ok ? '✓' : '✗'} <span className="font-mono text-lab-text-muted">{c.el.cite}</span> {c.el.label}{!c.ok && <i className="block pl-4 text-lab-text-muted">{c.why}</i>}</li>)}</ul>
            </Panel>)
        })}</div>
      </div>
    )
  }

function Registries() {
    const { p, act, d, id } = useDoc()
    const regs = registries(d, p!), need = registriesFor(d), issues = registryIssues(d, p!), ups = registryUpdates(p!)
    const [r, setR] = useState<RegistryId>(need[0] ?? 'ctgov')
    const reg = regs.find((x) => x.id === r)!
    const set = (key: string, v: string) => act((x) => { (x.docs ??= {}).registry ??= {}; x.docs.registry![`${r}.${key}`] = v })
    return (
      <div className="space-y-3">
        {ups.length > 0 && <Panel title="Registry updates after this amendment" sub="The fields that differ between the previous version and this one, for each registry the trial is in, with when they must be updated.">
          <Table head={['Registry', 'Field', 'Before', 'After', 'By when']} rows={ups.map((u) => [u.name, u.label, <span className="text-xs line-clamp-3">{u.before}</span>, <span className="text-xs line-clamp-3">{u.after}</span>, <span className="text-xs">{u.when} <i className="text-lab-text-muted">({u.cite})</i></span>])} />
        </Panel>}
        <Tabs tabs={REGISTRIES.map((x) => ({ id: x.id, label: <span>{x.name}{need.includes(x.id) ? '' : ' (not needed)'}</span> }))} value={r} onChange={setR} />
        <Panel title={`${reg.name} entry`} sub="Each field is drafted from the protocol; the source is shown under it. Edits here stay with the registry entry." right={<Btn tone="grey" onClick={() => download(`${id}_${r}.json`, JSON.stringify(Object.fromEntries(reg.fields.map((f) => [f.label, f.value])), null, 2))}>Download</Btn>}>
          {issues.filter((i) => i.reg === r).length > 0 && <ul className="text-xs text-lab-amber mb-2">{issues.filter((i) => i.reg === r).map((i) => <li key={i.key}>{i.text}</li>)}</ul>}
          <div className="space-y-2">{reg.fields.map((f) => (
            <label key={f.key} className="block text-xs"><span className="flex justify-between"><b>{f.label}</b>{f.limit && <span className={f.value.length > f.limit ? 'text-lab-red' : 'text-lab-text-muted'}>{f.value.length}/{f.limit}</span>}</span>
              {f.value.length > 80 || f.value.includes('\n') ? <TextArea className="text-xs min-h-16" value={f.value} onChange={(e) => set(f.key, e.target.value)} /> : <input className={inputCls} value={f.value} onChange={(e) => set(f.key, e.target.value)} />}
              <span className="text-[10px] text-lab-text-muted">From: {f.source}</span></label>))}</div>
        </Panel>
      </div>
    )
  }

function BudgetGrid() {
    const { p, act, d, id } = useDoc()
    const b = siteBudget(d, p!), money = (n: number) => `$${n.toLocaleString('en-US')}`
    const set = (k: string, v: number) => act((x) => { (x.docs ??= {}).budget ??= {}; x.docs.budget![k] = v })
    return (
      <Panel title="Per-visit site budget" sub="Each procedure at each visit at a unit rate, plus visit fees and travel. Rates are illustrative teaching values in US dollars; change any rate to model the budget." right={<Btn tone="grey" onClick={() => download(`${id}_site_budget.csv`, budgetCsv(b), 'text/csv')}>Download CSV</Btn>}>
        <div className="flex flex-wrap gap-3 text-xs mb-2">{(Object.keys(DEFAULTS) as BudgetKey[]).map((k) => <label key={k} className="w-32">{({ visitFee: 'On-site visit fee', remoteFee: 'Remote visit fee', overheadPct: 'Overhead %', screenFailPct: 'Screen failures %', travel: 'Travel per visit', startUp: 'Start-up fee', closeOut: 'Close-out fee' } as Record<BudgetKey, string>)[k]}<input type="number" className={inputCls} value={b.settings[k]} onChange={(e) => set(k, Number(e.target.value))} /></label>)}</div>
        <div className="overflow-x-auto"><table className="text-xs border-collapse">
          <thead><tr><th className="text-left px-2">Procedure</th><th className="px-1">Rate</th>{b.visits.map((v) => <th key={v.id} className="px-1 font-mono font-normal">{v.id}</th>)}<th className="px-1">Total</th></tr></thead>
          <tbody>{b.rows.map((r) => <tr key={r.id} className="border-t border-lab-line/60"><td className="px-2 py-0.5 min-w-52">{r.name}</td>
            <td className="px-1">{r.id === 'FEE' || r.id === 'TRAVEL' ? <span className="font-mono">{r.rate}</span> : <input type="number" className="w-16 rounded border border-lab-line bg-lab-panel-strong px-1" value={r.rate} onChange={(e) => set(`rate.${r.id}`, Number(e.target.value))} />}</td>
            {r.cells.map((c, i) => <td key={i} className="px-1 text-right font-mono text-lab-text-muted">{c || ''}</td>)}<td className="px-1 text-right font-mono">{r.total}</td></tr>)}
            <tr className="border-t-2 border-lab-line font-semibold"><td className="px-2">Visit total</td><td />{b.visitTotals.map((c, i) => <td key={i} className="px-1 text-right font-mono">{c}</td>)}<td className="px-1 text-right font-mono">{b.perParticipant}</td></tr></tbody></table></div>
        <Table className="mt-3" head={['', '']} rows={[['Per completed participant, with overhead', money(b.withOverhead)], ['Per screen failure (screening visit with overhead)', money(b.screenFail)], [`Per site: ${b.perSiteParticipants} participants (${b.sites} sites), screen failures, start-up and close-out`, money(b.perSite)], ['Whole trial (site costs only)', money(b.perSite * b.sites)]]} />
      </Panel>
    )
  }

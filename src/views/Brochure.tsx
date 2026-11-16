import { useState } from 'react'
import { useStore } from '../state'
import { current } from '../domain/project'
import { IB_SECTIONS, IB_RULES, blankIb, ibFromLibrary, ibFindings, citedEdition, type Ib } from '../domain/ib'
import { PRODUCTS } from '../domain/examples'
import { Btn, Panel, Pill, Select, Table, TextArea, inputCls } from './ui'

// The Investigator's Brochure of the product the protocol tests, and its checks against the protocol.
export default function Brochure() {
  const { p, act } = useStore()
  const d = current(p!), ib = p!.ib
  const named = `${d.title['Investigational Product Name(s)'] ?? ''} ${d.title["Sponsor's Investigational Product Code(s)"] ?? ''} ${d.title['Full Title'] ?? ''}`.toLowerCase()
  const [pick, setPick] = useState((PRODUCTS.find((x) => named.includes(x.inn.toLowerCase()) || named.includes(x.code.toLowerCase())) ?? PRODUCTS[0]).id)
  const setIb = (fn: (x: Ib) => void) => act((pp) => { fn(pp.ib!) })
  if (!ib) return (
    <Panel title="Investigator's Brochure" sub="The IB is the product's compilation of nonclinical and clinical data (ICH E6(R3), Appendix A). The protocol's risks (2.2), doses (6) and safety reporting (9) must agree with it, and the protocol cites the edition whose reference safety information decides what is expected.">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label className="text-lab-text-muted">Library product<Select value={pick} onChange={(e) => setPick(e.target.value)} options={PRODUCTS.map((x) => ({ value: x.id, label: `${x.inn} (${x.code})` }))} /></label>
        <Btn onClick={() => act((pp) => { pp.ib = ibFromLibrary(PRODUCTS.find((x) => x.id === pick)!) })}>Start the IB from the library product</Btn>
        <Btn tone="grey" onClick={() => act((pp) => { pp.ib = blankIb(pick) })}>Start a blank IB</Btn>
      </div>
      <p className="text-xs text-lab-text-muted">The library fills the sections its data can give (properties, nonclinical, human pharmacokinetics and safety, the highest dose so far and the expected adverse reactions). The summary, introduction and guidance for the investigator are yours to write.</p>
    </Panel>
  )
  const fs = ibFindings(p!), ed = citedEdition(d)
  return (
    <div className="space-y-4">
      <Panel title={`Investigator's Brochure: ${PRODUCTS.find((x) => x.id === ib.productId)?.inn ?? ib.productId}, edition ${ib.edition}`} sub={`ICH E6(R3) Appendix A. The protocol ${ed ? `cites edition ${ed}` : 'cites no edition'} as the reference safety information.`}
        right={<Btn tone="grey" onClick={() => { if (window.confirm('Remove the IB from this project?')) act((pp) => { delete pp.ib }) }}>Remove the IB</Btn>}>
        <div className="grid sm:grid-cols-4 gap-2 text-sm">
          <label className="text-lab-text-muted">Edition<input type="number" min={1} className={inputCls} value={ib.edition} onChange={(e) => setIb((x) => { x.edition = Math.max(1, Number(e.target.value) || 1) })} /></label>
          <label className="text-lab-text-muted">Release date<input className={inputCls} value={ib.date} placeholder="YYYY-MM-DD" onChange={(e) => setIb((x) => { x.date = e.target.value })} /></label>
          <label className="text-lab-text-muted">Highest dose in humans (value)<input type="number" min={0} className={inputCls} value={ib.maxHumanDose.value} onChange={(e) => setIb((x) => { x.maxHumanDose.value = Number(e.target.value) || 0 })} /></label>
          <label className="text-lab-text-muted">Unit<input className={inputCls} value={ib.maxHumanDose.unit} onChange={(e) => setIb((x) => { x.maxHumanDose.unit = e.target.value })} /></label>
        </div>
      </Panel>
      <Panel title={`IB checks: ${fs.length} finding${fs.length === 1 ? '' : 's'}`} sub="The IB against the protocol: the edition cited, the expected adverse reactions against the risks in 2.2.1, the doses against the highest dose given to humans, and completeness.">
        {fs.length ? <ul className="space-y-1 text-sm">{fs.map((f) => <li key={f.id} className="flex gap-2"><Pill className="shrink-0" tone={f.severity === 'high' ? 'red' : 'amber'}>{f.severity}</Pill><span className="font-mono text-xs whitespace-nowrap shrink-0">{f.rule}</span><span>{f.text} <span className="text-xs text-lab-text-muted">Fix: {f.fix}</span></span></li>)}</ul> : <p className="text-sm text-lab-cdsco">The IB and the protocol agree.</p>}
        <details className="text-xs"><summary className="cursor-pointer">The rules</summary><Table head={['Rule', 'Severity', 'Checks that']} rows={IB_RULES.map((r) => [r.id, r.severity, r.title])} /></details>
      </Panel>
      {IB_SECTIONS.map((s) => (
        <Panel key={s.id} title={`${s.num} ${s.title}`} sub={s.guidance}>
          <TextArea className="min-h-24" value={ib.sections[s.id] ?? ''} onChange={(e) => setIb((x) => { x.sections[s.id] = e.target.value })} />
          {s.id === 'rsiIntro' && <>
            <Table head={['Expected adverse reaction (MedDRA preferred term)', 'System organ class', 'Frequency', 'Also written as', '']} rows={ib.rsi.map((t, i) => [
              <input className={inputCls} value={t.term} onChange={(e) => setIb((x) => { x.rsi[i].term = e.target.value })} />,
              <input className={inputCls} value={t.soc} onChange={(e) => setIb((x) => { x.rsi[i].soc = e.target.value })} />,
              <input className={inputCls} value={t.frequency} onChange={(e) => setIb((x) => { x.rsi[i].frequency = e.target.value })} />,
              <input className={inputCls} value={t.aka.join('; ')} onChange={(e) => setIb((x) => { x.rsi[i].aka = e.target.value.split(';').map((y) => y.trim()).filter(Boolean) })} />,
              <Btn tone="red" className="px-2 py-0.5" onClick={() => setIb((x) => { x.rsi.splice(i, 1) })}>Remove</Btn>])} empty="No expected adverse reactions listed." />
            <Btn tone="grey" onClick={() => setIb((x) => { x.rsi.push({ term: '', soc: '', frequency: '', aka: [] }) })}>Add an expected adverse reaction</Btn>
          </>}
        </Panel>))}
    </div>
  )
}

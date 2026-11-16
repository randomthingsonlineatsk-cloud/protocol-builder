import { useStore } from '../state'
import { CIP_SECTIONS, DEVICE_RULES, cipCoverage, cipFindings, cipHtml, blankCip, type Cip, type Hazard } from '../domain/cip'
import { projectFile } from '../domain/project'
import { download } from '../domain/store'
import { Btn, Panel, Pill, Select, Table, TextArea, inputCls } from './ui'

// The clinical investigation plan of a device project (ISO 14155:2026 Annex A topics).
export default function DeviceCip() {
  const { p, act } = useStore()
  const c = p!.cip
  if (!c) return <Panel title="Clinical investigation plan"><Btn onClick={() => act((pp) => { pp.cip = blankCip() })}>Start the CIP</Btn></Panel>
  const set = (fn: (x: Cip) => void) => act((pp) => { fn(pp.cip!) })
  const cov = cipCoverage(c), fs = cipFindings(c)
  const field = (label: string, k: keyof Cip['device'], area = false) => <label className="text-lab-text-muted text-sm">{label}{area ? <TextArea value={c.device[k]} onChange={(e) => set((x) => { x.device[k] = e.target.value })} /> : <input className={inputCls} value={c.device[k]} onChange={(e) => set((x) => { x.device[k] = e.target.value })} />}</label>
  const printIt = () => { const w = window.open('', '_blank'); if (!w) return; w.document.write(cipHtml(c)); w.document.close(); setTimeout(() => w.print(), 400) }
  return (
    <div className="space-y-4">
      <Panel title="Clinical investigation plan (ISO 14155:2026)" sub="The CIP for a medical device clinical investigation, in the topics of ISO 14155:2026 Annex A (fourth edition, March 2026). Section numbers are this app’s; check Annex A’s own numbering in your copy of the standard."
        right={<div className="flex gap-2"><Btn onClick={printIt}>Open the print layout</Btn><Btn tone="grey" onClick={() => download(`${p!.name.replace(/[^\w.-]+/g, '_')}.protocol-builder.json`, projectFile(p!))}>Export project file</Btn></div>}>
        <div className="flex flex-wrap gap-2 text-sm"><Pill tone={cov.pct === 100 ? 'green' : 'amber'}>Annex A coverage {cov.pct}% ({cov.covered} of {cov.total})</Pill><Pill tone={fs.some((f) => f.severity === 'high') ? 'red' : fs.length ? 'amber' : 'green'}>{fs.length} device finding{fs.length === 1 ? '' : 's'}</Pill></div>
      </Panel>
      <Panel title="Device checks" sub="The device-specific points, including those new in the 2026 edition.">
        {fs.length ? <ul className="space-y-1 text-sm">{fs.map((f) => <li key={f.id} className="flex gap-2"><Pill className="shrink-0" tone={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'amber' : 'grey'}>{f.severity}</Pill><span className="font-mono text-xs whitespace-nowrap shrink-0">{f.rule}</span><span>{f.text} <span className="text-xs text-lab-text-muted">Section {f.sections.join(', ')}. Fix: {f.fix}</span></span></li>)}</ul> : <p className="text-sm text-lab-cdsco">No device findings.</p>}
        <details className="text-xs"><summary className="cursor-pointer">The rules</summary><Table head={['Rule', 'Severity', 'Checks that']} rows={DEVICE_RULES.map((r) => [r.id, r.severity, r.title])} /></details>
      </Panel>
      {CIP_SECTIONS.map((s) => { const ok = cov.rows.find((r) => r.s.id === s.id)!.ok; return (
        <Panel key={s.id} title={<span>{s.num} {s.title} <Pill tone={ok ? 'green' : 'grey'}>{ok ? 'covered' : 'to do'}</Pill></span>} sub={s.guidance}>
          {s.id === 'ident' && <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <label className="text-lab-text-muted sm:col-span-2">Title<input className={inputCls} value={c.title} onChange={(e) => set((x) => { x.title = e.target.value })} /></label>
            <label className="text-lab-text-muted">Reference number<input className={inputCls} value={c.number} onChange={(e) => set((x) => { x.number = e.target.value })} /></label>
            <label className="text-lab-text-muted">Version<input className={inputCls} value={c.version} onChange={(e) => set((x) => { x.version = e.target.value })} /></label>
            <label className="text-lab-text-muted">Date<input className={inputCls} placeholder="YYYY-MM-DD" value={c.date} onChange={(e) => set((x) => { x.date = e.target.value })} /></label></div>}
          {s.id === 'device' && <div className="grid sm:grid-cols-2 gap-2">{field('Name', 'name')}{field('Model and version', 'model')}{field('Software version (if any)', 'software')}{field('Manufacturer', 'manufacturer')}{field('Classification (for example EU MDR class IIa, rule 10)', 'classification')}{field('Intended purpose', 'intendedPurpose', true)}{field('Description and principles of operation', 'description', true)}{field('Materials in contact with the body', 'contact', true)}{field('Training users need', 'training', true)}</div>}
          {s.id === 'risks' && <>
            <label className="text-lab-text-muted text-sm">ISO 14971 risk management file (reference and version)<input className={inputCls} value={c.riskFile} onChange={(e) => set((x) => { x.riskFile = e.target.value })} /></label>
            <Table head={['Category', 'Hazard', 'Harm', 'Risk control', 'Residual risk', '']} empty="No risks listed." rows={c.hazards.map((h, i) => [
              <Select value={h.category} onChange={(e) => set((x) => { x.hazards[i].category = e.target.value as Hazard['category'] })} options={[{ value: 'device', label: 'The device' }, { value: 'procedure', label: 'A procedure outside routine practice' }, { value: 'conduct', label: 'The conduct of the investigation' }]} />,
              ...(['hazard', 'harm', 'control', 'residual'] as const).map((k) => <input key={k} className={inputCls} value={h[k]} onChange={(e) => set((x) => { x.hazards[i][k] = e.target.value })} />),
              <Btn tone="red" className="px-2 py-0.5" onClick={() => set((x) => { x.hazards.splice(i, 1) })}>Remove</Btn>])} />
            <Btn tone="grey" onClick={() => set((x) => { x.hazards.push({ category: 'device', hazard: '', harm: '', control: '', residual: '' }) })}>Add a risk</Btn></>}
          {s.id === 'monitoring' && <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <label className="text-lab-text-muted">Data monitoring committee<Select value={c.dmc} onChange={(e) => set((x) => { x.dmc = e.target.value as Cip['dmc'] })} options={[{ value: '', label: '(choose)' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} /></label>
            <label className="text-lab-text-muted">Clinical events committee<Select value={c.cec} onChange={(e) => set((x) => { x.cec = e.target.value as Cip['cec'] })} options={[{ value: '', label: '(choose)' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} /></label>
            <label className="text-lab-text-muted">{c.dmc === 'no' ? 'Why no DMC is needed' : 'The DMC: members, what it reviews, when it can suspend or stop'}<TextArea value={c.dmcText} onChange={(e) => set((x) => { x.dmcText = e.target.value })} /></label>
            <label className="text-lab-text-muted">{c.cec === 'no' ? 'Why no CEC is needed' : 'The CEC: members and what it adjudicates'}<TextArea value={c.cecText} onChange={(e) => set((x) => { x.cecText = e.target.value })} /></label></div>}
          <TextArea className="min-h-24" placeholder={s.structured ? 'Further text (optional)' : s.guidance} value={c.sections[s.id] ?? ''} onChange={(e) => set((x) => { x.sections[s.id] = e.target.value })} />
        </Panel>) })}
    </div>
  )
}

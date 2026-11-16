import { useStore } from '../state'
import { current, protocolId, projectFile, handoff, status, usdmOfProject, docOpts } from '../domain/project'
import { teachingSubset, checkUsdm } from '../domain/usdm'
import { protocolHtml } from '../domain/print'
import { download } from '../domain/store'
import { useState } from 'react'
import { applicationBundle } from '../domain/bundle'
import { allCoverage } from '../domain/crosswalk'
import { trialDesign, trialDesignFile, toCsv, designNotes, TD_DOMAINS, TD_VARS, TS_FROM_DATA, type TdDomain } from '../domain/sdtmDesign'
import { Btn, Panel, Pill, Table, Tabs } from './ui'

const EDC = 'https://randomthingsonlineatsk-cloud.github.io/edc-study-build-lab/'
const SIMULATOR = 'https://randomthingsonlineatsk-cloud.github.io/clinical-trial-simulator/'
const JOURNEY = 'https://randomthingsonlineatsk-cloud.github.io/pharmolecule/journey.html'

export default function Export() {
  const { p } = useStore()
  const d = current(p!), id = protocolId(p!).replace(/[^\w.-]+/g, '_'), ver = d.title['Version Number'] || '0'
  const u = usdmOfProject(p!), issues = checkUsdm(u), errors = issues.filter((i) => i.level === 'error').length
  const st = status(p!)
  const json = (x: unknown) => JSON.stringify(x, null, 2)
  const printIt = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(protocolHtml(d, docOpts(p!))); w.document.close(); setTimeout(() => w.print(), 400)
  }
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title="CDISC USDM v4" sub="The protocol as data for the Digital Data Flow. Codes from the M11 code lists carry their NCI C-codes.">
        <p className="text-sm">{errors ? <Pill tone="red">{errors} errors</Pill> : <Pill tone="green">passes the export checks</Pill>} {issues.length - errors} warnings · {u.study.versions[0].studyDesigns[0].encounters.length} encounters, {u.study.versions[0].studyDesigns[0].activities.length} activities, {u.study.versions[0].studyDesigns[0].estimands.length} estimands</p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => download(`${id}-${ver}-usdm.json`, json(u))}>Full USDM v4 (JSON)</Btn>
          <Btn tone="grey" onClick={() => download(`${id}-${ver}-usdm-teaching-subset.json`, json(teachingSubset(u)))}>Teaching subset for the EDC lab</Btn>
        </div>
        <p className="text-xs text-lab-text-muted">The teaching subset holds only what the <a className="underline text-lab-fda" href={EDC} target="_blank" rel="noreferrer">EDC Study Build Lab</a> reads to draft a database build (study, titles, identifiers, criteria, biomedical concepts, encounters, activities and the schedule timeline). Its “Generate a build from a USDM file” accepts either file.</p>
      </Panel>
      <Panel title="Readable protocol" sub="Title page, amendment details, table of contents, every section in order and the schedule grid. Save as PDF from the print dialog, or download a Word file.">
        <div className="flex flex-wrap gap-2"><Btn onClick={printIt}>Open the print layout</Btn>
          <Btn tone="grey" onClick={async () => { const { protocolDocxBlob } = await import('../domain/docx'); const b = await protocolDocxBlob(d, docOpts(p!)); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${id}-protocol-${ver}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) }}>Word document (DOCX)</Btn></div>
        <p className="text-xs text-lab-text-muted">The Word file has the title page, amendment details and summary of changes, a table of contents already filled in with page numbers, every section and the schedule of activities in landscape.</p>
      </Panel>
      <Panel title="Application bundle for the Trial Application Step" sub="The protocol, its synopsis, the cross-walk results for the US, the EU and India, and, for an amendment, the summary of changes with a cover note per region. The Clinical Trial Simulator's trial application step opens it and shows where each part goes in an IND, a CTA in CTIS or a CT-04 application.">
        <p className="text-sm flex flex-wrap gap-1">{allCoverage(d).map((c) => <Pill key={c.id} tone={c.gaps.length ? 'amber' : 'green'}>{c.name.split(',')[0]}: {c.pct}%</Pill>)}{p!.versions.at(-1)!.amendment ? <Pill tone="blue">amendment {p!.versions.at(-1)!.amendment!.identifier}</Pill> : null}</p>
        <div className="flex flex-wrap gap-2"><Btn onClick={() => download(`${id}-${ver}-application-bundle.json`, json(applicationBundle(p!)))}>Download the application bundle</Btn><a className="text-xs underline text-lab-fda self-center" href={SIMULATOR} target="_blank" rel="noreferrer">Open the Clinical Trial Simulator</a></div>
      </Panel>
      <TrialDesignPanel />
      <Panel title="Project file" sub="Everything in this project, to keep or to open in another browser.">
        <Btn onClick={() => download(`${p!.name.replace(/[^\w.-]+/g, '_')}.protocol-builder.json`, projectFile(p!))}>Export project file</Btn>
      </Panel>
      <Panel title="Hand-off for the Ostrevia lifecycle journey" sub="The pharmolecule hub checks this file at step 2: VERDANT-1 (HRP-301), no high findings, at most two medium, and a USDM export without errors.">
        <p className="text-sm">{protocolId(p!) === 'HRP-301' ? <Pill tone="blue">HRP-301</Pill> : <Pill tone="amber">not HRP-301</Pill>} <Pill tone={st.highOpen ? 'red' : 'green'}>{st.highOpen} high</Pill> <Pill tone={st.medium > 2 ? 'amber' : 'green'}>{st.medium} medium</Pill> <Pill tone={errors ? 'red' : 'green'}>USDM {errors} errors</Pill></p>
        <div className="flex flex-wrap gap-2"><Btn tone="green" onClick={() => download(`${id}-protocol-handoff.json`, json(handoff(p!)))}>Download the hand-off</Btn><a className="text-xs underline text-lab-fda self-center" href={JOURNEY} target="_blank" rel="noreferrer">Open the journey</a></div>
      </Panel>
    </div>
  )
}

const TRAINER = 'https://randomthingsonlineatsk-cloud.github.io/sdtm-mapping-trainer/'
function TrialDesignPanel() {
  const { p } = useStore()
  const d = current(p!), id = protocolId(p!).replace(/[^\w.-]+/g, '_')
  const t = trialDesign(d), notes = designNotes(d)
  const [dom, setDom] = useState<TdDomain>('TA')
  return (
    <Panel className="lg:col-span-2" title="SDTM trial design datasets" sub={`TA, TE, TV, TI and TS (SDTMIG v3.4), written from the protocol. The TS parameters that come from the collected data (${TS_FROM_DATA.join(', ')}) are left for the SDTM programmer.`}>
      <Tabs tabs={TD_DOMAINS.map((x) => ({ id: x, label: `${x} (${t[x].length})` }))} value={dom} onChange={setDom} />
      <div className="max-h-80 overflow-auto"><Table head={TD_VARS[dom].filter((v) => v !== 'STUDYID' && v !== 'DOMAIN')} rows={t[dom].map((r) => TD_VARS[dom].filter((v) => v !== 'STUDYID' && v !== 'DOMAIN').map((v) => <span className="text-xs">{r[v]}</span>))} /></div>
      {notes.length > 0 && <ul className="text-xs text-lab-amber list-disc pl-5">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => download(`${id}-trial-design.json`, JSON.stringify(trialDesignFile(d), null, 2))}>Trial design file (JSON)</Btn>
        {TD_DOMAINS.map((x) => <Btn key={x} tone="grey" onClick={() => download(`${id}-${x.toLowerCase()}.csv`, toCsv(x, t[x]))}>{x}.csv</Btn>)}
      </div>
      <p className="text-xs text-lab-text-muted">The <a className="underline text-lab-fda" href={TRAINER} target="_blank" rel="noreferrer">SDTM Mapping Trainer</a> reads the JSON file as the reference for its trial design mission, so the tables you build there are checked against your protocol.</p>
    </Panel>
  )
}

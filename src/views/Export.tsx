import { useStore } from '../state'
import { current, protocolId, projectFile, handoff, status } from '../domain/project'
import { usdmOf, teachingSubset, checkUsdm } from '../domain/usdm'
import { protocolHtml } from '../domain/print'
import { download } from '../domain/store'
import { Btn, Panel, Pill } from './ui'

const EDC = 'https://randomthingsonlineatsk-cloud.github.io/edc-study-build-lab/'
const JOURNEY = 'https://randomthingsonlineatsk-cloud.github.io/pharmolecule/journey.html'

export default function Export() {
  const { p } = useStore()
  const d = current(p!), id = protocolId(p!).replace(/[^\w.-]+/g, '_'), ver = d.title['Version Number'] || '0'
  const u = usdmOf(d), issues = checkUsdm(u), errors = issues.filter((i) => i.level === 'error').length
  const st = status(p!)
  const json = (x: unknown) => JSON.stringify(x, null, 2)
  const printIt = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(protocolHtml(d)); w.document.close(); setTimeout(() => w.print(), 400)
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
      <Panel title="Readable protocol" sub="Title page, table of contents, every section in order, the schedule grid. Use the print dialog’s “Save as PDF”.">
        <Btn onClick={printIt}>Open the print layout</Btn>
        <p className="text-xs text-lab-text-muted">A Word (DOCX) export comes in a later version.</p>
      </Panel>
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

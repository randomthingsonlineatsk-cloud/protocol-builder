import { useRef, useState } from 'react'
import { useStore } from '../state'
import { simulatorProject } from '../domain/simulator'
import { cipFindings } from '../domain/cip'
import { certificate, certificateHtml, passportRecord, PASSPORT_PAGE } from '../domain/certificate'
import { download } from '../domain/store'
import { deviceProject, blankProject, exampleProject, libraryProject, lifecycleProject, usdmProject, readProjectFile, status, protocolId, getLearner, setLearner } from '../domain/project'
import { EXAMPLES, PRODUCTS, INDICATIONS, DESIGNS, type ExampleId } from '../domain/examples'
import { CODELISTS } from '../domain/m11'
import { MISSIONS, startMission } from '../domain/missions'
import { Btn, Panel, Pill, Select, Table, inputCls, fmtUtc } from './ui'

export default function Home({ onOpen }: { onOpen: () => void }) {
  const { projects, open, remove, setError } = useStore()
  const [learner, setL] = useState(getLearner())
  const [lib, setLib] = useState({ product: 'lumiravostat', indication: 'che', design: 'dose', phase: 'Phase 2', id: 'HRP-201', name: 'HRP-201 dose-ranging' })
  const usdmFile = useRef<HTMLInputElement>(null), projFile = useRef<HTMLInputElement>(null), simFile = useRef<HTMLInputElement>(null)
  const go = (p: Parameters<typeof open>[0]) => { open(p); onOpen() }
  const readFile = async (f: File, kind: 'usdm' | 'project' | 'simulator') => {
    try { const t = await f.text(); go(kind === 'usdm' ? usdmProject(t, f.name.replace(/\.json$/, '')) : kind === 'simulator' ? simulatorProject(t) : readProjectFile(t)) } catch (e) { setError(`Could not open ${f.name}: ${(e as Error).message}`) }
  }
  const missionDone = (id: string) => projects.filter((p) => p.mission?.id === id && p.mission.submittedUtc).sort((a, b) => (b.mission!.score ?? 0) - (a.mission!.score ?? 0))[0]
  return (
    <div className="space-y-4">
      <Panel title="Write a clinical trial protocol in the ICH M11 structure" sub="Objectives, endpoints, estimands, the schedule of activities and the statistics are held as data and checked against each other by 40 consistency rules. The protocol exports as CDISC USDM v4 for the EDC Study Build Lab, and as a readable PDF.">
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <label className="text-lab-text-muted">Your name (for the certificate)<input className={inputCls} value={learner.name} onChange={(e) => setL(setLearner({ name: e.target.value }))} /></label>
          <label className="text-lab-text-muted">Class ID (optional, for classroom mode)<input className={inputCls} value={learner.classId} onChange={(e) => setL(setLearner({ classId: e.target.value.trim() }))} placeholder="for example CLS-2026-RA1" /></label>
          <p className="text-lab-text-muted self-end">Learner ID: <span className="font-mono text-lab-text">{learner.userId}</span>. Every protocol you start carries it.</p>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Start a protocol">
          <div className="space-y-3 text-sm">
            <div className="rounded border border-lab-cdsco/50 bg-lab-cdsco-soft/30 p-3 space-y-1">
              <p><b>Ostrevia lifecycle, step 2:</b> finish the VERDANT-1 (HRP-301) protocol before its database is built. The estimand strategies, part of the schedule and the multiplicity section are missing, and two numbers disagree.</p>
              <Btn tone="green" onClick={() => go(lifecycleProject())}>Start the VERDANT-1 protocol</Btn>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn tone="solid" onClick={() => go(blankProject())}>Blank protocol</Btn>
              <Btn tone="grey" onClick={() => go(deviceProject())} title="A clinical investigation plan for a medical device, in the topics of ISO 14155:2026 Annex A">Device CIP (ISO 14155)</Btn>
              {(Object.keys(EXAMPLES) as ExampleId[]).map((k) => <Btn key={k} tone="grey" onClick={() => go(exampleProject(k))}>Worked example: {EXAMPLES[k].name.split(':')[0]}</Btn>)}
            </div>
            <div className="rounded border border-lab-line p-3 space-y-2">
              <p className="font-mono text-xs">From the library</p>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <label className="text-lab-text-muted">Product<Select value={lib.product} onChange={(e) => setLib({ ...lib, product: e.target.value })} options={PRODUCTS.map((x) => ({ value: x.id, label: `${x.inn} (${x.code}), ${x.form}` }))} /></label>
                <label className="text-lab-text-muted">Indication<Select value={lib.indication} onChange={(e) => setLib({ ...lib, indication: e.target.value })} options={INDICATIONS.map((x) => ({ value: x.id, label: x.name }))} /></label>
                <label className="text-lab-text-muted">Design<Select value={lib.design} onChange={(e) => setLib({ ...lib, design: e.target.value })} options={DESIGNS.map((x) => ({ value: x.id, label: x.name }))} /></label>
                <label className="text-lab-text-muted">Phase<Select value={lib.phase} onChange={(e) => setLib({ ...lib, phase: e.target.value })} options={CODELISTS.phase.values.map((x) => ({ value: x.decode, label: x.decode }))} /></label>
                <label className="text-lab-text-muted">Sponsor protocol identifier<input className={inputCls} value={lib.id} onChange={(e) => setLib({ ...lib, id: e.target.value })} /></label>
                <label className="text-lab-text-muted">Project name<input className={inputCls} value={lib.name} onChange={(e) => setLib({ ...lib, name: e.target.value })} /></label>
              </div>
              <Btn onClick={() => go(libraryProject(lib.name, lib.product, lib.indication, lib.design, lib.phase, lib.id))}>Create from the library</Btn>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn tone="grey" onClick={() => usdmFile.current?.click()}>Import a USDM v4 file</Btn>
              <Btn tone="grey" onClick={() => projFile.current?.click()}>Open a project file</Btn>
              <Btn tone="grey" onClick={() => simFile.current?.click()} title="A design file exported from the Clinical Trial Simulator's final report">Start from a Clinical Trial Simulator design</Btn>
              <input ref={simFile} type="file" accept=".json,application/json" className="hidden" aria-label="Clinical Trial Simulator design file" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, 'simulator'); e.target.value = '' }} />
              <input ref={usdmFile} type="file" accept=".json,application/json" className="hidden" aria-label="USDM file" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, 'usdm'); e.target.value = '' }} />
              <input ref={projFile} type="file" accept=".json,application/json" className="hidden" aria-label="Project file" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, 'project'); e.target.value = '' }} />
            </div>
          </div>
        </Panel>
        <Panel title="Missions" sub="Each mission starts its own protocol and is scored when you submit it.">
          <ul className="space-y-2">
            {MISSIONS.map((m) => { const best = missionDone(m.id); return (
              <li key={m.id} className="rounded border border-lab-line p-2 flex flex-wrap items-start justify-between gap-2">
                <div className="max-w-md"><p className="text-sm"><span className="font-mono text-lab-fda">{m.id}</span> {m.title}</p><p className="text-xs text-lab-text-muted">{m.brief}</p></div>
                <div className="flex items-center gap-2">{best && <Pill tone={best.mission!.level === 'expert' ? 'purple' : best.mission!.level === 'pass' ? 'green' : 'amber'}>{best.mission!.score} · {best.mission!.level}</Pill>}<Btn onClick={() => go(startMission(m.id))}>Start</Btn></div>
              </li>) })}
          </ul>
          <CertificatePanel learner={learner} />
        </Panel>
      </div>

      <Panel title="Your protocols" sub="Saved in this browser. Export a project file to keep a copy or move it to another browser.">
        <Table head={['Project', 'Protocol', 'Source', 'Checks', 'Updated (UTC)', '']} empty="No protocols yet." rows={projects.map((p) => { const st = p.type === 'device' ? (() => { const f = p.cip ? cipFindings(p.cip) : []; return { high: f.filter((x) => x.severity === 'high').length, medium: f.filter((x) => x.severity === 'medium').length, low: f.filter((x) => x.severity === 'low').length } })() : status(p); return [
          <button className="text-lab-fda underline text-left" onClick={() => go(p)}>{p.name}</button>, protocolId(p), p.mission ? `Mission ${p.mission.id}` : p.source,
          <Pill tone={st.high ? 'red' : st.medium ? 'amber' : 'green'}>{st.high} / {st.medium} / {st.low}</Pill>, fmtUtc(p.updatedUtc),
          <Btn tone="red" onClick={() => { if (window.confirm(`Delete “${p.name}” from this browser?`)) remove(p.id) }}>Delete</Btn>] })} />
      </Panel>
    </div>
  )
}

function CertificatePanel({ learner }: { learner: { name: string; userId: string } }) {
  const { projects } = useStore()
  let quiz: Record<string, boolean> = {}
  try { quiz = JSON.parse(localStorage.getItem('protocol-builder:quiz') ?? '{}') } catch { /* storage blocked */ }
  const c = certificate(projects, quiz, learner)
  const left = c.criteria.filter((x) => !x.met)
  return (
    <div className="rounded border border-lab-line p-2 space-y-1 text-sm">
      <p className="font-semibold">Certificate {c.eligible ? <Pill tone={c.distinction ? 'purple' : 'green'}>{c.distinction ? 'with distinction' : 'earned'}</Pill> : <Pill tone="grey">{c.criteria.length - left.length} of {c.criteria.length}</Pill>}</p>
      <p className="text-xs text-lab-text-muted">Pass M1 to M10 (core and workflow missions) and every Learn quiz. Distinction: every mission passed, three or more at expert level. The verification code can be checked on the <a className="underline text-lab-fda" href={PASSPORT_PAGE} target="_blank" rel="noreferrer">Skills Passport</a>.</p>
      {!c.eligible && <p className="text-xs">Still to do: {left.map((x) => x.label).join('; ')}.</p>}
      {c.eligible && <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-lab-cdsco">{c.code}</span>
        <Btn disabled={!learner.name.trim()} onClick={() => download('protocol-builder-certificate.html', certificateHtml(c, learner), 'text/html')}>Certificate (HTML)</Btn>
        <Btn tone="grey" disabled={!learner.name.trim()} onClick={() => download('protocol-builder-passport-record.json', JSON.stringify(passportRecord(c, learner), null, 2))}>Passport record (JSON)</Btn>
        {!learner.name.trim() && <span className="text-xs text-lab-amber">Enter your name above first.</span>}</div>}
    </div>
  )
}

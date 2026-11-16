// Projects: create, open from a file, export, and the hand-off file the pharmolecule hub checks.
import type { Project, ProtocolData, Finding } from './types'
import { EXAMPLES, emptyData, fromLibrary, type ExampleId } from './examples'
import { findings, counts } from './rules'
import { usdmOf, checkUsdm, protocolFromUsdm } from './usdm'
import { hrpIb } from './ib'
import { blankCip } from './cip'

export const FORMAT = 'protocol-builder-project' as const
export const HANDOFF = 'protocol-builder-handoff' as const
export const SCHEMA = 1
export const APP_URL = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/'
const now = () => new Date().toISOString()
const rid = () => Math.random().toString(36).slice(2, 10)

// The learner on this browser, with a class ID for the shared classroom mode to come.
const KEY = 'protocol-builder:learner'
export interface Learner { name: string; userId: string; classId: string }
export function getLearner(): Learner {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (v?.userId) return { classId: '', ...v } } catch { /* storage blocked */ }
  const v = { name: '', userId: `L-${rid()}`, classId: '' }
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage blocked */ }
  return v
}
export function setLearner(patch: Partial<Learner>): Learner {
  const v = { ...getLearner(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage blocked */ }
  return v
}

export function newProject(name: string, data: ProtocolData, source: Project['source'], phase = data.title['Trial Phase'] ?? ''): Project {
  const l = getLearner()
  return { format: FORMAT, schema: SCHEMA, id: `P-${rid()}`, name, userId: l.userId, classId: l.classId, type: 'drug', phase, regions: ['US', 'EU', 'IN'], source,
    createdUtc: now(), updatedUtc: now(), versions: [{ number: data.title['Version Number'] || '0.1', date: now().slice(0, 10), status: 'draft', data }], marks: {} }
}
export const blankProject = (name = 'New protocol') => newProject(name, emptyData(), 'blank')
// A device project holds a clinical investigation plan (ISO 14155) instead of an M11 protocol.
export function deviceProject(name = 'New clinical investigation plan', source: Project['source'] = 'blank'): Project {
  const p = newProject(name, emptyData(), source, 'Device')
  p.type = 'device'; p.cip = blankCip(); p.regions = ['EU', 'US', 'IN']
  return p
}
export const exampleProject = (id: ExampleId) => { const p = newProject(EXAMPLES[id].name, EXAMPLES[id].data(), 'example', EXAMPLES[id].phase); if (id === 'HRP-301') p.ib = hrpIb(); return p }
export const libraryProject = (name: string, product: string, indication: string, design: string, phase: string, protocolId: string) => newProject(name, fromLibrary(product, indication, design, phase, protocolId), 'library', phase)
export function usdmProject(text: string, name: string): Project {
  let u: unknown
  try { u = JSON.parse(text) } catch { throw new Error('The file is not JSON.') }
  const d = protocolFromUsdm(u, emptyData())
  return newProject(name || d.title['Trial Acronym'] || d.title['Sponsor Protocol Identifier'] || 'Imported protocol', d, 'usdm')
}

// The Ostrevia lifecycle start: VERDANT-1 with its estimands, part of the schedule and the
// statistics left for the learner, and two planted disagreements to find.
export function lifecycleProject(): Project {
  const d = EXAMPLES['HRP-301'].data()
  d.estimands = d.estimands.map((e) => ({ ...e, intercurrentEvents: e.intercurrentEvents.map((ie) => ({ ...ie, strategy: '' as const })), summary: '' as const }))
  d.procedures.find((p) => p.id === 'P10')!.visits = ['SCR', 'D1', 'W4', 'W8', 'W12']
  d.design['Number of Participants Randomly Assigned'] = '300'
  d.multiplicity = ''
  d.narrative['10.10'] = ''
  for (const s of ['4.2.1', '10.4']) d.narrative[s] = ''
  return newProject('VERDANT-1 protocol (Ostrevia lifecycle)', d, 'lifecycle', 'Phase 3')
}

export const current = (p: Project) => p.versions[p.versions.length - 1].data
// The current amendment and the ones before it, for the printed and Word protocol.
export const docOpts = (p: Project) => ({ amendment: p.versions[p.versions.length - 1].amendment, prior: p.versions.slice(0, -1).flatMap((v) => (v.amendment ? [v.amendment] : [])) })
// The USDM export of the current version, with every amendment so far.
export const usdmOfProject = (p: Project) => usdmOf(current(p), { amendments: p.versions.flatMap((v) => (v.amendment ? [v.amendment] : [])) })
export const protocolId = (p: Project) => (p.type === 'device' ? p.cip?.number || '(no CIP reference)' : current(p).title['Sponsor Protocol Identifier'] || '(no identifier)')
export function open(p: Project): Finding[] { return findings(current(p)).filter((f) => !p.marks[f.id]) }
export function status(p: Project) {
  const all = findings(current(p)), openF = all.filter((f) => !p.marks[f.id])
  // A justified finding still counts for a high: only a fix clears it.
  const highOpen = all.filter((f) => f.severity === 'high' && p.marks[f.id]?.status !== 'resolved').length
  return { all, open: openF, ...counts(openF), highOpen }
}

export function upgrade(p: Project): Project {
  if (!p.marks) p.marks = {}
  if (!p.classId) p.classId = ''
  return p
}

// ---------- files ----------
export function projectFile(p: Project) { return JSON.stringify({ format: FORMAT, schema: SCHEMA, exportedUtc: now(), project: p }, null, 2) }
export function readProjectFile(text: string): Project {
  let j: { format?: string; schema?: number; project?: Project }
  try { j = JSON.parse(text) } catch { throw new Error('The file is not JSON.') }
  if (j.format !== FORMAT || !j.project) throw new Error('This is not a Protocol Builder project file. Export one with “Export project file”.')
  if ((j.schema ?? 1) > SCHEMA) throw new Error('This file was made by a newer version of the Protocol Builder.')
  return upgrade({ ...j.project, id: j.project.id || `P-${rid()}` })
}

// The hand-off to the pharmolecule hub's lifecycle journey (and the EDC Study Build Lab, which
// reads the USDM inside it).
export function handoff(p: Project) {
  const d = current(p), st = status(p), u = usdmOfProject(p), issues = checkUsdm(u)
  return {
    format: HANDOFF, schema: 1, exportedUtc: now(), app: { name: 'Protocol Builder', url: APP_URL },
    learner: { userId: p.userId, classId: p.classId },
    protocol: { id: protocolId(p), title: d.title['Full Title'] ?? '', phase: d.title['Trial Phase'] ?? '', version: d.title['Version Number'] ?? '', source: p.source, project: p.name },
    consistency: { rules: 40, high: st.high, medium: st.medium, low: st.low, justified: Object.values(p.marks).filter((m) => m.status === 'justified').length, highOpen: st.highOpen },
    estimands: d.estimands.map((e) => ({ id: e.id, endpoint: d.endpoints.find((x) => x.id === e.endpointId)?.text ?? '', strategies: e.intercurrentEvents.map((i) => `${i.name}: ${i.strategy || '(none)'}`), summary: e.summary })),
    usdm: { version: u.usdmVersion, errors: issues.filter((i) => i.level === 'error').length, warnings: issues.filter((i) => i.level === 'warning').length },
    study: u,
  }
}

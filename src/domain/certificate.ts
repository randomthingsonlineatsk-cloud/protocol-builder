// The Protocol Builder certificate and its Skills Passport record. The certificate needs the core
// missions and the workflow missions passed (submitted at the mission's pass mark or above) and
// every Learn lesson's quiz passed. It is awarded with distinction when every mission is passed and
// at least three are at expert level. The verification code is cyrb53 of the basis, the same
// method as the CDM console, the SDTM trainer, the EDC lab and the TLF lab; the pharmolecule hub's
// Skills Passport recomputes it (verify.js, prefix PB-).
import type { Project } from './types'
import { MISSIONS } from './missions'
import { LESSONS } from './learn'

export const PASSPORT_KIND = 'pharmolecule/passport-record' as const
export const PASSPORT_PAGE = 'https://randomthingsonlineatsk-cloud.github.io/pharmolecule/passport.html'
export const APP_ID = 'protocol-builder'
export const APP_NAME = 'Protocol Builder'
export const APP_URL = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/'
const NOTICE = 'Portfolio certificate from a training app. Not an accreditation.'

export function hash(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677) }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

// Core: M1 to M7. Workflow: M8, M9 and M10. Elective missions (M11, M12) count for distinction.
export const REQUIRED = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10']
export interface Cert { eligible: boolean; distinction: boolean; basis: string; code: string; criteria: { label: string; met: boolean }[]; best: Record<string, { score: number; level: string } | undefined>; quizzes: number }

export function certificate(projects: Project[], quiz: Record<string, boolean>, learner: { name: string; userId: string }): Cert {
  const best: Cert['best'] = {}
  for (const m of MISSIONS) {
    const runs = projects.filter((p) => p.mission?.id === m.id && p.mission.submittedUtc).sort((a, b) => (b.mission!.score ?? 0) - (a.mission!.score ?? 0))
    const r = runs[0]?.mission
    best[m.id] = r ? { score: r.score ?? 0, level: r.level ?? 'not yet' } : undefined
  }
  const passed = (id: string) => !!best[id] && best[id]!.level !== 'not yet'
  const quizzes = LESSONS.filter((l) => quiz[l.id]).length
  const criteria = [
    ...REQUIRED.map((id) => ({ label: `${id} ${MISSIONS.find((m) => m.id === id)?.title ?? ''} passed`, met: passed(id) })),
    { label: `All ${LESSONS.length} Learn quizzes passed`, met: quizzes === LESSONS.length },
  ]
  const eligible = criteria.every((c) => c.met)
  const expert = MISSIONS.filter((m) => best[m.id]?.level === 'expert').length
  const distinction = eligible && MISSIONS.every((m) => passed(m.id)) && expert >= 3
  const basis = `${learner.name.trim().toLowerCase()}|${MISSIONS.filter((m) => passed(m.id)).map((m) => `${m.id}:${best[m.id]!.score}:${best[m.id]!.level}`).join(',')}|quiz:${quizzes}/${LESSONS.length}|${learner.userId}`
  const h = hash(basis).slice(-10).toUpperCase()
  return { eligible, distinction, basis, code: `PB-${h.slice(0, 5)}-${h.slice(5)}`, criteria, best, quizzes }
}

export const sealOf = (rec: object) => { const { seal: _s, ...rest } = rec as Record<string, unknown>; void _s; return hash(JSON.stringify(rest)) }
export function passportRecord(c: Cert, learner: { name: string; userId: string }, issued = new Date().toISOString().slice(0, 10)) {
  const rec = { kind: PASSPORT_KIND, schema: 1, app: APP_ID, appName: APP_NAME, certificate: c.distinction ? 'Protocol authoring (ICH M11), with distinction' : 'Protocol authoring (ICH M11)', appUrl: APP_URL, name: learner.name.trim(), userId: learner.userId, issued, basis: c.basis, code: c.code, criteria: c.criteria, distinction: c.distinction, alg: 'cyrb53' as const, notice: NOTICE }
  return { ...rec, seal: sealOf(rec) }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
export function certificateHtml(c: Cert, learner: { name: string }, issued = new Date().toISOString().slice(0, 10)) {
  const rows = MISSIONS.map((m) => `<tr><td>${m.id}</td><td>${esc(m.title)}</td><td>${c.best[m.id] ? `${c.best[m.id]!.score} (${c.best[m.id]!.level})` : '—'}</td></tr>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Certificate: protocol authoring</title><style>body{font-family:Georgia,serif;max-width:46rem;margin:3rem auto;padding:2rem;border:6px double #333;color:#111}h1{font-size:1.6rem}table{border-collapse:collapse;width:100%;font:0.85rem sans-serif}td{border-bottom:1px solid #ccc;padding:0.3rem}code{font-size:1.1rem}.n{font:0.8rem sans-serif;color:#555}</style></head><body>
<p class="n">Protocol Builder · training certificate</p><h1>Protocol authoring in the ICH M11 structure${c.distinction ? ', with distinction' : ''}</h1>
<p>This certifies that <b>${esc(learner.name)}</b> wrote, checked, amended and handed off clinical trial protocols in the ICH M11 structure: estimands (ICH E9(R1)), the schedule of activities, the statistics, amendments classified for the US, the EU and India, region readiness against EU CTR Annex I and India's NDCT Rules, and the USDM v4 hand-off to a database build.</p>
<table>${rows}<tr><td></td><td>Learn quizzes</td><td>${c.quizzes} passed</td></tr></table>
<p>Issued ${issued}. Verification code: <code>${c.code}</code></p>
<p class="n">Check it on the Regulatory Skills Passport: ${PASSPORT_PAGE}. ${NOTICE} All protocols, products and sponsors are fictional.</p>
<p class="n">Built by Khan Gulrez Shagufa Fazal Ahmed.</p></body></html>`
}

// Protocol versions, tracked changes and amendments, and how each change is handled in the US
// (21 CFR 312.30), the EU (Regulation (EU) No 536/2014: substantial modifications, Article 81(9)
// updates, non-substantial modifications, urgent safety measures under Article 54) and India (New
// Drugs and Clinical Trials Rules 2019, Third Schedule paragraph 1(v) and 1(vi)). The
// classifications are the app's teaching key, written from those texts; a learner may argue a
// justified alternative.
import type { Project, ProtocolData, Amendment, Change, Region, Arm } from './types'
import { TOC } from './m11'

// ---------- versions ----------
export const last = (p: Project) => p.versions[p.versions.length - 1]
export function dataForEdit(p: Project): ProtocolData {
  const v = last(p)
  if (v.status === 'approved') throw new Error(`Version ${v.number} is approved. Start an amendment (Amendments page) to change the protocol.`)
  return v.data
}
export function approve(p: Project, date = new Date().toISOString().slice(0, 10)) {
  const v = last(p); v.status = 'approved'; v.date = date
  v.data.title['Version Date'] = date; if (!/^\d{4}-\d\d-\d\d/.test(v.data.title['Sponsor Approval'] ?? '')) v.data.title['Sponsor Approval'] = date
}
const nextNumber = (n: string) => `${Math.floor(Number(n) || 0) + 1}.0`
export function startAmendment(p: Project) {
  const v = last(p)
  if (v.status !== 'approved') throw new Error(`Version ${v.number} is still a draft: approve it first, then amend it.`)
  const data: ProtocolData = structuredClone(v.data), number = nextNumber(v.number), n = p.versions.filter((x) => x.amendment).length + 1
  data.title['Original Protocol Indicator'] = 'No'; data.title['Version Number'] = number; data.title['Amendment Identifier'] = String(n); data.title['Amendment Scope'] = 'Global'
  data.title['Version Date'] = new Date().toISOString().slice(0, 10); data.title['Sponsor Approval'] = 'Pending (draft amendment)'
  p.versions.push({ number, date: new Date().toISOString().slice(0, 10), status: 'draft', data,
    amendment: { identifier: String(n), scope: 'Global', scopeDetail: '', enrolledPct: 0, primaryReason: '', secondaryReasons: [], summary: '', safetyRights: '', dataImpact: '', changes: [] } })
}

// ---------- tracked changes ----------
export interface DiffItem { section: string; label: string; before: string; after: string }
const sectionTitle = (n: string) => (n === 'TP' ? 'Title page' : `${n} ${TOC.find((s) => s.num === n)?.title ?? ''}`)
export function diff(a: ProtocolData, b: ProtocolData): DiffItem[] {
  const out: DiffItem[] = []
  const add = (section: string, label: string, x: unknown, y: unknown) => { const s1 = fmt(x), s2 = fmt(y); if (s1 !== s2) out.push({ section, label, before: s1, after: s2 }) }
  const keys = (o1: Record<string, string>, o2: Record<string, string>) => [...new Set([...Object.keys(o1), ...Object.keys(o2)])]
  for (const k of keys(a.title, b.title)) if (!['Version Number', 'Version Date', 'Original Protocol Indicator', 'Amendment Identifier', 'Amendment Scope', 'Sponsor Approval'].includes(k)) add('TP', k, a.title[k], b.title[k])
  for (const k of keys(a.design, b.design)) add('1.1.2', k, a.design[k], b.design[k])
  const F: [keyof ProtocolData['facts'], string, string][] = [['participants', '10.11', 'Number of participants'], ['perArm', '10.11', 'Participants per arm'], ['treatmentWeeks', '4.1', 'Treatment period (weeks)'], ['followUpWeeks', '4.1', 'Follow-up (weeks)'], ['ageMin', '5.1', 'Minimum age'], ['ageMax', '5.1', 'Maximum age'], ['power', '10.11', 'Power'], ['alpha', '10.1', 'Alpha'], ['dropoutPct', '10.11', 'Dropout (%)']]
  for (const [k, s, l] of F) add(s, l, a.facts[k], b.facts[k])
  add('10.11', 'Sample size assumptions', a.facts.assumption, b.facts.assumption)
  const byId = <T,>(xs: T[], id: (x: T) => string) => new Map(xs.map((x) => [id(x), x]))
  const list = <T,>(section: string, what: string, xa: T[], xb: T[], id: (x: T) => string, show: (x: T) => string) => {
    const A = byId(xa, id), B = byId(xb, id)
    for (const [k, x] of A) if (!B.has(k)) out.push({ section, label: `${what} ${k} removed`, before: show(x), after: '' })
    for (const [k, y] of B) { const x = A.get(k); if (!x) out.push({ section, label: `${what} ${k} added`, before: '', after: show(y) }); else if (show(x) !== show(y)) out.push({ section, label: `${what} ${k}`, before: show(x), after: show(y) }) }
  }
  list('1.2', 'Arm', a.arms, b.arms, (x: Arm) => x.id, (x) => `${x.name}: ${x.intervention} (ratio ${x.ratio})`)
  list('6.1', 'Intervention', a.interventions, b.interventions, (x) => x.id, (x) => `${x.name}: ${x.dose}, ${x.route}, ${x.frequency}, ${x.durationWeeks} weeks`)
  list('3', 'Objective', a.objectives, b.objectives, (x) => x.id, (x) => `${x.level}: ${x.text}`)
  list('3', 'Endpoint', a.endpoints, b.endpoints, (x) => x.id, (x) => `${x.level}: ${x.text} (${x.visitIds.join(', ')})`)
  list('3.1', 'Estimand', a.estimands, b.estimands, (x) => x.id, (x) => `${x.population}; ${x.treatment}; ${x.intercurrentEvents.map((i) => `${i.name}: ${i.strategy}`).join('; ')}; ${x.summary}`)
  list('5.2', 'Criterion', a.criteria.filter((c) => c.category === 'Inclusion'), b.criteria.filter((c) => c.category === 'Inclusion'), (x) => x.code, (x) => x.text)
  list('5.3', 'Criterion', a.criteria.filter((c) => c.category === 'Exclusion'), b.criteria.filter((c) => c.category === 'Exclusion'), (x) => x.code, (x) => x.text)
  list('1.3', 'Visit', a.visits, b.visits, (x) => x.id, (x) => `${x.name}: day ${x.day} (${x.lo} to ${x.hi})`)
  list('1.3', 'Procedure', a.procedures, b.procedures, (x) => x.id, (x) => `${x.name} at ${x.visits === 'continuous' ? `all visits from ${x.from ?? 'D1'}` : x.visits.join(', ')}`)
  list('10.2', 'Analysis set', a.analysisSets, b.analysisSets, (x) => x.id, (x) => `${x.name}: ${x.text}`)
  add('10.10', 'Multiplicity strategy', a.multiplicity, b.multiplicity)
  add('6.9', 'Rescue therapy', a.rescue, b.rescue)
  add('9.2', 'Adverse events collected from', a.aeFrom, b.aeFrom)
  for (const s of TOC) if ((a.narrative[s.num] ?? '') !== (b.narrative[s.num] ?? '')) out.push({ section: s.num, label: `Text of ${sectionTitle(s.num)}`, before: a.narrative[s.num] ?? '', after: b.narrative[s.num] ?? '' })
  return out
}
const fmt = (x: unknown) => (x === undefined || x === null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x))

// Word-level difference for display (longest common subsequence on words).
export type Seg = { t: '=' | '-' | '+'; s: string }
export function wordDiff(a: string, b: string): Seg[] {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/)
  if (A.length * B.length > 400000) return [{ t: '-', s: a }, { t: '+', s: b }]
  const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1))
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out: Seg[] = [], push = (t: Seg['t'], s: string) => { const l = out[out.length - 1]; if (l && l.t === t) l.s += s; else out.push({ t, s }) }
  let i = 0, j = 0
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { push('=', A[i]); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]); else push('+', B[j++]) }
  while (i < A.length) push('-', A[i++]); while (j < B.length) push('+', B[j++])
  return out
}

// ---------- classification ----------
export const REGIONS: { id: Region; name: string; basis: string }[] = [
  { id: 'US', name: 'United States (FDA, IND)', basis: '21 CFR 312.30' },
  { id: 'EU', name: 'European Union (CTR)', basis: 'Regulation (EU) No 536/2014, Articles 2(2)(13), 15 to 24, 54 and 81(9)' },
  { id: 'IN', name: 'India (CDSCO)', basis: 'NDCT Rules 2019, Third Schedule, paragraph 1(v) and 1(vi)' },
]
export const OPTIONS: Record<Region, { id: string; label: string }[]> = {
  US: [
    { id: 'change', label: 'Protocol amendment: change in protocol (submit to FDA and get IRB approval before implementing)' },
    { id: 'immediate', label: 'Immediate hazard: implement at once, then submit the amendment and notify the IRB' },
    { id: 'investigator', label: 'Protocol amendment: new investigator (within 30 days)' },
    { id: 'new-protocol', label: 'Protocol amendment: new protocol' },
    { id: 'irb-only', label: 'No FDA amendment: IRB review and approval only' },
    { id: 'annual', label: 'No amendment: report in the IND annual report' },
    { id: 'none', label: 'No submission: record it in the trial files' },
  ],
  EU: [
    { id: 'sm-1', label: 'Substantial modification, Part I (assessed by the Member States concerned)' },
    { id: 'sm-2', label: 'Substantial modification, Part II (each Member State concerned)' },
    { id: 'sm-12', label: 'Substantial modification of Part I and Part II' },
    { id: 'usm', label: 'Urgent safety measure (Article 54): act now, notify within 7 days, then a substantial modification' },
    { id: 'nsm', label: 'Non-substantial modification: record in the trial master file and list in the next substantial modification' },
    { id: '81-9', label: 'Update in CTIS (Article 81(9)), not a substantial modification' },
    { id: 'new-cta', label: 'A new clinical trial application' },
  ],
  IN: [
    { id: 'prior', label: 'Prior written approval of the ethics committee and CDSCO before implementing' },
    { id: 'ec', label: 'Ethics committee approval; the sponsor informs CDSCO' },
    { id: 'notify30', label: 'Administrative, logistic or minor: notify CDSCO within 30 days' },
    { id: 'immediate', label: 'Immediate hazard: implement at once and notify the ethics committee and CDSCO immediately' },
    { id: 'new', label: 'A new clinical trial application' },
  ],
}
export interface Category { id: string; label: string; example: string; key: (phase: string) => Record<Region, string>; why: Record<Region, string> }
const p1 = (phase: string) => /^(Early )?Phase 1$/.test(phase)
const K = (US: string, EU: string, IN: string) => ({ US, EU, IN })
export const CATEGORIES: Category[] = [
  { id: 'safety-add', label: 'Adds a test or procedure to monitor safety', example: 'Liver tests at every visit after a hepatic signal', key: () => K('change', 'sm-1', 'prior'),
    why: { US: '312.30(b)(1)(iii): adding a test to improve monitoring for a side effect needs a change-in-protocol amendment.', EU: 'It affects participant safety: a substantial modification of Part I (the protocol).', IN: 'A change to the approved protocol: prior written approval of the ethics committee and CDSCO.' } },
  { id: 'safety-drop', label: 'Drops a safety test or procedure', example: 'Stopping the Week 12 ECG', key: () => K('change', 'sm-1', 'prior'),
    why: { US: '312.30(b)(1)(iii): dropping a test intended to monitor safety needs an amendment.', EU: 'It affects participant safety: substantial, Part I.', IN: 'A protocol change: prior approval.' } },
  { id: 'urgent', label: 'Removes an immediate hazard to participants', example: 'Stopping dosing in all participants at once after unexpected deaths', key: () => K('immediate', 'usm', 'immediate'),
    why: { US: '312.30(b)(2)(ii): may be implemented at once, then submitted as an amendment with the IRB notified.', EU: 'Article 54: urgent safety measures without prior authorisation, notified within 7 days, followed by a substantial modification.', IN: 'Third Schedule 1(vi): allowed to eliminate an immediate hazard; notify the ethics committee and CDSCO at once.' } },
  { id: 'exposure', label: 'Increases the dose or the duration of exposure', example: 'A 50 mg arm, or 24 instead of 16 weeks of treatment', key: () => K('change', 'sm-1', 'prior'),
    why: { US: '312.30(b)(1)(i): an increase in dose or duration of exposure.', EU: 'Substantial: it changes the safety and the scientific basis of Part I.', IN: 'A protocol change: prior approval.' } },
  { id: 'size', label: 'Significantly increases the number of participants', example: 'From 324 to 450 participants', key: () => K('change', 'sm-1', 'prior'),
    why: { US: '312.30(b)(1)(i): a significant increase in the number of subjects.', EU: 'Substantial, Part I.', IN: 'A protocol change: prior approval.' } },
  { id: 'design', label: 'Changes the design: control, endpoints, eligibility or the primary analysis', example: 'A new primary endpoint, or an exclusion criterion removed', key: (ph) => K(p1(ph) ? 'annual' : 'change', 'sm-1', 'prior'),
    why: { US: '312.30(b)(1): in phase 2 and 3, changes that significantly affect the scope or scientific quality need an amendment; in phase 1, only safety changes do (312.23(a)(6)), others go in the annual report.', EU: 'It affects the reliability and robustness of the data: substantial, Part I.', IN: 'A protocol change: prior approval.' } },
  { id: 'schedule', label: 'Adds or moves a non-safety procedure or visit', example: 'An extra pharmacokinetic sample at Week 4', key: (ph) => K(p1(ph) ? 'annual' : 'change', 'sm-1', 'prior'),
    why: { US: 'A change affecting the scientific quality in phase 2 or 3: change in protocol; in phase 1, the annual report.', EU: 'It adds burden to participants and changes data collection: substantial, Part I.', IN: 'A protocol change: prior approval.' } },
  { id: 'site', label: 'Adds a site or an investigator', example: 'A new site in Pune', key: () => K('investigator', 'sm-2', 'ec'),
    why: { US: '312.30(c): a new-investigator amendment within 30 days of the investigator being added.', EU: 'Suitability of the site and investigator is Part II: a substantial modification of Part II in that Member State.', IN: 'The new site needs its ethics committee approval; CDSCO is informed.' } },
  { id: 'icf', label: 'Changes the informed consent form or recruitment material only', example: 'Clearer wording of the ICF', key: () => K('irb-only', 'sm-2', 'ec'),
    why: { US: 'Not a protocol amendment: the IRB reviews and approves the consent form.', EU: 'Consent and recruitment documents are Part II: substantial, Part II.', IN: 'The ethics committee approves the revised consent documents.' } },
  { id: 'admin', label: 'Corrects an error or clarifies text without changing the conduct', example: 'A typo in section 8, or a cross-reference fixed', key: () => K('none', 'nsm', 'notify30'),
    why: { US: 'Not a change that significantly affects safety, scope or quality: no amendment; keep it on file.', EU: 'Non-substantial: recorded in the trial master file and listed in the cover letter of the next substantial modification.', IN: 'Third Schedule 1(vi): administrative or minor changes are notified to CDSCO within 30 days.' } },
  { id: 'contact', label: 'Updates contact or oversight details', example: 'A new sponsor contact person or CRO address', key: () => K('none', '81-9', 'notify30'),
    why: { US: 'Not a protocol change: update the IND administrative information in the next submission.', EU: 'Article 81(9): information relevant to supervision is updated in CTIS without a substantial modification.', IN: 'Administrative: notify CDSCO within 30 days.' } },
  { id: 'logistic', label: 'Changes logistics without effect on participants or data', example: 'A new courier for sample shipment', key: () => K('none', 'nsm', 'notify30'),
    why: { US: 'No effect on safety, scope or quality: no amendment.', EU: 'Non-substantial.', IN: 'Third Schedule 1(vi): logistic changes are notified within 30 days.' } },
  { id: 'new-study', label: 'Is in fact a new study', example: 'An open-label extension added as a new study', key: () => K('new-protocol', 'new-cta', 'new'),
    why: { US: '312.30(a): a study not covered by a protocol in the IND is a new-protocol amendment.', EU: 'A new trial needs its own application.', IN: 'A new trial needs its own application.' } },
]
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id)
export const keyFor = (c: Change, phase: string) => categoryById(c.category)?.key(phase)
export function grade(c: Change, phase: string) {
  const k = keyFor(c, phase)
  return REGIONS.map((r) => ({ region: r.id, answer: c.answers[r.id] ?? '', key: k?.[r.id] ?? '', ok: !!k && c.answers[r.id] === k[r.id], justified: !!k && c.answers[r.id] !== k[r.id] && (c.justify[r.id] ?? '').trim().length >= 20 }))
}

// Draft the changes from the tracked differences, one per section.
export function draftChanges(items: DiffItem[]): Change[] {
  const bySection = new Map<string, DiffItem[]>()
  for (const it of items) bySection.set(it.section, [...(bySection.get(it.section) ?? []), it])
  return [...bySection.entries()].map(([s, xs], i) => ({ id: `C${i + 1}`, sections: [s], description: xs.map((x) => x.label).join('; '), rationale: '', category: '', answers: {}, justify: {} }))
}

// Checks on an amendment (shown on the Amendments page and scored in mission M7).
export function amendmentFindings(p: Project): { id: string; text: string }[] {
  const v = last(p), a = v.amendment, out: { id: string; text: string }[] = []
  if (!a) return out
  const prev = p.versions[p.versions.length - 2]
  const items = prev ? diff(prev.data, v.data) : []
  if (!items.length) out.push({ id: 'AM-01', text: 'The new version has no changes yet.' })
  const covered = new Set(a.changes.flatMap((c) => c.sections))
  for (const s of [...new Set(items.map((x) => x.section))]) if (!covered.has(s)) out.push({ id: `AM-02:${s}`, text: `Section ${s === 'TP' ? 'title page' : s} changed, but no entry in the summary of changes covers it.` })
  if (!a.primaryReason) out.push({ id: 'AM-03', text: 'The primary reason for the amendment is not given (M11 amendment details).' })
  if (!a.summary.trim()) out.push({ id: 'AM-04', text: 'The amendment summary is empty.' })
  if (!a.safetyRights || !a.dataImpact) out.push({ id: 'AM-05', text: 'Say whether the amendment substantially affects participant safety or rights, and the reliability and robustness of the data.' })
  if (a.scope === 'Not Global' && !a.scopeDetail.trim()) out.push({ id: 'AM-06', text: 'The amendment is not global: name the countries, regions or sites.' })
  for (const c of a.changes) {
    if (!c.category) out.push({ id: `AM-07:${c.id}`, text: `Change ${c.id}: choose what kind of change it is.` })
    if (!c.rationale.trim()) out.push({ id: `AM-08:${c.id}`, text: `Change ${c.id}: give the rationale (M11 summary of changes).` })
    for (const r of REGIONS) if (!c.answers[r.id]) out.push({ id: `AM-09:${c.id}:${r.id}`, text: `Change ${c.id}: classify it for ${r.name}.` })
  }
  return out
}

// ---------- downstream impact ----------
// Which documents and systems built from the protocol must change with an amendment. The
// protocol is the source; these follow it. Read from the sections the changes touch and from the
// amendment's reasons.
export interface Impact { doc: string; why: string; sections: string[]; action: string }
const touches = (secs: string[], ...prefixes: string[]) => secs.filter((s) => prefixes.some((p) => s === p || s.startsWith(p + '.')))
export function impactOf(p: Project): Impact[] {
  const v = last(p), a = v.amendment
  if (!a) return []
  const prev = p.versions[p.versions.length - 2]
  const items = prev ? diff(prev.data, v.data) : []
  const secs = [...new Set([...a.changes.flatMap((c) => c.sections), ...items.map((i) => i.section)])]
  const labels = items.map((i) => i.label).join(' ')
  const out: Impact[] = []
  const icf = touches(secs, '1.3', '2.2', '4.1', '5', '6.1', '6.3', '7', '8', '9', '11.3', '11.8')
  if (icf.length) out.push({ doc: 'Informed consent form', sections: icf, why: 'Procedures, visits, risks, eligibility, treatment or data use that participants are told about have changed.', action: 'Update the ICF; have the ethics committee approve it; re-consent participants already enrolled where the change may affect their willingness to continue (ICH E6(R3)).' })
  const ecrf = touches(secs, '1.3', '1.1.2', '5.2', '5.3', '6.1', '7', '8', '9.2', '12.1')
  if (ecrf.length) out.push({ doc: 'eCRF, visit schedule and edit checks', sections: ecrf, why: 'The schedule, windows, criteria, dosing, assessments or the adverse event period read by the database have changed.', action: 'Change the database build and its edit checks, test them (UAT) and release a new build version before the amendment is in force at a site.' })
  const sap = touches(secs, '3', '1.1.1', '10', '4.2.1')
  if (sap.length || /participants|Sample size|estimand|endpoint/i.test(labels)) out.push({ doc: 'Statistical analysis plan', sections: sap.length ? sap : ['10'], why: 'Objectives, endpoints, estimands, analysis sets or the sample size have changed.', action: 'Amend the SAP (and the TLF shells) before unblinding, and record the change in the SAP history.' })
  if (a.primaryReason === 'C207609' || a.secondaryReasons.includes('C207609') || touches(secs, '2.2', '9').length) out.push({ doc: "Investigator's Brochure and reference safety information", sections: touches(secs, '2.2', '9'), why: a.primaryReason === 'C207609' || a.secondaryReasons.includes('C207609') ? 'New safety information prompted the amendment.' : 'The risks or safety reporting have changed.', action: 'Make sure the new safety information is in the IB and its RSI, and that 9.2 cites the IB edition in force.' })
  if (touches(secs, '6.7', '1.2').length || /Number of Arms|Randomisation|ratio/i.test(labels)) out.push({ doc: 'Randomisation and drug supply (IRT)', sections: touches(secs, '6.7', '1.2', '1.1.2'), why: 'Arms, allocation or blinding have changed.', action: 'Update the randomisation specification and the drug supply plan; test the IRT change.' })
  if (touches(secs, '6.6', '6.1').length) out.push({ doc: 'Pharmacy manual and drug labels', sections: touches(secs, '6.6', '6.1'), why: 'Doses, presentation, storage or accountability have changed.', action: 'Revise the pharmacy manual; check the labels still match.' })
  if (touches(secs, '12.1', '8.4').length) out.push({ doc: 'Laboratory manual and central laboratory set-up', sections: touches(secs, '12.1', '8.4'), why: 'Laboratory tests or their timing have changed.', action: 'Update the laboratory manual, the requisitions and the data transfer agreement.' })
  if (secs.some((s) => ['TP', '1.1.2', '3', '5', '4.4'].some((x) => s === x || s.startsWith(x + '.'))) || /Title|participants/i.test(labels)) out.push({ doc: 'Trial registry records', sections: secs.filter((s) => ['TP', '1.1.2', '3', '5', '4.4'].some((x) => s === x || s.startsWith(x + '.'))), why: 'Registered data elements (titles, design, outcomes, eligibility, enrolment) may have changed.', action: 'Update ClinicalTrials.gov, CTIS and CTRI as each registry requires.' })
  out.push({ doc: 'Site training and the trial master file', sections: secs, why: 'Every amendment.', action: 'Train site staff on the changes and file the approvals, the amended protocol and the training records.' })
  return out
}

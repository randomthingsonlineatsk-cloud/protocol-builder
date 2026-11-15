// Missions M1 to M5 (Phase 1), each scored on the rules, the export checks and a reference.
// A mission is a project with `mission` set; submitting scores it and keeps the result.
import type { Project, ProtocolData } from './types'
import { EXAMPLES, fromLibrary, nfrData, NFR_PROCS } from './examples'
import { findings } from './rules'
import { newProject, current } from './project'
import { usdmOf, checkUsdm } from './usdm'
import { REQUIRED_TEXT } from './rules'

export interface Question { id: string; q: string; options: string[]; answer: string; section: string }
export interface MissionDef { id: string; title: string; brief: string; core: boolean; steps: string[]; pass: number; expert: number; start: () => Project; questions?: Question[] }

// ---------- M1: read a protocol ----------
const Q = (id: string, q: string, answer: string, wrong: string[], section: string): Question => ({ id, q, answer, options: [answer, ...wrong].sort((a, b) => a.localeCompare(b)), section })
export const M1_QUESTIONS: Question[] = [
  Q('q1', 'What kind of variable is the primary endpoint?', 'Binary (responder or not)', ['Continuous', 'Time to event', 'Count'], '3.1'),
  Q('q2', 'Which strategy does the primary estimand use for rescue therapy?', 'Composite variable: the participant is a non-responder', ['Treatment policy', 'Hypothetical', 'While on treatment'], '3.1'),
  Q('q3', 'What is the population-level summary of the primary estimand?', 'Difference in proportions', ['Difference in means', 'Hazard ratio', 'Odds ratio'], '3.1'),
  Q('q4', 'How many participants are randomised?', '324', ['300', '291', '108'], '1.1.2'),
  Q('q5', 'What is the allocation ratio?', '1:1:1', ['2:1', '1:1', '2:2:1'], '6.7'),
  Q('q6', 'At which visit is the primary endpoint measured?', 'Week 16', ['Week 12', 'Week 20', 'Day 1'], '3.1'),
  Q('q7', 'Which criterion keeps out participants at risk of hepatitis B reactivation?', 'EX01', ['EX02', 'EX03', 'IN04'], '5.3'),
  Q('q8', 'Which analysis set does the primary estimand use?', 'Intent-to-treat set', ['Safety set', 'Per-protocol set', 'Completers'], '10.2'),
  Q('q9', 'How long is the treatment period?', '16 weeks', ['12 weeks', '20 weeks', '24 weeks'], '1.1.2'),
  Q('q10', 'From when are adverse events collected?', 'The signing of informed consent', ['The first dose', 'Randomisation', 'Week 2'], '9.2'),
  Q('q11', 'Who has HBV DNA measured during treatment?', 'Participants positive for anti-HBc with undetectable HBV DNA', ['Everyone', 'Participants positive for HBsAg', 'No one'], '1.3'),
  Q('q12', 'How is the familywise error rate controlled?', 'A fixed-sequence procedure', ['Bonferroni', 'It is not controlled', 'A graphical approach with recycling'], '10.10'),
  Q('q13', 'What power and significance level does the sample size use?', '90% power, two-sided 0.05', ['80% power, one-sided 0.025', '90% power, one-sided 0.05', '80% power, two-sided 0.05'], '10.11'),
  Q('q14', 'In which M11 section is the sample size determined?', '10.11', ['10.4', '1.1.2', '10.9'], '10.11'),
  Q('q15', 'In which M11 section are the risks and their mitigations summarised?', '2.2.1', ['4.3', '9.1', '11.6'], '2.2.1'),
]

// ---------- M5: twenty planted inconsistencies in VASCLEAR-2 ----------
export interface Plant { n: number; what: string; ids: string[]; apply: (d: ProtocolData) => void }
const proc = (d: ProtocolData, id: string) => d.procedures.find((p) => p.id === id)!
export const PLANTS: Plant[] = [
  { n: 1, what: '1.1.2 gives 120 participants', ids: ['PB-S01:n'], apply: (d) => { d.design['Number of Participants Randomly Assigned'] = '120' } },
  { n: 2, what: '10.11 gives 120 participants', ids: ['PB-T01:n'], apply: (d) => { d.statements['10.11'] = d.statements['10.11'].replace('132', '120'); d.narrative['10.11'] = d.statements['10.11'] } },
  { n: 3, what: '9.2.1 collects adverse events from the first dose; the schedule from consent', ids: ['PB-A06:ae'], apply: (d) => { d.aeFrom = 'first dose'; d.narrative['9.2'] = d.narrative['9.2'].replace('the signing of informed consent', 'the first dose') } },
  { n: 4, what: '1.1.2 gives 3 arms', ids: ['PB-S02:arms'], apply: (d) => { d.design['Number of Arms'] = '3' } },
  { n: 5, what: '1.1.2 gives 16 weeks of intervention', ids: ['PB-S03:dur'], apply: (d) => { d.design['Total Planned Duration of Trial Intervention'] = '16 weeks' } },
  { n: 6, what: 'Trial Phase is Phase 3; the title says phase 2', ids: ['PB-S06:phase'], apply: (d) => { d.title['Trial Phase'] = 'Phase 3' } },
  { n: 7, what: 'Blind schema is single blind; the title says double-blind', ids: ['PB-S05:blind'], apply: (d) => { d.design['Trial Blind Schema'] = 'Single Blind' } },
  { n: 8, what: 'The primary estimand summarises blood pressure as a difference in proportions', ids: ['PB-E03:EST1'], apply: (d) => { d.estimands[0].summary = 'Difference in proportions' } },
  { n: 9, what: 'Rescue medication has no strategy in the primary estimand', ids: ['PB-E02:EST1-EST1-IE1'], apply: (d) => { d.estimands[0].intercurrentEvents[0].strategy = '' } },
  { n: 10, what: 'The secondary estimand names an undefined analysis set', ids: ['PB-E04:EST2'], apply: (d) => { d.estimands[1].analysisSetId = 'PPS' } },
  { n: 11, what: 'The diastolic endpoint is primary under a secondary objective', ids: ['PB-E06:OBJ2-END2'], apply: (d) => { d.endpoints[1].level = 'Primary' } },
  { n: 12, what: 'Blood pressure is not measured at Week 12', ids: ['PB-A01:END1-P05-W12', 'PB-A01:END2-P05-W12'], apply: (d) => { const p = proc(d, 'P05'); p.visits = (p.visits as string[]).filter((v) => v !== 'W12') } },
  { n: 13, what: 'The Week 8 window runs into Week 12’s', ids: ['PB-A04:W8-W12'], apply: (d) => { d.visits.find((v) => v.id === 'W8')!.hi = 84 } },
  { n: 14, what: 'Weight is collected for no purpose', ids: ['PB-A02:P06'], apply: (d) => { proc(d, 'P06').purpose = [] } },
  { n: 15, what: 'IN01 allows ages up to 80', ids: ['PB-P01:age'], apply: (d) => { d.criteria[0].text = 'Aged 18 to 80 years when consent is signed' } },
  { n: 16, what: 'The local laboratory is not done at screening, but EX02 and EX03 need it', ids: ['PB-P02:EX02-P08', 'PB-P02:EX03-P08'], apply: (d) => { const p = proc(d, 'P08'); p.visits = (p.visits as string[]).filter((v) => v !== 'SCR') } },
  { n: 17, what: 'The pregnancy test was removed', ids: ['PB-P03:preg', 'PB-P02:IN03-P11'], apply: (d) => { d.procedures = d.procedures.filter((p) => p.id !== 'P11') } },
  { n: 18, what: 'The Vasclarin arm gives 20 mg; section 6 has 10 mg', ids: ['PB-I01:ARM1'], apply: (d) => { d.arms[0].intervention = 'Vasclarin 20 mg orally once daily for 12 weeks' } },
  { n: 19, what: 'Vasclarin is given for 8 weeks in section 6', ids: ['PB-I02:INT1'], apply: (d) => { d.interventions[0].durationWeeks = 8 } },
  { n: 20, what: 'Two hypotheses but no multiplicity strategy', ids: ['PB-T03:mult', 'PB-C06:10.10'], apply: (d) => { d.multiplicity = ''; d.narrative['10.10'] = '' } },
]
export function plantedVasclear(): ProtocolData { const d = EXAMPLES['HLV-204-201'].data(); for (const p of PLANTS) p.apply(d); return d }

// ---------- M2 and M3 starts ----------
function m2Start(): ProtocolData { const d = nfrData(); d.objectives = []; d.endpoints = []; d.estimands = []; for (const s of ['4.2.1', '10.4', '10.5', '10.10']) d.narrative[s] = ''; return d }
function m3Start(): ProtocolData { const d = nfrData(); d.procedures = d.procedures.map((p) => (p.visits === 'continuous' ? p : { ...p, visits: [] })); return d }
export const m3Target = () => burden(nfrData()).minutes
export function burden(d: ProtocolData) {
  let minutes = 0, blood = 0, slots = 0
  for (const p of d.procedures) if (p.visits !== 'continuous') { slots += p.visits.length; minutes += (p.minutes ?? 5) * p.visits.length; blood += (p.bloodMl ?? 0) * p.visits.length }
  return { minutes, blood, slots, visits: d.visits.length }
}

export const MISSIONS: MissionDef[] = [
  { id: 'M1', title: 'Read a protocol', core: true, pass: 70, expert: 93, brief: 'Answer 15 questions on VERDANT-1 (HRP-301). Every answer is in the protocol; the section is named after you answer.', steps: ['Read the protocol in Sections, Estimands and Schedule.', 'Answer the questions on the mission bar.', 'Submit.'], questions: M1_QUESTIONS,
    start: () => newProject('M1: read VERDANT-1', EXAMPLES['HRP-301'].data(), 'mission', 'Phase 3') },
  { id: 'M2', title: 'Objectives, endpoints and estimands for a dose-finding study', core: true, pass: 70, expert: 100, brief: 'NORTHFELL-2 compares three doses of inhaled teravelin with placebo for 12 weeks in COPD. The design, schedule and analysis sets are written; the objectives, endpoints and estimands are not.', steps: ['Write the primary objective and its endpoint (lung function, measured by spirometry).', 'Define the primary estimand with all five attributes, including how discontinuation and rescue medication are handled.', 'Add the secondary objectives and endpoints and link each endpoint to the procedure that measures it.', 'Clear the findings in groups E and A, then submit.'],
    start: () => newProject('M2: NORTHFELL-2 estimands', m2Start(), 'mission', 'Phase 2') },
  { id: 'M3', title: 'Build the schedule of activities', core: true, pass: 70, expert: 100, brief: 'NORTHFELL-2’s objectives, estimands and criteria are written and its visits are set, but no procedure is scheduled. Schedule what the endpoints, the criteria and safety need, and no more.', steps: ['Tick each procedure at the visits where it is needed.', 'Check the schedule findings (group A) and the eligibility findings (group P).', 'Keep the time on site within the target shown, then submit.'],
    start: () => newProject('M3: NORTHFELL-2 schedule', m3Start(), 'mission', 'Phase 2') },
  { id: 'M4', title: 'Write a phase 2 protocol', core: true, pass: 70, expert: 95, brief: 'Write HRP-201, the phase 2 dose-ranging study of lumiravostat (5, 10 and 25 mg or placebo for 12 weeks) in chronic hand eczema that comes before VERDANT-1. The title page and product information are filled from the library; the rest is yours.', steps: ['Fill the title page and the overall design.', 'Write the objectives, endpoints and estimands, the schedule and the criteria.', 'Size the study in 10.11 and write every required section.', 'Clear every high finding and export valid USDM, then submit.'],
    start: () => newProject('M4: HRP-201 phase 2 protocol', fromLibrary('lumiravostat', 'che', 'dose', 'Phase 2', 'HRP-201'), 'mission', 'Phase 2') },
  { id: 'M5', title: 'Fix a protocol with 20 planted inconsistencies', core: true, pass: 70, expert: 100, brief: 'VASCLEAR-2 came back from medical review with 20 inconsistencies across the synopsis, the estimands, the schedule, the criteria, the intervention and the statistics. Find and fix them without making new ones.', steps: ['Open Checks to see the findings.', 'Fix each one at its source (not by marking it justified).', 'Submit when no findings are left.'],
    start: () => newProject('M5: fix VASCLEAR-2', plantedVasclear(), 'mission', 'Phase 2') },
]
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id)!
export function startMission(id: string): Project { const m = missionById(id); const p = m.start(); p.mission = { id, startedUtc: new Date().toISOString(), answers: {} }; return p }

// ---------- scoring ----------
export interface Score { score: number; detail: { label: string; got: number; of: number }[] }
const line = (label: string, ok: boolean | number, of: number) => ({ label, got: typeof ok === 'number' ? Math.round(ok * of) : ok ? of : 0, of })
export function grade(p: Project): Score {
  const id = p.mission!.id, d = current(p), fs = findings(d), has = (pre: string) => fs.some((f) => f.rule.startsWith(pre))
  let detail: Score['detail'] = []
  if (id === 'M1') {
    const a = p.mission!.answers ?? {}
    detail = M1_QUESTIONS.map((q, i) => ({ label: `${i + 1}. ${q.q}`, got: a[q.id] === q.answer ? 1 : 0, of: 1 }))
    return { score: Math.round((100 * detail.filter((x) => x.got).length) / detail.length), detail }
  }
  if (id === 'M2') {
    const po = d.objectives.find((o) => o.level === 'Primary'), pe = po && d.endpoints.find((e) => po.endpointIds.includes(e.id))
    const spiro = !!pe && pe.procedureIds.includes('P05') && pe.visitIds.includes('W12') && pe.variableType === 'continuous'
    const est = po && d.estimands.find((e) => e.objectiveId === po.id)
    const attrs = !!est && !!est.population.trim() && !!est.treatment.trim() && est.endpointId === pe?.id && d.analysisSets.some((a) => a.id === est.analysisSetId) && est.intercurrentEvents.length > 0 && !!est.summary
    const ies = !!est && est.intercurrentEvents.every((i) => i.strategy) && est.intercurrentEvents.some((i) => /discontinu|stop/i.test(i.name)) && est.intercurrentEvents.some((i) => /rescue/i.test(i.name))
    detail = [line('Primary objective with a spirometry endpoint at Week 12 (continuous)', spiro, 20), line('Primary estimand with all five attributes', attrs, 30), line('Discontinuation and rescue medication each have a strategy', ies, 20),
      line('Summary measure fits the variable (no PB-E03)', !!est && !fs.some((f) => f.rule === 'PB-E03'), 15), line('Secondary objectives with linked endpoints; no findings in groups E and A', d.objectives.some((o) => o.level === 'Secondary') && !has('PB-E') && !has('PB-A'), 15)]
  }
  if (id === 'M3') {
    const b = burden(d), target = m3Target()
    const needed = NFR_PROCS.filter((x) => x.visits !== 'continuous')
    const scheduled = d.procedures.filter((x) => x.visits !== 'continuous' && x.visits.length > 0).length / needed.length
    detail = [line('Every endpoint is collected where it is measured, with its baseline (PB-A01, PB-A03)', !fs.some((f) => f.rule === 'PB-A01' || f.rule === 'PB-A03'), 30),
      line('Eligibility tests are done at screening; pregnancy testing is in place (PB-P02, PB-P03)', !fs.some((f) => f.rule === 'PB-P02' || f.rule === 'PB-P03'), 20),
      line('Every visit has a purpose (PB-A05) and every procedure is scheduled', !fs.some((f) => f.rule === 'PB-A05') && scheduled === 1, 15),
      line('No overlapping windows or unused procedures (PB-A02, PB-A04)', !fs.some((f) => f.rule === 'PB-A02' || f.rule === 'PB-A04'), 10),
      line(`Time on site within the target (${b.minutes} of ${Math.round(target * 1.1)} minutes)`, b.minutes > 0 && b.minutes <= target * 1.1, 25)]
  }
  if (id === 'M4') {
    const issues = checkUsdm(usdmOf(d)).filter((i) => i.level === 'error')
    const textOk = REQUIRED_TEXT.filter((n) => (d.narrative[n] ?? '').trim().length >= 20).length / REQUIRED_TEXT.length
    const med = fs.filter((f) => f.severity === 'medium' && p.marks[f.id]?.status !== 'justified').length
    detail = [line('No high findings', !fs.some((f) => f.severity === 'high'), 40), line(`At most 3 open medium findings (${med})`, med <= 3, 20),
      line('Every primary objective has an estimand, and there are at least two arms', d.objectives.some((o) => o.level === 'Primary') && !fs.some((f) => f.rule === 'PB-E01') && d.arms.length >= 2, 15),
      line(`The USDM export has no errors (${issues.length})`, issues.length === 0 && d.visits.length > 0, 15), line(`Required sections written (${Math.round(textOk * 100)}%)`, textOk >= 0.9 ? 1 : textOk * 0.5, 10)]
  }
  if (id === 'M5') {
    const ids = new Set(fs.map((f) => f.id)), planted = new Set(PLANTS.flatMap((x) => x.ids))
    const fixed = PLANTS.filter((x) => x.ids.every((i) => !ids.has(i)))
    const fresh = fs.filter((f) => !planted.has(f.id))
    detail = [...PLANTS.map((x) => ({ label: `${x.n}. ${x.what}`, got: fixed.includes(x) ? 5 : 0, of: 5 })), ...(fresh.length ? [{ label: `New findings introduced: ${fresh.map((f) => f.id).join(', ')}`, got: -5 * fresh.length, of: 0 }] : [])]
  }
  const score = Math.max(0, Math.min(100, detail.reduce((s, x) => s + x.got, 0)))
  return { score, detail }
}
export function submit(p: Project) {
  const m = missionById(p.mission!.id), g = grade(p)
  p.mission = { ...p.mission!, submittedUtc: new Date().toISOString(), score: g.score, level: g.score >= m.expert ? 'expert' : g.score >= m.pass ? 'pass' : 'not yet', detail: g.detail }
  return g
}

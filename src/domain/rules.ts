// The consistency checker: 40 rules in eight groups that read the protocol's sections together.
// Each finding names the sections it compares, says what disagrees and how to fix it. The rules
// read the structured data; free text is read only where a section states a number (a sample
// size, a duration, an age) that another section also states.

import { TOC, TITLE_ELEMENTS, DESIGN_ELEMENTS, CODELISTS, type ElementDef } from './m11'
import { sizeFromFacts, planProblems } from './stats'
import type { ProtocolData, Finding, Procedure, Visit, Endpoint } from './types'

export interface RuleDef { id: string; group: string; severity: Finding['severity']; title: string }
export const GROUPS = ['Completeness', 'Synopsis against body', 'Objectives, endpoints and estimands', 'Schedule against endpoints', 'Eligibility against population', 'Intervention', 'Statistics', 'Safety and oversight'] as const
const R = (id: string, group: number, severity: Finding['severity'], title: string): RuleDef => ({ id, group: GROUPS[group], severity, title })
export const RULES: RuleDef[] = [
  R('PB-C01', 0, 'high', 'A required title page element is missing'),
  R('PB-C02', 0, 'high', 'A required overall design element is missing'),
  R('PB-C03', 0, 'medium', 'A value is not in the M11 code list'),
  R('PB-C04', 0, 'medium', 'A required section has no text'),
  R('PB-C05', 0, 'high', 'An amended protocol has no amendment identifier or scope'),
  R('PB-C06', 0, 'medium', 'A conditional section is needed but empty'),
  R('PB-S01', 1, 'high', 'The number of participants in 1.1.2 differs from the body'),
  R('PB-S02', 1, 'high', 'The number of arms in 1.1.2 differs from the arms defined'),
  R('PB-S03', 1, 'high', 'The duration of intervention in 1.1.2 differs from section 6'),
  R('PB-S04', 1, 'medium', 'The duration of participation in 1.1.2 differs from the schedule'),
  R('PB-S05', 1, 'medium', 'The title and the blinding disagree'),
  R('PB-S06', 1, 'medium', 'The title and the trial phase disagree'),
  R('PB-E01', 2, 'high', 'A primary objective has no estimand'),
  R('PB-E02', 2, 'high', 'An intercurrent event has no strategy'),
  R('PB-E03', 2, 'high', 'The population-level summary does not fit the variable'),
  R('PB-E04', 2, 'medium', 'An estimand names no defined analysis set'),
  R('PB-E05', 2, 'medium', 'An objective has no endpoint, or an endpoint no objective'),
  R('PB-E06', 2, 'medium', 'An endpoint’s level differs from its objective’s'),
  R('PB-A01', 3, 'high', 'An endpoint needs a measurement the schedule does not collect'),
  R('PB-A02', 3, 'medium', 'A procedure serves no endpoint, safety purpose, criterion or conduct need'),
  R('PB-A03', 3, 'high', 'An endpoint timepoint is not a visit in the schedule'),
  R('PB-A04', 3, 'medium', 'Visit windows overlap'),
  R('PB-A05', 3, 'low', 'A visit has no procedures'),
  R('PB-A06', 3, 'high', 'Adverse event collection starts at different times in 1.3 and 9.2.1'),
  R('PB-P01', 4, 'high', 'The age criterion differs from the population age in 1.1.2'),
  R('PB-P02', 4, 'medium', 'A criterion needs a test the screening visit does not do'),
  R('PB-P03', 4, 'high', 'Participants of childbearing potential, but no pregnancy test in the schedule'),
  R('PB-P04', 4, 'low', 'A criterion code is repeated or does not match its category'),
  R('PB-I01', 5, 'high', 'An arm’s dose is not a dose of any intervention in section 6'),
  R('PB-I02', 5, 'high', 'The intervention’s duration differs from the treatment period'),
  R('PB-I03', 5, 'high', 'The end-of-treatment visit does not fall at the end of the treatment period'),
  R('PB-I04', 5, 'medium', 'An intercurrent event refers to rescue therapy that 6.9 does not define'),
  R('PB-T01', 6, 'high', 'The sample size in 10.11 differs from the number of participants'),
  R('PB-T02', 6, 'high', 'The assumptions in 10.11 do not give the stated number per arm'),
  R('PB-T03', 6, 'medium', 'More than one hypothesis is tested, but there is no multiplicity strategy'),
  R('PB-T04', 6, 'medium', 'No safety analysis set is defined'),
  R('PB-T05', 6, 'medium', 'An interim analysis is planned without a data monitoring committee'),
  R('PB-O01', 7, 'medium', 'A committee in 1.1.2 is not described in 11.4'),
  R('PB-O02', 7, 'medium', 'Adverse event collection ends at a visit that is not in the schedule'),
  R('PB-O03', 7, 'low', 'Section 9.2 does not give the serious adverse event reporting timeline'),
]
export const ruleById = (id: string) => RULES.find((r) => r.id === id)!

// ---------- helpers ----------
const blank = (s?: string) => !s || !s.trim()
export const firstInt = (s?: string) => { const m = /(\d[\d,]*)/.exec(s ?? ''); return m ? Number(m[1].replace(/,/g, '')) : NaN }
export const weeksIn = (s?: string) => { const m = /(\d+(?:\.\d+)?)\s*(week|day|month)/i.exec(s ?? ''); if (!m) return NaN; const n = Number(m[1]); return /day/i.test(m[2]) ? n / 7 : /month/i.test(m[2]) ? n * 4.345 : n }
const children = (num: string) => TOC.filter((s) => s.num.startsWith(num + '.'))
const text = (d: ProtocolData, num: string) => d.narrative[num] ?? ''
const hasText = (d: ProtocolData, num: string) => !blank(text(d, num)) || children(num).some((c) => !blank(text(d, c.num)))
const visitIds = (p: Procedure, d: ProtocolData) => (p.visits === 'continuous' ? d.visits.map((v) => v.id) : p.visits)
const visitById = (d: ProtocolData, id: string) => d.visits.find((v) => v.id === id)
const procById = (d: ProtocolData, id: string) => d.procedures.find((p) => p.id === id)
const screening = (d: ProtocolData) => d.visits.filter((v) => v.epoch === 'Screening').map((v) => v.id)
export const hasChildbearing = (d: ProtocolData) => d.criteria.some((c) => /childbearing|contracept/i.test(c.text))
export const pregnancyTest = (d: ProtocolData) => d.procedures.find((p) => /pregnan/i.test(p.name) || p.concept === 'Pregnancy Test')
const dmc = (d: ProtocolData) => /data monitoring|DMC|DSMB|safety monitoring board/i.test(d.design['Independent Committees'] ?? '')
const hypotheses = (d: ProtocolData) => d.estimands.filter((e) => { const o = d.objectives.find((x) => x.id === e.objectiveId); return o && o.kind === 'Efficacy' && o.level !== 'Exploratory' }).length * Math.max(1, d.arms.filter((a) => a.type === 'Investigational').length)
export const endOfTreatment = (d: ProtocolData): Visit | undefined => d.visits.filter((v) => v.epoch === 'Treatment').sort((a, b) => b.day - a.day)[0]
const SUMMARY_FITS: Record<Endpoint['variableType'], string[]> = {
  continuous: ['Difference in means', 'Difference in medians'], binary: ['Difference in proportions', 'Odds ratio', 'Risk ratio'],
  'time-to-event': ['Hazard ratio', 'Difference in medians'], count: ['Rate ratio', 'Difference in means'], ordinal: ['Odds ratio', 'Difference in proportions'],
}
// Narrative sections the protocol needs: required leaves without their own structured editor.
// Structured sections (title page, design, schema, schedule, criteria) are checked by their rules.
const STRUCTURED = new Set(['TP', '1.1.1', '1.1.2', '1.2', '1.3', '5.2', '5.3', '3', '3.1', '3.2', '3.3', '12.3'])
export const REQUIRED_TEXT = TOC.filter((s) => s.conf === 'R' && !children(s.num).some((c) => c.conf === 'R') && !STRUCTURED.has(s.num)).map((s) => s.num)
// Conditional sections and the condition that makes each one needed.
export const CONDITIONAL: { num: string; when: (d: ProtocolData) => boolean; why: string }[] = [
  { num: '4.2.5', when: (d) => d.design['Adaptive Trial Design Indicator'] === 'Yes', why: 'the design is adaptive' },
  { num: '4.2.6', when: (d) => !blank(text(d, '10.9')) || !!d.interim, why: 'an interim analysis is planned' },
  { num: '10.9', when: (d) => !!d.interim, why: 'an interim analysis is planned' },
  { num: '5.4', when: hasChildbearing, why: 'the criteria include participants of childbearing potential' },
  { num: '6.9', when: (d) => !blank(d.rescue), why: 'rescue therapy is used' },
  { num: '9.3', when: hasChildbearing, why: 'participants of childbearing potential are included' },
  { num: '10.5', when: (d) => d.objectives.some((o) => o.level === 'Secondary'), why: 'there are secondary objectives' },
  { num: '10.10', when: (d) => hypotheses(d) > 1, why: 'more than one hypothesis is tested' },
  { num: '12.1', when: (d) => d.procedures.some((p) => p.form === 'LB' || /laborator/i.test(p.name)), why: 'laboratory tests are done' },
]

const checkElements = (out: Finding[], els: ElementDef[], vals: Record<string, string>, rule: string, where: string, d: ProtocolData) => {
  for (const e of els) {
    const v = vals[e.term]
    const needed = e.conf === 'R' || (e.conf === 'C' && (
      (e.term === 'Randomisation Type' && vals['Intervention Assignment Method'] === 'Randomisation') ||
      (e.term === 'Number of Participants Randomly Assigned' && d.design['Intervention Assignment Method'] === 'Randomisation') ||
      (e.term.startsWith('Total Planned Duration') && d.facts.treatmentWeeks > 0)))
    if (needed && blank(v)) out.push({ id: `${rule}:${e.term}`, rule, severity: 'high', sections: [where], text: `${e.term} is ${e.conf === 'R' ? 'required' : `needed (${e.when})`} but empty.`, fix: `Fill ${e.term} on the ${where === 'TP' ? 'title page' : 'overall design (1.1.2)'}.` })
    else if (!blank(v) && e.list && !CODELISTS[e.list].values.some((c) => c.decode === v)) out.push({ id: `PB-C03:${e.term}`, rule: 'PB-C03', severity: 'medium', sections: [where], text: `${e.term} is “${v}”, which is not in the M11 code list ${CODELISTS[e.list].name} (${CODELISTS[e.list].id}).`, fix: `Choose one of: ${CODELISTS[e.list].values.map((c) => c.decode).join(', ')}.` })
  }
}

// ---------- the rules ----------
export function findings(d: ProtocolData): Finding[] {
  const out: Finding[] = []
  const add = (rule: string, key: string, sections: string[], t: string, fix: string) => out.push({ id: `${rule}:${key}`, rule, severity: ruleById(rule).severity, sections, text: t, fix })
  const f = d.facts

  // Completeness
  checkElements(out, TITLE_ELEMENTS, d.title, 'PB-C01', 'TP', d)
  checkElements(out, DESIGN_ELEMENTS, d.design, 'PB-C02', '1.1.2', d)
  for (const num of REQUIRED_TEXT) if (!hasText(d, num)) add('PB-C04', num, [num], `Section ${num} ${TOC.find((s) => s.num === num)!.title} is required and has no text.`, 'Write the section, following the guidance beside it.')
  if (d.title['Original Protocol Indicator'] === 'No' && (blank(d.title['Amendment Identifier']) || blank(d.title['Amendment Scope']))) add('PB-C05', 'amend', ['TP'], 'The protocol is not the original, but the amendment identifier or scope is empty.', 'Fill Amendment Identifier and Amendment Scope on the title page.')
  if (d.title['Amendment Scope'] === 'Not Global' && blank(d.title['Country, Region, or Site Identifier'])) add('PB-C06', 'scope', ['TP'], 'The amendment is not global, but no country, region or site is named.', 'Name the countries, regions or sites the amendment applies to.')
  for (const c of CONDITIONAL) if (c.when(d) && !hasText(d, c.num)) add('PB-C06', c.num, [c.num], `Section ${c.num} ${TOC.find((s) => s.num === c.num)!.title} is needed because ${c.why}, but it is empty.`, `Write section ${c.num}.`)

  // Synopsis against body
  const nSyn = firstInt(d.design['Number of Participants Randomly Assigned'] || d.design['Target/Maximum Number of Participants'])
  if (Number.isFinite(nSyn) && nSyn !== f.participants) add('PB-S01', 'n', ['1.1.2', '10.11'], `1.1.2 says ${nSyn} participants; the protocol plans ${f.participants} (${f.perArm} per arm).`, 'Use one number: correct 1.1.2 or the sample size.')
  const arms = firstInt(d.design['Number of Arms'])
  if (Number.isFinite(arms) && arms !== d.arms.length) add('PB-S02', 'arms', ['1.1.2', '4.1'], `1.1.2 says ${arms} arms; ${d.arms.length} arms are defined (${d.arms.map((a) => a.name).join(', ')}).`, 'Correct the number of arms or the arms.')
  const wInt = weeksIn(d.design['Total Planned Duration of Trial Intervention'])
  if (Number.isFinite(wInt) && Math.abs(wInt - f.treatmentWeeks) > 0.5) add('PB-S03', 'dur', ['1.1.2', '6.1'], `1.1.2 gives ${d.design['Total Planned Duration of Trial Intervention']} of intervention; the treatment period is ${f.treatmentWeeks} weeks.`, 'Make the durations agree.')
  const wPart = weeksIn(d.design['Total Planned Duration of Trial Participation'])
  const lastDay = Math.max(...d.visits.map((v) => v.hi > 9000 ? v.day : v.hi)), firstDay = Math.min(...d.visits.map((v) => v.lo < -9000 ? v.day : v.lo))
  const schedWeeks = Number.isFinite(lastDay) ? Math.ceil((lastDay - firstDay + 1) / 7) : NaN
  if (Number.isFinite(wPart) && Number.isFinite(schedWeeks) && Math.abs(wPart - schedWeeks) > 1) add('PB-S04', 'part', ['1.1.2', '1.3'], `1.1.2 gives ${d.design['Total Planned Duration of Trial Participation']} of participation; the schedule runs from day ${firstDay} to day ${lastDay}, about ${schedWeeks} weeks.`, 'Correct the duration or the visit days.')
  const t = (d.title['Full Title'] ?? '').toLowerCase(), blind = d.design['Trial Blind Schema'] ?? ''
  if ((/double[- ]blind/.test(t) && blind && blind !== 'Double Blind') || (/open[- ]label/.test(t) && blind && blind !== 'Open Label')) add('PB-S05', 'blind', ['TP', '1.1.2'], `The full title says ${/double/.test(t) ? 'double-blind' : 'open-label'}; the blind schema is ${blind}.`, 'Make the title and the blind schema agree.')
  const ph = /phase\s*(1|2|3|4|i{1,3}v?)\b/i.exec(t)?.[1], phase = d.title['Trial Phase'] ?? ''
  const roman: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' }
  if (ph && phase && !phase.includes(`Phase ${roman[ph.toLowerCase()] ?? ph}`)) add('PB-S06', 'phase', ['TP'], `The full title says phase ${ph}; Trial Phase is ${phase}.`, 'Correct the title or the trial phase.')

  // Objectives, endpoints and estimands
  for (const o of d.objectives) {
    if (o.level === 'Primary' && !d.estimands.some((e) => e.objectiveId === o.id)) add('PB-E01', o.id, ['3.1'], `Primary objective “${o.text}” has no estimand.`, 'Define its estimand: population, treatment, variable, intercurrent events with strategies, summary.')
    if (!o.endpointIds.length) add('PB-E05', o.id, ['3'], `Objective “${o.text}” has no endpoint.`, 'Link an endpoint.')
    for (const eid of o.endpointIds) { const ep = d.endpoints.find((x) => x.id === eid); if (ep && ep.level !== o.level) add('PB-E06', `${o.id}-${eid}`, ['3'], `Endpoint “${ep.text}” is ${ep.level.toLowerCase()}, but its objective is ${o.level.toLowerCase()}.`, 'Use the same level for the objective and its endpoint.') }
  }
  for (const ep of d.endpoints) if (!d.objectives.some((o) => o.endpointIds.includes(ep.id))) add('PB-E05', ep.id, ['3'], `Endpoint “${ep.text}” is not linked to any objective.`, 'Link it to its objective or remove it.')
  for (const e of d.estimands) {
    const ep = d.endpoints.find((x) => x.id === e.endpointId)
    for (const ie of e.intercurrentEvents) if (!ie.strategy) add('PB-E02', `${e.id}-${ie.id}`, ['3.1', '10.4'], `Intercurrent event “${ie.name}” of estimand ${e.id} has no strategy.`, 'Choose treatment policy, hypothetical, composite variable, while on treatment or principal stratum.')
    if (ep && e.summary && !SUMMARY_FITS[ep.variableType].includes(e.summary) && e.summary !== 'Descriptive') add('PB-E03', e.id, ['3.1', '10.4'], `Estimand ${e.id} summarises a ${ep.variableType} variable (“${ep.text}”) as a ${e.summary.toLowerCase()}.`, `Use ${SUMMARY_FITS[ep.variableType].join(' or ').toLowerCase()}.`)
    if (!e.summary) add('PB-E03', `${e.id}-none`, ['3.1'], `Estimand ${e.id} has no population-level summary.`, 'Choose the summary measure.')
    if (!d.analysisSets.some((a) => a.id === e.analysisSetId)) add('PB-E04', e.id, ['3.1', '10.2'], `Estimand ${e.id} names analysis set “${e.analysisSetId || '(none)'}”, which 10.2 does not define.`, 'Choose an analysis set defined in 10.2.')
  }

  // Schedule against endpoints
  const ids = new Set(d.visits.map((v) => v.id))
  for (const ep of d.endpoints) {
    for (const vid of ep.visitIds) if (!ids.has(vid)) add('PB-A03', `${ep.id}-${vid}`, ['3', '1.3'], `Endpoint “${ep.text}” is measured at ${vid}, which is not a visit in the schedule.`, 'Add the visit or correct the endpoint’s timepoint.')
    if (!ep.procedureIds.length) { add('PB-A01', ep.id, ['3', '1.3'], `Endpoint “${ep.text}” is not linked to any procedure, so nothing in the schedule collects it.`, 'Link the procedure that measures it.'); continue }
    for (const pid of ep.procedureIds) {
      const p = procById(d, pid)
      if (!p) { add('PB-A01', `${ep.id}-${pid}`, ['3', '1.3'], `Endpoint “${ep.text}” needs procedure ${pid}, which the schedule does not have.`, 'Add the procedure.'); continue }
      const missing = ep.visitIds.filter((v) => ids.has(v) && !visitIds(p, d).includes(v))
      if (missing.length) add('PB-A01', `${ep.id}-${pid}-${missing.join('-')}`, ['3', '1.3'], `Endpoint “${ep.text}” needs ${p.name} at ${missing.join(', ')}, but the schedule does not collect it there.`, `Tick ${p.name} at ${missing.join(', ')}.`)
      // baseline: change-from-baseline endpoints need the measurement before the first dose too
      if (/baseline/i.test(ep.text) && p.visits !== 'continuous' && !p.visits.some((v) => (visitById(d, v)?.day ?? 99) <= 1)) add('PB-A01', `${ep.id}-${pid}-baseline`, ['3', '1.3'], `Endpoint “${ep.text}” is a change from baseline, but ${p.name} is not done at screening or Day 1.`, `Tick ${p.name} at the baseline visit.`)
    }
  }
  for (const p of d.procedures) {
    const used = d.endpoints.some((e) => e.procedureIds.includes(p.id)) || d.criteria.some((c) => c.procedureIds.includes(p.id))
    if (!used && !p.purpose.includes('safety') && !p.purpose.includes('conduct')) add('PB-A02', p.id, ['1.3', '8'], `${p.name} is collected${p.visits === 'continuous' ? ' throughout' : ` at ${p.visits.length} visit${p.visits.length === 1 ? '' : 's'}`}, but no endpoint, criterion, safety purpose or conduct need uses it.`, 'Link it to what it serves, or remove it from the schedule.')
  }
  const sorted = d.visits.filter((v) => v.lo > -9000).sort((a, b) => a.day - b.day)
  for (let i = 1; i < sorted.length; i++) if (sorted[i].lo <= sorted[i - 1].hi) add('PB-A04', `${sorted[i - 1].id}-${sorted[i].id}`, ['1.3'], `The windows of ${sorted[i - 1].name} (day ${sorted[i - 1].lo} to ${sorted[i - 1].hi}) and ${sorted[i].name} (day ${sorted[i].lo} to ${sorted[i].hi}) overlap.`, 'Narrow one of the windows so a visit date belongs to one visit only.')
  for (const v of d.visits.filter((x) => x.lo > -9000)) if (!d.procedures.some((p) => p.visits !== 'continuous' && p.visits.includes(v.id))) add('PB-A05', v.id, ['1.3'], `${v.name} has no procedures.`, 'Remove the visit or schedule what it is for.')
  const ae = d.procedures.find((p) => p.form === 'AE')
  if (ae) {
    const schedFromConsent = (ae.from ?? '') !== '' && screening(d).includes(ae.from!)
    if (schedFromConsent !== (d.aeFrom === 'consent')) add('PB-A06', 'ae', ['1.3', '9.2'], `The schedule collects adverse events from ${ae.from ? visitById(d, ae.from)?.name ?? ae.from : 'Day 1'}; 9.2.1 collects them from ${d.aeFrom === 'consent' ? 'the signing of informed consent' : 'the first dose'}.`, 'Make the schedule footnote and 9.2.1 agree.')
    if (d.aeTo && !ids.has(d.aeTo)) add('PB-O02', 'ae', ['9.2'], `9.2.1 collects adverse events until “${d.aeTo}”, which is not a visit in the schedule.`, 'Name the last visit of the schedule (usually the follow-up).')
  }

  // Eligibility against population
  const age = d.criteria.find((c) => c.category === 'Inclusion' && /\bage|aged\b/i.test(c.text))
  const popAge = d.design['Population Age (Minimum and Maximum)'] ?? ''
  if (age) {
    const [a1, a2] = (age.text.match(/\d+/g) ?? []).map(Number)
    if ((a1 !== undefined && a1 !== f.ageMin) || (a2 !== undefined && a2 !== f.ageMax)) add('PB-P01', 'age', ['5.2', '1.1.2'], `${age.code} says ${age.text.toLowerCase()}; the population is ${f.ageMin} to ${f.ageMax} years.`, 'Make the criterion and the population age agree.')
  }
  const [p1, p2] = (popAge.match(/\d+/g) ?? []).map(Number)
  if (popAge && (p1 !== f.ageMin || p2 !== f.ageMax)) add('PB-P01', 'pop', ['1.1.2', '5.1'], `1.1.2 gives a population age of ${popAge}; section 5.1 and the criteria use ${f.ageMin} to ${f.ageMax}.`, 'Correct the population age.')
  const scr = screening(d)
  for (const c of d.criteria) for (const pid of c.procedureIds) {
    const p = procById(d, pid)
    if (!p || (p.visits !== 'continuous' && !p.visits.some((v) => scr.includes(v)))) add('PB-P02', `${c.code}-${pid}`, ['5', '1.3'], `${c.code} needs ${p?.name ?? pid}, which is not done at screening.`, 'Schedule it at the screening visit.')
  }
  if (hasChildbearing(d)) { const pt = pregnancyTest(d); if (!pt) add('PB-P03', 'preg', ['5.4', '1.3', '8.4'], 'The criteria include participants of childbearing potential, but the schedule has no pregnancy test.', 'Add a pregnancy test at screening, Day 1 and the end of treatment.') }
  const seen = new Set<string>()
  for (const c of d.criteria) {
    if (seen.has(c.code)) add('PB-P04', `dup-${c.code}`, ['5'], `Criterion code ${c.code} is used twice.`, 'Number criteria uniquely.')
    seen.add(c.code)
    if ((c.code.startsWith('IN') && c.category !== 'Inclusion') || (c.code.startsWith('EX') && c.category !== 'Exclusion')) add('PB-P04', `cat-${c.code}`, ['5'], `${c.code} is listed as an ${c.category.toLowerCase()} criterion.`, 'Move it or renumber it.')
  }

  // Intervention
  const doses = d.interventions.map((i) => `${i.doseValue} ${i.doseUnit}`.toLowerCase())
  for (const a of d.arms.filter((x) => x.type === 'Investigational')) {
    const m = /(\d+(?:\.\d+)?)\s*(mg|g|µg|ug|mL|IU)/i.exec(a.intervention)
    if (m && !doses.includes(`${m[1]} ${m[2]}`.toLowerCase())) add('PB-I01', a.id, ['1.1.2', '4.1', '6.1'], `Arm “${a.name}” gives ${m[1]} ${m[2]}; section 6.1 has ${d.interventions.map((i) => `${i.name} ${i.doseValue} ${i.doseUnit}`).join(', ')}.`, 'Correct the arm or the intervention.')
  }
  for (const i of d.interventions.filter((x) => x.role !== 'Rescue')) if (i.durationWeeks !== f.treatmentWeeks) add('PB-I02', i.id, ['6.1', '4.1'], `${i.name} is given for ${i.durationWeeks} weeks; the treatment period is ${f.treatmentWeeks} weeks.`, 'Make the durations agree.')
  const eot = endOfTreatment(d)
  if (eot && f.treatmentWeeks && Math.abs(eot.day - (f.treatmentWeeks * 7 + 1)) > 3) add('PB-I03', eot.id, ['1.3', '4.1'], `The last treatment visit, ${eot.name}, is on day ${eot.day}; ${f.treatmentWeeks} weeks of treatment from Day 1 end on day ${f.treatmentWeeks * 7 + 1}.`, 'Move the visit or correct the treatment period.')
  if (d.estimands.some((e) => e.intercurrentEvents.some((ie) => /rescue/i.test(ie.name))) && blank(d.rescue)) add('PB-I04', 'rescue', ['3.1', '6.9'], 'An estimand has rescue therapy as an intercurrent event, but 6.9 does not say what rescue therapy is allowed.', 'Describe the rescue therapy in 6.9.')

  // Statistics
  const nStated = firstInt(d.statements['10.11'])
  if (Number.isFinite(nStated) && nStated !== f.participants) add('PB-T01', 'n', ['10.11', '1.1.2'], `10.11 says ${nStated}; the protocol plans ${f.participants} participants.`, 'Use one number.')
  if (f.perArm * d.arms.length !== f.participants) add('PB-T01', 'arms', ['10.11'], `${f.perArm} per arm × ${d.arms.length} arms is ${f.perArm * d.arms.length}, not ${f.participants}.`, 'Correct the total or the number per arm.')
  try {
    const s = sizeFromFacts(f)
    if (Math.abs(s.perArm - f.perArm) > 1) add('PB-T02', 'calc', ['10.11'], `The assumptions in 10.11 give ${s.perArm} per arm (${s.evaluable} evaluable, ${f.dropoutPct}% dropout); the protocol states ${f.perArm}.`, 'Correct the assumptions or the number.')
  } catch { add('PB-T02', 'calc', ['10.11'], 'The sample size assumptions are incomplete or out of range.', 'Give alpha, power, dropout and the effect assumptions.') }
  if (hypotheses(d) > 1 && blank(d.multiplicity)) add('PB-T03', 'mult', ['10.10'], `${hypotheses(d)} efficacy hypotheses are tested (doses × estimands), but 10.10 has no multiplicity strategy.`, 'Describe how the familywise error rate is controlled.')
  if (d.multiplicityPlan) {
    for (const [i, pr] of planProblems(d.multiplicityPlan).entries()) add('PB-T03', `plan${i}`, ['10.10'], `The multiplicity plan is not valid: ${pr}`, 'Correct the weights or transitions so the familywise error rate is controlled.')
    if (d.multiplicityPlan.method !== 'none' && d.multiplicityPlan.hypotheses.length < hypotheses(d)) add('PB-T03', 'cover', ['10.10'], `The multiplicity plan has ${d.multiplicityPlan.hypotheses.length} hypotheses; the protocol tests ${hypotheses(d)}.`, 'Rebuild the plan from the current estimands and arms.')
  }
  if (!d.analysisSets.some((a) => /safety/i.test(a.name))) add('PB-T04', 'saf', ['10.2'], 'No safety analysis set is defined.', 'Define it (usually: everyone who took at least one dose, analysed as treated).')
  if ((!blank(text(d, '10.9')) || d.interim) && !dmc(d)) add('PB-T05', 'dmc', ['10.9', '11.4'], 'Section 10.9 plans an interim analysis, but 1.1.2 names no data monitoring committee to review it.', 'Name the committee in 1.1.2 and describe it in 11.4.')

  // Safety and oversight
  if (!blank(d.design['Independent Committees']) && !/^none/i.test(d.design['Independent Committees']) && blank(text(d, '11.4'))) add('PB-O01', 'committee', ['1.1.2', '11.4'], `1.1.2 names “${d.design['Independent Committees']}”, but 11.4 does not describe it.`, 'Describe each committee, its members and charter in 11.4.')
  if (!/24 hours|within 1 day|immediately/i.test(text(d, '9.2'))) add('PB-O03', 'sae', ['9.2'], 'Section 9.2 does not say how fast the investigator reports a serious adverse event to the sponsor.', 'State the timeline (for example, within 24 hours of awareness).')
  return out
}

export const counts = (fs: Finding[]) => ({ high: fs.filter((x) => x.severity === 'high').length, medium: fs.filter((x) => x.severity === 'medium').length, low: fs.filter((x) => x.severity === 'low').length })

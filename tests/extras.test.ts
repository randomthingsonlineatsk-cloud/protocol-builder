import { describe, expect, test } from 'vitest'
import { exampleProject, current } from '../src/domain/project'
import { EXAMPLES } from '../src/domain/examples'
import { startMission, grade } from '../src/domain/missions'
import { impactOf, startAmendment, dataForEdit, approve } from '../src/domain/amend'
import { annex2Findings, elementsIn } from '../src/domain/annex2'
import { STANDARD_TEXT, textState, withStandardText } from '../src/domain/standard'
import { adaptiveFindings, adaptiveText, blankAdaptive } from '../src/domain/adaptive'
import { complexity, nonCore } from '../src/domain/complexity'
import { readiness } from '../src/domain/review'

describe('group 1 spec leftovers', () => {
  test('amendment impact names the downstream documents', () => {
    const p = exampleProject('HRP-301'); approve(p); startAmendment(p)
    const d = dataForEdit(p); (d.procedures.find((x) => x.id === 'P07')!.visits as string[]).push('D1'); d.narrative['2.2.1'] += ' New liver risk.'
    const docs = impactOf(p).map((i) => i.doc).join(' | ')
    expect(docs).toMatch(/consent/i); expect(docs).toMatch(/eCRF|visit schedule/i)
  })
  test('Annex 2: remote visits need their arrangements written', () => {
    const d = EXAMPLES['HRP-301'].data()
    expect(elementsIn(d)).toEqual([])
    d.visits.find((v) => v.id === 'W8')!.type = 'Remote'
    expect(elementsIn(d)).toContain('remote')
    expect(annex2Findings(d).some((f) => f.rule === 'PB-DC01')).toBe(true)
    d.narrative['8.1'] = 'Week 8 is a video visit (telemedicine).'; d.narrative['9.2'] = (d.narrative['9.2'] ?? '') + ' Participants contact the investigator promptly; identity is confirmed at the start of each call.'
    expect(annex2Findings(d).filter((f) => f.rule === 'PB-DC01')).toEqual([])
  })
  test('standard text: none, standard, edited, reviewed', () => {
    const d = withStandardText({ ...EXAMPLES['HRP-301'].data(), narrative: {} })
    const k = Object.keys(STANDARD_TEXT)[0]
    expect(textState(d, k)).toBe('standard')
    d.narrative[k] += ' Edited.'; expect(textState(d, k)).toBe('edited')
    d.reviewedText = [k]; expect(textState(d, k)).toBe('reviewed')
  })
  test('E20 adaptive fields only for adaptive designs', () => {
    const d = EXAMPLES['HRP-301'].data()
    expect(adaptiveFindings(d)).toEqual([])
    d.design['Adaptive Trial Design Indicator'] = 'Yes'
    expect(adaptiveFindings(d).length).toBe(7)
    d.adaptive = { ...blankAdaptive(), types: ['stop'], timing: 'One interim analysis at 50% of participants reaching Week 16.', rules: 'Stop for futility if conditional power is below 10%; non-binding.', typeI: 'No efficacy stopping, so the type I error is not inflated; alpha 0.05 two-sided.', estimation: 'Futility stopping only, so conventional estimates are used.', simulations: 'Simulation report SR-01: power 90%, probability of stopping under the alternative 2%.', integrity: 'An independent data monitoring committee sees unblinded results; the sponsor team does not.' }
    expect(adaptiveFindings(d)).toEqual([])
    expect(adaptiveText(d.adaptive)).toMatch(/early stopping/i)
    const p = exampleProject('HRP-301'); dataForEdit(p).design['Adaptive Trial Design Indicator'] = 'Yes'
    expect(readiness(p).items.some((i) => /E20/.test(i.label) && !i.ok)).toBe(true)
  })
})

describe('complexity and the burden mission', () => {
  test('examples score low or moderate', () => {
    for (const k of Object.keys(EXAMPLES)) expect(complexity(EXAMPLES[k].data()).band).not.toBe('High')
  })
  test('M13 starts heavy and a careful cut scores 100', () => {
    const p = startMission('M13'), d0 = current(p), c0 = complexity(d0)
    expect(c0.score).toBeGreaterThan(complexity(EXAMPLES['HRP-301'].data()).score + 5)
    expect(c0.risk).not.toBe('Low')
    expect(grade(p).score).toBeLessThan(50)
    const d = dataForEdit(p)
    d.visits = d.visits.filter((v) => v.id !== 'W6' && v.id !== 'W10')
    for (const q of d.procedures) if (q.visits !== 'continuous') q.visits = q.visits.filter((v) => v !== 'W6' && v !== 'W10')
    d.procedures = d.procedures.filter((q) => q.id !== 'P17')
    d.procedures.find((q) => q.id === 'P16')!.visits = ['D1', 'W16']
    d.procedures.find((q) => q.id === 'P18')!.visits = ['SCR', 'W16']
    d.procedures.find((q) => q.id === 'P05')!.visits = ['SCR', 'D1', 'W4', 'W8', 'W16']
    expect(nonCore(d).ids).toEqual(['P16'])
    const g = grade(p)
    expect(g.detail.filter((x) => x.got < x.of).map((x) => x.label)).toEqual([])
    expect(g.score).toBe(100)
  })
  test('cutting an endpoint’s procedure loses the endpoint line', () => {
    const p = startMission('M13'), d = dataForEdit(p)
    d.procedures = d.procedures.filter((q) => q.id !== 'P11' && q.id !== 'P17')
    expect(grade(p).detail[0].got).toBe(0)
  })
})

import { icfChecks, icfSections, icfRegions } from '../src/domain/icf'
import { registries, registryIssues, registryUpdates, registriesFor } from '../src/domain/registry'
import { sapOutline, tlfList } from '../src/domain/sap'
import { siteBudget } from '../src/domain/budget'
import { dispensing, rtsmSpec } from '../src/domain/rtsm'

describe('generated documents', () => {
  test('ICF: three regions, gaps until written', () => {
    const p = exampleProject('HRP-301'), d = current(p)
    expect(icfRegions(d)).toEqual(['US', 'EU', 'IN'])
    const miss = icfChecks(p).filter((c) => !c.ok).map((c) => c.el.id)
    expect(miss).toEqual(expect.arrayContaining(['US-a4', 'US-a6', 'EU-d', 'IN-10', 'IN-11']))
    const secs = icfSections(p)
    expect(secs.find((s) => s.id === 'what')!.text).toMatch(/1 in 3 chance of receiving placebo/)
    expect(secs.find((s) => s.id === 'results')!.text).toMatch(/ClinicalTrials\.gov[\s\S]*EU trial number[\s\S]*Clinical Trials Registry – India/)
    p.docs = { icf: {
      alternatives: 'You do not have to take part to receive treatment. Other treatments include topical corticosteroids, topical calcineurin inhibitors and oral alitretinoin. If you stop the study treatment early, the study doctor will discuss your care and follow-up with you.',
      costs: 'The study treatment and study procedures are free. Travel costs are paid back; you receive a payment for each visit, prorated if you leave early.',
      injury: 'If you are injured as a result of taking part, you will receive medical treatment free of charge. You will receive compensation for study-related injury or death as the law of your country requires; the sponsor holds insurance for this.',
    } }
    expect(icfChecks(p).filter((c) => !c.ok).map((c) => c.el.id)).toEqual([])
  })
  test('registry entries are filled and within limits', () => {
    const d = EXAMPLES['HRP-301'].data()
    expect(registriesFor(d)).toEqual(['ctgov', 'ctis', 'ctri'])
    expect(registryIssues(d)).toEqual([])
    const ct = registries(d)[0].fields
    expect(ct.find((f) => f.key === 'masking')!.value).toMatch(/Double|Triple|Quadruple/)
    expect(registries(d)[1].fields.find((f) => f.key === 'msc')!.value).toBe('Germany')
  })
  test('registry updates after an amendment list changed fields and deadlines', () => {
    const p = exampleProject('HRP-301'); approve(p); startAmendment(p)
    const d = dataForEdit(p); d.facts.participants = 360; d.criteria[0].text += ' (revised)'
    const ups = registryUpdates(p)
    expect(ups.some((u) => u.reg === 'ctgov' && u.label.startsWith('Enrollment') && /30 days/.test(u.when))).toBe(true)
    expect(ups.some((u) => u.reg === 'ctri' && /Inclusion/.test(u.label))).toBe(true)
    expect(ups.some((u) => u.reg === 'ctis')).toBe(true)
  })
  test('SAP outline carries the estimands and lists TLFs', () => {
    const d = EXAMPLES['HRP-301'].data()
    expect(sapOutline(d).find((s) => s.id === 'estimands')!.text).toMatch(/EST1[\s\S]*Composite variable/i)
    expect(tlfList(d).some((t) => t.num === '14.2.1' && /IGA-CHE/.test(t.title))).toBe(true)
  })
  test('site budget and RTSM', () => {
    const d = EXAMPLES['HRP-301'].data(), b = siteBudget(d)
    expect(b.visitTotals.reduce((n, x) => n + x, 0)).toBe(b.perParticipant)
    expect(b.withOverhead).toBe(Math.round(b.perParticipant * 1.25))
    expect(dispensing(d).map((x) => x.kits)).toEqual([1, 1, 1, 1])
    expect(rtsmSpec(d).find((s) => s.id === 'rand')!.text).toMatch(/Block size: 6/)
  })
})

import { LEGACY } from '../src/domain/legacy'
import { AI_DRAFT } from '../src/domain/aidraft'
describe('conversion and AI review missions', () => {
  test('M14: mapping, placing and facts score 100', () => {
    const p = startMission('M14')
    expect(grade(p).score).toBeLessThan(20)
    p.mission!.answers = Object.fromEntries(LEGACY.map((l) => [`map:${l.id}`, l.m11[0]]))
    const d = dataForEdit(p)
    for (const l of LEGACY) if (l.m11[0] !== 'TP') d.narrative[l.m11[0]] = `${d.narrative[l.m11[0]] ?? ''}\n\n${l.text}`.trim()
    d.facts = { ...d.facts, participants: 212, perArm: 53, treatmentWeeks: 12, followUpWeeks: 4 }
    d.arms = ['5', '10', '25', 'P'].map((x, i) => ({ id: `ARM${i + 1}`, name: x === 'P' ? 'Placebo' : `Lumiravostat ${x} mg`, type: x === 'P' ? 'Placebo' as const : 'Investigational' as const, intervention: '', ratio: 1 }))
    d.endpoints = [{ id: 'END1', level: 'Primary', text: 'IGA-CHE treatment success at Week 12', variableType: 'binary', procedureIds: [], visitIds: [], purpose: 'Efficacy' }]
    expect(grade(p).score).toBe(100)
  })
  test('M15: every planted error named, no false alarms', () => {
    const p = startMission('M15')
    p.mission!.answers = Object.fromEntries(AI_DRAFT.map((s) => [`ai:${s.id}`, s.err ?? 'ok']))
    expect(grade(p).score).toBe(100)
    p.mission!.answers = Object.fromEntries(AI_DRAFT.map((s) => [`ai:${s.id}`, 'reference']))
    expect(grade(p).score).toBeLessThan(40)
    expect(AI_DRAFT.filter((s) => s.err).length).toBe(8)
  })
})

import { sign, signState } from '../src/domain/signoff'
import { feasibility, atScreening, defaultRate } from '../src/domain/feasibility'
import { addComment } from '../src/domain/review'
import { last } from '../src/domain/amend'
describe('group 3', () => {
  test('sign-off: three different people, in order; edits void later signatures; approver approves', () => {
    const p = exampleProject('HRP-301')
    expect(() => sign(p, 'Reviewer', 'R. Iyer', 'Clinical scientist')).toThrow(/author/i)
    sign(p, 'Author', 'A. Shah', 'Medical writer')
    expect(() => sign(p, 'Reviewer', 'a. shah', 'Clinical scientist')).toThrow(/different people/)
    const c = addComment(p, { section: '2.1', quote: '', kind: 'Correction', comment: 'Fix', author: 'R. Iyer' })
    expect(() => sign(p, 'Reviewer', 'R. Iyer', 'Clinical scientist')).toThrow(/open correction/)
    c.status = 'resolved'
    sign(p, 'Reviewer', 'R. Iyer', 'Clinical scientist')
    dataForEdit(p).narrative['2.1'] += ' Edited after review.'
    expect(signState(p).map((s) => s.valid)).toEqual([false, false, false])
    sign(p, 'Author', 'A. Shah', 'Medical writer'); sign(p, 'Reviewer', 'R. Iyer', 'Clinical scientist'); sign(p, 'Approver', 'M. Rao', 'Medical director')
    expect(last(p).status).toBe('approved')
    expect(signState(p).every((s) => s.valid)).toBe(true)
    expect(current(p).title['Sponsor Approval']).toMatch(/M\. Rao.*approval/)
  })
  test('feasibility: funnel adds up, repeats with the seed, and relaxing a criterion speeds recruitment', () => {
    const p = exampleProject('HRP-301'), d = current(p), f = feasibility(d, p)
    expect(f.steps.reduce((n, s) => n + s.lost, 0) + (f.prescreened - f.consented) + f.randomised).toBe(f.simulated)
    expect(feasibility(d, p).randomised).toBe(f.randomised)
    expect(d.criteria.filter((c) => atScreening(d, c)).length).toBeGreaterThan(0)
    expect(defaultRate({ code: 'X', category: 'Inclusion', text: 'Aged 18 to 85 years', procedureIds: [] })).toBe(1)
    p.feasibility = { rates: { [f.worst!.code]: 0.9 } }
    const g = feasibility(d, p)
    expect(g.randomised).toBeGreaterThan(f.randomised)
    expect(g.months!).toBeLessThanOrEqual(f.months!)
  })
})

import { describe, expect, test } from 'vitest'
import { exampleProject, current, deviceProject } from '../src/domain/project'
import { ibFindings, ibFromLibrary, hrpIb, citedEdition, IB_SECTIONS } from '../src/domain/ib'
import { PRODUCTS } from '../src/domain/examples'
import { cipFindings, cipCoverage, blankCip, cipHtml, DEVICE_RULES, type Cip } from '../src/domain/cip'
import { readiness, plainLanguage, syllables, addComment, quoteFound } from '../src/domain/review'
import { startMission, grade, submit, MISSIONS } from '../src/domain/missions'
import { synopsis } from '../src/domain/bundle'
import { LESSONS } from '../src/domain/learn'

describe('Investigator’s Brochure', () => {
  test('VERDANT-1 and its IB agree', () => {
    const p = exampleProject('HRP-301')
    expect(citedEdition(current(p))).toBe(3)
    expect(ibFindings(p)).toEqual([])
  })
  test('each rule fires on a planted disagreement', () => {
    const p = exampleProject('HRP-301')
    p.ib!.edition = 4
    p.ib!.rsi.push({ term: 'Headache', soc: 'Nervous system disorders', frequency: 'Common', aka: [] })
    p.ib!.maxHumanDose.value = 20
    p.ib!.sections.tox = ''
    expect(ibFindings(p).map((f) => f.rule).sort()).toEqual(['PB-B01', 'PB-B02', 'PB-B03', 'PB-B04'])
    p.ib!.rsi = []; expect(ibFindings(p).some((f) => f.rule === 'PB-B05')).toBe(true)
  })
  test('the library fills what it can and leaves the writing to the writer', () => {
    const ib = ibFromLibrary(PRODUCTS.find((x) => x.id === 'teravelin')!)
    expect(ib.rsi.map((t) => t.term)).toEqual(['Dry mouth', 'Urinary retention', 'Cough'])
    expect(ib.maxHumanDose).toMatchObject({ value: 400, unit: 'µg' })
    for (const k of ['summary', 'intro', 'guidance']) expect(ib.sections[k] ?? '').toBe('')
    expect(hrpIb().sections.summary.length).toBeGreaterThan(100)
  })
})

describe('mission M11', () => {
  test('starts low; a complete IB and a protocol brought into line score 100', () => {
    const p = startMission('M11')
    expect(grade(p).score).toBeLessThan(15)
    p.ib = ibFromLibrary(PRODUCTS.find((x) => x.id === 'teravelin')!)
    for (const s of IB_SECTIONS) p.ib.sections[s.id] ||= `Text for ${s.title}, written by the learner with enough words to count as a section of the brochure.`
    const d = current(p)
    d.narrative['2.2.1'] = 'Risks: dry mouth and cough, from the anticholinergic action, and urinary retention in men with prostatic hyperplasia, who are excluded. Mitigation: monitoring at each visit.'
    d.narrative['9.2'] += ' The reference safety information is section 7 of the teravelin Investigator’s Brochure, edition 1.'
    const g = grade(p)
    expect(g.detail.filter((x) => x.got < x.of)).toEqual([])
    expect(g.score).toBe(100)
  })
})

const fullCip = (): Cip => {
  const c = blankCip()
  Object.assign(c, { title: 'Accuracy of the HeartPatch HP-2 for detecting atrial fibrillation compared with 12-lead Holter monitoring', number: 'CVM-HP2-01', version: '1.0', date: '2026-11-01', riskFile: 'RMF-HP2, version 4 (ISO 14971:2019)', dmc: 'no', dmcText: 'No DMC: the device is non-invasive, the investigation lasts 14 days per subject and no interim decision is planned.', cec: 'yes', cecText: 'Three cardiologists, blinded to the device output, adjudicate every Holter rhythm strip; disagreements go to a third reader.' })
  c.device = { name: 'HeartPatch HP-2', model: 'HP-2 rev C', manufacturer: 'Corvane Medical (fictional)', intendedPurpose: 'Continuous single-lead ECG recording for up to 14 days with software that flags atrial fibrillation for review by a physician.', classification: 'EU MDR class IIa (rule 11, software)', software: 'AF detection algorithm 2.1', description: 'An adhesive patch with electrodes and a recorder; data upload to the analysis software.', contact: 'Hydrocolloid adhesive on intact skin', training: 'Site staff are trained to apply the patch.' }
  c.hazards = [
    { category: 'device', hazard: 'Adhesive', harm: 'Skin irritation', control: 'Biocompatible adhesive; skin checks', residual: 'Acceptable' },
    { category: 'procedure', hazard: 'Extra Holter recording', harm: 'Discomfort', control: 'Standard practice', residual: 'Acceptable' },
    { category: 'conduct', hazard: 'Data loss', harm: 'Missed arrhythmia', control: 'Physician reads all urgent alerts', residual: 'Acceptable' },
  ]
  const long = (x: string) => `${x} This text describes the topic in enough detail for the clinical investigation plan.`
  for (const id of ['sponsor', 'investigators', 'synopsis', 'justification', 'risks', 'objectives', 'design', 'subjects', 'stats', 'data', 'deviations', 'consent', 'vulnerable', 'termination', 'publication', 'bibliography', 'monitoring']) c.sections[id] = long(id)
  c.sections.procedures = long('The reference Holter recorders are calibrated before each subject against a signal generator.')
  c.sections.amendments = long('No eligibility waivers are granted: any exemption from the eligibility criteria is a CIP amendment.')
  c.sections.accountability = long('Each patch is tracked by serial number and UDI from receipt to return.')
  c.sections.compliance = long('The investigation complies with ISO 14155:2026, the Declaration of Helsinki and Regulation (EU) 2017/745 Annex XV.')
  c.sections.safety = long('Definitions: adverse event, serious adverse event, adverse device effect, serious adverse device effect, unanticipated serious adverse device effect and device deficiency. Device deficiencies that could have led to a serious adverse device effect are reported like SADEs, within 3 days.')
  return c
}

describe('device CIP (ISO 14155:2026)', () => {
  test('a blank CIP fails every device rule; a complete one passes all', () => {
    expect(new Set(cipFindings(blankCip()).map((f) => f.rule)).size).toBeGreaterThanOrEqual(DEVICE_RULES.length - 1)
    const c = fullCip()
    expect(cipFindings(c)).toEqual([]); expect(cipCoverage(c).pct).toBe(100)
    expect(cipHtml(c)).toContain('HeartPatch HP-2')
  })
  test('the 2026 points each fire on their own', () => {
    const rule = (c: Cip) => cipFindings(c).map((f) => f.rule)
    let c = fullCip(); c.dmcText = ''; expect(rule(c)).toEqual(['PB-D05'])
    c = fullCip(); c.sections.procedures = 'Visits on Day 1 and Day 14, with the Holter fitted at the same time as the patch.'; expect(rule(c)).toEqual(['PB-D07'])
    c = fullCip(); c.sections.amendments = 'Amendments are approved by the ethics committee before they are made.'; expect(rule(c)).toEqual(['PB-D08'])
    c = fullCip(); c.hazards = c.hazards.filter((h) => h.category !== 'conduct'); expect(rule(c)).toEqual(['PB-D03'])
    c = fullCip(); c.device.software = ''; expect(rule(c)).toEqual(['PB-D01'])
  })
  test('mission M12 scores a complete CIP at 100', () => {
    const p = startMission('M12')
    expect(p.type).toBe('device'); expect(grade(p).score).toBeLessThan(20)
    p.cip = fullCip()
    expect(grade(p).score).toBe(100)
    submit(p); expect(p.mission!.level).toBe('expert')
  })
})

describe('review, readiness and plain language', () => {
  test('VERDANT-1 is ready; a blocking comment makes it not ready until resolved', () => {
    const p = exampleProject('HRP-301')
    expect(readiness(p).items.filter((i) => !i.ok).map((i) => i.label)).toEqual([])
    const c = addComment(p, { section: '7.1', quote: 'ALT above 5 × ULN', kind: 'Consistency', comment: 'Match 2.2.1', author: 'QC' })
    expect(readiness(p).ready).toBe(false); expect(quoteFound(p, c)).toBe(true)
    current(p).narrative['7.1'] = current(p).narrative['7.1'].replace('ALT above 5 × ULN', 'ALT above 8 × ULN')
    expect(quoteFound(p, c)).toBe(false)
    p.reviews![0].status = 'resolved'; expect(readiness(p).ready).toBe(true)
  })
  test('readiness of a device project reads the CIP', () => {
    const p = deviceProject(); expect(readiness(p).ready).toBe(false)
    p.cip = fullCip(); expect(readiness(p).ready).toBe(true)
  })
  test('reading level: the synopsis is specialist text, a lay summary is plain', () => {
    expect(syllables('randomised')).toBe(3); expect(syllables('the')).toBe(1); expect(syllables('participant')).toBe(4)
    const syn = plainLanguage(synopsis(exampleProject('HRP-301')))
    expect(syn.fkGrade).toBeGreaterThan(12); expect(syn.jargon.length).toBeGreaterThan(3)
    const lay = plainLanguage('We want to find out if a new tablet helps people with sore, itchy hands. You take one tablet a day for 16 weeks. Some people get a dummy tablet. We check your skin and your blood at each visit. You can stop at any time.')
    expect(lay.fkGrade).toBeLessThan(8); expect(lay.jargon).toEqual([])
  })
})

test('twelve missions and their lessons', () => {
  expect(MISSIONS.map((m) => m.id)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'])
  expect(LESSONS.some((l) => l.id === 'ib') && LESSONS.some((l) => l.id === 'device')).toBe(true)
})

import { submissionPayload, verifySubmission } from '../src/domain/classroom'
test('classroom: a submitted mission project re-scores to the same score', async () => {
  const p = startMission('M12'); p.cip = fullCip(); submit(p)
  const pl = await submissionPayload(p)
  expect(pl.project.kind).toBe('protocol-builder/mission-submission'); expect(pl.score).toBe(100)
  const v = await verifySubmission(JSON.parse(JSON.stringify(pl.project)))
  expect(v.score).toBe(100); expect(v.project.cip?.number).toBe('CVM-HP2-01')
  await expect(submissionPayload(startMission('M1'))).rejects.toThrow(/Submit the mission/)
})

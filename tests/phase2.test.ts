import { describe, expect, test } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { EXAMPLES } from '../src/domain/examples'
import { findings } from '../src/domain/rules'
import { timeToEvent, singleArm, niProportions, crossover, boundaries, presetPlan, testPlan, planProblems, sizeFromFacts } from '../src/domain/stats'
import { approve, startAmendment, dataForEdit, diff, wordDiff, draftChanges, grade as gradeChange, amendmentFindings, CATEGORIES, REGIONS, keyFor } from '../src/domain/amend'
import { exampleProject, current, usdmOfProject, docOpts, projectFile, readProjectFile } from '../src/domain/project'
import { checkUsdm } from '../src/domain/usdm'
import { startMission, grade, submit, M8_CHANGES } from '../src/domain/missions'
import { protocolHtml } from '../src/domain/print'
import { protocolDocxBuffer } from '../src/domain/docx'
import { LESSONS } from '../src/domain/learn'
import { TOC } from '../src/domain/m11'
import type { Project } from '../src/domain/types'

const I = { alpha: 0.05, sided: 2 as const, power: 0.9, dropoutPct: 0 }
const labels = (d: ReturnType<typeof current>) => { const inv = d.arms.filter((a) => a.type === 'Investigational'); return d.estimands.filter((e) => { const o = d.objectives.find((x) => x.id === e.objectiveId); return o && o.kind === 'Efficacy' && o.level !== 'Exploratory' }).flatMap((e) => inv.map((a) => `${e.id} · ${a.name}`)) }

describe('statistics', () => {
  test('time to event: HR 0.7, two-sided 0.05, 90% power needs 331 events', () => {
    expect(timeToEvent(0.7, 0.6, I).events).toBe(331)
  })
  test('single arm exact binomial: p0 0.2, p1 0.4, one-sided 0.025, 80% power', () => {
    const r = singleArm(0.2, 0.4, { alpha: 0.025, sided: 1, power: 0.8, dropoutPct: 0 })
    expect(r.evaluable).toBeGreaterThan(35); expect(r.evaluable).toBeLessThan(55)
    expect(r.critical).toBeGreaterThan(0.2 * r.evaluable)
  })
  test('non-inferiority and crossover formulas', () => {
    // 2·(1.96+1.2816)²·0.25 / 0.1² = 525.4 → 526
    expect(niProportions(0.5, 0.1, I).evaluable).toBe(526)
    // N = 2·(3.2415)²·1/0.5² = 84.06 → n per sequence 42.03 → 43
    expect(crossover(0.5, 1, I).evaluable).toBe(43)
  })
  test('O’Brien-Fleming and Pocock-type boundaries at t = 0.5, 1', () => {
    const o = boundaries([0.5, 1], 0.05, 'obrien-fleming'), p = boundaries([0.5, 1], 0.05, 'pocock')
    expect(o[0].z).toBeCloseTo(2.963, 1); expect(o[1].z).toBeCloseTo(1.969, 1)
    expect(p[0].z).toBeCloseTo(2.157, 1); expect(p[1].z).toBeCloseTo(2.201, 1)
    expect(o[1].cumAlpha).toBeCloseTo(0.05, 3)
  })
  test('Holm, fixed sequence, Hochberg and a graphical plan', () => {
    const h = presetPlan('holm', ['A', 'B', 'C'])
    expect(planProblems(h)).toEqual([])
    expect(testPlan(h, [0.01, 0.02, 0.04], 0.05).rejected).toEqual([true, true, true])
    expect(testPlan(h, [0.01, 0.03, 0.04], 0.05).rejected).toEqual([true, false, false])
    const f = presetPlan('fixed-sequence', ['A', 'B', 'C'])
    expect(testPlan(f, [0.01, 0.2, 0.001], 0.05).rejected).toEqual([true, false, false])
    expect(testPlan(presetPlan('hochberg', ['A', 'B']), [0.04, 0.045], 0.05).rejected).toEqual([true, true])
    expect(testPlan(presetPlan('bonferroni', ['A', 'B']), [0.04, 0.045], 0.05).rejected).toEqual([false, false])
    // Two doses × two endpoints: alpha split by dose, passed primary → secondary, then across doses.
    const g = { method: 'graphical' as const, hypotheses: [{ id: 'H1', label: 'P·hi', weight: 0.5 }, { id: 'H2', label: 'P·lo', weight: 0.5 }, { id: 'H3', label: 'S·hi', weight: 0 }, { id: 'H4', label: 'S·lo', weight: 0 }],
      transitions: [[0, 0.5, 0.5, 0], [0.5, 0, 0, 0.5], [0, 1, 0, 0], [1, 0, 0, 0]] }
    expect(planProblems(g)).toEqual([])
    // H1 rejected at 0.025 passes half its weight to H3 (now 0.0125): p 0.03 is not enough, 0.01 is.
    expect(testPlan(g, [0.01, 0.2, 0.03, 0.5], 0.05).rejected).toEqual([true, false, false, false])
    expect(testPlan(g, [0.01, 0.2, 0.01, 0.5], 0.05).rejected).toEqual([true, false, true, false])
    // After H1 and H3, H2 holds the full alpha.
    expect(testPlan(g, [0.01, 0.04, 0.01, 0.5], 0.05).rejected).toEqual([true, true, true, false])
    expect(planProblems({ ...g, transitions: [[0.2, 0.5, 0.5, 0], ...g.transitions.slice(1)] }).length).toBeGreaterThan(0)
  })
})

describe('versions and amendments', () => {
  test('an approved version cannot be edited; an amendment copies it as 2.0', () => {
    const p = exampleProject('HRP-301')
    expect(() => startAmendment(p)).toThrow()
    approve(p, '2026-01-20')
    expect(() => dataForEdit(p)).toThrow()
    startAmendment(p)
    expect(p.versions.map((v) => v.number)).toEqual(['1.0', '2.0'])
    const d = dataForEdit(p)
    expect(d.title['Original Protocol Indicator']).toBe('No'); expect(d.title['Amendment Identifier']).toBe('1')
    expect(diff(p.versions[0].data, d)).toEqual([])
    d.procedures.find((x) => x.id === 'P05')!.visits = ['SCR', 'W16']
    d.narrative['7.1'] += ' Also for QTcF above 500 ms.'
    const items = diff(p.versions[0].data, d)
    expect(items.map((x) => x.section).sort()).toEqual(['1.3', '7.1'])
    const ch = draftChanges(items)
    expect(ch).toHaveLength(2)
    p.versions[1].amendment!.changes = ch
    expect(amendmentFindings(p).some((f) => f.id === 'AM-03')).toBe(true)
    expect(amendmentFindings(p).some((f) => f.id.startsWith('AM-02'))).toBe(false)
  })
  test('word diff keeps the common words', () => {
    const w = wordDiff('stop for ALT above 5 × ULN', 'stop for ALT above 3 × ULN')
    expect(w.filter((s) => s.t === '-').map((s) => s.s.trim())).toEqual(['5'])
    expect(w.filter((s) => s.t === '+').map((s) => s.s.trim())).toEqual(['3'])
  })
  test('classification is graded against the key, and a justified alternative counts', () => {
    const k = CATEGORIES.find((c) => c.id === 'safety-add')!.key('Phase 3')
    const c = { id: 'C1', sections: ['1.3'], description: '', rationale: '', category: 'safety-add', answers: { ...k }, justify: {} }
    expect(gradeChange(c, 'Phase 3').every((x) => x.ok)).toBe(true)
    const other = Object.keys(k).length && REGIONS[0].id
    c.answers[other] = 'none'
    expect(gradeChange(c, 'Phase 3')[0]).toMatchObject({ ok: false, justified: false })
    c.justify = { [other]: 'The sponsor judged it minor because the test is already standard care.' }
    expect(gradeChange(c, 'Phase 3')[0].justified).toBe(true)
  })
  test('every category has a key option and a reason for each region', () => {
    for (const c of CATEGORIES) for (const ph of ['Phase 1', 'Phase 3']) for (const r of REGIONS) { expect(c.key(ph)[r.id]).toBeTruthy(); expect(c.why[r.id]).toBeTruthy() }
  })
})

function amended(): Project {
  const p = exampleProject('HRP-301'); approve(p, '2026-01-20'); startAmendment(p)
  const d = dataForEdit(p)
  d.procedures.find((x) => x.id === 'P05')!.visits = ['SCR', 'D1', 'W16']
  d.narrative['7.1'] += ' Also for QTcF above 500 ms.'
  const a = p.versions[1].amendment!
  Object.assign(a, { primaryReason: 'C207609', summary: 'Adds an ECG on Day 1 and a QTc stopping rule.', safetyRights: 'Yes', dataImpact: 'No', enrolledPct: 20 })
  a.changes = draftChanges(diff(p.versions[0].data, d)).map((c) => ({ ...c, rationale: 'New safety information', category: 'safety-add', answers: { ...CATEGORIES[0].key('Phase 3') } }))
  return p
}

describe('amended protocol exports', () => {
  test('USDM with the amendment passes the export checks, and is written for the validator', () => {
    const p = amended(), u = usdmOfProject(p)
    expect(checkUsdm(u)).toEqual([])
    const am = u.study.versions[0].amendments
    expect(am).toHaveLength(1)
    expect(am[0].primaryReason.code.code).toBe('C207609')
    expect(amendmentFindings(p)).toEqual([])
    mkdirSync('tests/out', { recursive: true })
    writeFileSync('tests/out/HRP-301-amended-usdm.json', JSON.stringify(u, null, 2))
  })
  test('the print layout and the Word file carry the amendment', async () => {
    const p = amended(), html = protocolHtml(current(p), docOpts(p))
    expect(html).toContain('Amendment details'); expect(html).toContain('New Safety Information Available')
    const buf = await protocolDocxBuffer(current(p), docOpts(p))
    expect(buf.length).toBeGreaterThan(10000)
    expect(buf.subarray(0, 2).toString()).toBe('PK')
    mkdirSync('tests/out', { recursive: true }); writeFileSync('tests/out/HRP-301-2.0.docx', buf)
  })
  test('project files keep versions and amendments', () => {
    const p = amended(), q = readProjectFile(projectFile(p))
    expect(q.versions).toHaveLength(2); expect(q.versions[1].amendment?.changes.length).toBe(2)
  })
})

describe('missions M6 to M8', () => {
  test('M6 starts at zero and a correct answer scores 100', () => {
    const p = startMission('M6'), d = current(p)
    expect(grade(p).score).toBeLessThan(30)
    d.facts.assumption = { kind: 'proportions', p0: 0.15, p1: 0.35 }
    const s = sizeFromFacts(d.facts); d.facts.perArm = s.perArm; d.facts.participants = s.perArm * d.arms.length
    d.statements['10.11'] = d.narrative['10.11'] = `${d.facts.participants} participants (${s.perArm} per arm).`
    d.design['Number of Participants Randomly Assigned'] = d.design['Target/Maximum Number of Participants'] = String(d.facts.participants)
    d.multiplicityPlan = presetPlan('holm', labels(d)); d.multiplicity = d.narrative['10.10'] = 'Holm procedure across the six hypotheses.'
    expect(d.multiplicityPlan.hypotheses).toHaveLength(6)
    expect(findings(d).filter((f) => f.rule.startsWith('PB-T'))).toEqual([])
    expect(grade(p)).toMatchObject({ score: 100 })
  })
  test('M7: the planted version is approved, and a full amendment scores 100', () => {
    const p = startMission('M7')
    expect(p.versions[0].status).toBe('approved')
    expect(grade(p).score).toBeLessThan(40)
    startAmendment(p)
    const d = dataForEdit(p)
    d.procedures.find((x) => x.id === 'P07')!.visits = ['SCR', 'W2', 'W4', 'W8', 'W12', 'W16', 'FU']
    d.narrative['7.1'] = 'The trial intervention is stopped permanently for ALT above 5 × ULN, or ALT above 3 × ULN with total bilirubin above 2 × ULN.'
    d.narrative['2.2.1'] += ' Liver tests at every visit and a liver stopping rule (7.1) were added in amendment 1.'
    const a = p.versions[1].amendment!
    Object.assign(a, { primaryReason: 'C207609', summary: 'Liver monitoring at every visit and a liver stopping rule.', safetyRights: 'Yes', dataImpact: 'No' })
    a.changes = draftChanges(diff(p.versions[0].data, d)).map((c) => ({ ...c, rationale: 'Hepatic signal from the data monitoring committee', category: 'safety-add', answers: { ...keyFor({ category: 'safety-add' } as never, 'Phase 3')! } }))
    expect(findings(d).filter((f) => f.severity === 'high')).toEqual([])
    const g = grade(p)
    expect(g.detail.filter((x) => x.got < x.of)).toEqual([])
    expect(g.score).toBe(100)
  })
  test('M8: fifteen changes, the key scores 100 and blanks score 0', () => {
    const p = startMission('M8')
    expect(M8_CHANGES).toHaveLength(15)
    expect(grade(p).score).toBe(0)
    M8_CHANGES.forEach((c, i) => { const k = CATEGORIES.find((x) => x.id === c.category)!.key('Phase 3'); for (const r of REGIONS) p.mission!.answers![`${i}:${r.id}`] = k[r.id] })
    submit(p)
    expect(p.mission!.score).toBe(100); expect(p.mission!.level).toBe('expert')
  })
})

describe('lessons', () => {
  test('lessons cover every top-level M11 section, and every quiz answer is in range', () => {
    const covered = new Set(LESSONS.flatMap((l) => l.sections))
    for (const s of TOC.filter((x) => x.num !== 'TP' && !x.num.includes('.'))) expect(covered.has(s.num)).toBe(true)
    for (const l of LESSONS) for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length)
  })
})
void EXAMPLES

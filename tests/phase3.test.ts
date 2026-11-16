import { describe, expect, test } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { EXAMPLES } from '../src/domain/examples'
import { FRAMEWORKS, coverage, allCoverage, itemsFor } from '../src/domain/crosswalk'
import { trialDesign, TD_VARS, TS_FROM_DATA, toCsv } from '../src/domain/sdtmDesign'
import { startMission, grade, m9Gaps } from '../src/domain/missions'
import { current } from '../src/domain/project'
import { TOC } from '../src/domain/m11'

describe('cross-walks', () => {
  test('item counts follow the official texts', () => {
    const n = (id: string) => FRAMEWORKS.find((f) => f.id === id)!.items
    // SPIRIT 2025: items 1 to 34, with their sub-items.
    expect(new Set(n('spirit').map((i) => i.id.replace(/[a-d]$/, ''))).size).toBe(34)
    // CTR Annex I D: 15(a)–(f), 16, 17(a)–(am) = 39 items, 18, 19(a)–(b), 20(a)–(d), 21–24.
    expect(n('ctr').filter((i) => i.id.startsWith('17(')).length).toBe(39)
    expect(n('ctr').length).toBe(6 + 1 + 39 + 1 + 2 + 4 + 4)
    // NDCT Table 2: a title page (a)–(f) and 16 headings.
    expect(new Set(n('ndct').filter((i) => !i.id.startsWith('TP')).map((i) => i.id.replace(/\(.*$/, ''))).size).toBe(16)
    expect(n('ndct').filter((i) => i.id.startsWith('TP')).length).toBe(6)
    // 312.23(a)(6)(iii) (a)–(g).
    expect(n('ind').filter((i) => i.id.startsWith('(iii)')).length).toBe(7)
  })
  test('every M11 reference names a real section or element', () => {
    const nums = new Set(TOC.map((s) => s.num))
    for (const f of FRAMEWORKS) for (const it of f.items) for (const m of it.m11) expect(nums.has(m.split(':')[0]), `${f.id} ${it.id} ${m}`).toBe(true)
  })
  test('HRP-301 is region-ready: every applicable item covered', () => {
    for (const c of allCoverage(EXAMPLES['HRP-301'].data())) expect(c.gaps.map((g) => g.item.id), c.name).toEqual([])
  })
  test('GLV-12-301 and the others show gaps, and a gap closes when the content is written', () => {
    const d = EXAMPLES['HLV-204-201'].data(), before = coverage(d, 'ctr')
    expect(before.gaps.map((g) => g.item.id)).toContain('17(e)')
    d.narrative['4.1.1'] = 'Patients with hypertension reviewed the visit schedule.'
    expect(coverage(d, 'ctr').gaps.map((g) => g.item.id)).not.toContain('17(e)')
    expect(coverage(d, 'ctr').pct).toBeGreaterThan(before.pct)
  })
  test('items that do not apply are not scored (open label, no randomisation)', () => {
    const d = EXAMPLES['HRP-301'].data()
    d.design['Trial Blind Schema'] = 'Open Label'
    const c = coverage(d, 'spirit')
    expect(c.results.filter((r) => ['24a', '24b', '24c'].includes(r.item.id)).every((r) => r.status === 'n/a')).toBe(true)
  })
  test('a section shows the items it serves', () => {
    expect(itemsFor('11.8').map((x) => `${x.fw} ${x.id}`)).toEqual(expect.arrayContaining(['SPIRIT 33', 'EU CTR 17(ak)', 'EU CTR 17(am)', 'NDCT 11(d)']))
  })
})

describe('mission M9', () => {
  test('starts with EU and India gaps; closing them scores 100', () => {
    const g = m9Gaps()
    expect(g.ctr.length).toBeGreaterThan(5); expect(g.ndct.length).toBeGreaterThan(3)
    const p = startMission('M9')
    expect(grade(p).score).toBeLessThan(30)
    // The learner writes the content back.
    const ref = EXAMPLES['HRP-301'].data(), d = current(p)
    d.title = { ...ref.title }; d.narrative = { ...ref.narrative }
    const r = grade(p)
    expect(r.detail.filter((x) => x.got < x.of)).toEqual([])
    expect(r.score).toBe(100)
  })
})

describe('SDTM trial design datasets', () => {
  const trainer = JSON.parse(readFileSync('tests/fixtures/glv-sdtm-trainer-design.json', 'utf8')) as Record<string, Record<string, string>[]>
  const mine = trialDesign(EXAMPLES['GLV-12-301'].data())
  const pick = (rows: Record<string, string>[], vars: string[]) => rows.map((r) => vars.map((v) => r[v] ?? ''))
  test.each(['TA', 'TE', 'TV', 'TI'] as const)('GLV-12-301 %s matches the SDTM Mapping Trainer’s reference', (dom) => {
    expect(pick(mine[dom], TD_VARS[dom])).toEqual(pick(trainer[dom], TD_VARS[dom]))
  })
  test('GLV-12-301 TS matches the trainer for every parameter a protocol gives', () => {
    const TEXT = ['STOPRULE']
    const key = (rows: Record<string, string>[]) => rows.filter((r) => !TS_FROM_DATA.includes(r.TSPARMCD) && !TEXT.includes(r.TSPARMCD)).map((r) => [r.TSPARMCD, r.TSVAL, r.TSVALCD, r.TSVCDREF, r.TSVCDVER].join('|')).sort()
    const theirs = key(trainer.TS), ours = key(mine.TS.filter((r) => r.TSPARMCD !== 'OUTMSSEC'))
    expect(ours).toEqual(theirs)
    expect(mine.TS.some((r) => r.TSPARMCD === 'STOPRULE' && r.TSVAL)).toBe(true)
  })
  test('HRP-301 design datasets are complete and consistent', () => {
    const t = trialDesign(EXAMPLES['HRP-301'].data())
    expect(t.TA).toHaveLength(9); expect(new Set(t.TA.map((r) => r.ARMCD))).toEqual(new Set(['HRP25', 'HRP10', 'PBO']))
    expect(t.TV.map((r) => r.VISIT)).toEqual(['SCREENING', 'DAY 1', 'WEEK 2', 'WEEK 4', 'WEEK 8', 'WEEK 12', 'WEEK 16', 'FOLLOW-UP'])
    expect(t.TI).toHaveLength(7)
    const ts = Object.fromEntries(t.TS.map((r) => [r.TSPARMCD, r.TSVAL]))
    expect(ts).toMatchObject({ TPHASE: 'PHASE III TRIAL', PLANSUB: '324', NARMS: '3', TBLIND: 'DOUBLE BLIND', RANDOM: 'Y', ADDON: 'N', AGEMIN: 'P18Y', AGEMAX: 'P75Y', INTMODEL: 'PARALLEL', SPONSOR: 'Halcyon Ridge Pharmaceuticals' })
    // every TE element used in TA, and every TS row has TSSEQ
    const te = new Set(t.TE.map((r) => r.ETCD)); for (const r of t.TA) expect(te.has(r.ETCD)).toBe(true)
    expect(t.TS.every((r) => r.TSSEQ && r.TSPARM)).toBe(true)
    expect(toCsv('TA', t.TA).split('\n')[0]).toBe(TD_VARS.TA.join(','))
  })
})

import { simulatorProject, readSimDesign } from '../src/domain/simulator'
import { applicationBundle, coverNotes } from '../src/domain/bundle'
import { exampleProject } from '../src/domain/project'
import { approve, startAmendment, dataForEdit, diff, draftChanges, CATEGORIES } from '../src/domain/amend'
import { writeFileSync } from 'node:fs'
import { findings } from '../src/domain/rules'

describe('Clinical Trial Simulator design', () => {
  const text = readFileSync('tests/fixtures/vasclarin-simulator-design.json', 'utf8')
  test('fills the title page and sections 1, 2, 3, 4 and 10', () => {
    const p = simulatorProject(text), d = current(p)
    expect(p.source).toBe('simulator'); expect(p.phase).toBe('Phase 3')
    expect(d.title['Sponsor Protocol Identifier']).toBe('VSC-9-301')
    expect(d.title['Full Title']).toMatch(/^A randomised, double-blind, placebo-controlled phase 3 study of Vasclarin \(VSC-9\) in resistant/)
    expect(d.design).toMatchObject({ 'Intervention Model': 'Parallel Group', 'Control Type': 'Placebo', 'Trial Blind Schema': 'Double Blind', 'Intervention Assignment Method': 'Randomisation', 'Number of Arms': '2' })
    expect(d.endpoints[0].text).toMatch(/ambulatory systolic/i)
    expect(d.estimands).toHaveLength(1)
    expect(d.interim?.spending).toBe('obrien-fleming')
    for (const s of ['2.1', '2.2.1', '4.1', '4.2.3', '5.1', '10.1', '10.10', '10.11']) expect(d.narrative[s], s).toBeTruthy()
    // the learner still has work: the checks find what the design leaves open
    expect(findings(d).length).toBeGreaterThan(5)
  })
  test('refuses other files', () => {
    expect(() => readSimDesign('{"kind":"x"}')).toThrow(/not a design file/)
  })
})

describe('application bundle', () => {
  test('a new protocol carries its synopsis, cross-walks and the readable protocol', () => {
    const p = exampleProject('HRP-301'); approve(p, '2026-01-20')
    const b = applicationBundle(p)
    expect(b.protocol).toMatchObject({ id: 'HRP-301', status: 'approved', version: '1.0' })
    expect(b.crosswalks.map((c) => c.id)).toEqual(['spirit', 'ctr', 'ndct', 'ind'])
    expect(b.crosswalks.every((c) => c.gaps.length === 0)).toBe(true)
    expect(b.synopsis).toMatch(/Primary objective/); expect(b.documents.protocolHtml).toMatch(/<html/)
    expect(b.amendment).toBeNull()
  })
  test('an amendment carries the changes and a cover note per region', () => {
    const p = exampleProject('HRP-301'); approve(p, '2026-01-20'); startAmendment(p)
    const d = dataForEdit(p); d.procedures.find((x) => x.id === 'P05')!.visits = ['SCR', 'D1', 'W2', 'W4', 'W8', 'W16']
    const a = p.versions[1].amendment!
    Object.assign(a, { primaryReason: 'C207609', summary: 'Vital signs at Week 2.', safetyRights: 'No', dataImpact: 'No' })
    a.changes = draftChanges(diff(p.versions[0].data, d)).map((c) => ({ ...c, rationale: 'More safety monitoring', category: 'schedule', answers: { ...CATEGORIES.find((k) => k.id === 'schedule')!.key('Phase 3') } }))
    approve(p, '2026-03-01')
    const notes = coverNotes(p)
    expect(notes.US).toMatch(/21 CFR 312\.30/); expect(notes.EU).toMatch(/CTIS/); expect(notes.IN).toMatch(/Third Schedule/)
    const b = applicationBundle(p)
    expect(b.amendment?.changes[0].classification.US).toBeTruthy()
    // Refresh the Clinical Trial Simulator's fixture when its repository sits beside this one.
    if (existsSync('../clinical-trial-simulator/tests')) writeFileSync('../clinical-trial-simulator/tests/fixtures/hrp301-application-bundle.json', JSON.stringify({ ...b, exportedUtc: '2026-11-16T00:00:00.000Z' }))
  })
})

import { M10_CLAIMS, readEdcBuild, submit } from '../src/domain/missions'
describe('mission M10', () => {
  const text = readFileSync('tests/fixtures/hrp301-edc-build.json', 'utf8')
  test('the EDC lab’s first-pass build of HRP-301 has the generator’s misses and none of the distractors', () => {
    const b = readEdcBuild(text, 'HRP-301')
    const truth = Object.fromEntries(M10_CLAIMS.map((c) => [c.id, c.truth(b)]))
    expect(truth).toEqual({ scr: true, logs: true, generic: true, notes: true, checks: true, uns: true, dv: true, w2: false, ietest: false, preg: false })
    expect(() => readEdcBuild(text, 'HLV-204-201')).toThrow(/HRP-301/)
  })
  test('scored from the loaded build: all right is 100, nothing loaded is 15', () => {
    const p = startMission('M10')
    expect(p.versions[0].status).toBe('approved')
    expect(grade(p).score).toBe(15)
    const b = readEdcBuild(text, 'HRP-301')
    p.mission!.answers = { build: JSON.stringify(b), ...Object.fromEntries(M10_CLAIMS.map((c) => [`claim:${c.id}`, c.truth(b) ? 'true' : 'false'])) }
    submit(p)
    expect(p.mission!.score).toBe(100)
  })
})

import { certificate, passportRecord, sealOf, hash, REQUIRED } from '../src/domain/certificate'
import { MISSIONS } from '../src/domain/missions'
import { LESSONS } from '../src/domain/learn'
import type { Project } from '../src/domain/types'
describe('certificate and Skills Passport record', () => {
  const learner = { name: 'Asha Verma', userId: 'L-test0004' }
  const run = (id: string, score: number, level: 'pass' | 'expert'): Project => ({ ...exampleProject('HRP-301'), mission: { id, startedUtc: '2026-11-01T00:00:00Z', submittedUtc: '2026-11-02T00:00:00Z', score, level } })
  const allQuiz = Object.fromEntries(LESSONS.map((l) => [l.id, true]))
  test('needs M1 to M10 and every quiz', () => {
    const some = certificate(REQUIRED.slice(0, 9).map((id) => run(id, 80, 'pass')), allQuiz, learner)
    expect(some.eligible).toBe(false); expect(some.criteria.filter((c) => !c.met).map((c) => c.label)).toEqual([expect.stringMatching(/^M10 /)])
    const noQuiz = certificate(REQUIRED.map((id) => run(id, 80, 'pass')), {}, learner)
    expect(noQuiz.eligible).toBe(false)
    const ok = certificate(REQUIRED.map((id, i) => run(id, 90, i < 3 ? 'expert' : 'pass')), allQuiz, learner)
    expect(ok.eligible).toBe(true); expect(ok.code).toMatch(/^PB-[0-9A-F]{5}-[0-9A-F]{5}$/)
    expect(ok.distinction).toBe(MISSIONS.length === REQUIRED.length)
  })
  test('the record verifies the way the hub recomputes it', () => {
    const c = certificate(REQUIRED.map((id, i) => run(id, 90 + i % 3, i < 4 ? 'expert' : 'pass')), allQuiz, learner)
    const rec = passportRecord(c, learner, '2026-11-16')
    expect(rec.seal).toBe(sealOf(rec))
    const h = hash(rec.basis).slice(-10).toUpperCase(); expect(rec.code).toBe(`PB-${h.slice(0, 5)}-${h.slice(5)}`)
    expect(rec.basis.startsWith('asha verma|')).toBe(true); expect(rec.basis.endsWith('|L-test0004')).toBe(true)
    if (existsSync('../pharmolecule/tests/fixtures')) writeFileSync('../pharmolecule/tests/fixtures/pb.json', JSON.stringify(rec, null, 2))
  })
})

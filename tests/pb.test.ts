import { describe, expect, test } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { EXAMPLES, type ExampleId } from '../src/domain/examples'
import { findings, RULES } from '../src/domain/rules'
import { sizeFromFacts, twoProportions, twoMeans, qnorm } from '../src/domain/stats'
import { usdmOf, checkUsdm, protocolFromUsdm, teachingSubset } from '../src/domain/usdm'
import { emptyData } from '../src/domain/examples'
import { exampleProject, lifecycleProject, projectFile, readProjectFile, handoff, current, usdmProject, blankProject } from '../src/domain/project'
import { MISSIONS, PLANTS, plantedVasclear, startMission, grade, submit, M1_QUESTIONS } from '../src/domain/missions'
import { nfrData } from '../src/domain/examples'
import { protocolHtml } from '../src/domain/print'
import { TOC, CODELISTS } from '../src/domain/m11'

const ids = Object.keys(EXAMPLES) as ExampleId[]

describe('worked examples', () => {
  test.each(ids)('%s has no findings and a valid USDM export', (id) => {
    const d = EXAMPLES[id].data()
    expect(findings(d).map((f) => f.id)).toEqual([])
    expect(checkUsdm(usdmOf(d))).toEqual([])
  })
  test('the stated sample sizes reproduce', () => {
    expect(sizeFromFacts(EXAMPLES['HRP-301'].data().facts)).toMatchObject({ evaluable: 97, perArm: 108 })
    expect(sizeFromFacts(EXAMPLES['HLV-204-201'].data().facts)).toMatchObject({ evaluable: 59, perArm: 66 })
    expect(sizeFromFacts(EXAMPLES['NFR-118-201'].data().facts)).toMatchObject({ evaluable: 76, perArm: 85 })
  })
  test('the normal quantile and the textbook sample sizes', () => {
    expect(qnorm(0.975)).toBeCloseTo(1.959964, 5)
    expect(qnorm(0.9)).toBeCloseTo(1.281552, 5)
    // Two means, delta = sd/2, 80% power, two-sided 0.05: 63 per group (2 × 7.849 × 4 = 62.8).
    expect(twoMeans(1, 2, { alpha: 0.05, sided: 2, power: 0.8, dropoutPct: 0 }).evaluable).toBe(63)
    expect(twoProportions(0.5, 0.7, { alpha: 0.05, sided: 2, power: 0.8, dropoutPct: 0 }).evaluable).toBe(93)
  })
  test('there are 40 rules with unique IDs, and the template is complete', () => {
    expect(RULES).toHaveLength(40)
    expect(new Set(RULES.map((r) => r.id)).size).toBe(40)
    for (const n of ['1.1.2', '1.3', '3.1', '4.2.1', '4.5', '5.4.2', '6.7', '7.3', '8.4', '9.2', '10.4', '10.11', '11.12', '12.3', '14']) expect(TOC.some((s) => s.num === n)).toBe(true)
    expect(CODELISTS.blind.values.find((v) => v.decode === 'Double Blind')!.code).toBe('C15228')
    expect(CODELISTS.phase.values.find((v) => v.decode === 'Phase 3')!.code).toBe('C15602')
  })
})

describe('rules', () => {
  test('VASCLEAR-2 planted: exactly the 20 planted inconsistencies are found', () => {
    const got = findings(plantedVasclear()).map((f) => f.id).sort()
    expect(got).toEqual(PLANTS.flatMap((p) => p.ids).sort())
    // Each plant on its own raises exactly its own findings.
    for (const pl of PLANTS) { const d = EXAMPLES['HLV-204-201'].data(); pl.apply(d); expect(findings(d).map((f) => f.id).sort()).toEqual([...pl.ids].sort()) }
  })
  test('a blank protocol reports what is missing', () => {
    const f = findings(emptyData())
    expect(f.some((x) => x.id === 'PB-C01:Full Title')).toBe(true)
    expect(f.some((x) => x.id === 'PB-C02:Trial Blind Schema')).toBe(true)
    expect(f.some((x) => x.rule === 'PB-C04')).toBe(true)
  })
  test('schedule and estimand rules', () => {
    const d = EXAMPLES['HRP-301'].data()
    d.procedures.find((p) => p.id === 'P09')!.visits = ['W4', 'W16']          // no baseline IGA-CHE
    d.estimands[0].summary = 'Hazard ratio'
    d.visits.find((v) => v.id === 'W16')!.day = 120                         // end of treatment off the period
    const ids = findings(d).map((f) => f.id)
    expect(ids).toContain('PB-A01:END1-P09-baseline')
    expect(ids).toContain('PB-E03:EST1')
    expect(ids).toContain('PB-I03:W16')
    expect(ids).toContain('PB-P02:IN03-P09')
  })
})

describe('USDM v4', () => {
  test.each(ids)('%s round-trips through USDM', (id) => {
    const d = EXAMPLES[id].data(), u = usdmOf(d)
    const back = protocolFromUsdm(JSON.parse(JSON.stringify(u)), emptyData())
    expect(findings(back)).toEqual([])
    expect(back.visits.map((v) => [v.id, v.day, v.lo, v.hi])).toEqual(d.visits.map((v) => [v.id, v.day, v.lo, v.hi]))
    expect(back.procedures.map((p) => [p.id, p.visits])).toEqual(d.procedures.map((p) => [p.id, p.visits]))
    expect(back.estimands).toEqual(d.estimands)
    expect(back.narrative).toEqual(Object.fromEntries(Object.entries(d.narrative).filter(([, v]) => v.trim())))
  })
  test('structure: main timeline, codes and timings', () => {
    const u = usdmOf(EXAMPLES['HRP-301'].data()), s = u.study.versions[0].studyDesigns[0]
    expect(u.usdmVersion).toBe('4.0.0')
    expect(s.studyPhase.standardCode).toMatchObject({ code: 'C15602', decode: 'Phase III Trial', codeSystemVersion: '2026-03-27' })
    expect(s.blindingSchema!.standardCode).toMatchObject({ code: 'C15228', decode: 'Double Blind Study' })
    expect(s.arms.map((a) => a.type.code)).toEqual(['C174266', 'C174266', 'C174268'])
    const scr = s.scheduleTimelines[0].timings.find((t) => t.id === 'Timing_SCR')!
    expect(scr).toMatchObject({ value: 'P14D', windowLower: 'P14D', windowUpper: 'P13D' })
    expect(scr.type).toMatchObject({ code: 'C201357', decode: 'Before' })
    expect(s.epochs.map((e) => e.type.code)).toEqual(['C202487', 'C101526', 'C202578'])
    expect(s.encounters[0].contactModes[0].code).toBe('C175574')
    // Every code is CDISC CT 2026-03-27 (or ISO 639-1 for the language): no teaching terms.
    const codes: any[] = []; const walk = (x: any) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x.instanceType === 'Code') codes.push(x); Object.values(x).forEach(walk) } }; walk(u)
    expect(codes.filter((c) => !(c.codeSystem === 'http://www.cdisc.org' && c.codeSystemVersion === '2026-03-27' && /^C\d+$/.test(c.code)) && c.codeSystem !== 'ISO 639-1')).toEqual([])
    // Procedures link CDISC biomedical concepts, or a surrogate where the library has none.
    const act = (pid: string) => s.activities.find((a) => a.id === `Activity_${pid}`)!
    expect(act('P05').bcCategoryIds).toEqual(['BCC_P05']); expect(act('P09').bcSurrogateIds).toEqual(['BCS_P09'])
    expect(u.study.versions[0].bcCategories.find((c) => c.id === 'BCC_P05')!.memberIds).toContain('BC_SYSTOLIC_BLOOD_PRESSURE')
    expect(s.estimands[0]).toMatchObject({ variableOfInterestId: 'Endpoint_END1', analysisPopulationId: 'AnalysisPopulation_ITT' })
  })
  test('the checks catch broken references and missing strategies', () => {
    const u = usdmOf(EXAMPLES['HRP-301'].data()) as any
    u.study.versions[0].studyDesigns[0].estimands[0].variableOfInterestId = 'Endpoint_X'
    u.study.versions[0].studyDesigns[0].estimands[1].intercurrentEvents[0].strategy = ''
    const ids = checkUsdm(u).map((i) => i.id)
    expect(ids).toContain('PB-USDM-05'); expect(ids).toContain('PB-USDM-10'); expect(ids).toContain('PB-USDM-11')
  })
  test('a blank or library protocol exports without errors in the coding', () => {
    expect(() => usdmOf(emptyData())).not.toThrow()
    const d = EXAMPLES['HRP-301'].data(); d.interventions[0].route = 'Intravenous'; d.interventions[0].frequency = 'twice daily'
    const a = usdmOf(d).study.versions[0].studyInterventions[0].administrations[0]
    expect([a.route!.standardCode.decode, a.frequency!.standardCode.decode]).toEqual(['Intravenous Route of Administration', 'Twice Daily'])
  })
  test('the teaching subset is cut from the full export', () => {
    const u = usdmOf(EXAMPLES['HRP-301'].data()), t = teachingSubset(u)
    expect(t.study.versions[0].studyDesigns[0].encounters).toEqual(u.study.versions[0].studyDesigns[0].encounters)
    expect(Object.keys(t.study.versions[0].studyDesigns[0])).not.toContain('estimands')
  })
  test('fixtures for the EDC Study Build Lab', () => {
    mkdirSync('tests/fixtures', { recursive: true })
    for (const id of ids) {
      const u = usdmOf(EXAMPLES[id].data())
      writeFileSync(`tests/fixtures/${id}-usdm.json`, JSON.stringify(u, null, 2))
      writeFileSync(`tests/fixtures/${id}-usdm-teaching-subset.json`, JSON.stringify(teachingSubset(u), null, 2))
    }
  })
})

describe('projects and hand-off', () => {
  test('project file round trip', () => {
    const p = exampleProject('HRP-301'), back = readProjectFile(projectFile(p))
    expect(back).toEqual(p)
    expect(() => readProjectFile('{"format":"x"}')).toThrow(/not a Protocol Builder project/)
  })
  test('USDM import makes a project', () => {
    const p = usdmProject(JSON.stringify(usdmOf(EXAMPLES['HLV-204-201'].data())), 'x')
    expect(current(p).title['Sponsor Protocol Identifier']).toBe('HLV-204-201')
    expect(findings(current(p))).toEqual([])
  })
  test('the lifecycle start has work to do, and the finished protocol hands off', () => {
    const p = lifecycleProject(), h0 = handoff(p)
    mkdirSync('tests/fixtures', { recursive: true })
    writeFileSync('tests/fixtures/hrp301-protocol-handoff-start.json', JSON.stringify(h0, null, 2))
    writeFileSync('tests/fixtures/hrp301-protocol-handoff-example.json', JSON.stringify(handoff(exampleProject('HRP-301')), null, 2))
    expect(h0.protocol.id).toBe('HRP-301'); expect(h0.consistency.high).toBeGreaterThan(0)
    const ids = findings(current(p)).map((f) => f.id)
    expect(ids).toEqual(expect.arrayContaining(['PB-S01:n', 'PB-E02:EST1-EST1-IE1', 'PB-E03:EST1-none', 'PB-A01:END2-P10-W16', 'PB-T03:mult', 'PB-C04:4.2.1', 'PB-C04:10.4', 'PB-C06:10.10']))
    p.versions[0].data = EXAMPLES['HRP-301'].data()
    const h = handoff(p)
    expect(h.consistency).toMatchObject({ high: 0, medium: 0 }); expect(h.usdm.errors).toBe(0)
    expect(h.format).toBe('protocol-builder-handoff'); expect(h.protocol.source).toBe('lifecycle')
    mkdirSync('tests/fixtures', { recursive: true }); writeFileSync('tests/fixtures/hrp301-protocol-handoff.json', JSON.stringify(h, null, 2))
  })
  test('print layout', () => {
    const html = protocolHtml(EXAMPLES['HRP-301'].data())
    expect(html).toContain('10.11 Sample Size Determination'); expect(html).toContain('VERDANT-1'); expect(html).toContain('IN04')
  })
  test('learner and class IDs on every project', () => {
    const p = blankProject()
    expect(p.userId).toMatch(/^L-/); expect(p).toHaveProperty('classId')
  })
})

describe('missions', () => {
  test('M1: all answers right is 100, none is 0', () => {
    const p = startMission('M1')
    expect(grade(p).score).toBe(0)
    p.mission!.answers = Object.fromEntries(M1_QUESTIONS.map((q) => [q.id, q.answer]))
    expect(submit(p)).toMatchObject({ score: 100 }); expect(p.mission!.level).toBe('expert')
  })
  test('every mission start scores below its pass mark', () => {
    for (const m of MISSIONS) { const p = startMission(m.id); expect(grade(p).score, m.id).toBeLessThan(m.pass) }
  })
  test('M2 and M3 with the reference protocol score 100', () => {
    for (const id of ['M2', 'M3']) { const p = startMission(id); p.versions[0].data = nfrData(); expect(grade(p).score, id).toBe(100) }
  })
  test('M5: fixing every plant scores 100; a new inconsistency costs 5', () => {
    const p = startMission('M5')
    expect(grade(p).score).toBe(0)
    p.versions[0].data = EXAMPLES['HLV-204-201'].data()
    expect(grade(p).score).toBe(100)
    p.versions[0].data.design['Number of Arms'] = '2'
    p.versions[0].data.facts.ageMax = 70
    expect(grade(p).score).toBeLessThan(100)
  })
  test('M4: a complete HRP-201 protocol passes', () => {
    const p = startMission('M4'), d = EXAMPLES['HRP-301'].data()
    d.title['Sponsor Protocol Identifier'] = 'HRP-201'; d.title['Trial Phase'] = 'Phase 2'; d.title['Full Title'] = d.title['Full Title'].replace('phase 3', 'phase 2')
    p.versions[0].data = d
    expect(grade(p).score).toBe(100)
  })
})

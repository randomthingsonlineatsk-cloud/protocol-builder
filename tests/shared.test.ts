// The consent module is shared with the Plain Language Lab: both copies must be identical, and the
// worked-example study facts that the Lab uses are written from this app's examples.
import { test, expect } from 'vitest'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { exampleProject, projectFile } from '../src/domain/project'
import { approve, startAmendment, diff, draftChanges, last } from '../src/domain/amend'
import type { Project } from '../src/domain/types'
import { studyFacts } from '../src/domain/icf'

const LAB = '../plain-language-lab'
test('the shared consent module matches the Plain Language Lab copy', () => {
  if (!existsSync(`${LAB}/src/shared/consent.ts`)) return
  expect(readFileSync('src/shared/consent.ts', 'utf8')).toBe(readFileSync(`${LAB}/src/shared/consent.ts`, 'utf8'))
})
for (const f of ['laysummary']) test(`the shared ${f} module matches the Plain Language Lab copy`, () => {
  if (!existsSync(`${LAB}/src/shared/${f}.ts`)) return
  expect(readFileSync(`src/shared/${f}.ts`, 'utf8')).toBe(readFileSync(`${LAB}/src/shared/${f}.ts`, 'utf8'))
})
test('the shared jargon dictionary matches the Plain Language Lab copy', () => {
  if (!existsSync(`${LAB}/src/shared/jargon.ts`)) return
  expect(readFileSync('src/shared/jargon.ts', 'utf8')).toBe(readFileSync(`${LAB}/src/shared/jargon.ts`, 'utf8'))
})
test('write the worked-example study facts for the Plain Language Lab', () => {
  const out = Object.fromEntries(['HRP-301', 'GLV-12-301'].map((id) => [id, studyFacts(exampleProject(id))]))
  expect(out['HRP-301'].knownReactions.length).toBeGreaterThan(0)
  if (existsSync(`${LAB}/src/domain`)) writeFileSync(`${LAB}/src/domain/studies.json`, JSON.stringify(out, null, 2) + '\n')
})

test('write the worked-example protocols for the CSR & Narrative Studio', () => {
  const STUDIO = '../csr-narrative-studio/src/data'
  if (!existsSync(STUDIO)) return
  for (const id of ['HRP-301', 'GLV-12-301']) {
    const p = exampleProject(id)
    amend(p, id)
    p.updatedUtc = p.createdUtc = '2026-01-15T09:00:00.000Z'; p.id = `P-${id.toLowerCase()}`
    const f = JSON.parse(projectFile(p)); f.exportedUtc = '2026-01-15T09:00:00.000Z'
    writeFileSync(`${STUDIO}/protocol-${id.toLowerCase()}.json`, JSON.stringify(f) + '\n')
  }
})

// One amendment for each worked study, made with this app's own amendment workflow, so the CSR
// (section 9.8, changes in the conduct of the study) has a version history to report.
function amend(p: Project, id: string) {
  const v1 = last(p); approve(p, v1.data.title['Version Date'])
  startAmendment(p)
  const v = last(p), d = v.data, a = v.amendment!
  if (id === 'GLV-12-301') {
    d.criteria = d.criteria.map((c) => (c.code === 'EX01' ? { ...c, text: 'eGFR below 30 mL/min/1.73 m2' } : c))
    Object.assign(a, { primaryReason: 'C207600', secondaryReasons: ['C207604'], enrolledPct: 40, summary: 'Exclusion criterion EX01 lowered from an eGFR below 45 to below 30 mL/min/1.73 m2, in line with current metformin prescribing information, which allows metformin down to an eGFR of 30; sites reported screening failures of otherwise eligible participants.', safetyRights: 'No: participants with an eGFR of 30 to 44 can take metformin under its prescribing information; renal function is monitored at every visit.', dataImpact: 'No: the primary endpoint and its analysis are unchanged; participants enrolled under each version are identifiable.' })
    a.changes = draftChanges(diff(v1.data, d)).map((c) => ({ ...c, rationale: 'Align eligibility with current metformin prescribing information (eGFR down to 30).' }))
    approve(p, '2026-03-02'); v.date = '2026-03-02'
  } else {
    d.narrative['7.1'] = `${d.narrative['7.1'] ?? ''}\n\nLiver stopping rule (amendment 1): study drug is stopped permanently if ALT or AST rises above 5 × ULN, or above 3 × ULN with total bilirubin above 2 × ULN or with symptoms of hepatitis. ALT or AST above 3 × ULN is repeated within 72 hours and then weekly until below 2 × ULN.`.trim()
    Object.assign(a, { primaryReason: 'C207609', secondaryReasons: [], enrolledPct: 85, summary: 'A hepatic stopping rule and closer liver test monitoring were added after a participant had ALT above 5 × ULN (reported as an adverse event of special interest).', safetyRights: 'Yes: the change protects participants from continued exposure after a liver test rise.', dataImpact: 'No: efficacy assessments are unchanged; liver tests are added.' })
    a.changes = draftChanges(diff(v1.data, d)).map((c) => ({ ...c, rationale: 'New safety information: a liver test rise above 5 × ULN in the study.' }))
    approve(p, '2026-08-10'); v.date = '2026-08-10'
  }
}

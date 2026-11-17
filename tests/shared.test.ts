// The consent module is shared with the Plain Language Lab: both copies must be identical, and the
// worked-example study facts that the Lab uses are written from this app's examples.
import { test, expect } from 'vitest'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { exampleProject } from '../src/domain/project'
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

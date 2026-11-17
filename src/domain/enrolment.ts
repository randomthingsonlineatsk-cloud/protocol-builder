// The enrolment plan: how many participants of each sex, age group and country the trial aims to
// enrol, set against who has the condition, so that the results apply to the people who will use
// the medicine. EU CTR Annex I paragraph 17(y) asks the protocol to justify the sex and age
// allocation and any group excluded or under-represented; ICH E7 asks for meaningful numbers of
// older patients when the disease is common in old age; ICH E17 for planning regional enrolment in
// multi-regional trials. In the US, the Food and Drug Omnibus Reform Act of 2022 requires
// diversity action plans for phase 3 and other pivotal studies once FDA finalises its guidance;
// the June 2024 draft had not been finalised as of mid-2026, so the plan is not yet required there.
import type { ProtocolData, Project } from './types'
import { textOf } from './crosswalk'

export interface EnrolRow { group: string; share: number; target: number; note?: string }
export interface Enrolment { sex: EnrolRow[]; age: EnrolRow[]; country: EnrolRow[]; flags: { id: string; text: string; fix: string }[]; settings: { femalePct: number; olderPct: number; oldestPct: number } }

const countries = (d: ProtocolData) => (d.design['Site Geographic Scope'] ?? '').split(/,| and /).map((x) => x.trim().replace(/^the /i, '')).filter(Boolean)
export function enrolDefaults(d: ProtocolData) {
  return { femalePct: 50, olderPct: d.facts.ageMax >= 65 ? 25 : 0, oldestPct: d.facts.ageMax >= 75 ? 8 : 0 }
}
export function enrolment(d: ProtocolData, p?: Project): Enrolment {
  const def = enrolDefaults(d), o = p?.enrolment ?? {}
  const settings = { femalePct: o.femalePct ?? def.femalePct, olderPct: o.olderPct ?? def.olderPct, oldestPct: o.oldestPct ?? def.oldestPct }
  const N = d.facts.participants, n = (pct: number) => Math.round((N * pct) / 100)
  const sex = [{ group: 'Women', share: settings.femalePct, target: n(settings.femalePct) }, { group: 'Men', share: 100 - settings.femalePct, target: N - n(settings.femalePct) }]
  const amin = d.facts.ageMin, amax = d.facts.ageMax
  const age: EnrolRow[] = [{ group: `${amin} to 64 years`, share: 100 - settings.olderPct, target: N - n(settings.olderPct) }]
  if (amax >= 65) age.push({ group: `65 years and over${amax < 120 ? ` (to ${amax})` : ''}`, share: settings.olderPct, target: n(settings.olderPct), note: settings.oldestPct ? `of whom about ${n(settings.oldestPct)} aged 75 or over` : undefined })
  const cs = countries(d), w = (o.countryPct ?? {}) as Record<string, number>
  const even = cs.length ? 100 / cs.length : 0, tot = cs.reduce((s, c) => s + (w[c] ?? even), 0) || 1
  const country = cs.map((c) => { const share = Math.round(((w[c] ?? even) * 100) / tot); return { group: c, share, target: Math.round((N * (w[c] ?? even)) / tot) } })
  const flags: Enrolment['flags'] = []
  if (!/\b(sex|gender|women|female|men|older|elderly|age)\b/i.test(textOf(d, '5.1'))) flags.push({ id: '17y', text: 'Section 5.1 does not justify the sex and age of the population (EU CTR Annex I 17(y)).', fix: 'Say in 5.1 how the planned sex and age split compares with the people who have the condition, and why any group is excluded or limited.' })
  if (settings.olderPct >= 20 && amax < 75) flags.push({ id: 'e7', text: `About ${settings.olderPct}% of patients are 65 or older, but the upper age limit is ${amax}.`, fix: 'Raise or remove the upper age limit unless there is a safety reason (ICH E7: include meaningful numbers of older patients, including those over 75, when the disease is common in old age).' })
  if (amax >= 65 && n(settings.olderPct) < Math.min(100, Math.round(N * 0.1)) && settings.olderPct >= 20) flags.push({ id: 'e7n', text: `Only ${n(settings.olderPct)} participants aged 65 or over are planned.`, fix: 'Plan enough older participants to describe safety in them; for a disease common in old age, ICH E7 suggests at least 100 older patients in the safety database for the programme.' })
  if (cs.length >= 2 && !/region|countr/i.test(textOf(d, '10', '5.1'))) flags.push({ id: 'e17', text: `The trial runs in ${cs.length} countries but sections 5.1 and 10 do not mention regions.`, fix: 'Plan regional enrolment and say whether results will be examined by region (ICH E17).' })
  if (d.criteria.some((c) => c.category === 'Exclusion' && /\b(women|female)\b/i.test(c.text) && !/pregnan|breast/i.test(c.text))) flags.push({ id: 'women', text: 'An exclusion criterion excludes women beyond pregnancy or breastfeeding.', fix: 'Exclude only for a stated safety reason; contraception requirements are usually enough.' })
  return { sex, age, country, flags, settings }
}

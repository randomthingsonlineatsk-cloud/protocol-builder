// Feasibility estimate: the eligibility criteria run against a synthetic population of patients
// with the condition, to estimate the screening funnel (how many are lost to each criterion,
// before and at screening) and how long recruitment would take with the planned sites. The pass
// rate of each criterion is an assumption the writer can change (in practice it comes from
// health-record queries, registries or site surveys); the app gives a starting value from the
// kind of criterion. The patients are simulated with a fixed seed, so results repeat.
import type { ProtocolData, Project, Criterion } from './types'

const TESTED = new Set(['LB', 'VS', 'EG', 'QS', 'PE', 'PREG', 'RS', 'FA'])
/** A criterion is checked at the screening visit (a screen failure) when it needs a test; otherwise from records before consent (pre-screening). */
export const atScreening = (d: ProtocolData, c: Criterion) => c.procedureIds.some((id) => TESTED.has(d.procedures.find((p) => p.id === id)?.form ?? ''))

function ageShare(text: string): number | null {
  const m = /(\d+)\s*(?:to|-|–)\s*(\d+)\s*years/i.exec(text) ?? /aged?\s*(\d+)\D+(\d+)/i.exec(text)
  if (!m) return null
  // Adults with a chronic condition: roughly even from 18 to 85, so the share is the width of the band.
  const lo = Math.max(18, Number(m[1])), hi = Math.min(85, Number(m[2]))
  return Math.max(0.05, Math.min(1, (hi - lo + 1) / 68))
}
/** A starting pass rate for a criterion, from the kind of criterion it is. */
export function defaultRate(c: Criterion): number {
  const t = c.text
  const age = ageShare(t); if (age !== null && /age/i.test(t)) return Math.round(age * 100) / 100
  const R: [RegExp, number][] = c.category === 'Inclusion'
    ? [[/inadequate|failed|did not respond|refractory|despite/i, 0.45], [/IGA|severity|moderate to severe|score|HbA1c|blood pressure|FEV1|mmHg/i, 0.4], [/stable|on .* for at least/i, 0.7], [/contracept|childbearing/i, 0.95], [/at least \d+ (months|years)|diagnos/i, 0.8], [/consent|willing|able to/i, 0.9]]
    : [[/pregnan|breast/i, 0.97], [/hepatitis|HBsAg|HCV|HIV|tuberculosis/i, 0.94], [/malignan|cancer/i, 0.95], [/ALT|AST|bilirubin|liver/i, 0.95], [/eGFR|renal|kidney/i, 0.94], [/other (study|trial)|investigational/i, 0.97], [/topical|systemic|biologic|prior|previous|within \d+ (weeks|days)/i, 0.85], [/infection/i, 0.95], [/CYP|inhibitor|interact/i, 0.93], [/cardiac|myocard|QT|heart/i, 0.95]]
  for (const [re, r] of R) if (re.test(t)) return r
  return c.category === 'Inclusion' ? 0.85 : 0.95
}

export const FEAS_DEFAULTS = { poolPerSiteMonth: 12, consentPct: 50, rampMonths: 6, seed: 7 }
export type FeasKey = keyof typeof FEAS_DEFAULTS
export const feasSetting = (p: Project | undefined, k: FeasKey) => p?.feasibility?.[k] ?? FEAS_DEFAULTS[k]
export const rateFor = (p: Project | undefined, c: Criterion) => p?.feasibility?.rates?.[c.code] ?? defaultRate(c)

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

export interface FunnelStep { code: string; text: string; stage: 'Pre-screening' | 'Screening'; rate: number; lost: number; left: number }
export interface Feasibility { simulated: number; steps: FunnelStep[]; prescreened: number; consented: number; randomised: number; yieldPct: number; screenFailPct: number; perSiteMonth: number; months: number | null; sites: number; target: number; worst: FunnelStep | null; curve: { month: number; total: number }[] }

export function feasibility(d: ProtocolData, p?: Project, N = 10000): Feasibility {
  const r = rng(feasSetting(p, 'seed')), crit = d.criteria
  const pre = crit.filter((c) => !atScreening(d, c)), scr = crit.filter((c) => atScreening(d, c))
  const lost: Record<string, number> = {}
  let prescreened = 0, consented = 0, randomised = 0
  const consent = feasSetting(p, 'consentPct') / 100
  for (let i = 0; i < N; i++) {
    // Each criterion is drawn independently for the patient; the first one failed is where they are lost.
    const fails = (cs: Criterion[]) => cs.find((c) => r() >= rateFor(p, c))
    const f1 = fails(pre); if (f1) { lost[f1.code] = (lost[f1.code] ?? 0) + 1; continue }
    prescreened++
    if (r() >= consent) continue
    consented++
    const f2 = fails(scr); if (f2) { lost[f2.code] = (lost[f2.code] ?? 0) + 1; continue }
    randomised++
  }
  let left = N
  const steps: FunnelStep[] = [...pre, ...scr].map((c) => { const l = lost[c.code] ?? 0; left -= l; if (c === scr[0]) left -= prescreened - consented; return { code: c.code, text: c.text, stage: pre.includes(c) ? 'Pre-screening' : 'Screening', rate: rateFor(p, c), lost: l, left } })
  const yieldPct = (100 * randomised) / N
  const sites = Number(/(\d+)/.exec(d.design['Site Distribution'] ?? '')?.[1] ?? 1) || 1
  const perSiteMonth = (feasSetting(p, 'poolPerSiteMonth') * randomised) / N
  const ramp = Math.max(1, feasSetting(p, 'rampMonths')), target = d.facts.participants
  const curve: { month: number; total: number }[] = []
  let total = 0, months: number | null = null
  for (let m = 1; m <= 120 && months === null; m++) {
    const active = Math.min(sites, (sites * m) / ramp)
    total += active * perSiteMonth; curve.push({ month: m, total: Math.round(total) })
    if (total >= target) months = m
  }
  const worst = steps.reduce<FunnelStep | null>((w, s) => (!w || s.lost > w.lost ? s : w), null)
  return { simulated: N, steps, prescreened, consented, randomised, yieldPct: Math.round(yieldPct * 10) / 10, screenFailPct: consented ? Math.round((100 * (consented - randomised)) / consented) : 0, perSiteMonth: Math.round(perSiteMonth * 100) / 100, months, sites, target, worst, curve }
}

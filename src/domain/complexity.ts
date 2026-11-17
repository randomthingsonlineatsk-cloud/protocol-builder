// Protocol complexity and burden. Industry analyses show protocols growing heavier: since 2005,
// procedures up 139%, endpoints up 214% and data points up 600% (IQVIA, January 2026). Each
// avoidable amendment costs up to $535,000 and about three months (Tufts CSDD, 2023), and
// dropout is higher where site burden is high (22% against 19%). This score is a teaching
// measure built from the protocol's own structure, not a validated index: it counts what drives
// complexity (procedures, endpoints, data points, visits, criteria, time and blood) and flags the
// patterns that commonly lead to avoidable amendments.
import type { ProtocolData } from './types'
import { burden } from './missions'

export interface Factor { id: string; label: string; value: number; unit: string; points: number; max: number; note: string }
export interface RiskFlag { id: string; text: string; fix: string }
export interface VisitLoad { id: string; name: string; type: string; procedures: number; minutes: number; bloodMl: number }
export interface Complexity { score: number; band: 'Low' | 'Moderate' | 'High'; factors: Factor[]; flags: RiskFlag[]; risk: 'Low' | 'Medium' | 'High'; visits: VisitLoad[]; nonCorePct: number; dataPoints: number }


/** Data items per participant: each procedure at each visit counts its biomedical concepts (or 1). Continuous collection counts once per visit. */
export function dataPoints(d: ProtocolData): number {
  let n = 0
  for (const p of d.procedures) n += (p.visits === 'continuous' ? d.visits.length : p.visits.length) * Math.max(1, p.bcs?.length ?? 1)
  return n
}

/** Procedures (by visit slot) that serve neither a primary or secondary endpoint, nor safety, eligibility or trial conduct. */
export function nonCore(d: ProtocolData): { ids: string[]; pct: number } {
  const core = new Set(d.endpoints.filter((e) => e.level !== 'Exploratory').flatMap((e) => e.procedureIds))
  const crit = new Set(d.criteria.flatMap((c) => c.procedureIds))
  let all = 0, non = 0; const ids: string[] = []
  for (const p of d.procedures) {
    if (p.visits === 'continuous') continue
    all += p.visits.length
    if (!core.has(p.id) && !crit.has(p.id) && !p.purpose.some((x) => x === 'safety' || x === 'eligibility' || x === 'conduct')) { non += p.visits.length; ids.push(p.id) }
  }
  return { ids, pct: all ? Math.round((100 * non) / all) : 0 }
}

export function visitLoad(d: ProtocolData): VisitLoad[] {
  return [...d.visits].sort((a, b) => a.day - b.day).map((v) => {
    const ps = d.procedures.filter((p) => p.visits !== 'continuous' && p.visits.includes(v.id))
    return { id: v.id, name: v.name, type: v.type, procedures: ps.length, minutes: ps.reduce((n, p) => n + (p.minutes ?? 5), 0), bloodMl: ps.reduce((n, p) => n + (p.bloodMl ?? 0), 0) }
  })
}

export function complexity(d: ProtocolData): Complexity {
  const b = burden(d), dp = dataPoints(d), nc = nonCore(d), vl = visitLoad(d)
  const onSite = d.visits.filter((v) => v.type === 'On site').length
  const hours = Math.round((b.minutes / 60) * 10) / 10
  // Each driver earns points in proportion to its value, up to a cap where it scores its maximum.
  const F = (id: string, label: string, value: number, unit: string, cap: number, max: number, note: string): Factor => ({ id, label, value, unit, points: Math.round(10 * max * Math.min(1, value / cap)) / 10, max, note })
  const factors: Factor[] = [
    F('proc', 'Distinct procedures', d.procedures.length, '', 30, 20, 'Each procedure is a form, a training need and a source of queries.'),
    F('end', 'Endpoints (all levels)', d.endpoints.length, '', 15, 20, 'Every endpoint needs data, cleaning and analysis; exploratory ones add burden without changing the decision.'),
    F('dp', 'Data points per participant', dp, '', 600, 20, 'Each procedure at each visit times its data items.'),
    F('vis', 'On-site visits', onSite, '', 20, 12, 'Travel to the site is the largest burden for most participants.'),
    F('crit', 'Eligibility criteria', d.criteria.length, '', 40, 12, 'Many or narrow criteria slow recruitment and are the commonest reason for avoidable amendments.'),
    F('time', 'Time on site per participant', hours, 'h', 20, 8, 'The sum of procedure times over all visits.'),
    F('blood', 'Blood drawn per participant', b.blood, 'mL', 500, 8, 'Check against the ethics committee’s and local limits.'),
  ]
  const score = Math.round(factors.reduce((n, f) => n + f.points, 0))
  const flags: RiskFlag[] = []
  if (d.criteria.length > 25) flags.push({ id: 'crit', text: `${d.criteria.length} eligibility criteria: restrictive eligibility is the commonest reason for avoidable amendments.`, fix: 'Keep only the criteria that protect participants or the primary estimand; move the rest to the investigator’s judgement.' })
  if (nc.pct > 15) flags.push({ id: 'noncore', text: `${nc.pct}% of procedure slots serve no primary or secondary endpoint, safety, eligibility or conduct need (${nc.ids.join(', ')}).`, fix: 'Remove them, or collect exploratory measures at fewer visits.' })
  const heavy = vl.filter((v) => v.minutes > 120)
  if (heavy.length) flags.push({ id: 'long', text: `${heavy.map((v) => `${v.name} (${v.minutes} min)`).join(', ')} take more than two hours on site.`, fix: 'Move questionnaires before the visit, split procedures, or make some visits remote.' })
  const narrow = d.visits.filter((v) => v.epoch !== 'Screening' && v.day > 1 && v.hi - v.lo < 2)
  if (narrow.length >= 2) flags.push({ id: 'win', text: `${narrow.length} visits have windows under two days (${narrow.map((v) => v.name).join(', ')}).`, fix: 'Widen the windows where the endpoint allows; tight windows cause protocol deviations.' })
  const expl = d.endpoints.filter((e) => e.level === 'Exploratory').length, ps = d.endpoints.length - expl
  if (expl > ps) flags.push({ id: 'expl', text: `${expl} exploratory endpoints against ${ps} primary and secondary.`, fix: 'Keep the exploratory endpoints that would change a decision.' })
  const empty = vl.filter((v) => v.type === 'On site' && v.procedures > 0 && d.procedures.filter((p) => p.visits !== 'continuous' && p.visits.includes(v.id)).every((p) => !d.endpoints.some((e) => e.procedureIds.includes(p.id) && e.level !== 'Exploratory') && !p.purpose.includes('conduct')) && !/screen|day 1|end|follow/i.test(v.name))
  if (empty.length) flags.push({ id: 'visit', text: `${empty.map((v) => v.name).join(', ')} collect no endpoint and dispense nothing, yet are on site.`, fix: 'Remove the visit, or make it a telephone or remote visit.' })
  if (b.blood > 400) flags.push({ id: 'blood', text: `${b.blood} mL of blood per participant.`, fix: 'Check against local limits; combine samples or reduce the frequency.' })
  return { score, band: score < 35 ? 'Low' : score <= 55 ? 'Moderate' : 'High', factors, flags, risk: flags.length >= 3 ? 'High' : flags.length ? 'Medium' : 'Low', visits: vl, nonCorePct: nc.pct, dataPoints: dp }
}

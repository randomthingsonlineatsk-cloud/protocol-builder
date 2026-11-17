// A per-visit site budget grid drafted from the schedule of activities: each procedure at each
// visit at a unit rate, visit fees, overhead, screen failures and participant travel. The rates
// are illustrative teaching values in US dollars, not market rates; the writer or the budget
// team replaces them. The grid is what a site contract budget is negotiated from.
import type { ProtocolData, Project } from './types'

export const DEFAULT_RATES: Record<string, number> = { IC: 150, DM: 30, IE: 50, MH: 60, VS: 40, LB: 45, PREG: 25, QS: 45, EX: 40, EG: 90, AE: 35, CM: 25, DS: 30, PE: 60 }
export const DEFAULTS = { visitFee: 120, remoteFee: 60, overheadPct: 25, screenFailPct: 30, travel: 50, startUp: 5000, closeOut: 2000 }
export type BudgetKey = keyof typeof DEFAULTS
export interface BudgetRow { id: string; name: string; rate: number; cells: number[]; total: number }
export interface Budget { visits: { id: string; name: string; type: string }[]; rows: BudgetRow[]; visitTotals: number[]; perParticipant: number; withOverhead: number; screenFail: number; perSite: number; sites: number; perSiteParticipants: number; settings: typeof DEFAULTS }

export const rateOf = (p: Project | undefined, procId: string, form: string) => p?.docs?.budget?.[`rate.${procId}`] ?? DEFAULT_RATES[form] ?? 40
export const settingOf = (p: Project | undefined, k: BudgetKey) => p?.docs?.budget?.[k] ?? DEFAULTS[k]

export function siteBudget(d: ProtocolData, p?: Project): Budget {
  const vs = [...d.visits].sort((a, b) => a.day - b.day)
  const settings = Object.fromEntries((Object.keys(DEFAULTS) as BudgetKey[]).map((k) => [k, settingOf(p, k)])) as typeof DEFAULTS
  const rows: BudgetRow[] = d.procedures.map((q) => {
    const rate = rateOf(p, q.id, q.form)
    const cells = vs.map((v) => (q.visits === 'continuous' ? (vs.indexOf(v) >= vs.findIndex((x) => x.id === (q.from ?? 'D1')) ? rate : 0) : q.visits.includes(v.id) ? rate : 0))
    return { id: q.id, name: q.name, rate, cells, total: cells.reduce((n, x) => n + x, 0) }
  })
  rows.push({ id: 'FEE', name: 'Visit fee (investigator and coordinator time)', rate: settings.visitFee, cells: vs.map((v) => (v.type === 'On site' ? settings.visitFee : settings.remoteFee)), total: 0 })
  rows.push({ id: 'TRAVEL', name: 'Participant travel reimbursement', rate: settings.travel, cells: vs.map((v) => (v.type === 'On site' ? settings.travel : 0)), total: 0 })
  for (const r of rows.slice(-2)) r.total = r.cells.reduce((n, x) => n + x, 0)
  const visitTotals = vs.map((_, i) => rows.reduce((n, r) => n + r.cells[i], 0))
  const perParticipant = visitTotals.reduce((n, x) => n + x, 0)
  const withOverhead = Math.round(perParticipant * (1 + settings.overheadPct / 100))
  const scr = vs.findIndex((v) => v.epoch === 'Screening' || /screen/i.test(v.name))
  const screenFail = Math.round((scr >= 0 ? visitTotals[scr] : 0) * (1 + settings.overheadPct / 100))
  const sites = Number(/(\d+)/.exec(d.design['Site Distribution'] ?? '')?.[1] ?? 1) || 1
  const perSiteParticipants = Math.max(1, Math.round(d.facts.participants / sites))
  const fails = Math.round((perSiteParticipants * settings.screenFailPct) / (100 - settings.screenFailPct))
  const perSite = settings.startUp + settings.closeOut + perSiteParticipants * withOverhead + fails * screenFail
  return { visits: vs.map((v) => ({ id: v.id, name: v.name, type: v.type })), rows, visitTotals, perParticipant, withOverhead, screenFail, perSite, sites, perSiteParticipants, settings }
}
export const budgetCsv = (b: Budget) => [['Procedure', 'Rate', ...b.visits.map((v) => v.id), 'Total'], ...b.rows.map((r) => [r.name, r.rate, ...r.cells, r.total]), ['Visit total', '', ...b.visitTotals, b.perParticipant]].map((r) => r.map((x) => (typeof x === 'string' && /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',')).join('\n')

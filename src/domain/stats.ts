// Sample size for the common two-group comparisons, by the normal approximation, as written in
// most protocols' section 10.11. Every formula is shown in the app so it can be checked by hand.

// Inverse of the standard normal distribution (Acklam's rational approximation, error < 1.2e-9
// after one refinement step is not needed at the precision protocols use).
export function qnorm(p: number): number {
  if (p <= 0 || p >= 1) throw new Error('p must be between 0 and 1')
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const lo = 0.02425, hi = 1 - lo
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  if (p > hi) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  const q = p - 0.5, r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

export interface SizeInput { alpha: number; sided: 1 | 2; power: number; dropoutPct: number }
export interface SizeResult { evaluable: number; perArm: number; formula: string; working: string }

const za = (i: SizeInput) => qnorm(1 - i.alpha / i.sided)
const r2 = (x: number) => Math.round(x * 1000) / 1000
const withDropout = (n: number, pct: number) => Math.ceil(n / (1 - pct / 100) - 1e-9)

// Two proportions, superiority: n per group = [z_a √(2 p̄ q̄) + z_b √(p0 q0 + p1 q1)]² / (p1 − p0)².
export function twoProportions(p0: number, p1: number, i: SizeInput): SizeResult {
  const a = za(i), b = qnorm(i.power), pb = (p0 + p1) / 2
  const n = (a * Math.sqrt(2 * pb * (1 - pb)) + b * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (p1 - p0) ** 2
  const evaluable = Math.ceil(n - 1e-9)
  return { evaluable, perArm: withDropout(evaluable, i.dropoutPct), formula: 'n = [z(1−α/s)·√(2·p̄·(1−p̄)) + z(1−β)·√(p0(1−p0) + p1(1−p1))]² / (p1 − p0)²',
    working: `z(1−α/s) = ${r2(a)}, z(1−β) = ${r2(b)}, p̄ = ${r2(pb)}; n = ${r2(n)} → ${evaluable} evaluable per group; ÷ (1 − ${i.dropoutPct}%) → ${withDropout(evaluable, i.dropoutPct)} per group` }
}
// Two means, superiority: n per group = 2 (z_a + z_b)² σ² / δ².
export function twoMeans(delta: number, sd: number, i: SizeInput): SizeResult {
  const a = za(i), b = qnorm(i.power)
  const n = (2 * (a + b) ** 2 * sd ** 2) / delta ** 2
  const evaluable = Math.ceil(n - 1e-9)
  return { evaluable, perArm: withDropout(evaluable, i.dropoutPct), formula: 'n = 2·(z(1−α/s) + z(1−β))²·σ² / δ²',
    working: `z(1−α/s) = ${r2(a)}, z(1−β) = ${r2(b)}; n = ${r2(n)} → ${evaluable} evaluable per group; ÷ (1 − ${i.dropoutPct}%) → ${withDropout(evaluable, i.dropoutPct)} per group` }
}

import type { KeyFacts, Assumption, MultiplicityPlan, InterimPlan } from './types'

// ---------- more designs ----------
const fin = (n: number, i: SizeInput, formula: string, work: string, per = 1): SizeResult => {
  const evaluable = Math.ceil(n - 1e-9)
  return { evaluable, perArm: withDropout(evaluable, i.dropoutPct), formula, working: `${work} → ${evaluable} evaluable${per === 1 ? ' per group' : ''}; ÷ (1 − ${i.dropoutPct}%) → ${withDropout(evaluable, i.dropoutPct)}${per === 1 ? ' per group' : ''}` }
}
// Non-inferiority, two proportions with the same true rate p: n per group = (z_a + z_b)² · 2p(1−p) / M².
export function niProportions(p: number, margin: number, i: SizeInput) {
  const a = za(i), b = qnorm(i.power), n = (a + b) ** 2 * 2 * p * (1 - p) / margin ** 2
  return fin(n, i, 'n = (z(1−α/s) + z(1−β))²·2p(1−p) / M²  (true difference 0, margin M)', `z(1−α/s) = ${r2(a)}, z(1−β) = ${r2(b)}; n = ${r2(n)}`)
}
// Non-inferiority, two means: n per group = 2 (z_a + z_b)² σ² / M².
export function niMeans(sd: number, margin: number, i: SizeInput) {
  const a = za(i), b = qnorm(i.power), n = 2 * (a + b) ** 2 * sd ** 2 / margin ** 2
  return fin(n, i, 'n = 2·(z(1−α/s) + z(1−β))²·σ² / M²  (true difference 0, margin M)', `z(1−α/s) = ${r2(a)}, z(1−β) = ${r2(b)}; n = ${r2(n)}`)
}
// Time to event, 1:1 (Schoenfeld): events D = 4 (z_a + z_b)² / (ln HR)²; participants = D / P(event); per group = half.
export function timeToEvent(hr: number, eventProb: number, i: SizeInput) {
  const a = za(i), b = qnorm(i.power), events = Math.ceil(4 * (a + b) ** 2 / Math.log(hr) ** 2 - 1e-9), total = events / eventProb
  const r = fin(total / 2, i, 'D = 4·(z(1−α/s) + z(1−β))² / (ln HR)²; N = D / P(event); n = N / 2', `z(1−α/s) = ${r2(a)}, z(1−β) = ${r2(b)}, ln HR = ${r2(Math.log(hr))}; D = ${events} events; N = ${r2(total)}; n = ${r2(total / 2)}`)
  return { ...r, events }
}
// Crossover (2×2, AB/BA): total N = 2 (z_a + z_b)² σw² / δ²; n per sequence = N / 2.
export function crossover(delta: number, sdWithin: number, i: SizeInput) {
  const a = za(i), b = qnorm(i.power), N = 2 * (a + b) ** 2 * sdWithin ** 2 / delta ** 2
  return fin(N / 2, i, 'N = 2·(z(1−α/s) + z(1−β))²·σw² / δ²; n per sequence = N / 2', `z(1−α/s) = ${r2(a)}, z(1−β) = ${r2(b)}, σw = ${sdWithin}; N = ${r2(N)}`)
}
// Single arm, exact binomial (one-sided): the smallest n with a critical count k such that
// P(X ≥ k | p0) ≤ α and P(X ≥ k | p1) ≥ power.
const lchoose = (n: number, k: number) => lgam(n + 1) - lgam(k + 1) - lgam(n - k + 1)
function lgam(x: number): number { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const q of c) s += q / ++y; return -t + Math.log(2.5066282746310005 * s / x) }
export const upperTail = (n: number, k: number, p: number) => { let s = 0; for (let j = k; j <= n; j++) s += Math.exp(lchoose(n, j) + j * Math.log(p) + (n - j) * Math.log(1 - p)); return s }
export function singleArm(p0: number, p1: number, i: SizeInput) {
  const alpha = i.alpha / (i.sided === 2 ? 2 : 1)
  for (let n = 5; n <= 2000; n++) {
    let k = 0; while (k <= n && upperTail(n, k, p0) > alpha) k++
    if (k <= n && upperTail(n, k, p1) >= i.power) {
      const r = fin(n, i, 'Smallest n with a critical count k: P(X ≥ k | p0) ≤ α and P(X ≥ k | p1) ≥ 1 − β (exact binomial)', `n = ${n}, k = ${k}: P(X ≥ ${k} | ${p0}) = ${r2(upperTail(n, k, p0))}, P(X ≥ ${k} | ${p1}) = ${r2(upperTail(n, k, p1))}`, 0)
      return { ...r, critical: k }
    }
  }
  throw new Error('No sample size up to 2,000 reaches the power.')
}

export const SIZE_KINDS: { kind: Assumption['kind']; label: string; fields: (keyof Assumption)[] }[] = [
  { kind: 'proportions', label: 'Two proportions, superiority', fields: ['p0', 'p1'] },
  { kind: 'means', label: 'Two means, superiority', fields: ['delta', 'sd'] },
  { kind: 'ni-proportions', label: 'Two proportions, non-inferiority', fields: ['p0', 'margin'] },
  { kind: 'ni-means', label: 'Two means, non-inferiority', fields: ['sd', 'margin'] },
  { kind: 'tte', label: 'Time to event, 1:1 (Schoenfeld)', fields: ['hr', 'eventProb'] },
  { kind: 'crossover', label: 'Crossover 2×2, means', fields: ['delta', 'sd'] },
  { kind: 'single', label: 'Single arm, exact binomial', fields: ['p0', 'p1'] },
]
export const FIELD_LABEL: Partial<Record<keyof Assumption, string>> = { p0: 'Control (or null) proportion p0', p1: 'Expected proportion p1', delta: 'Difference δ', sd: 'Standard deviation σ (within-participant for crossover)', margin: 'Non-inferiority margin M', hr: 'Hazard ratio', eventProb: 'Probability of an event during the trial' }

export function sizeFromFacts(f: KeyFacts): SizeResult & { events?: number; critical?: number } {
  const i = { alpha: f.alpha, sided: f.sided, power: f.power, dropoutPct: f.dropoutPct }, a = f.assumption
  const need = (...k: (keyof Assumption)[]) => { for (const x of k) if (!Number.isFinite(a[x] as number) || (a[x] as number) <= 0) throw new Error(`Give ${FIELD_LABEL[x]}.`) }
  switch (a.kind) {
    case 'proportions': need('p0', 'p1'); return twoProportions(a.p0!, a.p1!, i)
    case 'means': need('delta', 'sd'); return twoMeans(a.delta!, a.sd!, i)
    case 'ni-proportions': need('p0', 'margin'); return niProportions(a.p0!, a.margin!, i)
    case 'ni-means': need('sd', 'margin'); return niMeans(a.sd!, a.margin!, i)
    case 'tte': need('hr', 'eventProb'); return timeToEvent(a.hr!, a.eventProb!, i)
    case 'crossover': need('delta', 'sd'); return crossover(a.delta!, a.sd!, i)
    case 'single': need('p0', 'p1'); return singleArm(a.p0!, a.p1!, i)
  }
}

// ---------- multiplicity: the graphical approach (Bretz et al. 2009) ----------
// Weights w (summing to at most 1) and a transition matrix G (rows summing to at most 1, zero
// diagonal). Bonferroni, Holm and the fixed sequence are special cases; Hochberg is a step-up test.
export function planProblems(m: MultiplicityPlan): string[] {
  const out: string[] = [], n = m.hypotheses.length
  const ws = m.hypotheses.reduce((s, h) => s + h.weight, 0)
  if (n && ws > 1 + 1e-6) out.push(`The initial weights add up to ${r2(ws)}; they must not exceed 1.`)
  if (m.hypotheses.some((h) => h.weight < 0)) out.push('A weight is negative.')
  if (m.method === 'graphical') m.transitions.forEach((row, i) => {
    if (row[i]) out.push(`${m.hypotheses[i]?.label}: a hypothesis cannot pass its weight to itself.`)
    const s = row.reduce((x, y) => x + y, 0); if (s > 1 + 1e-6) out.push(`${m.hypotheses[i]?.label}: its outgoing transitions add up to ${r2(s)} (at most 1).`)
    if (row.some((g) => g < 0)) out.push(`${m.hypotheses[i]?.label}: a transition is negative.`)
  })
  return out
}
export function presetPlan(method: MultiplicityPlan['method'], labels: string[]): MultiplicityPlan {
  const n = labels.length
  const w = method === 'fixed-sequence' ? labels.map((_, i) => (i === 0 ? 1 : 0)) : labels.map(() => 1 / n)
  const g = labels.map((_, i) => labels.map((__, j) => (i === j ? 0 : method === 'fixed-sequence' ? (j === i + 1 ? 1 : 0) : method === 'holm' || method === 'graphical' ? (n > 1 ? 1 / (n - 1) : 0) : 0)))
  return { method, hypotheses: labels.map((l, i) => ({ id: `H${i + 1}`, label: l, weight: w[i] })), transitions: g }
}
// Which hypotheses are rejected at level alpha for these p-values.
export function testPlan(m: MultiplicityPlan, p: number[], alpha: number): { rejected: boolean[]; steps: string[] } {
  const n = m.hypotheses.length, rejected = Array(n).fill(false), steps: string[] = []
  if (m.method === 'hochberg') {
    const order = [...p.keys()].sort((a, b) => p[b] - p[a])
    for (const [r, j] of order.entries()) { const lvl = alpha / (r + 1); if (p[j] <= lvl) { for (const k of order.slice(r)) rejected[k] = true; steps.push(`p(${m.hypotheses[j].label}) = ${p[j]} ≤ α/${r + 1} = ${r2(lvl)}: reject it and every hypothesis with a smaller p-value.`); break } else steps.push(`p(${m.hypotheses[j].label}) = ${p[j]} > α/${r + 1} = ${r2(lvl)}.`) }
    return { rejected, steps }
  }
  if (m.method === 'none') { p.forEach((x, j) => { rejected[j] = x <= alpha }); return { rejected, steps: ['No adjustment: each hypothesis at the full α (the familywise error rate is not controlled).'] } }
  const w = m.hypotheses.map((h) => h.weight), g = m.transitions.map((r) => [...r]), active = new Set([...Array(n).keys()])
  if (m.method === 'bonferroni') { p.forEach((x, j) => { rejected[j] = x <= w[j] * alpha }); return { rejected, steps: m.hypotheses.map((h, j) => `${h.label}: p = ${p[j]} against ${r2(w[j] * alpha)}.`) } }
  for (;;) {
    const j = [...active].find((k) => p[k] <= w[k] * alpha + 1e-12)
    if (j === undefined) break
    rejected[j] = true; active.delete(j); steps.push(`Reject ${m.hypotheses[j].label}: p = ${p[j]} ≤ ${r2(w[j] * alpha)}; its weight passes on.`)
    for (const l of active) w[l] += w[j] * g[j][l]
    const ng = g.map((r) => [...r])
    for (const l of active) for (const k of active) ng[l][k] = l === k ? 0 : (g[l][k] + g[l][j] * g[j][k]) / (1 - g[l][j] * g[j][l] || 1)
    for (let a = 0; a < n; a++) g[a] = ng[a]
    w[j] = 0
  }
  if (active.size) steps.push(`Not rejected: ${[...active].map((k) => m.hypotheses[k].label).join(', ')}.`)
  return { rejected, steps }
}

// ---------- interim analyses: Lan-DeMets alpha spending, two-sided symmetric boundaries ----------
export const pnorm = (z: number) => 0.5 * erfc(-z / Math.SQRT2)
function erfc(x: number) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r }
export function spend(kind: InterimPlan['spending'], t: number, alpha: number) {
  const a = alpha / 2 // one side of a two-sided test
  const one = kind === 'obrien-fleming' ? 2 - 2 * pnorm(qnorm(1 - a / 2) / Math.sqrt(t)) : a * Math.log(1 + (Math.E - 1) * t)
  return 2 * Math.min(one, a)
}
// Boundaries by recursive numerical integration of the score process (Armitage, McPherson, Rowe).
export function boundaries(fractions: number[], alpha: number, kind: InterimPlan['spending']) {
  const N = 801, out: { t: number; z: number; cumAlpha: number; nominalP: number }[] = []
  let grid: number[] = [], dens: number[] = [], prevT = 0, spent = 0
  for (const t of fractions) {
    const target = spend(kind, t, alpha) - spent, dt = t - prevT, sd = Math.sqrt(dt)
    const exitP = (c: number) => {
      const b = c * Math.sqrt(t)
      if (!grid.length) return 2 * (1 - pnorm(b / sd))
      let s = 0; const h = grid[1] - grid[0]
      for (let i = 0; i < grid.length; i++) { const wgt = (i === 0 || i === grid.length - 1 ? 0.5 : 1) * h; s += wgt * dens[i] * (pnorm((-b - grid[i]) / sd) + 1 - pnorm((b - grid[i]) / sd)) }
      return s
    }
    let lo = 0.5, hi = 8
    for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (exitP(mid) > target) lo = mid; else hi = mid }
    const c = (lo + hi) / 2, b = c * Math.sqrt(t)
    const ng = Array.from({ length: N }, (_, i) => -b + (2 * b * i) / (N - 1)), nd = ng.map((x) => {
      if (!grid.length) return Math.exp(-(x * x) / (2 * dt)) / Math.sqrt(2 * Math.PI * dt)
      let s = 0; const h = grid[1] - grid[0]
      for (let i = 0; i < grid.length; i++) { const wgt = (i === 0 || i === grid.length - 1 ? 0.5 : 1) * h; s += wgt * dens[i] * Math.exp(-((x - grid[i]) ** 2) / (2 * dt)) / Math.sqrt(2 * Math.PI * dt) }
      return s
    })
    spent += exitP(c); grid = ng; dens = nd; prevT = t
    out.push({ t, z: Math.round(c * 1000) / 1000, cumAlpha: Math.round(spent * 1e5) / 1e5, nominalP: Math.round(2 * (1 - pnorm(c)) * 1e5) / 1e5 })
  }
  return out
}

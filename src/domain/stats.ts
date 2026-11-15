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

import type { KeyFacts } from './types'
export function sizeFromFacts(f: KeyFacts): SizeResult {
  const i = { alpha: f.alpha, sided: f.sided, power: f.power, dropoutPct: f.dropoutPct }
  return f.assumption.kind === 'proportions' ? twoProportions(f.assumption.p0, f.assumption.p1, i) : twoMeans(f.assumption.delta, f.assumption.sd, i)
}

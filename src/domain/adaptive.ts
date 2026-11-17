// Adaptive design fields, from the ICH E20 draft guideline (Step 2, June 2025; the work plan of
// July 2026 sets Step 4 for February 2027), so they are labelled as a draft. E20 asks for adaptations
// planned in advance, the type I error controlled, reliable estimation, trial integrity kept
// (who sees interim results), and the design's operating characteristics shown, usually by
// simulation, all documented in the protocol and the statistical analysis plan.
import type { ProtocolData, Finding } from './types'

export const ADAPTATIONS = [
  { id: 'stop', label: 'Early stopping for efficacy or futility' },
  { id: 'ssr', label: 'Sample size re-estimation (blinded or unblinded)' },
  { id: 'arm', label: 'Treatment selection (dropping or adding arms or doses)' },
  { id: 'pop', label: 'Population selection (enrichment)' },
  { id: 'rar', label: 'Response-adaptive randomisation' },
  { id: 'seamless', label: 'Seamless phase 2/3 design' },
]
export interface Adaptive { types: string[]; timing: string; rules: string; typeI: string; estimation: string; simulations: string; integrity: string }
export const blankAdaptive = (): Adaptive => ({ types: [], timing: '', rules: '', typeI: '', estimation: '', simulations: '', integrity: '' })
export const ADAPTIVE_FIELDS: { k: Exclude<keyof Adaptive, 'types'>; label: string; hint: string }[] = [
  { k: 'timing', label: 'When the interim analyses happen', hint: 'Information fractions or event counts, and the data each uses.' },
  { k: 'rules', label: 'Decision rules for each adaptation', hint: 'The criteria (boundaries, thresholds) and whether they are binding.' },
  { k: 'typeI', label: 'How the type I error is controlled', hint: 'The method (for example combination test, alpha spending, closed testing) and the overall level.' },
  { k: 'estimation', label: 'How treatment effects are estimated', hint: 'How bias from the adaptation is handled in estimates and confidence intervals.' },
  { k: 'simulations', label: 'Operating characteristics', hint: 'Power, type I error, expected sample size and the probability of each adaptation, from simulations under realistic scenarios.' },
  { k: 'integrity', label: 'Trial integrity', hint: 'Who sees comparative interim results (an independent committee), the firewall from the sponsor’s study team, and what investigators are told.' },
]
export function adaptiveFindings(d: ProtocolData): Finding[] {
  if (d.design['Adaptive Trial Design Indicator'] !== 'Yes') return []
  const a = d.adaptive ?? blankAdaptive(), out: Finding[] = []
  if (!a.types.length) out.push({ id: 'PB-E20:types', rule: 'PB-E20', severity: 'medium', sections: ['4.2.5'], text: 'The design is adaptive but no adaptation is named.', fix: 'Choose the planned adaptations.' })
  for (const f of ADAPTIVE_FIELDS) if (a[f.k].trim().length < 20) out.push({ id: `PB-E20:${f.k}`, rule: 'PB-E20', severity: 'medium', sections: ['4.2.5', '10.9'], text: `Adaptive design: ${f.label.toLowerCase()} is not described.`, fix: f.hint })
  return out
}
export function adaptiveText(a: Adaptive): string {
  const t = ADAPTATIONS.filter((x) => a.types.includes(x.id)).map((x) => x.label.toLowerCase()).join('; ')
  return [`Planned adaptations: ${t || '(none chosen)'}.`, ...ADAPTIVE_FIELDS.filter((f) => a[f.k].trim()).map((f) => `${f.label}: ${a[f.k].trim()}`)].join('\n\n')
}

// Start a protocol from a design made in the Clinical Trial Simulator. The simulator exports the
// scenario (product, indication, mechanism, what is known) and the learner's phase 2 or phase 3
// choices as a small JSON file; this fills the title page and sections 1 (design), 2, 3, 4, 5.1
// and 10 so the learner writes the rest. Anything the design does not settle is left blank.
import type { ProtocolData, Project } from './types'
import { emptyData } from './examples'
import { newProject } from './project'

export const SIM_DESIGN_KIND = 'clinical-trial-simulator/design'
export interface SimDesign {
  kind: typeof SIM_DESIGN_KIND; schema: number; phase: 'p2' | 'p3'
  scenario: { code: string; drug: string; modality: string; indication: string; area: string; moa: string; preclinical: string; known: string; unknown: string; soc: string; socExists: boolean; surrogate: string }
  choices: Record<string, string>; labels: Record<string, string>
}

export function readSimDesign(text: string): SimDesign {
  let j: SimDesign
  try { j = JSON.parse(text) } catch { throw new Error('The file is not JSON.') }
  if (j?.kind !== SIM_DESIGN_KIND || !j.scenario || !j.choices) throw new Error('This is not a design file from the Clinical Trial Simulator. Export one from its final report: “Design for the Protocol Builder”.')
  if ((j.schema ?? 1) > 1) throw new Error('This design file was made by a newer version of the Clinical Trial Simulator.')
  return j
}

export function designData(s: SimDesign): ProtocolData {
  const d = emptyData(), sc = s.scenario, c = s.choices, p3 = s.phase === 'p3'
  const phase = p3 ? 'Phase 3' : 'Phase 2', id = `${sc.code}-${p3 ? '301' : '201'}`
  const comparator = c.p2_comparator ?? 'placebo', single = comparator === 'single_arm' && !p3
  const blind = c.p2_blinding === 'open_unblinded' || c.p2_blinding === 'open_label' ? 'Open Label' : 'Double Blind'
  const active = comparator === 'active' || c.p3_design === 'non_inferiority'
  const control = single ? 'No Control' : active ? 'Active Comparator' : 'Placebo'
  const ratio = c.p2_ratio === '2_1' ? [2, 1] : c.p2_ratio === '3_1' ? [3, 1] : [1, 1]
  const compName = active ? (sc.soc || 'Active comparator') : 'Placebo'
  const addon = comparator === 'placebo_addon'
  const endpoint = (p3 ? s.labels.p3_endpoint : s.labels.p2_endpoint) ?? ''
  const ind = /^[A-Z][a-z]/.test(sc.indication) ? sc.indication[0].toLowerCase() + sc.indication.slice(1) : sc.indication
  const framework = c.p3_design === 'non_inferiority' || c.p3_design === 'ni_placebo' ? 'non-inferiority' : 'superiority'

  d.title = { ...d.title, 'Full Title': (single ? `A single-arm, ${blind.toLowerCase().replace(' ', '-')} ${phase.toLowerCase()} study of ${sc.drug} (${sc.code}) in ${ind}` : `A randomised, ${blind.toLowerCase().replace(' ', '-')}, ${control === 'Placebo' ? 'placebo-controlled' : 'active-controlled'} ${phase.toLowerCase()} study of ${sc.drug} (${sc.code}) in ${ind}`),
    'Sponsor Protocol Identifier': id, 'Original Protocol Indicator': 'Yes', 'Version Number': '0.1', 'Trial Phase': phase, "Sponsor's Investigational Product Code(s)": sc.code, 'Investigational Product Name(s)': sc.drug,
    'Short Title': `${sc.drug} in ${ind}` }
  d.design = { ...d.design, 'Intervention Model': single ? 'Single Group' : 'Parallel Group', 'Population Type': 'With Disease', 'Population Diagnosis or Condition': sc.indication, 'Units of Age': 'Years',
    'Control Type': control, 'Control Description': single ? 'No internal control; results are compared with historical data' : active ? `${compName}, the standard of care` : addon ? 'Matching placebo, added on to standard of care' : 'Matching placebo',
    'Intervention Assignment Method': single ? 'No Intervention Assignment Method' : 'Randomisation', ...(single ? {} : { 'Randomisation Type': `Randomisation ${ratio.join(':')}${c.p2_ratio === '2_1' || c.p2_ratio === '3_1' ? ' in favour of the investigational arm' : ''}.` }),
    'Trial Blind Schema': blind, 'Blinded Roles': blind === 'Double Blind' ? 'Participant, investigator, outcomes assessor, sponsor study team' : c.p2_blinding === 'open_label' ? 'Outcomes assessor (blinded independent central review)' : 'None',
    'Master Protocol Indicator': 'No', 'Drug/Device Combination Product Indicator': 'No', 'Adaptive Trial Design Indicator': !p3 && c.p2_adaptive && !/none/i.test(c.p2_adaptive) ? 'Yes' : 'No', 'Number of Arms': single ? '1' : '2',
    'Independent Committees': p3 || c.p3_interim === 'alpha_spending' ? 'Independent data monitoring committee' : '' }
  d.arms = [{ id: 'ARM1', name: sc.drug, type: 'Investigational', intervention: `${sc.drug} (${sc.modality})`, ratio: ratio[0] }, ...(single ? [] : [{ id: 'ARM2', name: compName, type: active ? 'Active comparator' as const : 'Placebo' as const, intervention: active ? compName : `Matching placebo${addon ? ', added on to standard of care' : ''}`, ratio: ratio[1] }])]
  d.interventions = [{ id: 'INT1', name: sc.drug, role: 'Investigational', dose: '', doseValue: 0, doseUnit: '', route: '', frequency: '', durationWeeks: 0 }, ...(single ? [] : [{ id: 'INT2', name: compName, role: active ? 'Investigational' as const : 'Placebo' as const, dose: '', doseValue: 0, doseUnit: '', route: '', frequency: '', durationWeeks: 0 }])]
  d.objectives = [
    { id: 'OBJ1', level: 'Primary', kind: 'Efficacy', text: `To ${framework === 'superiority' ? `show that ${sc.drug} is better than ${single ? 'historical control' : compName.toLowerCase()}` : `show that ${sc.drug} is not worse than ${compName.toLowerCase()} by more than the margin`} in ${sc.indication}`, endpointIds: ['END1'] },
    { id: 'OBJ2', level: 'Secondary', kind: 'Safety', text: `To assess the safety and tolerability of ${sc.drug}`, endpointIds: ['END2'] },
  ]
  d.endpoints = [
    { id: 'END1', level: 'Primary', text: endpoint, variableType: /surviv|time to|event/i.test(endpoint) ? 'time-to-event' : /rate|proportion|respon|remission/i.test(endpoint) ? 'binary' : 'continuous', procedureIds: [], visitIds: [], purpose: 'Efficacy' },
    { id: 'END2', level: 'Secondary', text: 'Adverse events, laboratory values and vital signs', variableType: 'binary', procedureIds: [], visitIds: [], purpose: 'Safety' },
  ]
  d.estimands = [{ id: 'EST1', objectiveId: 'OBJ1', endpointId: 'END1', population: `Participants with ${sc.indication}`, analysisSetId: '', treatment: single ? sc.drug : `${sc.drug} vs ${compName.toLowerCase()}`, intercurrentEvents: [{ id: 'EST1-IE1', name: 'Permanent discontinuation of trial intervention', strategy: '', description: '' }], summary: '', estimator: '', missing: '', sensitivity: '' }]
  d.facts = { ...d.facts, alpha: 0.05, sided: 2, power: 0.9, dropoutPct: 10 }
  const n = d.narrative
  n['2.1'] = `${sc.drug} (${sc.code}) is a ${sc.modality}. Mechanism: ${sc.moa} Standard of care: ${sc.socExists ? sc.soc : 'none established'}.`
  n['2.2.1'] = `Nonclinical findings: ${sc.preclinical} Known: ${sc.known} Not yet known: ${sc.unknown}`
  n['4.1'] = `This is a ${blind.toLowerCase()}, ${single ? 'single-arm' : `${control.toLowerCase()}-controlled, ${ratio.join(':')} randomised`} ${phase.toLowerCase()} trial of ${sc.drug} in ${sc.indication}${addon ? ', added on to standard of care' : ''}. It tests ${framework}${p3 ? '' : ' to inform the confirmatory trial'}.`
  if (s.labels.p2_comparator) n['4.2.3'] = `Control chosen in the design: ${s.labels.p2_comparator}.`
  if (s.labels.p2_adaptive && n['4.1']) n['4.2.5'] = d.design['Adaptive Trial Design Indicator'] === 'Yes' ? `Adaptive element: ${s.labels.p2_adaptive}.` : ''
  if (s.labels.p3_inclusion) n['5.1'] = `Population chosen in the design: ${s.labels.p3_inclusion}.`
  n['10.1'] = `Tests are two-sided at a significance level of 0.05. The framework is ${framework}.`
  if (s.labels.p3_size || s.labels.p2_size) n['10.11'] = `Sample size approach chosen in the design: ${s.labels.p3_size ?? s.labels.p2_size}. Enter the assumptions in the sample size helper to compute the numbers.`
  if (c.p3_interim === 'alpha_spending') {
    d.interim = { fractions: [0.5, 1], spending: 'obrien-fleming', purpose: 'Efficacy, at half of the information, reviewed by the independent data monitoring committee' }
    d.multiplicity = 'Secondary endpoints are tested in a fixed hierarchy after the primary, at the alpha left by the group-sequential design.'
    n['10.10'] = d.multiplicity
  } else if (s.labels.p3_interim) n['10.10'] = `Approach chosen in the design: ${s.labels.p3_interim}.`
  return structuredClone(d)
}
export const simulatorProject = (text: string): Project => { const s = readSimDesign(text); return newProject(`${s.scenario.drug} ${s.phase === 'p3' ? 'phase 3' : 'phase 2'} protocol (from the Clinical Trial Simulator)`, designData(s), 'simulator', s.phase === 'p3' ? 'Phase 3' : 'Phase 2') }

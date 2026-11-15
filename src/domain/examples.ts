// The worked examples and the library. All fictional.
//
// HRP-301 (VERDANT-1) is the Ostrevia phase 3 trial that the other apps already use: the CDM
// Query & Edit-Check Console locks its database, the SDTM Mapping Trainer maps it and the TLF
// Programming Lab analyses it. Its visits, windows, criteria, assessments (IGA-CHE, HECSI, itch
// NRS), the hepatitis B screening rule and the responder definitions are those apps' own, so a
// protocol written here describes the same trial. HLV-204-201 (VASCLEAR-2) is the hypertension
// trial of the CDM console's Protocol-to-Database Twin and the EDC Study Build Lab.

import type { ProtocolData, Procedure, Visit, Criterion, Arm } from './types'
import { endOfTreatment } from './rules'

// ---------- default narrative, written from the data ----------
// Each required section gets a short text built from the structured data, so an example reads as
// a whole protocol. Overrides replace these where a trial needs its own words.
export function defaultNarrative(d: ProtocolData, product: { name: string; cls: string; indication: string }): Record<string, string> {
  const inv = d.interventions.filter((i) => i.role === 'Investigational'), arms = d.arms.map((a) => a.name).join(', ')
  const eot = endOfTreatment(d), fu = d.visits.filter((v) => v.epoch === 'Follow-up').at(-1)
  const sets = (n: string) => d.analysisSets.find((a) => new RegExp(n, 'i').test(a.name))?.name ?? n
  const prim = d.estimands[0], primEp = d.endpoints.find((e) => e.id === prim?.endpointId)
  return {
    '2.1': `${product.name} is a ${product.cls}. This trial asks whether ${product.name} is more effective than ${d.design['Control Type']?.toLowerCase() ?? 'control'} in ${product.indication}, and how safe it is, over ${d.facts.treatmentWeeks} weeks.`,
    '2.2.1': `Identified and potential risks come from the nonclinical studies and earlier clinical trials summarised in the investigator's brochure. Each is mitigated by the eligibility criteria (section 5), the safety assessments in the schedule of activities (section 8.4) and the discontinuation rules (section 7.1).`,
    '2.2.2': `Participants may benefit from improvement in their ${product.indication}. All participants receive standard care for their condition, and rescue therapy is available.`,
    '2.2.3': 'With the mitigations described, the sponsor considers the expected benefits to justify the risks.',
    '4.1': `This is a ${d.design['Trial Blind Schema']?.toLowerCase() ?? ''}, ${d.design['Intervention Model']?.toLowerCase() ?? ''}, ${d.design['Control Type']?.toLowerCase() ?? ''}-controlled trial with ${d.arms.length} arms (${arms}), allocated ${d.arms.map((a) => a.ratio).join(':')}. It has a screening period of up to ${Math.abs(Math.min(...d.visits.map((v) => v.lo > -9000 ? v.lo : 0)))} days, ${d.facts.treatmentWeeks} weeks of treatment and ${d.facts.followUpWeeks} weeks of follow-up. ${d.facts.participants} participants are randomised.`,
    '4.2.1': prim ? `The primary estimand uses a ${prim.intercurrentEvents.map((i) => `${i.strategy.toLowerCase()} strategy for ${i.name.toLowerCase()}`).join(' and a ')}: the question is whether participants ${primEp ? `achieve the endpoint (${primEp.text.toLowerCase()})` : 'benefit'} under the treatment as it is used, counting those who needed rescue or stopped treatment as not having benefited where the strategy says so.` : '',
    '4.2.2': `A ${d.design['Intervention Model']?.toLowerCase() ?? 'parallel'} design is used because the condition can change over the treatment period and the effect is not expected to wash out quickly, so a cross-over design would not be reliable.`,
    '4.2.3': `${d.design['Control Type'] ?? 'The control'} control is needed to distinguish the effect of the intervention from the natural course of the condition and from expectation. Participants may use rescue therapy, so no one is left without treatment.`,
    '4.2.4': `${d.facts.treatmentWeeks} weeks of treatment is long enough to reach the maximal effect seen in earlier trials; ${d.facts.followUpWeeks} weeks of follow-up covers about five half-lives after the last dose.`,
    '4.3': 'The sponsor may stop the trial, or an arm, on the recommendation of the independent committee, for unacceptable risk, or if new information changes the benefit-risk balance. A site may be closed as described in 11.11.',
    '4.4': `The trial starts when the first participant signs informed consent. A participant has completed the trial at the ${fu?.name ?? 'last'} visit. The end of the trial is the last visit of the last participant.`,
    '4.5': 'Participants who complete the trial may enter the open-label extension study if it is open at their site. Otherwise the investigator arranges standard care.',
    '5.1': `Adults aged ${d.facts.ageMin} to ${d.facts.ageMax} years with ${d.design['Population Diagnosis or Condition']?.toLowerCase() ?? product.indication}. Women and men are included; the age range covers the population that will use the product.`,
    '5.6': 'A participant who does not meet the criteria is a screen failure; the reason is recorded. A participant may be rescreened once, after at least 4 weeks, with a new participant number and new consent.',
    '6.1': inv.map((i) => `${i.name}: ${i.dose}, ${i.route.toLowerCase()}, ${i.frequency}, for ${i.durationWeeks} weeks.`).join(' ') + (d.interventions.some((i) => i.role === 'Placebo') ? ' Placebo tablets match the active tablets in appearance.' : ''),
    '6.2': 'The doses were chosen from the exposure-response analysis of the earlier trial, which showed a plateau of effect at the higher dose and acceptable safety at both.',
    '6.3': 'One tablet is taken by mouth each morning with water, with or without food. A missed dose is skipped if more than 12 hours late.',
    '6.5': 'There is no antidote. In case of overdose the participant is monitored and treated symptomatically; the overdose is recorded as a special safety situation (9.4).',
    '6.6': 'Trial intervention is stored at 20 to 25 °C in a locked area with access limited to authorised staff. The site records every bottle received, dispensed, returned and destroyed (6.6.3 Accountability).',
    '6.7': `Participants are randomised through the interactive response technology system on Day 1. ${d.design['Randomisation Type'] ?? ''} The participant, investigator, assessors and sponsor study team are blinded. The investigator can unblind a participant through the system in an emergency.`,
    '6.8': 'Adherence is checked by counting tablets returned at each visit; less than 80% or more than 120% of expected tablets is a deviation.',
    '6.10': 'Prohibited: systemic immunosuppressants, systemic corticosteroids and phototherapy. Permitted: emollients, and medicines for other conditions at a stable dose. All concomitant therapy is recorded.',
    '7.1': 'The trial intervention is stopped permanently for pregnancy, a serious adverse reaction, or if the investigator judges it in the participant’s interest. Participants who stop the intervention stay in the trial and attend every visit, so their data can be used.',
    '7.2': 'A participant may withdraw at any time. Data collected until withdrawal are kept. The site asks, but cannot require, a final safety visit.',
    '7.3': 'Before a participant is called lost to follow-up, the site makes at least three attempts by telephone and one by letter, and records them.',
    '8.1': 'Procedures follow the schedule of activities (1.3). Participant-reported scales are completed before any other procedure; the same trained assessor scores a participant at each visit where possible.',
    '8.2': 'At screening: consent, demographics, medical history, eligibility, vital signs and laboratory tests. Day 1 assessments before the first dose are the baseline.',
    '8.3': d.endpoints.filter((e) => e.level !== 'Exploratory' && !/adverse|safety/i.test(e.text)).map((e) => e.text).join('. ') + '.',
    '8.4': 'Vital signs (8.4.2), clinical laboratory tests (8.4.4, listed in 12.1) and, for participants of childbearing potential, pregnancy tests (8.4.5) are done at the visits in 1.3.',
    '9.1': 'An adverse event is any untoward medical occurrence in a participant, whether or not related to the trial intervention. A serious adverse event results in death, is life-threatening, requires or prolongs hospitalisation, results in persistent disability, is a congenital anomaly, or is another important medical event.',
    '9.2': `9.2.1 Timing: adverse events are collected from ${d.aeFrom === 'consent' ? 'the signing of informed consent' : 'the first dose'} until the ${d.visits.find((v) => v.id === d.aeTo)?.name ?? d.aeTo} visit. Serious adverse events are reported to the sponsor within 24 hours of the site becoming aware. The sponsor reports suspected unexpected serious adverse reactions to the regulators and ethics committees within the regulatory timelines.`,
    '10.1': `Tests are ${d.facts.sided === 2 ? 'two-sided' : 'one-sided'} at a significance level of ${d.facts.alpha}. The statistical analysis plan, finalised before unblinding, gives the details.`,
    '10.2': d.analysisSets.map((a) => `${a.name}: ${a.text}`).join(' '),
    '10.3': 'Demographics and baseline characteristics are summarised by arm with descriptive statistics.',
    '10.4': prim ? `${primEp?.text ?? 'The primary endpoint'} is analysed in the ${sets('intent|full')}. ${prim.estimator} ${prim.missing} Sensitivity: ${prim.sensitivity}` : '',
    '10.5': d.endpoints.filter((e) => e.level === 'Secondary').map((e) => { const es = d.estimands.find((x) => x.endpointId === e.id); return `${e.text}: ${es ? es.estimator : e.purpose === 'Safety' ? 'summarised descriptively by arm (see 10.7).' : 'analysed with the method of the primary endpoint for its variable type, without multiplicity control.'}` }).join(' '),
    '10.7': `Adverse events are coded with MedDRA and summarised by arm in the ${sets('safety')}. Laboratory values and vital signs are summarised by visit, with shifts from baseline.`,
    '10.10': d.multiplicity,
    '10.11': d.statements['10.11'] ?? '',
    '11.1': 'The trial follows the protocol, ICH E6(R3) good clinical practice, the Declaration of Helsinki and the applicable regulations, including Regulation (EU) No 536/2014, 21 CFR parts 50, 56 and 312, and the New Drugs and Clinical Trials Rules, 2019. Each site starts only after its ethics committee approves.',
    '11.2': 'The investigator conducts the trial at the site and supervises delegated staff. The sponsor monitors the trial and ensures direct access to source records for monitoring, audits and inspections.',
    '11.3': 'The investigator or a delegate explains the trial and gives the participant time to ask questions before consent is signed. Consent is renewed when new information may affect willingness to continue.',
    '11.4': /data monitoring/i.test(d.design['Independent Committees'] ?? '') ? 'An independent data monitoring committee of two clinicians and a statistician reviews unblinded safety data every 6 months, under a charter that accompanies the protocol. It recommends to the sponsor whether to continue, change or stop the trial.' : 'No independent committee is planned: the trial is short, and the sponsor’s safety review team reviews blinded safety data monthly.',
    '11.5': 'The sponsor holds insurance that covers participants for harm caused by taking part, as the law of each country requires.',
    '11.6': 'Critical-to-quality factors are the primary endpoint assessment, eligibility and safety reporting. Centralised monitoring of key risk indicators and targeted on-site review focus on them.',
    '11.7': 'Data are entered in a validated electronic data capture system with an audit trail; laboratory and randomisation data are transferred electronically and reconciled.',
    '11.8': 'Participants are identified by number only. Personal data are processed under the applicable data protection laws; a breach is reported to the sponsor within 24 hours and handled under its procedure.',
    '11.9': 'Source records are the medical records and the worksheets defined in the monitoring plan; data entered directly in the eCRF are identified in advance.',
    '11.10': 'Protocol deviations are recorded in the eCRF and classified as important or not, following the deviation plan.',
    '11.11': 'The sponsor or the investigator may close a site for poor recruitment, poor compliance with the protocol or good clinical practice, or safety reasons.',
    '11.12': 'Results are posted in the public registries within one year of the end of the trial and submitted for publication whatever the outcome.',
    '13': 'AE: adverse event. eCRF: electronic case report form. ICH: International Council for Harmonisation. SAE: serious adverse event.',
    '14': 'ICH E6(R3) Guideline for good clinical practice. ICH E9(R1) Addendum on estimands and sensitivity analysis. ICH M11 Clinical electronic Structured Harmonised Protocol.',
  }
}

// ---------- HRP-301 (VERDANT-1) ----------
const V = (id: string, name: string, day: number, lo: number, hi: number, epoch: string): Visit => ({ id, name, day, lo, hi, epoch, type: 'On site' })
const HRP_VISITS: Visit[] = [
  V('SCR', 'Screening', -14, -28, -1, 'Screening'), V('D1', 'Day 1 (randomisation)', 1, 1, 1, 'Treatment'), V('W2', 'Week 2', 15, 12, 18, 'Treatment'),
  V('W4', 'Week 4', 29, 26, 32, 'Treatment'), V('W8', 'Week 8', 57, 53, 61, 'Treatment'), V('W12', 'Week 12', 85, 81, 89, 'Treatment'),
  V('W16', 'Week 16 (end of treatment)', 113, 109, 117, 'Treatment'), V('FU', 'Week 20 follow-up', 141, 134, 148, 'Follow-up'),
]
const SEV = ['SCR', 'D1', 'W2', 'W4', 'W8', 'W12', 'W16']
const P = (id: string, name: string, section: string, concept: string, form: string, visits: Procedure['visits'], purpose: Procedure['purpose'], more: Partial<Procedure> = {}): Procedure => ({ id, name, section, concept, form, visits, purpose, ...more })
const HRP_PROCS: Procedure[] = [
  P('P01', 'Informed consent', '11.3', 'Informed Consent Obtained', 'IC', ['SCR'], ['conduct'], { minutes: 30 }),
  P('P02', 'Demographics', '8.2', 'Demographics', 'DM', ['SCR'], ['conduct'], { minutes: 5 }),
  P('P03', 'Eligibility criteria', '5.2, 5.3', 'Eligibility Criteria Not Met', 'IE', ['SCR', 'D1'], ['conduct'], { minutes: 10 }),
  P('P04', 'Medical history, including hand eczema history', '8.2', 'Medical History', 'MH', ['SCR'], ['conduct'], { minutes: 15 }),
  P('P05', 'Vital signs (blood pressure, pulse) and weight', '8.4.2', 'Vital Signs (Blood Pressure, Pulse)', 'VS', ['SCR', 'D1', 'W4', 'W8', 'W16'], ['safety'], { minutes: 10 }),
  P('P06', 'Hepatitis B screening (HBsAg, anti-HBc; HBV DNA if anti-HBc positive)', '8.2, 12.1', 'Hepatitis B Screening Panel', 'LB', ['SCR'], ['eligibility'], { bloodMl: 5, minutes: 5 }),
  P('P07', 'Central safety laboratory (haematology, chemistry including ALT and AST)', '8.4.4, 12.1', 'Central Laboratory Sample', 'LB', ['SCR', 'W2', 'W4', 'W8', 'W12', 'W16', 'FU'], ['safety'], { bloodMl: 10, minutes: 5, footnote: 'a: participants positive for anti-HBc with undetectable HBV DNA also have HBV DNA measured at every visit from Week 4.' }),
  P('P08', 'Pregnancy test (participants of childbearing potential)', '8.4.5', 'Pregnancy Test (Choriogonadotropin Beta)', 'PREG', ['SCR', 'D1', 'W4', 'W8', 'W12', 'W16'], ['safety'], { minutes: 5, footnote: 'b: serum at screening, urine at the other visits.' }),
  P('P09', 'IGA-CHE (Investigator Global Assessment, chronic hand eczema)', '8.3', 'Investigator Global Assessment for Chronic Hand Eczema', 'QS', SEV, ['endpoint'], { minutes: 5 }),
  P('P10', 'HECSI (Hand Eczema Severity Index)', '8.3', 'Hand Eczema Severity Index', 'QS', SEV, ['endpoint'], { minutes: 10 }),
  P('P11', 'Worst itch over the last 24 hours (0 to 10 numeric rating scale)', '8.3', 'Itch Numeric Rating Scale', 'QS', SEV, ['endpoint'], { minutes: 2, footnote: 'c: completed by the participant before any other procedure.' }),
  P('P12', 'Dispense trial intervention; tablet count and adherence', '6.6.3, 6.8', 'Study Drug Dispensing and Accountability', 'EX', ['D1', 'W4', 'W8', 'W12', 'W16'], ['conduct'], { minutes: 10, footnote: 'd: dispensing on Day 1 to Week 12; tablets returned are counted at every visit after Day 1, including Week 16.' }),
  P('P13', 'Adverse events', '9.2', 'Adverse Event', 'AE', 'continuous', ['safety'], { from: 'SCR', footnote: 'e: collected from the signing of informed consent until the Week 20 follow-up visit.' }),
  P('P14', 'Concomitant therapy and rescue therapy', '6.9, 6.10', 'Concomitant Medication', 'CM', 'continuous', ['safety', 'conduct'], { from: 'SCR' }),
  P('P15', 'End of trial status', '7.2', 'Disposition', 'DS', ['FU'], ['conduct'], { minutes: 5 }),
]
const C = (code: string, text: string, procedureIds: string[]): Criterion => ({ code, category: code.startsWith('IN') ? 'Inclusion' : 'Exclusion', text, procedureIds })
const HRP_CRITERIA: Criterion[] = [
  C('IN01', 'Aged 18 to 75 years when consent is signed', ['P02']),
  C('IN02', 'Chronic hand eczema for at least 6 months, inadequately controlled with topical corticosteroids', ['P04']),
  C('IN03', 'IGA-CHE 3 (moderate) or 4 (severe) at screening and Day 1', ['P09']),
  C('IN04', 'Participants of childbearing potential agree to use highly effective contraception until 4 weeks after the last dose and have a negative pregnancy test', ['P08']),
  C('EX01', 'HBsAg positive, or anti-HBc positive with HBV DNA detectable', ['P06']),
  C('EX02', 'Systemic immunosuppressant or phototherapy in the 4 weeks before Day 1', ['P14']),
  C('EX03', 'ALT above 2 × ULN at screening', ['P07']),
]

const hrpData = (): ProtocolData => {
  const d: ProtocolData = {
    title: {
      'Full Title': 'VERDANT-1: a randomised, double-blind, placebo-controlled phase 3 study of lumiravostat (Ostrevia) 10 mg and 25 mg once daily for 16 weeks in adults with moderate to severe chronic hand eczema',
      'Trial Acronym': 'VERDANT-1', 'Sponsor Protocol Identifier': 'HRP-301', 'Original Protocol Indicator': 'Yes', 'Version Number': '1.0', 'Version Date': '2026-01-20',
      "Sponsor's Investigational Product Code(s)": 'HRP-4417', 'Investigational Product Name(s)': 'lumiravostat (Ostrevia)', 'Trial Phase': 'Phase 3',
      'Short Title': 'Lumiravostat in moderate to severe chronic hand eczema', 'Sponsor Name and Address': 'Halcyon Ridge Pharmaceuticals (fictional), 1 Harbour Row, Dublin, Ireland',
      'FDA IND Number': '000000 (fictional)', 'EU CT Number': '2026-500000-00-00 (fictional)', 'CTRI Number': 'CTRI/2026/00/000000 (fictional)',
      'Sponsor Approval': '2026-01-20, electronic signature in the sponsor’s document system', 'Sponsor Signatory': 'Medical Director, Dermatology (fictional)',
    },
    design: {
      'Intervention Model': 'Parallel Group', 'Population Type': 'With Disease', 'Population Diagnosis or Condition': 'Moderate to severe chronic hand eczema inadequately controlled with topical corticosteroids',
      'Population Age (Minimum and Maximum)': '18 to 75', 'Units of Age': 'Years', 'Control Type': 'Placebo', 'Control Description': 'Matching placebo tablets once daily',
      'Intervention Assignment Method': 'Randomisation', 'Randomisation Type': 'Stratified block randomisation 1:1:1 by IGA-CHE at baseline (3 or 4) and region, through an interactive response technology system.',
      'Stratification Indicator': 'Yes', 'Site Distribution': 'About 60 sites', 'Site Geographic Scope': 'Canada, Germany, India and the United States',
      'Master Protocol Indicator': 'No', 'Drug/Device Combination Product Indicator': 'No', 'Adaptive Trial Design Indicator': 'No', 'Number of Arms': '3',
      'Trial Blind Schema': 'Double Blind', 'Blinded Roles': 'Participant, investigator, outcomes assessor, sponsor study team',
      'Target/Maximum Number of Participants': '324', 'Number of Participants Randomly Assigned': '324',
      'Total Planned Duration of Trial Intervention': '16 weeks', 'Total Planned Duration of Trial Participation': 'Up to 25 weeks (screening up to 4 weeks, 16 weeks of treatment, follow-up at Week 20)',
      'Independent Committees': 'Independent data monitoring committee',
    },
    facts: { participants: 324, perArm: 108, dropoutPct: 10, treatmentWeeks: 16, followUpWeeks: 4, participationWeeks: 25, ageMin: 18, ageMax: 75, power: 0.9, alpha: 0.05, sided: 2, assumption: { kind: 'proportions', p0: 0.15, p1: 0.35 } },
    arms: [
      { id: 'ARM1', name: 'Lumiravostat 25 mg', type: 'Investigational', intervention: 'Lumiravostat 25 mg orally once daily for 16 weeks', ratio: 1 },
      { id: 'ARM2', name: 'Lumiravostat 10 mg', type: 'Investigational', intervention: 'Lumiravostat 10 mg orally once daily for 16 weeks', ratio: 1 },
      { id: 'ARM3', name: 'Placebo', type: 'Placebo', intervention: 'Matching placebo orally once daily for 16 weeks', ratio: 1 },
    ],
    epochs: [{ id: 'EP_SCR', name: 'Screening', type: 'Screening' }, { id: 'EP_TRT', name: 'Treatment', type: 'Treatment' }, { id: 'EP_FU', name: 'Follow-up', type: 'Follow-up' }],
    interventions: [
      { id: 'INT1', name: 'Lumiravostat 25 mg', role: 'Investigational', dose: '25 mg film-coated tablet', doseValue: 25, doseUnit: 'mg', route: 'Oral', frequency: 'once daily', durationWeeks: 16 },
      { id: 'INT2', name: 'Lumiravostat 10 mg', role: 'Investigational', dose: '10 mg film-coated tablet', doseValue: 10, doseUnit: 'mg', route: 'Oral', frequency: 'once daily', durationWeeks: 16 },
      { id: 'INT3', name: 'Placebo', role: 'Placebo', dose: 'matching placebo tablet', doseValue: 0, doseUnit: 'tablet', route: 'Oral', frequency: 'once daily', durationWeeks: 16 },
      { id: 'INT4', name: 'Topical corticosteroid (rescue)', role: 'Rescue', dose: 'class III topical corticosteroid, thin layer', doseValue: 0, doseUnit: 'application', route: 'Topical', frequency: 'as needed', durationWeeks: 0 },
    ],
    objectives: [
      { id: 'OBJ1', level: 'Primary', kind: 'Efficacy', text: 'To compare the efficacy of lumiravostat 25 mg and 10 mg with placebo in achieving clear or almost clear hands', endpointIds: ['END1'] },
      { id: 'OBJ2', level: 'Secondary', kind: 'Efficacy', text: 'To compare the effect on the extent and severity of hand eczema', endpointIds: ['END2'] },
      { id: 'OBJ3', level: 'Secondary', kind: 'Efficacy', text: 'To compare the effect on itch', endpointIds: ['END3'] },
      { id: 'OBJ4', level: 'Secondary', kind: 'Safety', text: 'To assess the safety and tolerability of lumiravostat', endpointIds: ['END4'] },
    ],
    endpoints: [
      { id: 'END1', level: 'Primary', text: 'IGA-CHE treatment success (0 or 1 with at least a 2-grade improvement from baseline) at Week 16', variableType: 'binary', procedureIds: ['P09'], visitIds: ['W16'], purpose: 'Efficacy' },
      { id: 'END2', level: 'Secondary', text: 'HECSI-75 (at least 75% improvement from baseline in HECSI) at Week 16', variableType: 'binary', procedureIds: ['P10'], visitIds: ['W16'], purpose: 'Efficacy' },
      { id: 'END3', level: 'Secondary', text: 'At least a 4-point improvement from baseline in worst itch at Week 16, in participants with a baseline of 4 or more', variableType: 'binary', procedureIds: ['P11'], visitIds: ['W16'], purpose: 'Efficacy' },
      { id: 'END4', level: 'Secondary', text: 'Treatment-emergent adverse events, laboratory abnormalities and vital signs to Week 20', variableType: 'binary', procedureIds: ['P13', 'P07', 'P05'], visitIds: [], purpose: 'Safety' },
    ],
    estimands: [],
    analysisSets: [
      { id: 'ITT', name: 'Intent-to-treat set', text: 'All randomised participants, analysed as randomised.' },
      { id: 'SAF', name: 'Safety set', text: 'All randomised participants who took at least one dose, analysed as treated.' },
      { id: 'PP', name: 'Per-protocol set', text: 'Intent-to-treat participants without an important deviation affecting the primary endpoint.' },
    ],
    criteria: HRP_CRITERIA, visits: HRP_VISITS, procedures: HRP_PROCS, narrative: {},
    statements: { '10.11': 'A sample size of 324 randomised participants (108 per arm) gives 90% power to detect a difference in IGA-CHE treatment success of 35% against 15% for each dose against placebo (two-sided alpha 0.05; two-proportion normal approximation, 97 evaluable per arm), allowing for 10% of participants without a Week 16 assessment.' },
    multiplicity: 'The familywise type I error rate is controlled at a two-sided 0.05 by a fixed-sequence procedure: IGA-CHE success for 25 mg, then 10 mg; then HECSI-75 for 25 mg, then 10 mg; then itch for 25 mg, then 10 mg. Testing stops at the first non-significant result.',
    rescue: 'A class III topical corticosteroid may be used as rescue therapy for intolerable symptoms after Week 4, at the investigator’s discretion. Use is recorded on the concomitant therapy form.',
    aeFrom: 'consent', aeTo: 'FU',
  }
  const est = (id: string, obj: string, end: string, pop: string, sens: string) => ({
    id, objectiveId: obj, endpointId: end, population: pop, analysisSetId: 'ITT', treatment: 'Lumiravostat 25 mg or 10 mg once daily, each compared with placebo, for 16 weeks',
    intercurrentEvents: [
      { id: `${id}-IE1`, name: 'Use of rescue therapy', strategy: 'Composite variable' as const, description: 'A participant who uses rescue therapy before Week 16 is a non-responder.' },
      { id: `${id}-IE2`, name: 'Permanent discontinuation of trial intervention', strategy: 'Composite variable' as const, description: 'A participant who stops the trial intervention before Week 16 is a non-responder.' },
    ],
    summary: 'Difference in proportions' as const, estimator: 'The difference in response rates between each dose and placebo with a 95% Wald confidence interval; Fisher’s exact test.', missing: 'Participants without a Week 16 assessment are non-responders.', sensitivity: sens,
  })
  d.estimands = [
    est('EST1', 'OBJ1', 'END1', 'Adults aged 18 to 75 with moderate to severe chronic hand eczema inadequately controlled with topical corticosteroids', 'A Cochran-Mantel-Haenszel analysis stratified by baseline IGA-CHE and region; and a hypothetical strategy for discontinuation with multiple imputation.'),
    est('EST2', 'OBJ2', 'END2', 'As the primary estimand', 'As the primary estimand.'),
    est('EST3', 'OBJ3', 'END3', 'Participants of the primary estimand population with a baseline worst itch of 4 or more', 'As the primary estimand.'),
  ]
  d.narrative = {
    ...defaultNarrative(d, { name: 'Lumiravostat', cls: 'reversible inhibitor of the STRK1 kinase (a fictional target), which mediates cytokine signalling in skin inflammation', indication: 'chronic hand eczema' }),
    '2.2.1': 'Identified risks of lumiravostat from the phase 2 trial HRP-201 and the nonclinical programme: upper respiratory tract infections, raised ALT, and a potential risk of hepatitis B virus reactivation (a class effect of kinase inhibitors that modulate immunity). Mitigations: exclusion of HBsAg-positive participants and of those with detectable HBV DNA (EX01); HBV DNA monitoring every 4 weeks in anti-HBc-positive participants; liver tests at every visit (P07); discontinuation for ALT above 5 × ULN (7.1). Embryo-fetal toxicity was seen in animals: contraception and pregnancy tests (5.4, 8.4.5).',
    '5.4': '5.4.1 A participant of childbearing potential is anyone who is not permanently sterile and not postmenopausal (12 months without menses with no other cause). 5.4.2 They use a highly effective method of contraception from screening until 4 weeks after the last dose; pregnancy tests are done as in the schedule.',
    '6.9': `6.9.2 Rescue therapy: ${d.rescue}`,
    '9.3': 'A pregnancy is reported to the sponsor within 24 hours and followed to its outcome. The trial intervention is stopped.',
    '12.1': 'Haematology: haemoglobin, white cells with differential (including neutrophils and lymphocytes), platelets. Chemistry: ALT, AST, alkaline phosphatase, bilirubin, creatinine, potassium. Hepatitis B: HBsAg, anti-HBc and, if anti-HBc positive, HBV DNA. Pregnancy: serum β-hCG at screening, urine at other visits.',
    '13': 'ALT: alanine aminotransferase. anti-HBc: antibody to hepatitis B core antigen. HBsAg: hepatitis B surface antigen. HBV: hepatitis B virus. HECSI: Hand Eczema Severity Index. IGA-CHE: Investigator Global Assessment for chronic hand eczema. ITT: intent-to-treat. NRS: numeric rating scale. ULN: upper limit of normal.',
  }
  return structuredClone(d)
}

// ---------- HLV-204-201 (VASCLEAR-2) ----------
// From the CDM console's twin, with its three inconsistencies corrected: the blood pressure value
// is the mean of the second and third readings throughout, adverse events are collected from
// consent, and the sample size is 132 everywhere.
const HLV_VISITS: Visit[] = [V('SCR', 'Screening', -14, -28, -1, 'Screening'), V('D1', 'Day 1 (randomisation)', 1, 1, 1, 'Treatment'), V('W2', 'Week 2', 15, 12, 18, 'Treatment'), V('W4', 'Week 4', 29, 26, 32, 'Treatment'), V('W8', 'Week 8', 57, 50, 64, 'Treatment'), V('W12', 'Week 12 (end of treatment)', 85, 82, 88, 'Treatment'), V('FU', 'Week 14 follow-up', 99, 96, 102, 'Follow-up')]
const HLV_ALL = HLV_VISITS.map((v) => v.id)
const HLV_PROCS: Procedure[] = [
  P('P01', 'Informed consent', '11.3', 'Informed Consent Obtained', 'IC', ['SCR'], ['conduct']),
  P('P02', 'Demographics', '8.2', 'Demographics', 'DM', ['SCR'], ['conduct']),
  P('P03', 'Eligibility criteria', '5.2, 5.3', 'Eligibility Criteria Not Met', 'IE', ['SCR'], ['conduct']),
  P('P04', 'Medical history', '8.2', 'Medical History', 'MH', ['SCR'], ['conduct']),
  P('P05', 'Seated blood pressure and pulse', '8.3, 8.4.2', 'Vital Signs (Blood Pressure, Pulse)', 'VS', HLV_ALL, ['endpoint', 'safety'], { footnote: 'a: three seated readings 2 minutes apart after 5 minutes’ rest; the mean of the second and third is recorded.' }),
  P('P06', 'Weight', '8.4.2', 'Body Weight', 'VS', ['SCR', 'W12'], ['safety']),
  P('P07', 'Height', '8.2', 'Body Height', 'VS', ['SCR'], ['conduct']),
  P('P08', 'Local safety laboratory (potassium, creatinine, ALT)', '8.4.4, 12.1', 'Local Safety Laboratory Panel', 'LB', ['SCR', 'W4', 'W12'], ['safety']),
  P('P09', 'Central laboratory sample (glucose, sodium, HbA1c)', '8.4.4, 12.1', 'Central Laboratory Sample', 'LB', ['SCR', 'W4', 'W12'], ['safety']),
  P('P10', '12-lead ECG (central reading)', '8.4.3', '12-Lead ECG', 'EG', ['SCR', 'W4', 'W12'], ['safety']),
  P('P11', 'Pregnancy test (participants of childbearing potential)', '8.4.5', 'Pregnancy Test (Choriogonadotropin Beta)', 'PREG', ['SCR', 'D1', 'W12'], ['safety']),
  P('P12', 'Dispense trial intervention; accountability and adherence', '6.6.3, 6.8', 'Study Drug Dispensing and Accountability', 'EX', ['D1', 'W2', 'W4', 'W8', 'W12'], ['conduct']),
  P('P13', 'Adverse events', '9.2', 'Adverse Event', 'AE', 'continuous', ['safety'], { from: 'SCR', footnote: 'b: collected from the signing of informed consent until the Week 14 follow-up visit.' }),
  P('P14', 'Concomitant and rescue therapy', '6.9, 6.10', 'Concomitant Medication', 'CM', 'continuous', ['safety', 'conduct'], { from: 'SCR' }),
  P('P15', 'End of trial status', '7.2', 'Disposition', 'DS', ['FU'], ['conduct']),
]
const hlvData = (): ProtocolData => {
  const d: ProtocolData = {
    title: { 'Full Title': 'A randomised, double-blind, placebo-controlled phase 2 study of Vasclarin (VSC-9) in adults with stage 1 or 2 hypertension', 'Trial Acronym': 'VASCLEAR-2', 'Sponsor Protocol Identifier': 'HLV-204-201', 'Original Protocol Indicator': 'Yes', 'Version Number': '1.0', 'Version Date': '2025-09-01', "Sponsor's Investigational Product Code(s)": 'VSC-9', 'Investigational Product Name(s)': 'Vasclarin', 'Trial Phase': 'Phase 2', 'Sponsor Name and Address': 'Halvern Therapeutics (fictional)', 'Sponsor Approval': '2025-09-01' },
    design: { 'Intervention Model': 'Parallel Group', 'Population Type': 'With Disease', 'Population Diagnosis or Condition': 'Stage 1 or 2 essential hypertension', 'Population Age (Minimum and Maximum)': '18 to 75', 'Units of Age': 'Years', 'Control Type': 'Placebo', 'Control Description': 'Matching placebo tablets once daily', 'Intervention Assignment Method': 'Randomisation', 'Randomisation Type': 'Randomisation 1:1, stratified by site.', 'Stratification Indicator': 'Yes', 'Site Distribution': '6 sites', 'Site Geographic Scope': 'Germany, India and the United States', 'Master Protocol Indicator': 'No', 'Drug/Device Combination Product Indicator': 'No', 'Adaptive Trial Design Indicator': 'No', 'Number of Arms': '2', 'Trial Blind Schema': 'Double Blind', 'Blinded Roles': 'Participant, investigator, outcomes assessor, sponsor study team', 'Target/Maximum Number of Participants': '132', 'Number of Participants Randomly Assigned': '132', 'Total Planned Duration of Trial Intervention': '12 weeks', 'Total Planned Duration of Trial Participation': 'Up to 19 weeks', 'Independent Committees': 'Independent data monitoring committee' },
    facts: { participants: 132, perArm: 66, dropoutPct: 10, treatmentWeeks: 12, followUpWeeks: 2, participationWeeks: 19, ageMin: 18, ageMax: 75, power: 0.9, alpha: 0.05, sided: 2, assumption: { kind: 'means', delta: 6, sd: 10 } },
    arms: [{ id: 'ARM1', name: 'Vasclarin 10 mg', type: 'Investigational', intervention: 'Vasclarin 10 mg orally once daily for 12 weeks', ratio: 1 }, { id: 'ARM2', name: 'Placebo', type: 'Placebo', intervention: 'Matching placebo orally once daily for 12 weeks', ratio: 1 }],
    epochs: [{ id: 'EP_SCR', name: 'Screening', type: 'Screening' }, { id: 'EP_TRT', name: 'Treatment', type: 'Treatment' }, { id: 'EP_FU', name: 'Follow-up', type: 'Follow-up' }],
    interventions: [
      { id: 'INT1', name: 'Vasclarin 10 mg', role: 'Investigational', dose: '10 mg tablet', doseValue: 10, doseUnit: 'mg', route: 'Oral', frequency: 'once daily', durationWeeks: 12 },
      { id: 'INT2', name: 'Placebo', role: 'Placebo', dose: 'matching placebo tablet', doseValue: 0, doseUnit: 'tablet', route: 'Oral', frequency: 'once daily', durationWeeks: 12 },
      { id: 'INT3', name: 'Amlodipine (rescue)', role: 'Rescue', dose: 'amlodipine 5 mg', doseValue: 5, doseUnit: 'mg', route: 'Oral', frequency: 'once daily', durationWeeks: 0 },
    ],
    objectives: [
      { id: 'OBJ1', level: 'Primary', kind: 'Efficacy', text: 'To compare the effect of Vasclarin with placebo on seated systolic blood pressure', endpointIds: ['END1'] },
      { id: 'OBJ2', level: 'Secondary', kind: 'Efficacy', text: 'To compare the effect on seated diastolic blood pressure', endpointIds: ['END2'] },
      { id: 'OBJ3', level: 'Secondary', kind: 'Safety', text: 'To assess safety', endpointIds: ['END3'] },
    ],
    endpoints: [
      { id: 'END1', level: 'Primary', text: 'Change from baseline to Week 12 in mean seated systolic blood pressure', variableType: 'continuous', procedureIds: ['P05'], visitIds: ['W12'], purpose: 'Efficacy' },
      { id: 'END2', level: 'Secondary', text: 'Change from baseline to Week 12 in mean seated diastolic blood pressure', variableType: 'continuous', procedureIds: ['P05'], visitIds: ['W12'], purpose: 'Efficacy' },
      { id: 'END3', level: 'Secondary', text: 'Adverse events; serum potassium and creatinine; QTcF', variableType: 'binary', procedureIds: ['P13', 'P08', 'P10'], visitIds: [], purpose: 'Safety' },
    ],
    estimands: [],
    analysisSets: [{ id: 'FAS', name: 'Full analysis set', text: 'All randomised participants, analysed as randomised.' }, { id: 'SAF', name: 'Safety set', text: 'All randomised participants who took at least one dose, analysed as treated.' }],
    criteria: [C('IN01', 'Aged 18 to 75 years when consent is signed', ['P02']), C('IN02', 'Mean seated systolic blood pressure 140 to 179 mmHg at screening', ['P05']), C('IN03', 'Participants of childbearing potential use highly effective contraception and have a negative pregnancy test', ['P11']), C('EX01', 'Known or suspected secondary hypertension', ['P04']), C('EX02', 'eGFR below 45 mL/min/1.73 m²', ['P08']), C('EX03', 'Serum potassium above 5.5 mmol/L at screening', ['P08']), C('EX04', 'Use of a potassium-sparing diuretic or potassium supplement within 4 weeks before screening', ['P14'])],
    visits: HLV_VISITS, procedures: HLV_PROCS, narrative: {},
    statements: { '10.11': 'A sample size of 132 randomised participants (66 per arm) gives 90% power to detect a difference of 6 mmHg (standard deviation 10 mmHg, two-sided alpha 0.05), allowing for 10% dropout.' },
    multiplicity: 'The secondary endpoint is tested only if the primary is significant (fixed sequence).',
    rescue: 'Amlodipine 5 mg once daily may be added if seated systolic blood pressure is 180 mmHg or more at any visit.', aeFrom: 'consent', aeTo: 'FU',
  }
  const ies = (id: string) => [{ id: `${id}-IE1`, name: 'Use of rescue antihypertensive medication', strategy: 'Treatment policy' as const, description: 'Values after rescue are used as observed.' }, { id: `${id}-IE2`, name: 'Discontinuation of trial intervention', strategy: 'Treatment policy' as const, description: 'Participants stay in the trial; their values are used.' }]
  d.estimands = [
    { id: 'EST1', objectiveId: 'OBJ1', endpointId: 'END1', population: 'Randomised adults with stage 1 or 2 hypertension', analysisSetId: 'FAS', treatment: 'Vasclarin 10 mg once daily vs placebo for 12 weeks', intercurrentEvents: ies('EST1'), summary: 'Difference in means', estimator: 'A mixed model for repeated measures with treatment, visit, treatment by visit and baseline.', missing: 'Missing values are assumed missing at random within the model.', sensitivity: 'Reference-based multiple imputation.' },
    { id: 'EST2', objectiveId: 'OBJ2', endpointId: 'END2', population: 'As the primary estimand', analysisSetId: 'FAS', treatment: 'As the primary estimand', intercurrentEvents: ies('EST2'), summary: 'Difference in means', estimator: 'As the primary estimand.', missing: 'As the primary estimand.', sensitivity: 'None.' },
  ]
  d.narrative = { ...defaultNarrative(d, { name: 'Vasclarin', cls: 'once-daily oral antihypertensive (fictional class)', indication: 'stage 1 or 2 hypertension' }),
    '5.4': '5.4.1 A participant of childbearing potential is anyone who is not permanently sterile and not postmenopausal. 5.4.2 They use a highly effective method of contraception until 2 weeks after the last dose.',
    '6.9': `6.9.2 Rescue therapy: ${d.rescue}`, '9.3': 'A pregnancy is reported within 24 hours and followed to its outcome.',
    '12.1': 'Local: potassium, creatinine (with eGFR), ALT. Central: glucose, sodium, HbA1c. Pregnancy: serum β-hCG at screening, urine at other visits.' }
  return structuredClone(d)
}


// ---------- NFR-118-201: teravelin dose-finding in COPD (missions M2 and M3) ----------
const NFR_VISITS: Visit[] = [V('SCR', 'Screening', -14, -21, -7, 'Screening'), V('D1', 'Day 1 (randomisation)', 1, 1, 1, 'Treatment'), V('W2', 'Week 2', 15, 13, 17, 'Treatment'), V('W4', 'Week 4', 29, 26, 32, 'Treatment'), V('W8', 'Week 8', 57, 53, 61, 'Treatment'), V('W12', 'Week 12 (end of treatment)', 85, 81, 89, 'Treatment'), V('FU', 'Week 14 follow-up', 99, 96, 102, 'Follow-up')]
const NFR_ALLT = ['D1', 'W2', 'W4', 'W8', 'W12']
export const NFR_PROCS: Procedure[] = [
  P('P01', 'Informed consent', '11.3', 'Informed Consent Obtained', 'IC', ['SCR'], ['conduct'], { minutes: 30 }),
  P('P02', 'Demographics and smoking history', '8.2', 'Demographics', 'DM', ['SCR'], ['conduct'], { minutes: 10 }),
  P('P03', 'Eligibility criteria', '5.2, 5.3', 'Eligibility Criteria Not Met', 'IE', ['SCR', 'D1'], ['conduct'], { minutes: 10 }),
  P('P04', 'Medical history, including exacerbation history', '8.2', 'Medical History', 'MH', ['SCR'], ['conduct'], { minutes: 15 }),
  P('P05', 'Spirometry (pre-dose trough FEV1 and FVC)', '8.3', 'Spirometry', 'RE', ['SCR', 'D1', 'W2', 'W4', 'W8', 'W12'], ['endpoint'], { minutes: 30, footnote: 'a: trough FEV1 is measured 23 to 24 hours after the previous dose; post-bronchodilator spirometry at screening only.' }),
  P('P06', 'COPD Assessment Test (CAT)', '8.3', 'COPD Assessment Test', 'QS', ['D1', 'W4', 'W8', 'W12'], ['endpoint'], { minutes: 5 }),
  P('P07', 'Vital signs', '8.4.2', 'Vital Signs (Blood Pressure, Pulse)', 'VS', ['SCR', 'D1', 'W4', 'W12', 'FU'], ['safety'], { minutes: 10 }),
  P('P08', '12-lead ECG', '8.4.3', '12-Lead ECG', 'EG', ['SCR', 'W4', 'W12'], ['safety'], { minutes: 15 }),
  P('P09', 'Safety laboratory', '8.4.4, 12.1', 'Local Safety Laboratory Panel', 'LB', ['SCR', 'W4', 'W12'], ['safety'], { bloodMl: 10, minutes: 5 }),
  P('P10', 'Pregnancy test (participants of childbearing potential)', '8.4.5', 'Pregnancy Test (Choriogonadotropin Beta)', 'PREG', ['SCR', 'D1', 'W12'], ['safety'], { minutes: 5 }),
  P('P11', 'Dispense inhaler; dose counter check', '6.6.3, 6.8', 'Study Drug Dispensing and Accountability', 'EX', ['D1', 'W4', 'W8', 'W12'], ['conduct'], { minutes: 10 }),
  P('P12', 'Adverse events', '9.2', 'Adverse Event', 'AE', 'continuous', ['safety'], { from: 'SCR' }),
  P('P13', 'Concomitant and rescue medication', '6.9, 6.10', 'Concomitant Medication', 'CM', 'continuous', ['safety', 'conduct'], { from: 'SCR' }),
  P('P14', 'End of trial status', '7.2', 'Disposition', 'DS', ['FU'], ['conduct'], { minutes: 5 }),
]
export const nfrData = (): ProtocolData => {
  const d: ProtocolData = {
    title: { 'Full Title': 'A randomised, double-blind, placebo-controlled, dose-finding phase 2 study of inhaled teravelin 50, 100 and 200 µg once daily for 12 weeks in adults with moderate to severe COPD', 'Trial Acronym': 'NORTHFELL-2', 'Sponsor Protocol Identifier': 'NFR-118-201', 'Original Protocol Indicator': 'Yes', 'Version Number': '1.0', 'Version Date': '2026-03-02', "Sponsor's Investigational Product Code(s)": 'TRV-118', 'Investigational Product Name(s)': 'teravelin', 'Trial Phase': 'Phase 2', 'Sponsor Name and Address': 'Northfell Respiratory (fictional), Leeds, United Kingdom', 'Sponsor Approval': '2026-03-02' },
    design: { 'Intervention Model': 'Parallel Group', 'Population Type': 'With Disease', 'Population Diagnosis or Condition': 'Moderate to severe chronic obstructive pulmonary disease', 'Population Age (Minimum and Maximum)': '40 to 80', 'Units of Age': 'Years', 'Control Type': 'Placebo', 'Control Description': 'Matching placebo inhaler once daily', 'Intervention Assignment Method': 'Randomisation', 'Randomisation Type': 'Block randomisation 1:1:1:1 through an interactive response technology system.', 'Stratification Indicator': 'No', 'Site Distribution': 'About 40 sites', 'Site Geographic Scope': 'India, Poland, the United Kingdom and the United States', 'Master Protocol Indicator': 'No', 'Drug/Device Combination Product Indicator': 'Yes', 'Adaptive Trial Design Indicator': 'No', 'Number of Arms': '4', 'Trial Blind Schema': 'Double Blind', 'Blinded Roles': 'Participant, investigator, sponsor study team', 'Target/Maximum Number of Participants': '340', 'Number of Participants Randomly Assigned': '340', 'Total Planned Duration of Trial Intervention': '12 weeks', 'Total Planned Duration of Trial Participation': 'Up to 18 weeks', 'Independent Committees': 'None' },
    facts: { participants: 340, perArm: 85, dropoutPct: 10, treatmentWeeks: 12, followUpWeeks: 2, participationWeeks: 18, ageMin: 40, ageMax: 80, power: 0.8, alpha: 0.05, sided: 2, assumption: { kind: 'means', delta: 0.1, sd: 0.22 } },
    arms: [50, 100, 200].map((n, i): Arm => ({ id: `ARM${i + 1}`, name: `Teravelin ${n} µg`, type: 'Investigational', intervention: `Teravelin ${n} µg inhaled once daily for 12 weeks`, ratio: 1 })).concat([{ id: 'ARM4', name: 'Placebo', type: 'Placebo' as const, intervention: 'Matching placebo inhaled once daily for 12 weeks', ratio: 1 }]),
    epochs: [{ id: 'EP_SCR', name: 'Screening', type: 'Screening' }, { id: 'EP_TRT', name: 'Treatment', type: 'Treatment' }, { id: 'EP_FU', name: 'Follow-up', type: 'Follow-up' }],
    interventions: [...[50, 100, 200].map((n, i) => ({ id: `INT${i + 1}`, name: `Teravelin ${n} µg`, role: 'Investigational' as const, dose: `${n} µg per inhalation`, doseValue: n, doseUnit: 'µg', route: 'Inhalation', frequency: 'once daily', durationWeeks: 12 })),
      { id: 'INT4', name: 'Placebo', role: 'Placebo' as const, dose: 'matching placebo inhalation', doseValue: 0, doseUnit: 'inhalation', route: 'Inhalation', frequency: 'once daily', durationWeeks: 12 },
      { id: 'INT5', name: 'Salbutamol (rescue)', role: 'Rescue' as const, dose: '100 µg per puff', doseValue: 100, doseUnit: 'µg', route: 'Inhalation', frequency: 'as needed', durationWeeks: 0 }],
    objectives: [
      { id: 'OBJ1', level: 'Primary', kind: 'Efficacy', text: 'To characterise the dose-response of teravelin on lung function', endpointIds: ['END1'] },
      { id: 'OBJ2', level: 'Secondary', kind: 'Efficacy', text: 'To compare the effect on health status', endpointIds: ['END2'] },
      { id: 'OBJ3', level: 'Secondary', kind: 'Safety', text: 'To assess safety and tolerability', endpointIds: ['END3'] },
    ],
    endpoints: [
      { id: 'END1', level: 'Primary', text: 'Change from baseline in trough FEV1 at Week 12', variableType: 'continuous', procedureIds: ['P05'], visitIds: ['W12'], purpose: 'Efficacy' },
      { id: 'END2', level: 'Secondary', text: 'Change from baseline in CAT total score at Week 12', variableType: 'continuous', procedureIds: ['P06'], visitIds: ['W12'], purpose: 'Efficacy' },
      { id: 'END3', level: 'Secondary', text: 'Adverse events, ECG and laboratory findings to Week 14', variableType: 'binary', procedureIds: ['P12', 'P08', 'P09'], visitIds: [], purpose: 'Safety' },
    ],
    estimands: [],
    analysisSets: [{ id: 'FAS', name: 'Full analysis set', text: 'All randomised participants, analysed as randomised.' }, { id: 'SAF', name: 'Safety set', text: 'All randomised participants who used the inhaler at least once, analysed as treated.' }],
    criteria: [C('IN01', 'Aged 40 to 80 years when consent is signed', ['P02']), C('IN02', 'COPD with post-bronchodilator FEV1/FVC below 0.70 and FEV1 30% to 80% of predicted at screening', ['P05']), C('IN03', 'Participants of childbearing potential use highly effective contraception and have a negative pregnancy test', ['P10']), C('EX01', 'Current diagnosis of asthma', ['P04']), C('EX02', 'QTcF above 450 ms at screening', ['P08']), C('EX03', 'A moderate or severe COPD exacerbation in the 6 weeks before screening', ['P04'])],
    visits: NFR_VISITS, procedures: NFR_PROCS, narrative: {},
    statements: { '10.11': 'A sample size of 340 randomised participants (85 per arm) gives 80% power to detect a difference of 100 mL in trough FEV1 between a dose and placebo (standard deviation 220 mL, two-sided alpha 0.05), allowing for 10% dropout.' },
    multiplicity: 'Doses are tested against placebo with the Hochberg procedure at a two-sided 0.05; the dose-response is modelled with an Emax model as supportive analysis.',
    rescue: 'Salbutamol 100 µg per puff as needed; not within 6 hours before spirometry.', aeFrom: 'consent', aeTo: 'FU',
  }
  void NFR_ALLT
  d.estimands = [{ id: 'EST1', objectiveId: 'OBJ1', endpointId: 'END1', population: 'Adults aged 40 to 80 with moderate to severe COPD', analysisSetId: 'FAS', treatment: 'Teravelin 50, 100 or 200 µg once daily, each compared with placebo, for 12 weeks',
    intercurrentEvents: [{ id: 'EST1-IE1', name: 'Permanent discontinuation of trial intervention', strategy: 'Hypothetical', description: 'Values after discontinuation are not used; the effect had participants stayed on treatment is estimated.' }, { id: 'EST1-IE2', name: 'Use of rescue medication within 6 hours before spirometry', strategy: 'Hypothetical', description: 'The affected measurement is set to missing.' }],
    summary: 'Difference in means', estimator: 'A mixed model for repeated measures with treatment, visit, treatment by visit, baseline FEV1 and baseline by visit, unstructured covariance.', missing: 'Missing at random within the model, consistent with the hypothetical strategy.', sensitivity: 'Reference-based multiple imputation (jump to reference).' }]
  d.narrative = { ...defaultNarrative(d, { name: 'Teravelin', cls: 'inhaled long-acting muscarinic antagonist (fictional)', indication: 'chronic obstructive pulmonary disease' }),
    '5.4': '5.4.1 A participant of childbearing potential is anyone who is not permanently sterile and not postmenopausal. 5.4.2 They use a highly effective method of contraception until 2 weeks after the last dose.',
    '6.9': `6.9.2 Rescue therapy: ${d.rescue}`, '9.3': 'A pregnancy is reported within 24 hours and followed to its outcome.', '12.1': 'Haematology and chemistry; serum β-hCG at screening, urine at other visits.' }
  return structuredClone(d)
}

// ---------- library ----------
export interface LibraryProduct { id: string; name: string; inn: string; code: string; cls: string; form: string; strengths: string[]; route: string; summary: string; sponsor: string }
export interface LibraryIndication { id: string; name: string; population: string; endpoints: { text: string; variableType: 'continuous' | 'binary'; procedure: string }[]; standardCare: string }
export const PRODUCTS: LibraryProduct[] = [
  { id: 'lumiravostat', name: 'Ostrevia', inn: 'lumiravostat', code: 'HRP-4417', cls: 'reversible STRK1 kinase inhibitor (fictional target)', form: 'film-coated tablet', strengths: ['5 mg', '10 mg', '25 mg'], route: 'Oral', summary: 'Phase 1 (HRP-101 to HRP-104): half-life about 18 hours, linear pharmacokinetics from 2 to 50 mg, metabolised by CYP3A. Nonclinical: embryo-fetal toxicity in rats; no genotoxicity.', sponsor: 'Halcyon Ridge Pharmaceuticals (fictional)' },
  { id: 'teravelin', name: 'Teravelin', inn: 'teravelin', code: 'TRV-118', cls: 'inhaled long-acting muscarinic antagonist (fictional)', form: 'dry powder inhaler', strengths: ['50 µg', '100 µg', '200 µg'], route: 'Inhalation', summary: 'Phase 1: bronchodilation from 15 minutes, lasting 24 hours; dry mouth at 400 µg. Nonclinical: no findings of concern.', sponsor: 'Northfell Respiratory (fictional)' },
]
export const INDICATIONS: LibraryIndication[] = [
  { id: 'che', name: 'Moderate to severe chronic hand eczema', population: 'Adults with chronic hand eczema for at least 6 months inadequately controlled with topical corticosteroids', standardCare: 'Emollients and topical corticosteroids', endpoints: [{ text: 'IGA-CHE treatment success at the end of treatment', variableType: 'binary', procedure: 'IGA-CHE' }, { text: 'Percent change from baseline in HECSI', variableType: 'continuous', procedure: 'HECSI' }] },
  { id: 'copd', name: 'Moderate to severe COPD', population: 'Adults aged 40 or more with COPD, post-bronchodilator FEV1/FVC below 0.70 and FEV1 30% to 80% of predicted', standardCare: 'Short-acting bronchodilators as needed', endpoints: [{ text: 'Change from baseline in trough FEV1 at the end of treatment', variableType: 'continuous', procedure: 'Spirometry' }, { text: 'Rate of moderate or severe exacerbations', variableType: 'continuous', procedure: 'Exacerbation diary' }] },
]
export const DESIGNS = [
  { id: 'parallel', name: 'Parallel, placebo-controlled', model: 'Parallel Group', control: 'Placebo' },
  { id: 'dose', name: 'Dose-finding, parallel, placebo-controlled', model: 'Parallel Group', control: 'Dose Response' },
  { id: 'crossover', name: 'Cross-over, placebo-controlled', model: 'Cross-over', control: 'Placebo' },
  { id: 'single', name: 'Single-arm', model: 'Single Group', control: 'No Control' },
]

// An empty protocol: what a learner starts from.
export function emptyData(): ProtocolData {
  return {
    title: { 'Original Protocol Indicator': 'Yes', 'Version Number': '0.1' }, design: {},
    facts: { participants: 0, perArm: 0, dropoutPct: 10, treatmentWeeks: 0, followUpWeeks: 0, participationWeeks: 0, ageMin: 18, ageMax: 75, power: 0.9, alpha: 0.05, sided: 2, assumption: { kind: 'proportions', p0: 0.2, p1: 0.4 } },
    arms: [], epochs: [{ id: 'EP_SCR', name: 'Screening', type: 'Screening' }, { id: 'EP_TRT', name: 'Treatment', type: 'Treatment' }, { id: 'EP_FU', name: 'Follow-up', type: 'Follow-up' }],
    interventions: [], objectives: [], endpoints: [], estimands: [], analysisSets: [], criteria: [], visits: [], procedures: [], narrative: {}, statements: {},
    multiplicity: '', rescue: '', aeFrom: 'consent', aeTo: '',
  }
}

// From the library: the title page and design filled from the chosen product, indication and
// design; everything else is for the learner to write.
export function fromLibrary(productId: string, indicationId: string, designId: string, phase: string, id: string): ProtocolData {
  const pr = PRODUCTS.find((x) => x.id === productId)!, ind = INDICATIONS.find((x) => x.id === indicationId)!, de = DESIGNS.find((x) => x.id === designId)!
  const d = emptyData()
  d.title = { ...d.title, 'Sponsor Protocol Identifier': id, 'Trial Phase': phase, "Sponsor's Investigational Product Code(s)": pr.code, 'Investigational Product Name(s)': `${pr.inn} (${pr.name})`, 'Sponsor Name and Address': pr.sponsor }
  d.design = { 'Intervention Model': de.model, 'Control Type': de.control, 'Population Type': 'With Disease', 'Population Diagnosis or Condition': ind.name, 'Units of Age': 'Years', 'Master Protocol Indicator': 'No', 'Drug/Device Combination Product Indicator': 'No', 'Adaptive Trial Design Indicator': 'No' }
  d.narrative = { '2.1': '', '6.2': `Product information: ${pr.summary}` }
  return structuredClone(d)
}

export const EXAMPLES = {
  'HRP-301': { name: 'VERDANT-1 (HRP-301): lumiravostat in chronic hand eczema', phase: 'Phase 3', data: hrpData },
  'HLV-204-201': { name: 'VASCLEAR-2 (HLV-204-201): Vasclarin in hypertension', phase: 'Phase 2', data: hlvData },
  'NFR-118-201': { name: 'NORTHFELL-2 (NFR-118-201): teravelin dose-finding in COPD', phase: 'Phase 2', data: nfrData },
} as const
export type ExampleId = keyof typeof EXAMPLES

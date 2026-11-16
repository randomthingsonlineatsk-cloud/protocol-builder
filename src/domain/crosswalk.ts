// Cross-walks from the M11 protocol to four other sets of protocol content requirements. Each
// item names the M11 sections (or title page and design elements) that satisfy it, and a check
// that reads the protocol to see whether they do. Item wording is a close paraphrase of the
// official text; numbers and letters are the official ones.
//   SPIRIT 2025 (Hopewell and others, BMJ 2025;389:e081477 and JAMA, 2025): 34 items.
//   Regulation (EU) No 536/2014, Annex I, section D (paragraphs 15 to 24).
//   New Drugs and Clinical Trials Rules 2019 (India), Third Schedule, Table 2.
//   21 CFR 312.23(a)(6), protocols in an IND, scaled by phase.
import type { ProtocolData } from './types'
import { TOC } from './m11'

export type FrameworkId = 'spirit' | 'ctr' | 'ndct' | 'ind'
export type Status = 'covered' | 'gap' | 'optional' | 'n/a'
export interface CwItem {
  id: string; group: string; text: string
  m11: string[]                                  // where M11 puts it (section numbers, 'TP', 'TP:<term>', '1.1.2:<term>')
  check: (d: ProtocolData) => boolean            // the protocol satisfies the item
  applies?: (d: ProtocolData) => boolean         // false: not applicable to this protocol
  optional?: boolean                             // "if applicable" or "if any": shown, not scored
  phase1?: boolean                               // 312.23: a Phase 1 protocol must give this in detail
  hint: string                                   // what to write, and where
}
export interface Framework { id: FrameworkId; name: string; short: string; source: string; items: CwItem[] }

// ---------- reading the protocol ----------
const blank = (s?: string) => !s || !s.trim()
const kids = (num: string) => TOC.filter((s) => s.num === num || s.num.startsWith(num + '.')).map((s) => s.num)
/** All the text of the sections given, with their subsections. */
export const textOf = (d: ProtocolData, ...nums: string[]) => nums.flatMap(kids).map((n) => d.narrative[n] ?? '').join('\n')
const has = (d: ProtocolData, ...nums: string[]) => nums.every((n) => !blank(textOf(d, n)))
const kw = (d: ProtocolData, nums: string[], re: RegExp) => re.test(textOf(d, ...nums))
const tp = (d: ProtocolData, ...terms: string[]) => terms.every((t) => !blank(d.title[t]))
const ds = (d: ProtocolData, ...terms: string[]) => terms.every((t) => !blank(d.design[t]))
const blinded = (d: ProtocolData) => !/open/i.test(d.design['Trial Blind Schema'] ?? '') && !blank(d.design['Trial Blind Schema'])
const randomised = (d: ProtocolData) => /random/i.test(d.design['Intervention Assignment Method'] ?? '')
const dmc = (d: ProtocolData) => /data monitoring|DMC|DSMB|safety monitoring/i.test(d.design['Independent Committees'] ?? '')
const secondary = (d: ProtocolData) => d.objectives.some((o) => o.level === 'Secondary')
const labs = (d: ProtocolData) => d.procedures.some((p) => p.form === 'LB' || /laborator/i.test(p.name))
const minors = (d: ProtocolData) => (d.facts.ageMin || Number((d.design['Population Age (Minimum and Maximum)'] ?? '').match(/\d+/)?.[0] ?? 18)) < 18
const objectives = (d: ProtocolData) => d.objectives.some((o) => o.level === 'Primary') && !blank(d.objectives[0]?.text)
const criteria = (d: ProtocolData) => d.criteria.some((c) => c.category === 'Inclusion') && d.criteria.some((c) => c.category === 'Exclusion')
const schedule = (d: ProtocolData) => d.visits.length > 1 && d.procedures.length > 0
const design = (d: ProtocolData) => ds(d, 'Intervention Model', 'Control Type', 'Trial Blind Schema') && d.arms.length > 0
const endpoints = (d: ProtocolData) => d.endpoints.some((e) => e.level === 'Primary') && (!secondary(d) || d.endpoints.some((e) => e.level === 'Secondary'))
const estimandsDone = (d: ProtocolData) => d.estimands.length > 0 && d.estimands.every((e) => !blank(e.summary) && e.intercurrentEvents.every((i) => !blank(i.strategy)))
const doses = (d: ProtocolData) => d.interventions.some((i) => i.role === 'Investigational' && !blank(i.dose))
const registry = (d: ProtocolData) => tp(d, 'NCT Number') || tp(d, 'EU CT Number') || tp(d, 'CTRI Number')
const synopsis = (d: ProtocolData) => objectives(d) && design(d)

// ---------- SPIRIT 2025 ----------
const SPIRIT: CwItem[] = [
  { id: '1a', group: 'Administrative information', text: 'Title describing the trial design, population and interventions, identifying it as a protocol', m11: ['TP:Full Title'], check: (d) => tp(d, 'Full Title') && /random|trial|stud/i.test(d.title['Full Title']), hint: 'Write the full title with the design, intervention, population and condition.' },
  { id: '1b', group: 'Administrative information', text: 'Structured summary of design and methods, including the WHO Trial Registration Data Set items', m11: ['1.1', '1.1.1', '1.1.2'], check: synopsis, hint: 'The synopsis is built from sections 3 and 1.1.2: fill the objectives and the design elements.' },
  { id: '2', group: 'Administrative information', text: 'Version date and identifier', m11: ['TP:Version Number', 'TP:Version Date'], check: (d) => tp(d, 'Version Number', 'Version Date'), hint: 'Fill the version number and date on the title page.' },
  { id: '3a', group: 'Administrative information', text: 'Names, affiliations and roles of protocol contributors', m11: ['TP:Sponsor Signatory', 'TP:Medical Expert Contact'], check: (d) => tp(d, 'Sponsor Signatory', 'Medical Expert Contact'), hint: 'Name the sponsor signatory and the medical expert on the title page; list other contributors in 11.2.' },
  { id: '3b', group: 'Administrative information', text: 'Name and contact information for the trial sponsor', m11: ['TP:Sponsor Name and Address'], check: (d) => tp(d, 'Sponsor Name and Address'), hint: 'Fill the sponsor name and address.' },
  { id: '3c', group: 'Administrative information', text: 'Role of the sponsor and funders, including any authority over design, conduct, analysis and reporting', m11: ['11.2'], check: (d) => kw(d, ['11.2'], /sponsor|fund/i), hint: 'Say in 11.2 what the sponsor (and any funder) decides: design, conduct, analysis, publication.' },
  { id: '3d', group: 'Administrative information', text: 'Composition, roles and responsibilities of the coordinating centre, committees and other oversight groups', m11: ['1.1.2:Independent Committees', '11.4'], check: (d) => ds(d, 'Independent Committees') && has(d, '11.4'), hint: 'Name the committees in 1.1.2 and describe them in 11.4.' },
  { id: '4', group: 'Open science', text: 'Registry name, identifying number (with URL) and date of registration, or the intended registry', m11: ['TP:NCT Number', 'TP:EU CT Number', 'TP:CTRI Number'], check: registry, hint: 'Give at least one registry number on the title page (NCT, EU CT or CTRI).' },
  { id: '5', group: 'Open science', text: 'Where the protocol and statistical analysis plan can be accessed', m11: ['11.12'], check: (d) => kw(d, ['11.12'], /protocol|statistical analysis plan|\bSAP\b/i), hint: 'Say in 11.12 where the protocol and the SAP will be made available.' },
  { id: '6', group: 'Open science', text: 'Where and how de-identified participant data, statistical code and other materials will be accessible', m11: ['11.12'], check: (d) => kw(d, ['11.12'], /data shar|participant[- ]level|individual participant data|de-identified|anonymi[sz]ed data|request/i), hint: 'Describe the data sharing policy in 11.12: what is shared, with whom, how and when.' },
  { id: '7a', group: 'Open science', text: 'Sources of funding and other support', m11: ['11.2'], check: (d) => kw(d, ['11', '12.2'], /fund/i), hint: 'State who funds the trial (in 11.2).' },
  { id: '7b', group: 'Open science', text: 'Financial and other conflicts of interest of the principal investigators and steering committee', m11: ['11.2', '11.4'], check: (d) => kw(d, ['11', '12.2'], /conflict/i), hint: 'Say how conflicts of interest are declared and managed (11.2 or 11.4).' },
  { id: '8', group: 'Open science', text: 'Plans to communicate results to participants, professionals, the public and others', m11: ['11.12'], check: (d) => has(d, '11.12'), hint: 'Write the dissemination plan in 11.12, including a lay summary for participants.' },
  { id: '9a', group: 'Introduction', text: 'Scientific background and rationale, including relevant studies of benefits and harms of each intervention', m11: ['2.1', '2.2'], check: (d) => has(d, '2.1', '2.2'), hint: 'Write 2.1 and the risk and benefit summaries in 2.2.' },
  { id: '9b', group: 'Introduction', text: 'Explanation for the choice of comparator', m11: ['4.2.3'], check: (d) => has(d, '4.2.3'), hint: 'Justify the control in 4.2.3.' },
  { id: '10', group: 'Introduction', text: 'Specific objectives related to benefits and harms', m11: ['3'], check: (d) => objectives(d) && d.objectives.some((o) => o.kind === 'Safety'), hint: 'Add objectives for both efficacy and safety in section 3.' },
  { id: '11', group: 'Methods: patient and public involvement and trial design', text: 'Details of patient or public involvement in the design, conduct and reporting, or plans for it', m11: ['4.1.1'], check: (d) => has(d, '4.1.1'), hint: 'Describe patient and public involvement in 4.1.1 (or say there was none and why).' },
  { id: '12', group: 'Methods: patient and public involvement and trial design', text: 'Type of trial, allocation ratio and framework (superiority, equivalence, non-inferiority, exploratory)', m11: ['1.1.2', '4.1', '10.1'], check: (d) => design(d) && (!randomised(d) || ds(d, 'Randomisation Type')) && kw(d, ['4.1', '10.1'], /superior|non-inferior|noninferior|equivalen|exploratory|dose[- ]finding|estimat/i), hint: 'Give the allocation ratio (Randomisation Type in 1.1.2) and state the framework (superiority, non-inferiority…) in 4.1 or 10.1.' },
  { id: '13', group: 'Methods: participants, interventions and outcomes', text: 'Settings and locations where the trial will be conducted', m11: ['1.1.2:Site Distribution', '1.1.2:Site Geographic Scope'], check: (d) => ds(d, 'Site Distribution', 'Site Geographic Scope'), hint: 'Fill Site Distribution and Site Geographic Scope in 1.1.2.' },
  { id: '14a', group: 'Methods: participants, interventions and outcomes', text: 'Eligibility criteria for participants', m11: ['5.2', '5.3'], check: criteria, hint: 'Write inclusion and exclusion criteria.' },
  { id: '14b', group: 'Methods: participants, interventions and outcomes', text: 'Eligibility criteria for sites and those delivering the interventions, if applicable', m11: ['11.2'], optional: true, check: (d) => kw(d, ['11', '12.2'], /site selection|site (feasibility|qualification)|investigator(s)? (must|should) be|qualified investigator/i), hint: 'Where sites or providers must meet criteria, give them in 11.2.' },
  { id: '15a', group: 'Methods: participants, interventions and outcomes', text: 'Intervention and comparator in enough detail to replicate them, including who will administer them', m11: ['6.1', '6.3'], check: (d) => doses(d) && has(d, '6.1', '6.3'), hint: 'Describe each intervention in 6.1 and its administration in 6.3.' },
  { id: '15b', group: 'Methods: participants, interventions and outcomes', text: 'Criteria for discontinuing or modifying the allocated intervention', m11: ['6.4', '7.1'], check: (d) => has(d, '7.1') && has(d, '6.4'), hint: 'Write dose modification (6.4) and discontinuation criteria (7.1).' },
  { id: '15c', group: 'Methods: participants, interventions and outcomes', text: 'Strategies to improve adherence and how adherence is monitored', m11: ['6.8'], check: (d) => has(d, '6.8'), hint: 'Write 6.8.' },
  { id: '15d', group: 'Methods: participants, interventions and outcomes', text: 'Concomitant care permitted or prohibited', m11: ['6.10'], check: (d) => has(d, '6.10'), hint: 'Write 6.10.' },
  { id: '16', group: 'Methods: participants, interventions and outcomes', text: 'Primary and secondary outcomes: variable, analysis metric, method of aggregation and time point', m11: ['3', '1.1.1'], check: (d) => endpoints(d) && estimandsDone(d), hint: 'Give each endpoint an estimand with every intercurrent event strategy and the population-level summary.' },
  { id: '17', group: 'Methods: participants, interventions and outcomes', text: 'How harms are defined and assessed', m11: ['9.1', '9.2'], check: (d) => has(d, '9.1', '9.2'), hint: 'Write 9.1 and 9.2.' },
  { id: '18', group: 'Methods: participants, interventions and outcomes', text: 'Participant timeline: enrolment, interventions, assessments and visits (a schedule diagram is recommended)', m11: ['1.2', '1.3'], check: schedule, hint: 'Build the schedule of activities.' },
  { id: '19', group: 'Methods: participants, interventions and outcomes', text: 'How the sample size was determined, with all the assumptions behind it', m11: ['10.11'], check: (d) => has(d, '10.11') && d.facts.perArm > 0, hint: 'Size the trial in 10.11 and write the statement from it.' },
  { id: '20', group: 'Methods: participants, interventions and outcomes', text: 'Strategies to achieve adequate enrolment', m11: ['5.1', '11.3'], check: (d) => kw(d, ['5', '11', '12.2'], /recruit/i), hint: 'Describe recruitment (5.1 or 11.3).' },
  { id: '21a', group: 'Methods: assignment of interventions', text: 'Who generates the allocation sequence and the method used', m11: ['6.7'], applies: randomised, check: (d) => kw(d, ['6.7'], /generat|interactive|IRT|IxRS|IWRS|computer/i), hint: 'Say in 6.7 who generates the randomisation list and how.' },
  { id: '21b', group: 'Methods: assignment of interventions', text: 'Type of randomisation and any stratification factors', m11: ['1.1.2:Randomisation Type', '6.7'], applies: randomised, check: (d) => ds(d, 'Randomisation Type') && (d.design['Stratification Indicator'] !== 'Yes' || kw(d, ['6.7'], /stratif/i)), hint: 'Fill Randomisation Type and name the stratification factors in 6.7.' },
  { id: '22', group: 'Methods: assignment of interventions', text: 'Mechanism to implement the sequence and conceal it until assignment', m11: ['6.7'], applies: randomised, check: (d) => kw(d, ['6.7'], /conceal|interactive|IRT|IxRS|IWRS|central/i), hint: 'Describe the allocation mechanism (an interactive response system) in 6.7.' },
  { id: '23', group: 'Methods: assignment of interventions', text: 'Whether those enrolling and assigning participants can see the sequence', m11: ['6.7'], applies: randomised, check: (d) => kw(d, ['6.7'], /access|enrol|blind/i), hint: 'Say in 6.7 that site staff who enrol participants have no access to the list.' },
  { id: '24a', group: 'Methods: assignment of interventions', text: 'Who will be blinded after assignment', m11: ['1.1.2:Blinded Roles'], applies: blinded, check: (d) => ds(d, 'Blinded Roles'), hint: 'Fill Blinded Roles in 1.1.2.' },
  { id: '24b', group: 'Methods: assignment of interventions', text: 'How blinding is achieved and how similar the interventions are', m11: ['6.7'], applies: blinded, check: (d) => kw(d, ['6.7', '6.1'], /match|identical|indistinguishable|same appearance|placebo/i), hint: 'Describe matching placebo or packaging in 6.7.' },
  { id: '24c', group: 'Methods: assignment of interventions', text: 'When unblinding is permitted and how', m11: ['6.7'], applies: blinded, check: (d) => kw(d, ['6.7'], /unblind|break the blind|emergency/i), hint: 'Describe emergency unblinding in 6.7.' },
  { id: '25a', group: 'Methods: data collection, management and analysis', text: 'Plans for collecting data, quality processes and instruments, with their reliability and validity', m11: ['8.1', '8.3'], check: (d) => has(d, '8.1', '8.3'), hint: 'Write 8.1 and 8.3 (who assesses, with which validated instruments).' },
  { id: '25b', group: 'Methods: data collection, management and analysis', text: 'Plans to promote retention and complete follow-up, including data from those who stop or deviate', m11: ['7.1', '7.3'], check: (d) => has(d, '7.3') && kw(d, ['7'], /stay|remain|continue|attend/i), hint: 'Say in 7.1 that participants who stop treatment stay in the trial, and write 7.3.' },
  { id: '26', group: 'Methods: data collection, management and analysis', text: 'Data entry, coding, security and storage, with quality processes', m11: ['11.7'], check: (d) => has(d, '11.7'), hint: 'Write 11.7.' },
  { id: '27a', group: 'Methods: data collection, management and analysis', text: 'Statistical methods for primary and secondary outcomes, including harms', m11: ['10.4', '10.5', '10.7'], check: (d) => has(d, '10.4', '10.7') && (!secondary(d) || has(d, '10.5')), hint: 'Write 10.4, 10.5 and 10.7.' },
  { id: '27b', group: 'Methods: data collection, management and analysis', text: 'Who is included in each analysis and in which group', m11: ['10.2'], check: (d) => d.analysisSets.length > 0, hint: 'Define the analysis sets in 10.2.' },
  { id: '27c', group: 'Methods: data collection, management and analysis', text: 'How missing data will be handled', m11: ['10.4', '3'], check: (d) => d.estimands.some((e) => !blank(e.missing)) || kw(d, ['10'], /missing/i), hint: 'Give the handling of missing data for each estimand.' },
  { id: '27d', group: 'Methods: data collection, management and analysis', text: 'Additional analyses, such as subgroup and sensitivity analyses', m11: ['10.4', '10.8'], check: (d) => d.estimands.some((e) => !blank(e.sensitivity)) || kw(d, ['10'], /sensitivity|subgroup|supplementary/i), hint: 'Give a sensitivity analysis for each estimand, and subgroups in 10.8.' },
  { id: '28a', group: 'Methods: monitoring', text: 'Data monitoring committee: composition, role, reporting structure and independence, or why one is not needed', m11: ['11.4'], check: (d) => has(d, '11.4'), hint: 'Describe the committee in 11.4, or say why none is needed.' },
  { id: '28b', group: 'Methods: monitoring', text: 'Interim analyses and stopping guidelines, who sees interim results and who decides to stop', m11: ['4.3', '10.9'], check: (d) => has(d, '4.3') && (!d.interim || has(d, '10.9')), hint: 'Write 4.3, and 10.9 if there is an interim analysis.' },
  { id: '29', group: 'Methods: monitoring', text: 'Frequency and procedures for monitoring trial conduct, or why there is none', m11: ['11.6'], check: (d) => has(d, '11.6') || kw(d, ['11'], /monitor/i), hint: 'Describe monitoring in 11.6 (risk-based quality management).' },
  { id: '30', group: 'Ethics', text: 'Plans for research ethics committee or IRB approval', m11: ['11.1'], check: (d) => has(d, '11.1'), hint: 'Write 11.1.' },
  { id: '31', group: 'Ethics', text: 'Plans for communicating important protocol modifications', m11: ['11.1', '12.3'], check: (d) => kw(d, ['11', '12'], /amend/i), hint: 'Say in 11.1 how amendments are approved and communicated.' },
  { id: '32a', group: 'Ethics', text: 'Who obtains informed consent or assent, and how', m11: ['11.3'], check: (d) => has(d, '11.3'), hint: 'Write 11.3.' },
  { id: '32b', group: 'Ethics', text: 'Additional consent for collection and use of data and samples in ancillary studies, if applicable', m11: ['11.3'], optional: true, check: (d) => kw(d, ['11.3'], /sample|specimen|future|ancillary|optional/i), hint: 'If samples are kept for future research, say how separate consent is taken.' },
  { id: '33', group: 'Ethics', text: 'How personal information is collected, shared and kept confidential', m11: ['11.8'], check: (d) => has(d, '11.8'), hint: 'Write 11.8.' },
  { id: '34', group: 'Ethics', text: 'Provisions for ancillary and post-trial care, and compensation for harm from taking part', m11: ['4.5', '11.5'], check: (d) => has(d, '4.5', '11.5'), hint: 'Write 4.5 (post-trial access) and 11.5 (insurance and compensation).' },
]

// ---------- EU CTR Annex I, section D ----------
const CTR: CwItem[] = [
  { id: '15(a)', group: '15 Identification', text: 'Title of the clinical trial', m11: ['TP:Full Title'], check: (d) => tp(d, 'Full Title'), hint: 'Fill the full title.' },
  { id: '15(b)', group: '15 Identification', text: 'EU trial number', m11: ['TP:EU CT Number'], check: (d) => tp(d, 'EU CT Number'), hint: 'The EU CT number is given by CTIS when the application is created; fill it on the title page.' },
  { id: '15(c)', group: '15 Identification', text: "Sponsor's protocol code number, the same for all versions", m11: ['TP:Sponsor Protocol Identifier'], check: (d) => tp(d, 'Sponsor Protocol Identifier'), hint: 'Fill the sponsor protocol identifier.' },
  { id: '15(d)', group: '15 Identification', text: 'Date and number of the version, updated when amended', m11: ['TP:Version Number', 'TP:Version Date'], check: (d) => tp(d, 'Version Number', 'Version Date'), hint: 'Fill the version number and date.' },
  { id: '15(e)', group: '15 Identification', text: 'Short title or name of the protocol', m11: ['TP:Short Title', 'TP:Trial Acronym'], check: (d) => tp(d, 'Short Title') || tp(d, 'Trial Acronym'), hint: 'Fill the short title or acronym.' },
  { id: '15(f)', group: '15 Identification', text: "Sponsor's name and address, and the name and function of those authorised to sign the protocol or substantial modifications", m11: ['TP:Sponsor Name and Address', 'TP:Sponsor Signatory'], check: (d) => tp(d, 'Sponsor Name and Address', 'Sponsor Signatory'), hint: 'Fill the sponsor address and the sponsor signatory with their function.' },
  { id: '16', group: '16 Format', text: 'An easily accessible and searchable electronic format, not scanned images', m11: ['TP'], check: () => true, hint: 'Met: the protocol is structured text, exported as searchable PDF, Word and USDM.' },
  { id: '17(a)', group: '17 Content', text: 'Statement that the trial follows the protocol, the Regulation and good clinical practice', m11: ['11.1'], check: (d) => kw(d, ['11.1'], /good clinical practice|\bGCP\b|E6/i) && kw(d, ['11.1'], /536\/2014|Regulation|applicable (laws|regulations|requirements)/i), hint: 'State compliance with the protocol, Regulation (EU) No 536/2014 and ICH GCP in 11.1.' },
  { id: '17(b)', group: '17 Content', text: 'Complete list of investigational and auxiliary medicinal products', m11: ['6.1', '6.9'], check: (d) => doses(d) && (blank(d.rescue) || has(d, '6.9')), hint: 'List every product in 6.1 and any auxiliary (rescue, background) product in 6.9.' },
  { id: '17(c)', group: '17 Content', text: 'Summary of nonclinical findings and other clinical trial findings of possible clinical significance', m11: ['2.2.1'], check: (d) => kw(d, ['2.1', '2.2'], /nonclinical|non-clinical|preclinical|animal|toxicolog/i), hint: 'Summarise the nonclinical and clinical findings in 2.2.1.' },
  { id: '17(d)', group: '17 Content', text: 'Summary of known and potential risks and benefits, with an evaluation for the Article 6 assessment', m11: ['2.2.1', '2.2.2', '2.2.3'], check: (d) => has(d, '2.2.1', '2.2.2', '2.2.3'), hint: 'Write 2.2.1 to 2.2.3.' },
  { id: '17(e)', group: '17 Content', text: 'Where patients were involved in the design, a description of their involvement', m11: ['4.1.1'], check: (d) => has(d, '4.1.1'), hint: 'Describe patient involvement in 4.1.1, or say there was none.' },
  { id: '17(f)', group: '17 Content', text: 'Dosage, regimen, route, mode of administration and treatment period for all products, with a justification', m11: ['6.1', '6.2', '6.3'], check: (d) => doses(d) && has(d, '6.2'), hint: 'Write 6.2 to justify the dose and regimen.' },
  { id: '17(g)', group: '17 Content', text: 'Whether the products are authorised and used within their marketing authorisation, and why any unauthorised auxiliary product is used', m11: ['6.1', '6.9'], check: (d) => kw(d, ['6.1', '6.9'], /authori[sz]|not (yet )?(approved|marketed)|unapproved|investigational/i), hint: 'Say in 6.1 and 6.9 whether each product is authorised in the EU and how it is used.' },
  { id: '17(h)', group: '17 Content', text: 'Groups and subgroups of subjects, including those with specific needs (age, sex, healthy volunteers, rare diseases)', m11: ['5.1'], check: (d) => has(d, '5.1'), hint: 'Write 5.1.' },
  { id: '17(i)', group: '17 Content', text: 'References to literature and data relevant to the trial', m11: ['2.1', '14'], check: (d) => has(d, '2.1', '14'), hint: 'Write 2.1 and list references in 14.' },
  { id: '17(j)', group: '17 Content', text: 'Discussion of the relevance of the trial for the Article 6 assessment', m11: ['2.1', '2.2.3'], check: (d) => has(d, '2.1', '2.2.3'), hint: 'Write 2.1 and the overall risk-benefit assessment in 2.2.3.' },
  { id: '17(k)', group: '17 Content', text: 'Type of trial and design, with a schematic diagram', m11: ['1.1.2', '1.2', '4.1'], check: (d) => design(d) && d.epochs.length > 0 && has(d, '4.1'), hint: 'Fill 1.1.2, the arms and epochs (for the schema in 1.2), and 4.1.' },
  { id: '17(l)', group: '17 Content', text: 'Primary and secondary endpoints', m11: ['3'], check: endpoints, hint: 'Add primary and secondary endpoints in section 3.' },
  { id: '17(m)', group: '17 Content', text: 'Measures to minimise bias, including randomisation and blinding', m11: ['6.7', '1.1.2'], check: (d) => has(d, '6.7') && ds(d, 'Trial Blind Schema'), hint: 'Write 6.7.' },
  { id: '17(n)', group: '17 Content', text: 'Expected duration of participation, and the sequence and duration of all periods including follow-up', m11: ['1.1.2:Total Planned Duration of Trial Participation', '1.3', '4.1'], check: (d) => ds(d, 'Total Planned Duration of Trial Participation') && schedule(d) && d.epochs.length > 1, hint: 'Fill the planned duration of participation and the epochs.' },
  { id: '17(o)', group: '17 Content', text: 'Definition of the end of the trial (with an estimated date and justification if it is not the last visit of the last subject)', m11: ['4.4'], check: (d) => has(d, '4.4'), hint: 'Write 4.4.' },
  { id: '17(p)', group: '17 Content', text: 'Criteria for discontinuing parts of the trial or the whole trial', m11: ['4.3'], check: (d) => has(d, '4.3'), hint: 'Write 4.3.' },
  { id: '17(q)', group: '17 Content', text: 'Arrangements for keeping randomisation codes and the procedure for breaking them', m11: ['6.7'], applies: randomised, check: (d) => kw(d, ['6.7'], /unblind|break|code/i), hint: 'Describe the randomisation codes and unblinding in 6.7.' },
  { id: '17(r)', group: '17 Content', text: 'Data recorded directly in the case report forms that are source data', m11: ['11.9'], check: (d) => has(d, '11.9'), hint: 'Write 11.9.' },
  { id: '17(s)', group: '17 Content', text: 'Collection, storage and future use of biological samples, unless in a separate document', m11: ['8.6', '12.1', '11.3'], applies: labs, check: (d) => kw(d, ['8', '11', '12'], /(stor|retain|retention|destroy|destruction|kept).{0,120}sample|sample.{0,120}(stor|retain|retention|destroy|destruction|kept)|biobank|laboratory manual/i), hint: 'Say how long samples are kept, where, and whether they are used later (or point to the laboratory manual).' },
  { id: '17(t)', group: '17 Content', text: 'Tracing, storing, destroying and returning products (Article 51)', m11: ['6.6'], check: (d) => kw(d, ['6.6'], /accountab|return|destr/i), hint: 'Describe accountability, return and destruction in 6.6.' },
  { id: '17(u)', group: '17 Content', text: 'Statistical methods: interim analyses, planned enrolment, sample size and power, significance level, termination criteria, missing data, deviations from the plan, analysis populations', m11: ['10'], check: (d) => has(d, '10.11', '10.4') && d.analysisSets.length > 0 && (!d.interim || has(d, '10.9')), hint: 'Write section 10: analysis sets, the primary analysis, missing data, the sample size and any interim analysis.' },
  { id: '17(v)', group: '17 Content', text: 'Inclusion and exclusion criteria, including criteria for withdrawing individual subjects from treatment or the trial', m11: ['5.2', '5.3', '7.1', '7.2'], check: (d) => criteria(d) && has(d, '7.1', '7.2'), hint: 'Write the criteria and 7.1 and 7.2.' },
  { id: '17(w)', group: '17 Content', text: 'Procedures for withdrawal, data collected after withdrawal, replacement of subjects and follow-up', m11: ['7.2', '7.3'], check: (d) => has(d, '7.2') && kw(d, ['5.6', '7'], /replac/i), hint: 'Write 7.2, and say whether withdrawn participants are replaced.' },
  { id: '17(x)', group: '17 Content', text: 'Justification for including subjects unable to give consent or other special populations, such as minors', m11: ['5.1', '11.3'], applies: minors, check: (d) => kw(d, ['5.1', '11.3'], /minor|child|paediatric|pediatric|assent|legally (acceptable|designated) representative/i), hint: 'Justify the inclusion of minors in 5.1 and describe assent in 11.3.' },
  { id: '17(y)', group: '17 Content', text: 'Justification of the gender and age allocation, and of excluding or under-representing groups', m11: ['5.1'], check: (d) => kw(d, ['5.1'], /\b(sex|gender|women|female|men|older|elderly|age)\b/i), hint: 'Say in 5.1 why the sex and age of the population fit the disease.' },
  { id: '17(z)', group: '17 Content', text: 'Recruitment and informed consent procedures, especially for subjects unable to consent', m11: ['11.3', '5.1'], check: (d) => has(d, '11.3') && kw(d, ['5', '11', '12.2'], /recruit/i), hint: 'Write 11.3 and describe recruitment.' },
  { id: '17(aa)', group: '17 Content', text: 'Treatments permitted or prohibited before or during the trial', m11: ['6.10'], check: (d) => has(d, '6.10'), hint: 'Write 6.10.' },
  { id: '17(ab)', group: '17 Content', text: 'Accountability for supplying and administering products, including keeping the blind', m11: ['6.6'], check: (d) => kw(d, ['6.6'], /accountab/i), hint: 'Describe accountability in 6.6.' },
  { id: '17(ac)', group: '17 Content', text: 'Procedures for monitoring subject compliance', m11: ['6.8'], check: (d) => has(d, '6.8'), hint: 'Write 6.8.' },
  { id: '17(ad)', group: '17 Content', text: 'Arrangements for monitoring the conduct of the trial', m11: ['11.6'], check: (d) => has(d, '11.6') || kw(d, ['11'], /monitor/i), hint: 'Write 11.6.' },
  { id: '17(ae)', group: '17 Content', text: 'Care of subjects after the trial, where different from normal care', m11: ['4.5'], check: (d) => has(d, '4.5'), hint: 'Write 4.5.' },
  { id: '17(af)', group: '17 Content', text: 'Efficacy and safety parameters, and how and when they are assessed, recorded and analysed', m11: ['8.3', '8.4', '1.3'], check: (d) => has(d, '8.3', '8.4') && schedule(d), hint: 'Write 8.3 and 8.4.' },
  { id: '17(ag)', group: '17 Content', text: 'Ethical considerations, if not described elsewhere', m11: ['11.1'], check: (d) => has(d, '11.1'), hint: 'Write 11.1.' },
  { id: '17(ah)', group: '17 Content', text: 'Sponsor statement that investigators and institutions will permit monitoring, audits and inspections, with direct access to source data', m11: ['11.9', '11.2'], check: (d) => kw(d, ['11'], /direct access/i), hint: 'Add the direct-access statement (11.9 or 11.2).' },
  { id: '17(ai)', group: '17 Content', text: 'Publication policy', m11: ['11.12'], check: (d) => kw(d, ['11.12'], /publi/i), hint: 'Write the publication policy in 11.12.' },
  { id: '17(aj)', group: '17 Content', text: 'Justification if the summary of results will be submitted more than one year after the end of the trial', m11: ['11.12'], optional: true, check: (d) => kw(d, ['11.12'], /summary of (the )?results|within (one|1) year|12 months/i), hint: 'Say when the summary of results goes into CTIS; justify if later than one year.' },
  { id: '17(ak)', group: '17 Content', text: 'Arrangements complying with the rules on protection of personal data, against unauthorised access, disclosure, alteration or loss', m11: ['11.8'], check: (d) => kw(d, ['11.8'], /GDPR|2016\/679|data protection/i), hint: 'Say in 11.8 how the trial complies with the GDPR (Regulation (EU) 2016/679).' },
  { id: '17(al)', group: '17 Content', text: 'Measures to keep records and personal data confidential', m11: ['11.8'], check: (d) => kw(d, ['11.8'], /confidential|pseudonym|coded|identification code|participant number/i), hint: 'Describe pseudonymisation and confidentiality in 11.8.' },
  { id: '17(am)', group: '17 Content', text: 'Measures to mitigate possible adverse effects of a data security breach', m11: ['11.8'], check: (d) => kw(d, ['11.8', '11.7'], /breach/i), hint: 'Say in 11.8 what happens after a data security breach (notification, mitigation).' },
  { id: '18', group: '18 Trade names', text: 'Treatment may be described by active substance or ATC code where several authorised products exist', m11: ['6.1'], optional: true, check: (d) => kw(d, ['6'], /ATC|active substance/i), hint: 'Only where authorised comparators of several brands are allowed.' },
  { id: '19(a)', group: '19–20 Safety reporting', text: 'Adverse events or laboratory abnormalities critical to safety that the investigator reports to the sponsor', m11: ['9.1', '9.2'], check: (d) => has(d, '9.2') && kw(d, ['9', '7.1'], /special interest|AESI|laborator|ALT|critical/i), hint: 'Name in 9.2 the events and laboratory values critical to safety that must be reported.' },
  { id: '19(b)', group: '19–20 Safety reporting', text: 'Serious adverse events that do not need immediate reporting by the investigator', m11: ['9.2'], check: (d) => kw(d, ['9'], /not (need|require)\w* (to be )?(reported )?immediate|do not need (to be )?reported immediately|exempt|disease[- ]related|efficacy endpoint/i), hint: 'List in 9.2 any SAEs exempt from immediate reporting (for example expected disease-related events), or say there are none.' },
  { id: '20(a)', group: '19–20 Safety reporting', text: 'Recording of adverse events by the investigator and reporting of relevant ones to the sponsor', m11: ['9.2'], check: (d) => has(d, '9.2'), hint: 'Write 9.2.' },
  { id: '20(b)', group: '19–20 Safety reporting', text: 'Reporting of serious adverse events not needing immediate reporting', m11: ['9.2'], check: (d) => kw(d, ['9'], /not (need|require)\w* (to be )?(reported )?immediate|do not need (to be )?reported immediately|exempt|disease[- ]related|efficacy endpoint|none are exempt|all serious adverse events/i), hint: 'Say how and when exempt SAEs are reported (for example in the eCRF).' },
  { id: '20(c)', group: '19–20 Safety reporting', text: 'Reporting of suspected unexpected serious adverse reactions by the sponsor to EudraVigilance', m11: ['9.2'], check: (d) => kw(d, ['9'], /SUSAR|suspected unexpected|EudraVigilance/i), hint: 'Say in 9.2 that the sponsor reports SUSARs to EudraVigilance (Article 42).' },
  { id: '20(d)', group: '19–20 Safety reporting', text: 'Follow-up of subjects after adverse reactions, with the type and duration of follow-up', m11: ['9.2'], check: (d) => kw(d, ['9'], /follow(ed)?[- ]?up|until (resolution|resolved)/i), hint: 'Say how long adverse reactions are followed (until resolution or stabilisation).' },
  { id: '21', group: '21–24 Other', text: 'Reasons for a single safety report covering all investigational products (Article 43(2))', m11: ['9.2'], optional: true, check: (d) => kw(d, ['9'], /single safety report|annual safety report|DSUR/i), hint: 'Only where one annual safety report covers several products.' },
  { id: '22', group: '21–24 Other', text: 'Labelling and unblinding of investigational products, where needed', m11: ['6.6', '6.7'], check: (d) => kw(d, ['6.6', '6.7'], /label/i) && (!blinded(d) || kw(d, ['6.7'], /unblind/i)), hint: 'Describe labelling (Annex VI) in 6.6 and unblinding in 6.7.' },
  { id: '23', group: '21–24 Other', text: 'Data safety monitoring committee charter accompanies the protocol', m11: ['11.4'], applies: dmc, check: (d) => kw(d, ['11.4'], /charter/i), hint: 'Refer in 11.4 to the committee charter submitted with the protocol.' },
  { id: '24', group: '21–24 Other', text: 'A synopsis accompanies the protocol', m11: ['1.1'], check: synopsis, hint: 'The synopsis is built from sections 3 and 1.1.2.' },
]

// ---------- India: NDCT Rules 2019, Third Schedule, Table 2 ----------
const NDCT: CwItem[] = [
  { id: 'TP(a)', group: 'Title page', text: 'Full title of the clinical study', m11: ['TP:Full Title'], check: (d) => tp(d, 'Full Title'), hint: 'Fill the full title.' },
  { id: 'TP(b)', group: 'Title page', text: 'Protocol or study number, and protocol version number with date', m11: ['TP:Sponsor Protocol Identifier', 'TP:Version Number', 'TP:Version Date'], check: (d) => tp(d, 'Sponsor Protocol Identifier', 'Version Number', 'Version Date'), hint: 'Fill the identifier, version number and date.' },
  { id: 'TP(c)', group: 'Title page', text: 'Investigational new drug name or number', m11: ['TP:Investigational Product Name(s)', "TP:Sponsor's Investigational Product Code(s)"], check: (d) => tp(d, 'Investigational Product Name(s)') || tp(d, "Sponsor's Investigational Product Code(s)"), hint: 'Fill the product name or code.' },
  { id: 'TP(d)', group: 'Title page', text: 'Complete name and address of the sponsor and any contract research organisation', m11: ['TP:Sponsor Name and Address', 'TP:Local Sponsor Name and Address'], check: (d) => tp(d, 'Sponsor Name and Address'), hint: 'Fill the sponsor address; give the Indian sponsor or CRO as the local sponsor.' },
  { id: 'TP(e)', group: 'Title page', text: 'List of investigators, their institutional affiliations and site locations', m11: ['12.2'], check: (d) => kw(d, ['12.2'], /investigator/i) && kw(d, ['12.2'], /site|hospital|institut|centre|center/i), hint: 'M11 has no investigator list: give the Indian sites and investigators in 12.2 (India).' },
  { id: 'TP(f)', group: 'Title page', text: 'Clinical laboratories and other departments or facilities taking part', m11: ['12.1', '12.2'], check: (d) => kw(d, ['12.1', '12.2'], /laborator/i), hint: 'Name the central laboratory (12.1) and other facilities (12.2).' },
  { id: '1', group: 'Contents', text: 'Background and introduction: preclinical experience and clinical experience', m11: ['2.1', '2.2.1'], check: (d) => has(d, '2.1') && kw(d, ['2'], /nonclinical|non-clinical|preclinical|animal|toxicolog/i) && kw(d, ['2'], /phase [123]|clinical (data|experience|stud|trial)|participants|patients/i), hint: 'Summarise preclinical and clinical experience in 2.1 and 2.2.1.' },
  { id: '2', group: 'Contents', text: 'Study rationale', m11: ['2.1', '4.2'], check: (d) => has(d, '2.1', '4.2'), hint: 'Write 2.1 and 4.2.' },
  { id: '3', group: 'Contents', text: 'Study objectives (primary and secondary) and their link to the design', m11: ['3', '4.2.1'], check: (d) => objectives(d) && (!secondary(d) || d.objectives.some((o) => o.level === 'Secondary')) && estimandsDone(d), hint: 'Write the objectives and their estimands.' },
  { id: '4(a)', group: 'Contents', text: 'Design overview: type of study, treatment groups, number of subjects, study periods', m11: ['1.1.2', '4.1'], check: (d) => design(d) && ds(d, 'Target/Maximum Number of Participants') && d.epochs.length > 0, hint: 'Fill 1.1.2 and the epochs.' },
  { id: '4(b)', group: 'Contents', text: 'Flow chart of the study', m11: ['1.2', '1.3'], check: (d) => d.epochs.length > 0 && schedule(d), hint: 'The schema (1.2) and schedule of activities (1.3) serve as the flow chart.' },
  { id: '4(c)', group: 'Contents', text: 'Brief description of methods and procedures', m11: ['8.1'], check: (d) => has(d, '8.1'), hint: 'Write 8.1.' },
  { id: '4(d)', group: 'Contents', text: 'Reasons for the chosen design', m11: ['4.2'], check: (d) => has(d, '4.2.2', '4.2.3'), hint: 'Write 4.2.2 and 4.2.3.' },
  { id: '5', group: 'Contents', text: 'Study population', m11: ['5.1'], check: (d) => has(d, '5.1'), hint: 'Write 5.1.' },
  { id: '6', group: 'Contents', text: 'Subject eligibility: inclusion and exclusion criteria', m11: ['5.2', '5.3'], check: criteria, hint: 'Write the criteria.' },
  { id: '7', group: 'Contents', text: 'Study assessments', m11: ['8.3', '8.4'], check: (d) => has(d, '8.3', '8.4'), hint: 'Write 8.3 and 8.4.' },
  { id: '8', group: 'Contents', text: 'Study conduct: visit-by-visit description, discontinued subjects, protocol violations', m11: ['1.3', '7', '11.10'], check: (d) => schedule(d) && has(d, '7.1', '7.2', '11.10'), hint: 'Build the schedule and write 7.1, 7.2 and 11.10.' },
  { id: '9(a)', group: 'Contents', text: 'Study treatment: dosing schedule', m11: ['6.1'], check: doses, hint: 'Give the dose and frequency of each intervention.' },
  { id: '9(b)', group: 'Contents', text: 'Study drug supply and administration', m11: ['6.3', '6.6'], check: (d) => has(d, '6.3', '6.6'), hint: 'Write 6.3 and 6.6.' },
  { id: '9(c)', group: 'Contents', text: 'Dose modification for toxicity', m11: ['6.4'], check: (d) => has(d, '6.4'), hint: 'Write 6.4 (or say no modification is allowed).' },
  { id: '9(d)', group: 'Contents', text: 'Possible drug interactions', m11: ['6.10', '2.2.1'], check: (d) => kw(d, ['6', '2.2'], /interact|CYP|inhibitor|inducer/i), hint: 'Name likely interactions (for example CYP3A4 inhibitors) in 6.10.' },
  { id: '9(e)', group: 'Contents', text: 'Concomitant therapy', m11: ['6.10'], check: (d) => has(d, '6.10'), hint: 'Write 6.10.' },
  { id: '9(f)', group: 'Contents', text: 'Blinding procedures', m11: ['6.7'], applies: blinded, check: (d) => ds(d, 'Blinded Roles') && has(d, '6.7'), hint: 'Write 6.7.' },
  { id: '9(g)', group: 'Contents', text: 'Unblinding procedures', m11: ['6.7'], applies: blinded, check: (d) => kw(d, ['6.7'], /unblind|break/i), hint: 'Describe unblinding in 6.7.' },
  { id: '10', group: 'Contents', text: 'Adverse events (with serious adverse events reported within 24 hours of the investigator learning of them)', m11: ['9.1', '9.2'], check: (d) => has(d, '9.1', '9.2') && kw(d, ['9'], /24 hours/i), hint: 'Write 9.1 and 9.2; the NDCT Rules require SAE reports within 24 hours.' },
  { id: '11(a)', group: 'Contents', text: 'Ethical considerations: risk and benefit assessment', m11: ['2.2.3'], check: (d) => has(d, '2.2.3'), hint: 'Write 2.2.3.' },
  { id: '11(b)', group: 'Contents', text: 'Ethics committee review and communications', m11: ['11.1'], check: (d) => kw(d, ['11.1'], /ethics committee|\bIEC\b|\bIRB\b|\bEC\b/i), hint: 'Describe ethics committee review in 11.1.' },
  { id: '11(c)', group: 'Contents', text: 'Informed consent process (with audio-visual recording where the Rules require it)', m11: ['11.3', '12.2'], check: (d) => has(d, '11.3'), hint: 'Write 11.3; in 12.2 (India) note audio-visual recording of consent where it applies.' },
  { id: '11(d)', group: 'Contents', text: 'Subject confidentiality, data ownership and coding', m11: ['11.8', '11.7'], check: (d) => has(d, '11.8') && kw(d, ['11.7', '11.8'], /code|coded|pseudonym|participant number|identification/i), hint: 'Write 11.8 and say how participants are coded.' },
  { id: '12', group: 'Contents', text: 'Study monitoring and supervision', m11: ['11.2', '11.6'], check: (d) => has(d, '11.6') || kw(d, ['11'], /monitor/i), hint: 'Write 11.6.' },
  { id: '13(a)', group: 'Investigational product management', text: 'Product description and packaging', m11: ['6.1', '6.6'], check: (d) => has(d, '6.1') && kw(d, ['6.1', '6.6'], /tablet|capsule|vial|pack|bottle|blister|syringe/i), hint: 'Describe the dose form and packaging in 6.1.' },
  { id: '13(b)', group: 'Investigational product management', text: 'Precise dosing', m11: ['6.1'], check: doses, hint: 'Give the dose of each product.' },
  { id: '13(c)', group: 'Investigational product management', text: 'Packaging, labelling and blinding', m11: ['6.6', '6.7'], check: (d) => kw(d, ['6.6', '6.7'], /label/i), hint: 'Describe labelling in 6.6.' },
  { id: '13(d)', group: 'Investigational product management', text: 'Treatment assignment and subject identification coding', m11: ['6.7'], check: (d) => has(d, '6.7'), hint: 'Write 6.7.' },
  { id: '13(e)', group: 'Investigational product management', text: 'Storage conditions', m11: ['6.6'], check: (d) => kw(d, ['6.6'], /stor|°C|temperature/i), hint: 'Give storage conditions in 6.6.' },
  { id: '13(f)', group: 'Investigational product management', text: 'Accountability for receipt, dispensing and return', m11: ['6.6'], check: (d) => kw(d, ['6.6'], /accountab/i), hint: 'Describe accountability in 6.6.' },
  { id: '13(g)', group: 'Investigational product management', text: 'Handling of unused product', m11: ['6.6'], check: (d) => kw(d, ['6.6'], /unused|destr|return/i), hint: 'Say what happens to unused product in 6.6.' },
  { id: '14', group: 'Contents', text: 'Data analysis: sample size, endpoints and statistical methods', m11: ['10'], check: (d) => has(d, '10.11', '10.4') && endpoints(d), hint: 'Write section 10.' },
  { id: '15', group: 'Contents', text: 'Undertaking by the investigator (Table 4 of the Third Schedule)', m11: ['12.2'], check: (d) => kw(d, ['12'], /undertaking/i), hint: 'Note in 12.2 (India) that each investigator signs the Table 4 undertaking, kept with the protocol.' },
  { id: '16', group: 'Contents', text: 'Appendices', m11: ['12', '13', '14'], check: (d) => has(d, '13') || has(d, '14') || has(d, '12.1'), hint: 'Fill the appendices (12 to 14).' },
]

// ---------- US: 21 CFR 312.23(a)(6) ----------
const p1 = (d: ProtocolData) => /phase 1|phase i\b|early phase/i.test(d.title['Trial Phase'] ?? '') && !/phase 1\/2/i.test(d.title['Trial Phase'] ?? '')
const IND: CwItem[] = [
  { id: '(iii)(a)', group: '(a)(6)(iii) Contents', text: 'Statement of the objectives and purpose of the study', m11: ['2.1', '3'], check: (d) => objectives(d) && has(d, '2.1'), hint: 'Write 2.1 and the objectives.' },
  { id: '(iii)(b)', group: '(a)(6)(iii) Contents', text: 'Name, address and qualifications of each investigator and subinvestigator, research facilities, and each reviewing IRB', m11: ['12.2'], check: (d) => kw(d, ['12.2'], /1572|investigator/i) && kw(d, ['12.2'], /IRB|institutional review board/i), hint: 'Give US investigators, facilities and IRBs in 12.2 (United States), or refer to each Form FDA 1572 in the IND.' },
  { id: '(iii)(c)', group: '(a)(6)(iii) Contents', text: 'Criteria for patient selection and exclusion, and the estimated number of patients', m11: ['5.2', '5.3', '1.1.2:Target/Maximum Number of Participants'], phase1: true, check: (d) => criteria(d) && ds(d, 'Target/Maximum Number of Participants'), hint: 'Write the criteria and the target number of participants.' },
  { id: '(iii)(d)', group: '(a)(6)(iii) Contents', text: 'Design, including the control group and methods to minimise bias', m11: ['1.1.2', '4.1', '6.7'], check: (d) => design(d) && ds(d, 'Control Description') && has(d, '6.7'), hint: 'Fill the design elements, the control description and 6.7.' },
  { id: '(iii)(e)', group: '(a)(6)(iii) Contents', text: 'How doses are chosen, the planned maximum dose and the duration of exposure', m11: ['6.1', '6.2', '1.1.2:Total Planned Duration of Trial Intervention'], phase1: true, check: (d) => doses(d) && has(d, '6.2') && (ds(d, 'Total Planned Duration of Trial Intervention') || d.interventions.some((i) => i.durationWeeks > 0)), hint: 'Justify the doses in 6.2, give the maximum dose, and fill the planned duration of intervention.' },
  { id: '(iii)(f)', group: '(a)(6)(iii) Contents', text: 'Observations and measurements to meet the objectives', m11: ['3', '8.3', '1.3'], check: (d) => endpoints(d) && has(d, '8.3') && schedule(d), hint: 'Link each endpoint to its procedures and visits, and write 8.3.' },
  { id: '(iii)(g)', group: '(a)(6)(iii) Contents', text: 'Clinical procedures, laboratory tests or other measures to monitor drug effects and minimise risk', m11: ['8.4', '12.1', '2.2.1'], phase1: true, check: (d) => has(d, '8.4', '2.2.1') && (!labs(d) || has(d, '12.1')), hint: 'Write 8.4, the mitigations in 2.2.1, and the laboratory tests in 12.1.' },
  { id: '(ii)', group: '(a)(6)(i)–(ii) Level of detail', text: 'Phase 2 and 3: a detailed protocol, with contingencies for foreseeable deviations (for example rescue or early escape of non-responders)', m11: ['6.4', '6.9', '7.1'], applies: (d) => !p1(d), check: (d) => has(d, '7.1') && (has(d, '6.9') || has(d, '6.4')), hint: 'Write the contingencies: dose modification (6.4), rescue (6.9) and discontinuation (7.1).' },
  { id: '(i)', group: '(a)(6)(i)–(ii) Level of detail', text: 'Phase 1: an outline giving the estimated number of participants, safety exclusions and the dosing plan; vital signs and blood chemistries in detail', m11: ['5.3', '6.1', '8.4'], applies: p1, check: (d) => criteria(d) && doses(d) && kw(d, ['8.4'], /vital|chemistr|laborator/i), hint: 'Detail the safety-critical elements: exclusions, dosing and safety monitoring.' },
]

export const FRAMEWORKS: Framework[] = [
  { id: 'spirit', name: 'SPIRIT 2025', short: 'SPIRIT', source: 'SPIRIT 2025 statement (BMJ 2025;389:e081477; JAMA 2025), 34 items', items: SPIRIT },
  { id: 'ctr', name: 'EU CTR Annex I, section D', short: 'EU CTR', source: 'Regulation (EU) No 536/2014, Annex I, section D, paragraphs 15 to 24', items: CTR },
  { id: 'ndct', name: 'India NDCT Rules, Table 2', short: 'NDCT', source: 'New Drugs and Clinical Trials Rules 2019, Third Schedule, Table 2', items: NDCT },
  { id: 'ind', name: 'US 21 CFR 312.23(a)(6)', short: '312.23', source: '21 CFR 312.23(a)(6): protocols in an IND', items: IND },
]
export const framework = (id: FrameworkId) => FRAMEWORKS.find((f) => f.id === id)!

export interface ItemResult { item: CwItem; status: Status }
export interface Coverage { id: FrameworkId; name: string; results: ItemResult[]; covered: number; scored: number; pct: number; gaps: ItemResult[] }
export function statusOf(it: CwItem, d: ProtocolData, fw: FrameworkId): Status {
  if (it.applies && !it.applies(d)) return 'n/a'
  if (it.check(d)) return 'covered'
  if (it.optional) return 'optional'
  if (fw === 'ind' && p1(d) && !it.phase1 && it.id.startsWith('(iii)') && it.id !== '(iii)(a)') return 'optional'
  return 'gap'
}
export function coverage(d: ProtocolData, id: FrameworkId): Coverage {
  const fw = framework(id)
  const results = fw.items.map((item) => ({ item, status: statusOf(item, d, id) }))
  const scored = results.filter((r) => r.status === 'covered' ? !r.item.optional : r.status === 'gap').length
  const covered = results.filter((r) => r.status === 'covered' && !r.item.optional).length
  return { id, name: fw.name, results, covered, scored, pct: scored ? Math.round((100 * covered) / scored) : 100, gaps: results.filter((r) => r.status === 'gap') }
}
export const allCoverage = (d: ProtocolData) => FRAMEWORKS.map((f) => coverage(d, f.id))

/** The cross-walk items a section serves, for the badges beside each section. */
export function itemsFor(num: string): { fw: string; id: string; text: string }[] {
  return FRAMEWORKS.flatMap((f) => f.items.filter((i) => i.m11.some((m) => m === num || m.split(':')[0] === num || (m !== 'TP' && num.startsWith(m + '.')))).map((i) => ({ fw: f.short, id: i.id, text: i.text })))
}

// The protocol as CDISC USDM v4 data (Unified Study Definitions Model, version 4.0, June 2025),
// for the Digital Data Flow: Study → StudyVersion → InterventionalStudyDesign, with arms, epochs,
// elements and cells, encounters, activities with their biomedical concepts, the main schedule
// timeline with its scheduled activity instances and timings, objectives, endpoints, estimands
// with intercurrent events, analysis populations, eligibility criteria, the population, study
// roles with masking, the study interventions with their administrable products, and the M11
// narrative as the protocol document's NarrativeContent.
//
// Codes: every coded value uses CDISC Controlled Terminology (release 2026-03-27) from the value
// set USDM names for that attribute (ct-usdm.json); the language uses ISO 639-1. Activities link
// to CDISC Biomedical Concepts (bc-cdisc.json) where the CDISC library has them, grouped in a
// BiomedicalConceptCategory per procedure; a procedure the library has no concept for (a disease
// scale such as IGA-CHE, a pregnancy test, drug dispensing) is a BiomedicalConceptSurrogate, as
// USDM intends. The CDASH fields of each procedure and the app's key facts travel in
// ExtensionAttributes, so a re-import is lossless and the EDC Study Build Lab can draft forms.
// The export passes the DDF conformance rules of the usdm4 reference library (d4k engine).
//
// Two files are written: the full export, and a teaching subset with only the classes the EDC
// Study Build Lab reads to draft a database build. The subset is cut from the full export, so the
// two always agree.

import { TOC } from './m11'
import CT from './ct-usdm.json'
import BCLIB from './bc-cdisc.json'
import type { ProtocolData, Procedure, Visit, Intervention } from './types'

const CS = 'http://www.cdisc.org', CT_VER = CT.version
export const EXT_URL = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/ext/key-facts'
export const CDASH_URL = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/ext/cdash-fields'
let seq = 0
const cid = () => `Code_${++seq}`
export const code = (c: string, decode: string, system = CS, version = CT_VER) => ({ id: cid(), code: c, codeSystem: system, codeSystemVersion: version, decode, instanceType: 'Code' as const })
const alias = (c: ReturnType<typeof code>) => ({ id: `Alias${c.id}`, standardCode: c, standardCodeAliases: [], instanceType: 'AliasCode' as const })
type Term = [string, string, string]
const LISTS = CT.codelists as unknown as Record<string, { name: string; terms: Term[] }>
// A CDISC term from a codelist, found by C-code, submission value or preferred term. The decode is
// the submission value for the DDF value sets and the preferred term for SDTM codelists (whose
// submission values are upper-case codes).
export function term(list: string, key: string) {
  const k = key.trim().toLowerCase()
  const t = LISTS[list]?.terms.find((x) => x[0].toLowerCase() === k || x[1].toLowerCase() === k || x[2].toLowerCase() === k)
  if (!t) throw new Error(`“${key}” is not in CDISC codelist ${list} (${LISTS[list]?.name ?? 'unknown'}).`)
  return code(t[0], t[1] === t[1].toUpperCase() && /[A-Z]/.test(t[1]) ? t[2] : t[1])
}
const termOr = (list: string, key: string, fallback: string) => { try { return term(list, key) } catch { return term(list, fallback) } }
// A deterministic UUID for Study.id (USDM requires a UUID there).
function uuidOf(s: string) {
  let h = ''
  for (let seed = 1; h.length < 32; seed++) { let x = 0x811c9dc5 ^ seed; for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0 } h += x.toString(16).padStart(8, '0') }
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const dur = (n: number) => `P${Math.abs(Math.round(n))}D`
const ARM_TYPE: Record<string, string> = { Investigational: 'C174266', Placebo: 'C174268', 'Active comparator': 'C174267', 'No intervention': 'C174270' }
const ROLE: Record<string, string> = { Investigational: 'C41161', Placebo: 'C753', Rescue: 'C165835', Auxiliary: 'C165822' }
const ROUTE: Record<string, string> = { oral: 'ORAL', inhalation: 'RESPIRATORY (INHALATION)', inhaled: 'RESPIRATORY (INHALATION)', topical: 'TOPICAL', subcutaneous: 'SUBCUTANEOUS', intravenous: 'INTRAVENOUS' }
const FREQ: Record<string, string> = { 'once daily': 'QD', 'twice daily': 'BID', 'as needed': 'PRN', 'once weekly': 'QS' }
const UNIT: Record<string, string> = { mg: 'mg', 'µg': 'ug', ug: 'ug', g: 'g', ml: 'mL', iu: 'IU', tablet: 'TABLET', capsule: 'CAPSULE', inhalation: 'INHALATION', puff: 'PUFF', application: 'APPLICATION' }
const SETTING: Record<Visit['type'], string> = { 'On site': 'CLINIC', Remote: 'HOME', Phone: 'HOME', 'Home nurse': 'HOME' }
const CONTACT: Record<Visit['type'], string> = { 'On site': 'C175574', Remote: 'C171525', Phone: 'C171537', 'Home nurse': 'C175574' }
const EPOCH: Record<string, string> = { Screening: 'SCREENING', Treatment: 'TREATMENT', 'Follow-up': 'FOLLOW-UP', 'Run-in': 'RUN-IN', Washout: 'WASHOUT' }
export function doseForm(i: Intervention) {
  const t = `${i.dose} ${i.route}`.toLowerCase()
  return i.form || (/film/.test(t) ? 'TABLET, FILM COATED' : /tablet/.test(t) ? 'TABLET' : /capsule/.test(t) ? 'CAPSULE' : /inhal/.test(t) ? 'INHALANT' : /topical|cream|corticosteroid/.test(t) ? 'CREAM' : 'TABLET')
}

// CDISC Biomedical Concepts for each procedure concept (a procedure's own `bcs` overrides this).
export const CONCEPT_BCS: Record<string, string[]> = {
  'Informed Consent Obtained': ['INFORMED CONSENT OBTAINED'], Demographics: ['AGE', 'SEX', 'RACE'], 'Eligibility Criteria Not Met': ['ELIGIBILITY CRITERIA MET'],
  'Medical History': ['MEDICAL HISTORY FREE TEXT FORMAT'], 'Vital Signs (Blood Pressure, Pulse)': ['SYSTOLIC BLOOD PRESSURE', 'DIASTOLIC BLOOD PRESSURE', 'PULSE'],
  'Body Weight': ['WEIGHT', 'BODY MASS INDEX'], 'Body Height': ['HEIGHT'],
  'Hepatitis B Screening Panel': ['HEPATITIS B VIRUS SURFACE ANTIGEN PRESENCE IN SERUM OR PLASMA', 'MICROBIAL-INDUCED IGG ANTIBODY FOR HEPATITIS B VIRUS CORE ANTIGEN', 'HEPATITIS B VIRUS DNA CONCENTRATION IN SERUM OR PLASMA'],
  'Local Safety Laboratory Panel': ['POTASSIUM CONCENTRATION IN SERUM OR PLASMA', 'CREATININE CONCENTRATION IN SERUM OR PLASMA', 'ALANINE AMINOTRANSFERASE CONCENTRATION IN SERUM OR PLASMA'],
  '12-Lead ECG': ['QTCF INTERVAL AGGREGATE'], 'Adverse Event': ['ADVERSE EVENT FREE TEXT FORMAT'], 'Concomitant Medication': ['CONCOMITANT MEDICATION FREE TEXT FORMAT'],
  Disposition: ['STUDY PARTICIPATION DISPOSITION'], Spirometry: ['FORCED EXPIRATORY VOLUME IN 1 SECOND (RE)', 'FORCED VITAL CAPACITY (RE)'],
}
type BcEntry = { name: string; label: string; synonyms: string[]; reference: string; code: [string, string]; properties: { name: string; label: string; datatype: string; isRequired: boolean; isEnabled: boolean; code: [string, string]; responses: [string, string][] }[] }
const BCS = (BCLIB as unknown as { concepts: Record<string, BcEntry> }).concepts
export const bcsOf = (p: Procedure) => (p.bcs ?? CONCEPT_BCS[p.concept] ?? []).filter((n) => BCS[n])
const bcId = (n: string) => `BC_${n.replace(/[^A-Z0-9]+/gi, '_').replace(/_+$/, '')}`

// The CDASH fields each procedure collects (what the EDC Study Build Lab drafts its forms from).
export const CONCEPT_PROPS: Record<string, string[]> = {
  'Informed Consent Obtained': ['DSSTDAT', 'ICVER'], Demographics: ['BRTHYR', 'SEX', 'RACE'], 'Eligibility Criteria Not Met': ['IEYN', 'IETESTCD'], 'Medical History': ['MHTERM', 'MHSTDAT', 'MHONGO'],
  'Vital Signs (Blood Pressure, Pulse)': ['VSDAT', 'SYSBP', 'DIABP', 'PULSE', 'WEIGHT'], 'Body Weight': ['WEIGHT'], 'Body Height': ['HEIGHT'],
  'Hepatitis B Screening Panel': ['HBVDAT', 'HBSAG', 'HBCAB', 'HBVDNA'], 'Central Laboratory Sample': ['LBPERF', 'LBREFID', 'LBDAT', 'LBTIM'], 'Local Safety Laboratory Panel': ['LBDAT', 'K', 'CREAT', 'ALT'],
  'Pregnancy Test (Choriogonadotropin Beta)': ['PREGCBP', 'PREGDAT', 'PREGTYP', 'PREGRES'], '12-Lead ECG': ['EGDAT', 'QTCF', 'EGINTP'],
  'Investigator Global Assessment for Chronic Hand Eczema': ['HEADAT', 'ASSESSOR', 'IGACHE'], 'Hand Eczema Severity Index': ['HECSI'], 'Itch Numeric Rating Scale': ['ITCHNRS'],
  'Study Drug Dispensing and Accountability': ['EXDISP', 'EXKIT', 'EXDSPQ', 'EXRET', 'EXCOMPL'], 'Adverse Event': ['AETERM', 'AESTDAT', 'AEONGO', 'AEENDAT', 'AESEV', 'AESER', 'AEREL', 'AEACN', 'AEOUT'],
  'Concomitant Medication': ['CMTRT', 'CMINDC', 'CMDSTXT', 'CMDOSU', 'CMROUTE', 'CMSTDAT', 'CMONGO', 'CMENDAT'], Disposition: ['DSDECOD', 'EOSDAT'],
  Spirometry: ['REDAT', 'FEV1', 'FVC'], 'COPD Assessment Test': ['QSDAT', 'CATTOT'],
}

const inst = (v: Visit | string) => `SAI_${typeof v === 'string' ? v : v.id}`
const anchorOf = (d: ProtocolData) => d.visits.find((v) => v.day === 1) ?? d.visits[0]
const isUns = (v: Visit) => v.lo < -9000
const epochOf = (d: ProtocolData, v: Visit) => d.epochs.find((e) => e.name === v.epoch || e.type === v.epoch)?.id ?? d.epochs[0]?.id
const activitiesAt = (d: ProtocolData, v: Visit) => d.procedures.filter((p) => (p.visits === 'continuous' ? v.day >= (d.visits.find((x) => x.id === p.from)?.day ?? 1) : p.visits.includes(v.id))).map((p) => `Activity_${p.id}`)
const phaseKey = (p: string) => ({ 'Early Phase 1': 'C54721', 'Phase 1': 'C15600', 'Phase 1/Phase 2': 'C15693', 'Phase 1/Phase 2/Phase 3': 'C198366', 'Phase 1/Phase 3': 'C198367', 'Phase 2': 'C15601', 'Phase 2/Phase 3': 'C15694', 'Phase 3': 'C15602', 'Phase 4': 'C15603' } as Record<string, string>)[p] ?? 'NOT APPLICABLE'
const modelKey = (m: string) => ({ 'Single Group': 'C82640', 'Parallel Group': 'C82639', 'Cross-over': 'C82637', Factorial: 'C82638', Sequential: 'C142568' } as Record<string, string>)[m] ?? 'C82639'

export function usdmOf(d: ProtocolData, meta: { userId?: string; version?: string } = {}) {
  seq = 0
  const id = d.title['Sponsor Protocol Identifier'] || 'UNNAMED'
  const visits = d.visits.filter((v) => !isUns(v)).sort((a, b) => a.day - b.day)
  const anchor = anchorOf(d)
  const timings = visits.map((v) => {
    const before = v.day < (anchor?.day ?? 1), isAnchor = v.id === anchor?.id
    return { id: `Timing_${v.id}`, name: `${v.id} timing`, label: v.name, description: '', type: term('C201264', isAnchor ? 'Fixed Reference' : before ? 'Before' : 'After'),
      value: dur(isAnchor ? 0 : before ? (anchor.day - v.day - 1) : v.day - anchor.day), valueLabel: `Day ${v.day}`,
      relativeToFrom: term('C201265', 'Start to Start'), relativeFromScheduledInstanceId: inst(v), relativeToScheduledInstanceId: inst(anchor),
      windowLower: isAnchor ? null : dur(v.day - v.lo), windowUpper: isAnchor ? null : dur(v.hi - v.day), windowLabel: isAnchor ? null : v.lo === v.hi ? `Day ${v.day}` : `Day ${v.lo} to ${v.hi}`, instanceType: 'Timing' as const }
  })
  const narr = TOC.filter((s) => (d.narrative[s.num] ?? '').trim())
  // Biomedical concepts: one instance per CDISC concept, shared by the activities that use it.
  const usedBcs = [...new Set(d.procedures.flatMap(bcsOf))]
  const biomedicalConcepts = usedBcs.map((n) => { const b = BCS[n]; return { id: bcId(n), name: b.name, label: b.label, synonyms: b.synonyms.filter((x) => x.toLowerCase() !== b.label.toLowerCase()), reference: b.reference, code: alias(code(b.code[0], b.code[1])),
    properties: b.properties.filter((p) => /^C\d+$/.test(p.code[0])).map((p, i) => ({ id: `${bcId(n)}_P${i + 1}`, name: `${b.code[1]}.${p.name}`, label: p.name, isRequired: p.isRequired, isEnabled: p.isEnabled, datatype: p.datatype || 'string', code: alias(code(p.code[0], p.code[1])),
      responseCodes: p.responses.map(([c, dcd], j) => ({ id: `${bcId(n)}_P${i + 1}_R${j + 1}`, name: `${b.code[1]}.${p.name}.${c}`, label: dcd, isEnabled: true, code: code(c, dcd), instanceType: 'ResponseCode' as const })), instanceType: 'BiomedicalConceptProperty' as const })), instanceType: 'BiomedicalConcept' as const } })
  const bcCategories = d.procedures.filter((p) => bcsOf(p).length).map((p) => ({ id: `BCC_${p.id}`, name: p.concept, label: p.name, description: `Biomedical concepts of ${p.name}`, childIds: [], memberIds: bcsOf(p).map(bcId), code: null, instanceType: 'BiomedicalConceptCategory' as const }))
  const bcSurrogates = d.procedures.filter((p) => !bcsOf(p).length).map((p) => ({ id: `BCS_${p.id}`, name: p.concept, label: p.name, description: `No CDISC biomedical concept in the library; described in protocol section ${p.section}.`, reference: `Protocol section ${p.section}`, instanceType: 'BiomedicalConceptSurrogate' as const }))
  const sponsorOrg = 'Organization_1'
  const blinded = (d.design['Blinded Roles'] ?? '').toLowerCase(), masked = d.design['Trial Blind Schema'] && d.design['Trial Blind Schema'] !== 'Open Label'
  const role = (rid: string, c: string, name: string, orgs: string[], isMasked?: boolean) => ({ id: rid, name, label: name, description: '', code: term('C215480', c), appliesToIds: ['StudyVersion_1'], assignedPersons: [], organizationIds: orgs,
    masking: isMasked === undefined ? null : { id: `Masking_${rid}`, text: isMasked ? `${name} is blinded to the treatment assignment.` : `${name} is not blinded.`, isMasked, instanceType: 'Masking' as const }, notes: [], instanceType: 'StudyRole' as const })
  const roles = [
    role('StudyRole_Sponsor', 'C70793', 'Sponsor', [sponsorOrg], masked ? /sponsor/.test(blinded) : undefined),
    ...(masked ? [role('StudyRole_Investigator', 'C25936', 'Investigator', [], /investigator/.test(blinded)), role('StudyRole_Subject', 'C41189', 'Study Subject', [], /participant|subject/.test(blinded)), role('StudyRole_Assessor', 'C207599', 'Outcomes Assessor', [], /assessor/.test(blinded))] : []),
    ...(/data monitoring/i.test(d.design['Independent Committees'] ?? '') ? [role('StudyRole_IDMC', 'C142578', 'Independent Data Monitoring Committee', [], masked ? false : undefined)] : []),
  ]
  const weeks = (n: number, text: string, vid: string, vary = false) => ({ id: vid, text, quantity: n ? { id: `${vid}_Q`, value: n, unit: alias(term('C71620', 'WEEKS')), instanceType: 'Quantity' as const } : null, durationWillVary: vary, reasonDurationWillVary: vary ? 'Used as needed.' : null, instanceType: 'Duration' as const })
  const unitOf = (u: string) => UNIT[u.toLowerCase()] ?? 'mg'
  return {
    usdmVersion: '4.0.0', systemName: 'Protocol Builder', systemVersion: '1.0',
    study: {
      id: uuidOf(id), name: id, label: d.title['Trial Acronym'] ?? '', description: d.title['Short Title'] ?? '', instanceType: 'Study' as const,
      documentedBy: [{ id: 'SDD_1', name: 'Protocol', label: `${id} protocol`, description: 'Clinical trial protocol in the ICH M11 structure', language: code('en', 'English', 'ISO 639-1', '2007'), type: term('C215477', 'Protocol'), templateName: 'ICH M11 CeSHarP', childIds: [], notes: [], instanceType: 'StudyDefinitionDocument' as const,
        versions: [{ id: 'SDDV_1', version: d.title['Version Number'] ?? meta.version ?? '1', status: term('C188723', 'Draft'), dateValues: [], notes: [], instanceType: 'StudyDefinitionDocumentVersion' as const,
          contents: narr.map((s, i) => ({ id: `NC_${s.num}`, name: `NC_${s.num}`, sectionNumber: s.num, sectionTitle: s.title, displaySectionNumber: true, displaySectionTitle: true, contentItemId: `NCI_${s.num}`, childIds: [], previousId: i ? `NC_${narr[i - 1].num}` : null, nextId: narr[i + 1] ? `NC_${narr[i + 1].num}` : null, instanceType: 'NarrativeContent' as const })) }] }],
      versions: [{
        id: 'StudyVersion_1', versionIdentifier: d.title['Version Number'] ?? '1', rationale: d.title['Original Protocol Indicator'] === 'No' ? `Amendment ${d.title['Amendment Identifier'] ?? ''}` : 'Original protocol', instanceType: 'StudyVersion' as const,
        documentVersionIds: ['SDDV_1'],
        titles: [
          { id: 'StudyTitle_1', text: d.title['Full Title'] ?? '', type: term('C207419', 'Official Study Title'), instanceType: 'StudyTitle' as const },
          ...(d.title['Short Title'] ? [{ id: 'StudyTitle_2', text: d.title['Short Title'], type: term('C207419', 'Brief Study Title'), instanceType: 'StudyTitle' as const }] : []),
          ...(d.title['Trial Acronym'] ? [{ id: 'StudyTitle_3', text: d.title['Trial Acronym'], type: term('C207419', 'Study Acronym'), instanceType: 'StudyTitle' as const }] : []),
        ],
        studyIdentifiers: [{ id: 'StudyIdentifier_1', text: id, scopeId: sponsorOrg, instanceType: 'StudyIdentifier' as const }],
        organizations: [{ id: sponsorOrg, name: (d.title['Sponsor Name and Address'] || 'Sponsor').split(',')[0], label: d.title['Sponsor Name and Address'] ?? '', type: term('C188724', 'Pharmaceutical Company'), identifier: id, identifierScheme: 'Sponsor protocol identifier', legalAddress: null, managedSites: [], instanceType: 'Organization' as const }],
        roles,
        administrableProducts: d.interventions.map((i) => ({ id: `AdministrableProduct_${i.id}`, name: i.name, label: i.dose, description: i.dose, administrableDoseForm: alias(term('C66726', doseForm(i))), productDesignation: term('C207418', i.role === 'Rescue' || i.role === 'Auxiliary' ? 'NIMP' : 'IMP'), sourcing: null, properties: [], identifiers: [], ingredients: [], notes: [], instanceType: 'AdministrableProduct' as const })),
        studyInterventions: d.interventions.map((i) => ({ id: `StudyIntervention_${i.id}`, name: i.name, label: i.dose, description: `${i.dose}, ${i.route.toLowerCase()}, ${i.frequency}`, role: term('C207417', ROLE[i.role]), type: term('C99078', 'DRUG'), codes: [], notes: [],
          administrations: [{ id: `Administration_${i.id}`, name: `${i.name} administration`, label: '', description: '', dose: { id: `Dose_${i.id}`, value: i.doseValue, unit: alias(term('C71620', unitOf(i.doseUnit))), instanceType: 'Quantity' as const },
            route: alias(termOr('C66729', ROUTE[i.route.toLowerCase()] ?? i.route, 'ORAL')), frequency: alias(termOr('C71113', FREQ[i.frequency.toLowerCase()] ?? i.frequency, 'QD')),
            duration: i.durationWeeks ? weeks(i.durationWeeks, `${i.durationWeeks} weeks`, `Duration_${i.id}`) : weeks(0, 'As needed', `Duration_${i.id}`, true),
            administrableProductId: `AdministrableProduct_${i.id}`, medicalDeviceId: null, notes: [], instanceType: 'Administration' as const }],
          minimumResponseDuration: null, instanceType: 'StudyIntervention' as const })),
        biomedicalConcepts, bcCategories, bcSurrogates,
        eligibilityCriterionItems: d.criteria.map((c) => ({ id: `ECI_${c.code}`, name: c.code, text: c.text, dictionaryId: null, instanceType: 'EligibilityCriterionItem' as const })),
        narrativeContentItems: narr.map((s) => ({ id: `NCI_${s.num}`, name: `NCI_${s.num}`, text: d.narrative[s.num], instanceType: 'NarrativeContentItem' as const })),
        amendments: [],
        extensionAttributes: [{ id: 'Ext_1', url: EXT_URL, valueString: JSON.stringify({ facts: d.facts, statements: d.statements, multiplicity: d.multiplicity, rescue: d.rescue, aeFrom: d.aeFrom, aeTo: d.aeTo, title: d.title, design: d.design, procedures: d.procedures.map((p) => ({ id: p.id, section: p.section, concept: p.concept, form: p.form, purpose: p.purpose, footnote: p.footnote, from: p.from, bloodMl: p.bloodMl, minutes: p.minutes, bcs: p.bcs })), criteria: d.criteria.map((c) => ({ code: c.code, procedureIds: c.procedureIds })), endpoints: d.endpoints.map((e) => ({ id: e.id, variableType: e.variableType, procedureIds: e.procedureIds, visitIds: e.visitIds })), objectives: d.objectives.map((o) => ({ id: o.id, kind: o.kind })), estimands: d.estimands.map((e) => ({ id: e.id, objectiveId: e.objectiveId, population: e.population, estimator: e.estimator, missing: e.missing, sensitivity: e.sensitivity, treatment: e.treatment })), visits: d.visits.map((v) => ({ id: v.id, type: v.type, epoch: v.epoch })), interventions: d.interventions, arms: d.arms.map((a) => ({ id: a.id, intervention: a.intervention, ratio: a.ratio, type: a.type })) }), extensionAttributes: [], instanceType: 'ExtensionAttribute' as const }],
        studyDesigns: [{
          id: 'StudyDesign_1', name: `${d.title['Trial Acronym'] || id} design`, label: '', description: d.narrative['4.1'] ?? '', instanceType: 'InterventionalStudyDesign' as const,
          rationale: d.narrative['4.2.2'] || d.narrative['4.1'] || 'See protocol section 4.2.',
          model: term('C99076', modelKey(d.design['Intervention Model'] ?? '')), studyType: term('C99077', 'INTERVENTIONAL'),
          studyPhase: alias(term('C66737', phaseKey(d.title['Trial Phase'] ?? ''))), blindingSchema: d.design['Trial Blind Schema'] ? alias(term('C66735', d.design['Trial Blind Schema'])) : null,
          intentTypes: [term('C66736', 'TREATMENT')], subTypes: [], therapeuticAreas: [], characteristics: [], biospecimenRetentions: [], documentVersionIds: [], notes: [],
          indications: [{ id: 'Indication_1', name: d.design['Population Diagnosis or Condition'] || 'Condition', label: '', description: d.design['Population Diagnosis or Condition'] ?? '', codes: [], isRareDisease: false, notes: [], instanceType: 'Indication' as const }],
          studyInterventionIds: d.interventions.map((i) => `StudyIntervention_${i.id}`),
          arms: d.arms.map((a) => ({ id: `StudyArm_${a.id}`, name: a.name, label: a.name, description: a.intervention, type: term('C174222', ARM_TYPE[a.type]), dataOriginType: term('C188727', 'Data Generated Within Study'), dataOriginDescription: 'Data collected in this trial', populationIds: [], notes: [], instanceType: 'StudyArm' as const })),
          epochs: d.epochs.map((e, i) => ({ id: `StudyEpoch_${e.id}`, name: e.name, label: e.name, description: '', type: term('C99079', EPOCH[e.type] ?? 'TREATMENT'), previousId: i ? `StudyEpoch_${d.epochs[i - 1].id}` : null, nextId: d.epochs[i + 1] ? `StudyEpoch_${d.epochs[i + 1].id}` : null, notes: [], instanceType: 'StudyEpoch' as const })),
          elements: [...d.epochs.filter((e) => e.type !== 'Treatment').map((e) => ({ id: `StudyElement_${e.id}`, name: e.name, label: e.name, description: '', transitionStartRule: null, transitionEndRule: null, studyInterventionIds: [], notes: [], instanceType: 'StudyElement' as const })),
            ...d.arms.map((a) => ({ id: `StudyElement_${a.id}`, name: a.name, label: a.intervention, description: '', transitionStartRule: null, transitionEndRule: null, studyInterventionIds: d.interventions.filter((i) => a.intervention.toLowerCase().includes(i.name.toLowerCase().split(' (')[0])).map((i) => `StudyIntervention_${i.id}`), notes: [], instanceType: 'StudyElement' as const }))],
          studyCells: d.arms.flatMap((a) => d.epochs.map((e) => ({ id: `StudyCell_${a.id}_${e.id}`, armId: `StudyArm_${a.id}`, epochId: `StudyEpoch_${e.id}`, elementIds: [e.type === 'Treatment' ? `StudyElement_${a.id}` : `StudyElement_${e.id}`], instanceType: 'StudyCell' as const }))),
          population: { id: 'Population_1', name: 'Trial population', label: '', description: d.narrative['5.1'] ?? '', includesHealthySubjects: d.design['Population Type'] === 'Without Disease',
            plannedEnrollmentNumber: { id: 'Enrol_1', value: d.facts.participants, unit: null, instanceType: 'Quantity' as const }, plannedCompletionNumber: null,
            plannedAge: { id: 'Age_1', minValue: { id: 'AgeMin_1', value: d.facts.ageMin, unit: alias(term('C71620', 'YEARS')), instanceType: 'Quantity' as const }, maxValue: { id: 'AgeMax_1', value: d.facts.ageMax, unit: alias(term('C71620', 'YEARS')), instanceType: 'Quantity' as const }, isApproximate: false, instanceType: 'Range' as const },
            plannedSex: [term('C66732', 'F'), term('C66732', 'M')], criterionIds: d.criteria.map((c) => `EC_${c.code}`), cohorts: [], notes: [], instanceType: 'StudyDesignPopulation' as const },
          analysisPopulations: d.analysisSets.map((a) => ({ id: `AnalysisPopulation_${a.id}`, name: a.name, label: a.name, description: '', text: a.text, subsetOfIds: [], notes: [], instanceType: 'AnalysisPopulation' as const })),
          encounters: visits.map((v, i) => ({ id: `Encounter_${v.id}`, name: v.id, label: v.name, description: v.name, type: term('C188728', 'Visit'), environmentalSettings: [term('C127262', SETTING[v.type] ?? 'CLINIC')], contactModes: [term('C171445', CONTACT[v.type] ?? 'C175574')], scheduledAtId: `Timing_${v.id}`, previousId: i ? `Encounter_${visits[i - 1].id}` : null, nextId: visits[i + 1] ? `Encounter_${visits[i + 1].id}` : null, transitionStartRule: null, transitionEndRule: null, notes: [], instanceType: 'Encounter' as const })),
          activities: d.procedures.map((p, i) => ({ id: `Activity_${p.id}`, name: p.name, label: p.name, description: `Protocol section ${p.section}`, biomedicalConceptIds: [], bcCategoryIds: bcsOf(p).length ? [`BCC_${p.id}`] : [], bcSurrogateIds: bcsOf(p).length ? [] : [`BCS_${p.id}`], timelineId: null, childIds: [], definedProcedures: [], previousId: i ? `Activity_${d.procedures[i - 1].id}` : null, nextId: d.procedures[i + 1] ? `Activity_${d.procedures[i + 1].id}` : null,
            extensionAttributes: [{ id: `ExtCdash_${p.id}`, url: CDASH_URL, valueString: (CONCEPT_PROPS[p.concept] ?? []).join(','), extensionAttributes: [], instanceType: 'ExtensionAttribute' as const }],
            notes: p.footnote ? [{ id: `Note_${p.id}`, text: p.footnote, codes: [], instanceType: 'CommentAnnotation' as const }] : [], instanceType: 'Activity' as const })),
          eligibilityCriteria: d.criteria.map((c, i) => ({ id: `EC_${c.code}`, name: c.code, label: c.code, description: '', identifier: c.code, category: term('C66797', c.category === 'Inclusion' ? 'INCLUSION' : 'EXCLUSION'), criterionItemId: `ECI_${c.code}`, previousId: i ? `EC_${d.criteria[i - 1].code}` : null, nextId: d.criteria[i + 1] ? `EC_${d.criteria[i + 1].code}` : null, contextId: null, notes: [], instanceType: 'EligibilityCriterion' as const })),
          objectives: d.objectives.map((o) => ({ id: `Objective_${o.id}`, name: o.id, label: '', description: '', text: o.text, level: term('C188725', o.level === 'Primary' ? 'C85826' : o.level === 'Secondary' ? 'C85827' : 'C163559'), dictionaryId: null, notes: [],
            endpoints: o.endpointIds.map((eid) => d.endpoints.find((e) => e.id === eid)).filter((e) => !!e).map((e) => ({ id: `Endpoint_${e!.id}`, name: e!.id, label: '', description: '', text: e!.text, purpose: e!.purpose, level: term('C188726', e!.level === 'Primary' ? 'C94496' : e!.level === 'Secondary' ? 'C139173' : 'C170559'), dictionaryId: null, notes: [], instanceType: 'Endpoint' as const })), instanceType: 'Objective' as const })),
          estimands: d.estimands.map((e) => ({ id: `Estimand_${e.id}`, name: e.id, label: '', description: e.treatment, populationSummary: e.summary, analysisPopulationId: `AnalysisPopulation_${e.analysisSetId}`, variableOfInterestId: `Endpoint_${e.endpointId}`, interventionIds: d.interventions.filter((i) => i.role !== 'Rescue').map((i) => `StudyIntervention_${i.id}`), notes: [],
            intercurrentEvents: e.intercurrentEvents.map((ie) => ({ id: `IntercurrentEvent_${ie.id}`, name: `${e.id}: ${ie.name}`, label: ie.name, description: ie.description, text: ie.description, dictionaryId: null, strategy: ie.strategy, notes: [], instanceType: 'IntercurrentEvent' as const })), instanceType: 'Estimand' as const })),
          scheduleTimelines: [{ id: 'Timeline_1', name: 'Main timeline', label: 'Schedule of activities', description: '', mainTimeline: true, entryCondition: 'Informed consent signed', entryId: visits[0] ? inst(visits[0]) : '', plannedDuration: weeks(d.facts.participationWeeks, `Up to ${d.facts.participationWeeks} weeks`, 'Duration_Timeline'), exits: [{ id: 'Exit_1', instanceType: 'ScheduleTimelineExit' as const }], instanceType: 'ScheduleTimeline' as const,
            instances: visits.map((v, i) => ({ id: inst(v), name: v.id, label: v.name, description: '', encounterId: `Encounter_${v.id}`, activityIds: activitiesAt(d, v), epochId: `StudyEpoch_${epochOf(d, v)}`, defaultConditionId: visits[i + 1] ? inst(visits[i + 1]) : null, timelineExitId: visits[i + 1] ? null : 'Exit_1', timelineId: null, instanceType: 'ScheduledActivityInstance' as const })),
            timings }],
        }],
      }],
    },
  }
}
export type Usdm = ReturnType<typeof usdmOf>

// The teaching subset the EDC Study Build Lab reads, cut from the full export.
export function teachingSubset(u: Usdm) {
  const v = u.study.versions[0], s = v.studyDesigns[0]
  return {
    usdmVersion: u.usdmVersion, systemName: u.systemName, systemVersion: u.systemVersion,
    note: 'Teaching subset of a USDM v4 export: only the classes the EDC Study Build Lab reads. The full export holds the rest.',
    study: { id: u.study.id, name: u.study.name, instanceType: u.study.instanceType, versions: [{
      id: v.id, versionIdentifier: v.versionIdentifier, rationale: v.rationale, instanceType: v.instanceType, titles: v.titles, studyIdentifiers: v.studyIdentifiers, organizations: v.organizations,
      eligibilityCriterionItems: v.eligibilityCriterionItems, biomedicalConcepts: v.biomedicalConcepts, bcCategories: v.bcCategories, bcSurrogates: v.bcSurrogates,
      studyDesigns: [{ id: s.id, name: s.name, instanceType: s.instanceType, model: s.model, encounters: s.encounters, activities: s.activities, eligibilityCriteria: s.eligibilityCriteria, scheduleTimelines: s.scheduleTimelines }],
    }] },
  }
}

// ---------- conformance checks on the export ----------
// Modelled on the kinds of rule in the DDF conformance rule catalogue (identifiers, references,
// cardinalities, the main timeline, estimand links); the IDs are this app's own.
export interface UsdmIssue { id: string; level: 'error' | 'warning'; path: string; text: string }
const ISO = /^-?P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/
export function checkUsdm(u: unknown): UsdmIssue[] {
  const out: UsdmIssue[] = []
  const ids = new Map<string, { type: string; path: string }>()
  const refs: { id: string; path: string; want?: string[] }[] = []
  const walk = (x: unknown, path: string) => {
    if (Array.isArray(x)) { x.forEach((y, i) => walk(y, `${path}[${i}]`)); return }
    if (!x || typeof x !== 'object') return
    const o = x as Record<string, unknown>
    if ('id' in o && typeof o.id === 'string') {
      if (!o.instanceType) out.push({ id: 'PB-USDM-01', level: 'error', path, text: `Object ${o.id} has no instanceType.` })
      if (ids.has(o.id)) out.push({ id: 'PB-USDM-02', level: 'error', path, text: `Identifier ${o.id} is used twice (also at ${ids.get(o.id)!.path}).` })
      else ids.set(o.id, { type: String(o.instanceType), path })
    }
    if (o.instanceType === 'Code' && (!o.code || !o.decode)) out.push({ id: 'PB-USDM-03', level: 'error', path, text: 'A Code has no code or decode.' })
    for (const [k, v] of Object.entries(o)) {
      if (/Id$/.test(k) && typeof v === 'string' && k !== 'id') refs.push({ id: v, path: `${path}.${k}` })
      if (/Ids$/.test(k) && Array.isArray(v)) v.forEach((r, i) => typeof r === 'string' && refs.push({ id: r, path: `${path}.${k}[${i}]` }))
      if (['windowLower', 'windowUpper', 'value'].includes(k) && o.instanceType === 'Timing' && typeof v === 'string' && !ISO.test(v)) out.push({ id: 'PB-USDM-04', level: 'error', path: `${path}.${k}`, text: `${k} “${v}” is not an ISO 8601 duration.` })
      walk(v, `${path}.${k}`)
    }
  }
  walk(u, '$')
  for (const r of refs) if (!ids.has(r.id)) out.push({ id: 'PB-USDM-05', level: 'error', path: r.path, text: `Reference ${r.id} does not resolve to any object.` })
  const root = u as Usdm
  const v = root?.study?.versions?.[0], s = v?.studyDesigns?.[0]
  if (!v || !s) { out.push({ id: 'PB-USDM-06', level: 'error', path: '$.study', text: 'The file has no study version or study design.' }); return out }
  if (!v.titles?.some((t) => t.type?.decode === 'Official Study Title' && t.text)) out.push({ id: 'PB-USDM-07', level: 'error', path: '$.study.versions[0].titles', text: 'There is no official study title.' })
  if (!v.studyIdentifiers?.length) out.push({ id: 'PB-USDM-08', level: 'error', path: '$.study.versions[0].studyIdentifiers', text: 'There is no study identifier.' })
  const mains = s.scheduleTimelines?.filter((t) => t.mainTimeline) ?? []
  if (mains.length !== 1) out.push({ id: 'PB-USDM-09', level: 'error', path: '$..scheduleTimelines', text: `A study design needs exactly one main timeline; this one has ${mains.length}.` })
  const type = (id: string) => ids.get(id)?.type
  for (const [i, e] of (s.estimands ?? []).entries()) {
    if (type(e.variableOfInterestId) !== 'Endpoint') out.push({ id: 'PB-USDM-10', level: 'error', path: `$..estimands[${i}]`, text: `Estimand ${e.id}: variableOfInterestId must refer to an Endpoint.` })
    if (type(e.analysisPopulationId) !== 'AnalysisPopulation') out.push({ id: 'PB-USDM-10', level: 'error', path: `$..estimands[${i}]`, text: `Estimand ${e.id}: analysisPopulationId must refer to an AnalysisPopulation.` })
    if (!e.intercurrentEvents?.length) out.push({ id: 'PB-USDM-11', level: 'warning', path: `$..estimands[${i}]`, text: `Estimand ${e.id} has no intercurrent events.` })
    for (const ie of e.intercurrentEvents ?? []) if (!ie.strategy) out.push({ id: 'PB-USDM-11', level: 'error', path: `$..estimands[${i}]`, text: `Intercurrent event ${ie.id} has no strategy.` })
  }
  for (const o of s.objectives ?? []) if (!o.endpoints?.length) out.push({ id: 'PB-USDM-12', level: 'warning', path: '$..objectives', text: `Objective ${o.id} has no endpoint.` })
  for (const t of mains) for (const si of t.instances) if (type(si.encounterId) !== 'Encounter') out.push({ id: 'PB-USDM-13', level: 'error', path: '$..instances', text: `Scheduled instance ${si.id} does not refer to an Encounter.` })
  if (!s.encounters?.length) out.push({ id: 'PB-USDM-14', level: 'warning', path: '$..encounters', text: 'The design has no encounters (visits).' })
  if (!s.arms?.length) out.push({ id: 'PB-USDM-14', level: 'warning', path: '$..arms', text: 'The design has no arms.' })
  return out
}

// ---------- import ----------
// Reads a USDM v4 file back into the protocol: the app's own export losslessly (through its
// extension), and other USDM v4 files (for example the EDC lab's teaching file) as far as their
// classes go.
type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
const days = (s?: string) => Number(/P(\d+)D/.exec(s ?? '')?.[1] ?? 0)
export function protocolFromUsdm(u: Any, base: ProtocolData): ProtocolData {
  const v = u?.study?.versions?.[0], s = v?.studyDesigns?.[0]
  if (!v || !s) throw new Error('The file has no study version or study design, so it is not a USDM v4 study.')
  const d: ProtocolData = structuredClone(base)
  const ext = (v.extensionAttributes ?? []).find((x: Any) => x.url === EXT_URL)
  const x = ext ? JSON.parse(ext.valueString) : null
  d.title = { ...d.title, ...(x?.title ?? {}) }
  d.title['Sponsor Protocol Identifier'] ||= v.studyIdentifiers?.[0]?.text ?? u.study.name
  d.title['Full Title'] ||= v.titles?.find((t: Any) => t.type?.decode === 'Official Study Title')?.text ?? v.titles?.[0]?.text ?? ''
  const acr = v.titles?.find((t: Any) => t.type?.decode === 'Study Acronym')?.text; if (acr) d.title['Trial Acronym'] ||= acr
  if (s.studyPhase?.standardCode?.decode) d.title['Trial Phase'] ||= s.studyPhase.standardCode.decode
  d.design = { ...d.design, ...(x?.design ?? {}) }
  if (s.model?.decode) d.design['Intervention Model'] ||= s.model.decode
  if (s.blindingSchema?.standardCode?.decode) d.design['Trial Blind Schema'] ||= s.blindingSchema.standardCode.decode
  const tl = (s.scheduleTimelines ?? []).find((t: Any) => t.mainTimeline) ?? s.scheduleTimelines?.[0]
  const xv = new Map<string, Any>((x?.visits ?? []).map((q: Any) => [q.id, q]))
  d.visits = (s.encounters ?? []).map((e: Any) => {
    const si = tl?.instances?.find((i: Any) => i.encounterId === e.id)
    const t = tl?.timings?.find((q: Any) => q.relativeFromScheduledInstanceId === si?.id)
    const kind = t?.type?.decode
    const day = !t || kind === 'Fixed Reference' ? 1 : kind === 'Before' ? 1 - days(t.value) - 1 : 1 + days(t.value)
    const ep = (s.epochs ?? []).find((q: Any) => q.id === si?.epochId)
    return { id: e.name, name: e.label || e.name, day, lo: day - days(t?.windowLower), hi: day + days(t?.windowUpper), epoch: xv.get(e.name)?.epoch ?? ep?.name ?? (day < 1 ? 'Screening' : 'Treatment'), type: xv.get(e.name)?.type ?? 'On site' } as Visit
  })
  const xp = new Map<string, Any>((x?.procedures ?? []).map((q: Any) => [q.id, q]))
  d.procedures = (s.activities ?? []).map((a: Any) => {
    const pid = String(a.id).replace(/^Activity_/, ''), bc = (v.biomedicalConcepts ?? []).find((b: Any) => b.id === a.biomedicalConceptIds?.[0]), q = xp.get(pid) ?? {}
    const at = (tl?.instances ?? []).filter((i: Any) => (i.activityIds ?? []).includes(a.id)).map((i: Any) => d.visits.find((vv) => `Encounter_${vv.id}` === i.encounterId)?.id).filter(Boolean) as string[]
    const cat = (v.bcCategories ?? []).find((c: Any) => c.id === a.bcCategoryIds?.[0]), sur = (v.bcSurrogates ?? []).find((c: Any) => c.id === a.bcSurrogateIds?.[0])
    return { id: pid, name: a.name, section: q.section ?? (/section (.*)$/.exec(a.description ?? '')?.[1] ?? ''), concept: q.concept ?? cat?.name ?? sur?.name ?? bc?.name ?? a.name, bcs: q.bcs, form: q.form ?? '', visits: q.from ? 'continuous' : at, from: q.from, footnote: q.footnote ?? a.notes?.[0]?.text, purpose: q.purpose ?? ['conduct'], bloodMl: q.bloodMl, minutes: q.minutes } as Procedure
  })
  const xc = new Map<string, Any>((x?.criteria ?? []).map((q: Any) => [q.code, q]))
  d.criteria = (s.eligibilityCriteria ?? []).map((c: Any) => ({ code: c.identifier ?? c.name, category: /Exclusion/i.test(c.category?.decode ?? '') || /^EX/.test(c.identifier) ? 'Exclusion' : 'Inclusion', text: (v.eligibilityCriterionItems ?? []).find((i: Any) => i.id === c.criterionItemId)?.text ?? '', procedureIds: xc.get(c.identifier)?.procedureIds ?? [] }))
  const lvl = (c: Any) => (/Primary/.test(c?.decode ?? '') ? 'Primary' : /Secondary/.test(c?.decode ?? '') ? 'Secondary' : 'Exploratory') as 'Primary'
  const xe = new Map<string, Any>((x?.endpoints ?? []).map((q: Any) => [q.id, q])), xo = new Map<string, Any>((x?.objectives ?? []).map((q: Any) => [q.id, q]))
  d.endpoints = []; d.objectives = (s.objectives ?? []).map((o: Any) => {
    for (const e of o.endpoints ?? []) { const eid = String(e.id).replace(/^Endpoint_/, ''), q = xe.get(eid) ?? {}; d.endpoints.push({ id: eid, level: lvl(e.level), text: e.text, purpose: e.purpose ?? '', variableType: q.variableType ?? 'continuous', procedureIds: q.procedureIds ?? [], visitIds: q.visitIds ?? [] }) }
    const oid = String(o.id).replace(/^Objective_/, '')
    return { id: oid, level: lvl(o.level), kind: xo.get(oid)?.kind ?? 'Efficacy', text: o.text, endpointIds: (o.endpoints ?? []).map((e: Any) => String(e.id).replace(/^Endpoint_/, '')) }
  })
  d.analysisSets = (s.analysisPopulations ?? []).map((a: Any) => ({ id: String(a.id).replace(/^AnalysisPopulation_/, ''), name: a.name, text: a.text ?? '' }))
  const xs = new Map<string, Any>((x?.estimands ?? []).map((q: Any) => [q.id, q]))
  d.estimands = (s.estimands ?? []).map((e: Any) => { const eid = String(e.id).replace(/^Estimand_/, ''), q = xs.get(eid) ?? {}, ep = String(e.variableOfInterestId).replace(/^Endpoint_/, '')
    return { id: eid, objectiveId: q.objectiveId ?? d.objectives.find((o) => o.endpointIds.includes(ep))?.id ?? '', endpointId: ep, population: q.population ?? s.population?.description ?? '', analysisSetId: String(e.analysisPopulationId).replace(/^AnalysisPopulation_/, ''), treatment: q.treatment ?? e.description ?? '',
      intercurrentEvents: (e.intercurrentEvents ?? []).map((ie: Any) => ({ id: String(ie.id).replace(/^IntercurrentEvent_/, ''), name: ie.label || ie.name, strategy: ie.strategy ?? '', description: ie.description ?? '' })), summary: e.populationSummary ?? '', estimator: q.estimator ?? '', missing: q.missing ?? '', sensitivity: q.sensitivity ?? '' } })
  if (x?.interventions) d.interventions = x.interventions
  else d.interventions = (v.studyInterventions ?? []).map((i: Any, n: number) => ({ id: `INT${n + 1}`, name: i.name, role: /Placebo/.test(i.role?.decode) ? 'Placebo' : /Rescue/.test(i.role?.decode) ? 'Rescue' : 'Investigational', dose: i.label ?? '', doseValue: i.administrations?.[0]?.dose?.value ?? 0, doseUnit: i.administrations?.[0]?.dose?.unit?.standardCode?.decode ?? '', route: i.administrations?.[0]?.route?.standardCode?.decode ?? '', frequency: i.administrations?.[0]?.frequency?.standardCode?.decode ?? '', durationWeeks: i.administrations?.[0]?.duration?.quantity?.value ?? 0 }))
  const xa = new Map<string, Any>((x?.arms ?? []).map((q: Any) => [q.id, q]))
  d.arms = (s.arms ?? []).map((a: Any) => { const aid = String(a.id).replace(/^StudyArm_/, ''), q = xa.get(aid) ?? {}; return { id: aid, name: a.name, type: q.type ?? (/Placebo/.test(a.type?.decode) ? 'Placebo' : /Active/.test(a.type?.decode) ? 'Active comparator' : 'Investigational'), intervention: q.intervention ?? a.description ?? '', ratio: q.ratio ?? 1 } })
  if (s.epochs?.length) d.epochs = s.epochs.map((e: Any) => ({ id: String(e.id).replace(/^StudyEpoch_/, ''), name: e.name, type: (['Screening', 'Treatment', 'Follow-up', 'Run-in', 'Washout'].find((t) => t === e.type?.decode) ?? 'Treatment') as 'Treatment' }))
  const items = new Map<string, string>((v.narrativeContentItems ?? []).map((i: Any) => [i.id, i.text]))
  for (const nc of u.study.documentedBy?.[0]?.versions?.[0]?.contents ?? []) if (items.has(nc.contentItemId)) d.narrative[nc.sectionNumber] = items.get(nc.contentItemId)!
  if (x) { d.facts = x.facts; d.statements = x.statements ?? {}; d.multiplicity = x.multiplicity ?? ''; d.rescue = x.rescue ?? ''; d.aeFrom = x.aeFrom ?? 'consent'; d.aeTo = x.aeTo ?? '' }
  else {
    const n = s.population?.plannedEnrollmentNumber?.value; if (n) { d.facts.participants = n; d.facts.perArm = Math.round(n / Math.max(1, d.arms.length)) }
    const ae = d.procedures.find((p) => /adverse event/i.test(p.concept)); if (ae) { ae.form = 'AE'; ae.purpose = ['safety'] }
  }
  return d
}

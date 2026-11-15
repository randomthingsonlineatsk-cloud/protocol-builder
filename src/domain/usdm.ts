// The protocol as CDISC USDM v4 data (Unified Study Definitions Model, version 4.0, June 2025),
// for the Digital Data Flow: Study → StudyVersion → InterventionalStudyDesign, with arms, epochs,
// elements and cells, encounters, activities and biomedical concepts, the main schedule timeline
// with its scheduled activity instances and timings, objectives, endpoints, estimands with
// intercurrent events, analysis populations, eligibility criteria, the population, the study
// interventions, and the M11 narrative as the protocol document's NarrativeContent.
//
// Codes: values the ICH M11 technical specification defines (phase, model, blinding, arm type,
// intervention type and use, units) carry their NCI C-codes; a few USDM terms whose codes this app
// does not hold are written as teaching terms in their own code system, and the export says so.
// The app's own key facts (sample size assumptions and the sentences that restate them) travel in
// an ExtensionAttribute so that a re-import is lossless.
//
// Two files are written: the full export, and a teaching subset with only the classes the EDC
// Study Build Lab reads to draft a database build. The subset is cut from the full export, so the
// two always agree.

import { CODELISTS, codeOf, TOC } from './m11'
import type { ProtocolData, Procedure, Visit } from './types'

const M11_CS = 'http://www.cdisc.org', M11_VER = 'ICH M11 technical specification (Step 4, 2025-11-19)'
const TEACH_CS = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/terms'
export const EXT_URL = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/ext/key-facts'
let seq = 0
const cid = () => `Code_${++seq}`
export const code = (c: string, decode: string, system = M11_CS, version = M11_VER) => ({ id: cid(), code: c, codeSystem: system, codeSystemVersion: version, decode, instanceType: 'Code' as const })
const teach = (decode: string) => code(decode.toUpperCase().replace(/\W+/g, '_'), decode, TEACH_CS, '1')
const fromList = (list: keyof typeof CODELISTS, decode: string) => { const c = codeOf(list, decode); return c ? code(c.code, c.decode) : teach(decode || 'Not specified') }
const alias = (c: ReturnType<typeof code>) => ({ id: `Alias${c.id}`, standardCode: c, standardCodeAliases: [], instanceType: 'AliasCode' as const })
// NCI codes this app uses outside the M11 code lists.
const NCI = {
  officialTitle: ['C207616', 'Official Study Title'], briefTitle: ['C207615', 'Brief Study Title'], acronym: ['C207646', 'Study Acronym'],
  sponsor: ['C70793', 'Clinical Study Sponsor'], visit: ['C25716', 'Visit'], inclusion: ['C25532', 'Inclusion Criteria'], exclusion: ['C25370', 'Exclusion Criteria'],
  primaryObj: ['C85826', 'Primary Objective'], secondaryObj: ['C85827', 'Secondary Objective'], primaryEnd: ['C94496', 'Primary Endpoint'], secondaryEnd: ['C139173', 'Secondary Endpoint'],
} as const
const nci = (k: keyof typeof NCI) => code(NCI[k][0], NCI[k][1], M11_CS, 'NCI Thesaurus')
const dur = (n: number) => `P${Math.abs(Math.round(n))}D`
const ARM_TYPE: Record<string, string> = { Investigational: 'Experimental Arm', Placebo: 'Placebo Comparator Arm', 'Active comparator': 'Active Comparator Arm', 'No intervention': 'No Intervention Arm' }
const USE: Record<string, string> = { Investigational: 'Experimental Intervention', Placebo: 'Placebo', Rescue: 'Rescue Medicine', Auxiliary: 'Background Treatment' }

// Properties (data items) of the biomedical concepts the examples use, CDASH-style names.
export const CONCEPT_PROPS: Record<string, string[]> = {
  'Informed Consent Obtained': ['DSSTDAT', 'ICVER'], Demographics: ['BRTHYR', 'SEX', 'RACE'], 'Eligibility Criteria Not Met': ['IEYN', 'IETESTCD'], 'Medical History': ['MHTERM', 'MHSTDAT', 'MHONGO'],
  'Vital Signs (Blood Pressure, Pulse)': ['VSDAT', 'SYSBP', 'DIABP', 'PULSE', 'WEIGHT'], 'Body Weight': ['WEIGHT'], 'Body Height': ['HEIGHT'],
  'Hepatitis B Screening Panel': ['HBVDAT', 'HBSAG', 'HBCAB', 'HBVDNA'], 'Central Laboratory Sample': ['LBPERF', 'LBREFID', 'LBDAT', 'LBTIM'], 'Local Safety Laboratory Panel': ['LBDAT', 'K', 'CREAT', 'ALT'],
  'Pregnancy Test (Choriogonadotropin Beta)': ['PREGDAT', 'PREGRES'], '12-Lead ECG': ['EGDAT', 'QTCF', 'EGINTP'],
  'Investigator Global Assessment for Chronic Hand Eczema': ['HEADAT', 'ASSESSOR', 'IGACHE'], 'Hand Eczema Severity Index': ['HECSI'], 'Itch Numeric Rating Scale': ['ITCHNRS'],
  'Study Drug Dispensing and Accountability': ['EXDISP', 'EXKIT', 'EXDSPQ', 'EXRET', 'EXCOMPL'], 'Adverse Event': ['AETERM', 'AESTDAT', 'AEONGO', 'AEENDAT', 'AESEV', 'AESER', 'AEREL', 'AEACN', 'AEOUT'],
  'Concomitant Medication': ['CMTRT', 'CMINDC', 'CMDSTXT', 'CMDOSU', 'CMROUTE', 'CMSTDAT', 'CMONGO', 'CMENDAT'], Disposition: ['DSDECOD', 'EOSDAT'],
}

const inst = (v: Visit | string) => `SAI_${typeof v === 'string' ? v : v.id}`
const anchorOf = (d: ProtocolData) => d.visits.find((v) => v.day === 1) ?? d.visits[0]
const isUns = (v: Visit) => v.lo < -9000
const epochOf = (d: ProtocolData, v: Visit) => d.epochs.find((e) => e.name === v.epoch || e.type === v.epoch)?.id ?? d.epochs[0]?.id
const activitiesAt = (d: ProtocolData, v: Visit) => d.procedures.filter((p) => (p.visits === 'continuous' ? v.day >= (d.visits.find((x) => x.id === p.from)?.day ?? 1) : p.visits.includes(v.id))).map((p) => `Activity_${p.id}`)

export function usdmOf(d: ProtocolData, meta: { userId?: string; version?: string } = {}) {
  seq = 0
  const id = d.title['Sponsor Protocol Identifier'] || 'UNNAMED'
  const visits = d.visits.filter((v) => !isUns(v)).sort((a, b) => a.day - b.day)
  const anchor = anchorOf(d)
  const timings = visits.map((v) => {
    const before = v.day < (anchor?.day ?? 1), isAnchor = v.id === anchor?.id
    return { id: `Timing_${v.id}`, name: `${v.id} timing`, label: v.name, description: '', type: teach(isAnchor ? 'Fixed Reference' : before ? 'Before' : 'After'),
      value: dur(isAnchor ? 0 : before ? (anchor.day - v.day - 1) : v.day - anchor.day), valueLabel: `Day ${v.day}`,
      relativeToFrom: teach('Start to Start'), relativeFromScheduledInstanceId: inst(v), relativeToScheduledInstanceId: inst(anchor),
      windowLower: dur(v.day - v.lo), windowUpper: dur(v.hi - v.day), windowLabel: v.lo === v.hi ? `Day ${v.day}` : `Day ${v.lo} to ${v.hi}`, instanceType: 'Timing' as const }
  })
  const ec = d.criteria.map((c) => ({ c }))
  const narr = TOC.filter((s) => (d.narrative[s.num] ?? '').trim())
  return {
    usdmVersion: '4.0.0', systemName: 'Protocol Builder', systemVersion: '1.0',
    study: {
      id: 'Study_1', name: id, label: d.title['Trial Acronym'] ?? '', description: d.title['Short Title'] ?? '', instanceType: 'Study' as const,
      documentedBy: [{ id: 'SDD_1', name: 'Protocol', label: `${id} protocol`, description: 'Clinical trial protocol in the ICH M11 structure', language: teach('English'), type: teach('Protocol'), templateName: 'ICH M11 CeSHarP', instanceType: 'StudyDefinitionDocument' as const,
        versions: [{ id: 'SDDV_1', version: d.title['Version Number'] ?? meta.version ?? '', status: teach('Draft'), dateValues: [], notes: [], instanceType: 'StudyDefinitionDocumentVersion' as const,
          contents: narr.map((s, i) => ({ id: `NC_${s.num}`, name: `NC_${s.num}`, sectionNumber: s.num, sectionTitle: s.title, displaySectionNumber: true, displaySectionTitle: true, contentItemId: `NCI_${s.num}`, childIds: [], previousId: i ? `NC_${narr[i - 1].num}` : null, nextId: narr[i + 1] ? `NC_${narr[i + 1].num}` : null, instanceType: 'NarrativeContent' as const })) }] }],
      versions: [{
        id: 'StudyVersion_1', versionIdentifier: d.title['Version Number'] ?? '1', rationale: d.title['Original Protocol Indicator'] === 'No' ? `Amendment ${d.title['Amendment Identifier'] ?? ''}` : 'Original protocol', instanceType: 'StudyVersion' as const,
        documentVersionIds: ['SDDV_1'],
        titles: [
          { id: 'StudyTitle_1', text: d.title['Full Title'] ?? '', type: nci('officialTitle'), instanceType: 'StudyTitle' as const },
          ...(d.title['Short Title'] ? [{ id: 'StudyTitle_2', text: d.title['Short Title'], type: nci('briefTitle'), instanceType: 'StudyTitle' as const }] : []),
          ...(d.title['Trial Acronym'] ? [{ id: 'StudyTitle_3', text: d.title['Trial Acronym'], type: nci('acronym'), instanceType: 'StudyTitle' as const }] : []),
        ],
        studyIdentifiers: [{ id: 'StudyIdentifier_1', text: id, scopeId: 'Organization_1', instanceType: 'StudyIdentifier' as const }],
        organizations: [{ id: 'Organization_1', name: (d.title['Sponsor Name and Address'] ?? '').split(',')[0], label: d.title['Sponsor Name and Address'] ?? '', type: nci('sponsor'), identifier: id, identifierScheme: 'Sponsor', legalAddress: null, instanceType: 'Organization' as const }],
        studyInterventions: d.interventions.map((i) => ({ id: `StudyIntervention_${i.id}`, name: i.name, label: i.dose, description: `${i.dose}, ${i.route.toLowerCase()}, ${i.frequency}`, role: fromList('use', USE[i.role]), type: fromList('intType', 'Drug'),
          administrations: [{ id: `Administration_${i.id}`, name: `${i.name} administration`, dose: { id: `Dose_${i.id}`, value: i.doseValue, unit: alias(teach(i.doseUnit)), instanceType: 'Quantity' as const }, route: alias(teach(i.route)), frequency: alias(teach(i.frequency)), duration: i.durationWeeks ? { id: `Duration_${i.id}`, text: `${i.durationWeeks} weeks`, quantity: { id: `DQ_${i.id}`, value: i.durationWeeks, unit: alias(code('C29844', 'Weeks')), instanceType: 'Quantity' as const }, durationWillVary: false, instanceType: 'Duration' as const } : null, instanceType: 'Administration' as const }],
          minimumResponseDuration: null, instanceType: 'StudyIntervention' as const })),
        biomedicalConcepts: d.procedures.map((p) => ({ id: `BC_${p.id}`, name: p.concept, label: p.concept, synonyms: [], reference: '', code: { id: `AC_${p.id}`, standardCode: teach(p.concept), standardCodeAliases: [], instanceType: 'AliasCode' as const },
          properties: (CONCEPT_PROPS[p.concept] ?? []).map((f) => ({ id: `BCP_${p.id}_${f}`, name: f, label: f, isRequired: true, isEnabled: true, datatype: 'string', responseCodes: [], code: { id: `ACP_${p.id}_${f}`, standardCode: teach(f), standardCodeAliases: [], instanceType: 'AliasCode' as const }, instanceType: 'BiomedicalConceptProperty' as const })), instanceType: 'BiomedicalConcept' as const })),
        eligibilityCriterionItems: d.criteria.map((c) => ({ id: `ECI_${c.code}`, name: c.code, text: c.text, dictionaryId: null, instanceType: 'EligibilityCriterionItem' as const })),
        narrativeContentItems: narr.map((s) => ({ id: `NCI_${s.num}`, name: `NCI_${s.num}`, text: d.narrative[s.num], instanceType: 'NarrativeContentItem' as const })),
        amendments: [],
        extensionAttributes: [{ id: 'Ext_1', url: EXT_URL, valueString: JSON.stringify({ facts: d.facts, statements: d.statements, multiplicity: d.multiplicity, rescue: d.rescue, aeFrom: d.aeFrom, aeTo: d.aeTo, title: d.title, design: d.design, procedures: d.procedures.map((p) => ({ id: p.id, section: p.section, form: p.form, purpose: p.purpose, footnote: p.footnote, from: p.from, bloodMl: p.bloodMl, minutes: p.minutes })), criteria: d.criteria.map((c) => ({ code: c.code, procedureIds: c.procedureIds })), endpoints: d.endpoints.map((e) => ({ id: e.id, variableType: e.variableType, procedureIds: e.procedureIds, visitIds: e.visitIds })), objectives: d.objectives.map((o) => ({ id: o.id, kind: o.kind })), estimands: d.estimands.map((e) => ({ id: e.id, objectiveId: e.objectiveId, population: e.population, estimator: e.estimator, missing: e.missing, sensitivity: e.sensitivity, treatment: e.treatment })), visits: d.visits.map((v) => ({ id: v.id, type: v.type, epoch: v.epoch })), interventions: d.interventions, arms: d.arms.map((a) => ({ id: a.id, intervention: a.intervention, ratio: a.ratio, type: a.type })) }), instanceType: 'ExtensionAttribute' as const }],
        studyDesigns: [{
          id: 'StudyDesign_1', name: `${d.title['Trial Acronym'] || id} design`, label: '', description: d.narrative['4.1'] ?? '', instanceType: 'InterventionalStudyDesign' as const,
          model: fromList('model', d.design['Intervention Model'] ?? ''), studyType: teach('Interventional'),
          studyPhase: alias(fromList('phase', d.title['Trial Phase'] ?? '')), blindingSchema: alias(fromList('blind', d.design['Trial Blind Schema'] ?? '')),
          intentTypes: [teach('Treatment')], subTypes: [], therapeuticAreas: [], characteristics: [],
          indications: [{ id: 'Indication_1', name: d.design['Population Diagnosis or Condition'] ?? '', description: d.design['Population Diagnosis or Condition'] ?? '', codes: [], isRareDisease: false, instanceType: 'Indication' as const }],
          studyInterventionIds: d.interventions.map((i) => `StudyIntervention_${i.id}`),
          arms: d.arms.map((a) => ({ id: `StudyArm_${a.id}`, name: a.name, label: a.name, description: a.intervention, type: fromList('armType', ARM_TYPE[a.type]), dataOriginType: teach('Data Generated Within Study'), dataOriginDescription: '', populationIds: [], instanceType: 'StudyArm' as const })),
          epochs: d.epochs.map((e, i) => ({ id: `StudyEpoch_${e.id}`, name: e.name, label: e.name, description: '', type: teach(e.type), previousId: i ? `StudyEpoch_${d.epochs[i - 1].id}` : null, nextId: d.epochs[i + 1] ? `StudyEpoch_${d.epochs[i + 1].id}` : null, instanceType: 'StudyEpoch' as const })),
          elements: [...d.epochs.filter((e) => e.type !== 'Treatment').map((e) => ({ id: `StudyElement_${e.id}`, name: e.name, label: e.name, description: '', transitionStartRule: null, transitionEndRule: null, studyInterventionIds: [], instanceType: 'StudyElement' as const })),
            ...d.arms.map((a) => ({ id: `StudyElement_${a.id}`, name: a.name, label: a.intervention, description: '', transitionStartRule: null, transitionEndRule: null, studyInterventionIds: d.interventions.filter((i) => a.intervention.toLowerCase().includes(i.name.toLowerCase().split(' (')[0])).map((i) => `StudyIntervention_${i.id}`), instanceType: 'StudyElement' as const }))],
          studyCells: d.arms.flatMap((a) => d.epochs.map((e) => ({ id: `StudyCell_${a.id}_${e.id}`, armId: `StudyArm_${a.id}`, epochId: `StudyEpoch_${e.id}`, elementIds: [e.type === 'Treatment' ? `StudyElement_${a.id}` : `StudyElement_${e.id}`], instanceType: 'StudyCell' as const }))),
          population: { id: 'Population_1', name: 'Trial population', label: '', description: d.narrative['5.1'] ?? '', includesHealthySubjects: d.design['Population Type'] === 'Without Disease',
            plannedEnrollmentNumber: { id: 'Enrol_1', value: d.facts.participants, unit: null, instanceType: 'Quantity' as const },
            plannedAge: { id: 'Age_1', minValue: { id: 'AgeMin_1', value: d.facts.ageMin, unit: alias(code('C29848', 'Years')), instanceType: 'Quantity' as const }, maxValue: { id: 'AgeMax_1', value: d.facts.ageMax, unit: alias(code('C29848', 'Years')), instanceType: 'Quantity' as const }, isApproximate: false, instanceType: 'Range' as const },
            plannedSex: [], criterionIds: d.criteria.map((c) => `EC_${c.code}`), cohorts: [], instanceType: 'StudyDesignPopulation' as const },
          analysisPopulations: d.analysisSets.map((a) => ({ id: `AnalysisPopulation_${a.id}`, name: a.name, label: a.name, description: '', text: a.text, instanceType: 'AnalysisPopulation' as const })),
          encounters: visits.map((v, i) => ({ id: `Encounter_${v.id}`, name: v.id, label: v.name, description: v.name, type: nci('visit'), environmentalSettings: [teach(v.type === 'On site' ? 'Clinic' : 'Home')], contactModes: [teach(v.type === 'Phone' ? 'Telephone Call' : v.type === 'Remote' ? 'Remote Audio Video' : 'In Person')], scheduledAtId: `Timing_${v.id}`, previousId: i ? `Encounter_${visits[i - 1].id}` : null, nextId: visits[i + 1] ? `Encounter_${visits[i + 1].id}` : null, transitionStartRule: null, transitionEndRule: null, instanceType: 'Encounter' as const })),
          activities: d.procedures.map((p, i) => ({ id: `Activity_${p.id}`, name: p.name, label: p.name, description: `Protocol section ${p.section}`, biomedicalConceptIds: [`BC_${p.id}`], bcCategoryIds: [], bcSurrogateIds: [], timelineId: null, previousId: i ? `Activity_${d.procedures[i - 1].id}` : null, nextId: d.procedures[i + 1] ? `Activity_${d.procedures[i + 1].id}` : null,
            notes: p.footnote ? [{ id: `Note_${p.id}`, text: p.footnote, codes: [], instanceType: 'CommentAnnotation' as const }] : [], instanceType: 'Activity' as const })),
          eligibilityCriteria: ec.map(({ c }, i) => ({ id: `EC_${c.code}`, name: c.code, label: c.code, description: '', identifier: c.code, category: nci(c.category === 'Inclusion' ? 'inclusion' : 'exclusion'), criterionItemId: `ECI_${c.code}`, previousId: i ? `EC_${ec[i - 1].c.code}` : null, nextId: ec[i + 1] ? `EC_${ec[i + 1].c.code}` : null, contextId: null, instanceType: 'EligibilityCriterion' as const })),
          objectives: d.objectives.map((o) => ({ id: `Objective_${o.id}`, name: o.id, label: '', description: '', text: o.text, level: o.level === 'Primary' ? nci('primaryObj') : o.level === 'Secondary' ? nci('secondaryObj') : teach('Exploratory Objective'), dictionaryId: null,
            endpoints: o.endpointIds.map((eid) => d.endpoints.find((e) => e.id === eid)).filter((e) => !!e).map((e) => ({ id: `Endpoint_${e!.id}`, name: e!.id, label: '', description: '', text: e!.text, purpose: e!.purpose, level: e!.level === 'Primary' ? nci('primaryEnd') : e!.level === 'Secondary' ? nci('secondaryEnd') : teach('Exploratory Endpoint'), dictionaryId: null, instanceType: 'Endpoint' as const })), instanceType: 'Objective' as const })),
          estimands: d.estimands.map((e) => ({ id: `Estimand_${e.id}`, name: e.id, label: '', description: e.treatment, populationSummary: e.summary, analysisPopulationId: `AnalysisPopulation_${e.analysisSetId}`, variableOfInterestId: `Endpoint_${e.endpointId}`, interventionIds: d.interventions.filter((i) => i.role !== 'Rescue').map((i) => `StudyIntervention_${i.id}`),
            intercurrentEvents: e.intercurrentEvents.map((ie) => ({ id: `IntercurrentEvent_${ie.id}`, name: ie.name, label: '', description: ie.description, text: ie.description, strategy: ie.strategy, instanceType: 'IntercurrentEvent' as const })), instanceType: 'Estimand' as const })),
          scheduleTimelines: [{ id: 'Timeline_1', name: 'Main timeline', label: 'Schedule of activities', description: '', mainTimeline: true, entryCondition: 'Informed consent signed', entryId: visits[0] ? inst(visits[0]) : null, plannedDuration: null, exits: [{ id: 'Exit_1', instanceType: 'ScheduleTimelineExit' as const }], instanceType: 'ScheduleTimeline' as const,
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
      eligibilityCriterionItems: v.eligibilityCriterionItems, biomedicalConcepts: v.biomedicalConcepts,
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
    return { id: pid, name: a.name, section: q.section ?? (/section (.*)$/.exec(a.description ?? '')?.[1] ?? ''), concept: bc?.name ?? a.name, form: q.form ?? '', visits: q.from ? 'continuous' : at, from: q.from, footnote: q.footnote ?? a.notes?.[0]?.text, purpose: q.purpose ?? ['conduct'], bloodMl: q.bloodMl, minutes: q.minutes } as Procedure
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
      intercurrentEvents: (e.intercurrentEvents ?? []).map((ie: Any) => ({ id: String(ie.id).replace(/^IntercurrentEvent_/, ''), name: ie.name, strategy: ie.strategy ?? '', description: ie.description ?? '' })), summary: e.populationSummary ?? '', estimator: q.estimator ?? '', missing: q.missing ?? '', sensitivity: q.sensitivity ?? '' } })
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

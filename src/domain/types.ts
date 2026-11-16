// The protocol held as data. Each object maps to a USDM v4 class (named in the comment) and to
// the ICH M11 section that presents it. The shape of the title page, design, objectives,
// criteria, visits and procedures follows the CDM Query & Edit-Check Console's M11 object, so a
// protocol written here can drive that console's Protocol-to-Database Twin.

export type Level = 'Primary' | 'Secondary' | 'Exploratory'
export type Strategy = 'Treatment policy' | 'Hypothetical' | 'Composite variable' | 'While on treatment' | 'Principal stratum'
export type VariableType = 'continuous' | 'binary' | 'time-to-event' | 'count' | 'ordinal'
export type Summary = 'Difference in means' | 'Difference in proportions' | 'Odds ratio' | 'Risk ratio' | 'Hazard ratio' | 'Rate ratio' | 'Difference in medians' | 'Descriptive'

export interface Objective { id: string; level: Level; kind: 'Efficacy' | 'Safety' | 'Pharmacokinetic' | 'Other'; text: string; endpointIds: string[] } // USDM Objective
export interface Endpoint { id: string; level: Level; text: string; variableType: VariableType; procedureIds: string[]; visitIds: string[]; purpose: string } // USDM Endpoint
export interface IntercurrentEvent { id: string; name: string; strategy: Strategy | ''; description: string } // USDM IntercurrentEvent
export interface Estimand { // USDM Estimand
  id: string; objectiveId: string; endpointId: string; population: string; analysisSetId: string
  treatment: string; intercurrentEvents: IntercurrentEvent[]; summary: Summary | ''; estimator: string; missing: string; sensitivity: string
}
export interface AnalysisSet { id: string; name: string; text: string } // USDM AnalysisPopulation
export interface Criterion { code: string; category: 'Inclusion' | 'Exclusion'; text: string; procedureIds: string[] } // USDM EligibilityCriterion + Item
export interface Visit { id: string; name: string; day: number; lo: number; hi: number; epoch: string; type: 'On site' | 'Remote' | 'Phone' | 'Home nurse' } // USDM Encounter + ScheduledActivityInstance + Timing
export interface Procedure { // USDM Activity + BiomedicalConcept
  id: string; name: string; section: string; concept: string; form: string
  visits: string[] | 'continuous'; from?: string; footnote?: string; bcs?: string[]; purpose: ('endpoint' | 'safety' | 'eligibility' | 'conduct')[]; bloodMl?: number; minutes?: number
}
export interface Arm { id: string; name: string; type: 'Investigational' | 'Placebo' | 'Active comparator' | 'No intervention'; intervention: string; ratio: number } // USDM StudyArm
export interface Epoch { id: string; name: string; type: 'Screening' | 'Treatment' | 'Follow-up' | 'Run-in' | 'Washout' } // USDM StudyEpoch
export interface Intervention { id: string; name: string; role: 'Investigational' | 'Placebo' | 'Rescue' | 'Auxiliary'; dose: string; doseValue: number; doseUnit: string; route: string; frequency: string; durationWeeks: number; form?: string } // USDM StudyIntervention

// The numbers the protocol states once and reuses (M11 reuse rules). The synopsis shows them;
// a mission can plant a different value in one place to make an inconsistency.
export interface KeyFacts {
  participants: number; perArm: number; dropoutPct: number; treatmentWeeks: number; followUpWeeks: number; participationWeeks: number
  ageMin: number; ageMax: number; power: number; alpha: number; sided: 1 | 2
  assumption: { kind: 'proportions'; p0: number; p1: number } | { kind: 'means'; delta: number; sd: number }
}

export interface ProtocolData {
  title: Record<string, string>            // M11 title page elements, by M11 term
  design: Record<string, string>           // M11 1.1.2 Overall Design elements, by M11 term
  facts: KeyFacts
  arms: Arm[]; epochs: Epoch[]; interventions: Intervention[]
  objectives: Objective[]; endpoints: Endpoint[]; estimands: Estimand[]; analysisSets: AnalysisSet[]
  criteria: Criterion[]; visits: Visit[]; procedures: Procedure[]
  narrative: Record<string, string>        // section number -> text
  // Statements written in one section that repeat a fact from another. The consistency rules
  // read them against the facts above (for example 10.11's sample size against 1.1.2).
  statements: Record<string, string>
  multiplicity: string; rescue: string; aeFrom: 'consent' | 'first dose'; aeTo: string
}

export interface Finding { id: string; rule: string; severity: 'high' | 'medium' | 'low'; sections: string[]; text: string; fix: string }
export interface Mark { status: 'resolved' | 'justified'; note: string; utc: string }

export interface ProtocolVersion { number: string; date: string; status: 'draft' | 'approved'; data: ProtocolData }

export interface Project {
  format: 'protocol-builder-project'; schema: number
  id: string; name: string; userId: string; classId: string
  type: 'drug' | 'device'; phase: string; regions: string[]
  source: 'blank' | 'example' | 'library' | 'usdm' | 'mission' | 'lifecycle'
  createdUtc: string; updatedUtc: string
  versions: ProtocolVersion[]          // the last one is being edited
  marks: Record<string, Mark>          // finding id -> resolved or justified
  mission?: { id: string; startedUtc: string; submittedUtc?: string; score?: number; level?: 'pass' | 'expert' | 'not yet'; answers?: Record<string, string>; detail?: { label: string; got: number; of: number }[] }
}

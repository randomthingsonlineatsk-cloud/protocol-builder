import type { Adaptive } from './adaptive'
import type { Ib } from './ib'
import type { Cip } from './cip'
import type { ReviewComment } from './review'
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
export interface Arm { id: string; name: string; type: 'Investigational' | 'Placebo' | 'Active comparator' | 'No intervention'; intervention: string; ratio: number; code?: string } // USDM StudyArm (code: the SDTM ARMCD)
export interface Epoch { id: string; name: string; type: 'Screening' | 'Treatment' | 'Follow-up' | 'Run-in' | 'Washout' } // USDM StudyEpoch
export interface Intervention { id: string; name: string; role: 'Investigational' | 'Placebo' | 'Rescue' | 'Auxiliary'; dose: string; doseValue: number; doseUnit: string; route: string; frequency: string; durationWeeks: number; form?: string } // USDM StudyIntervention

// The numbers the protocol states once and reuses (M11 reuse rules). The synopsis shows them;
// a mission can plant a different value in one place to make an inconsistency.
export interface KeyFacts {
  participants: number; perArm: number; dropoutPct: number; treatmentWeeks: number; followUpWeeks: number; participationWeeks: number
  ageMin: number; ageMax: number; power: number; alpha: number; sided: 1 | 2
  assumption: Assumption
}

export interface Assumption { kind: 'proportions' | 'means' | 'ni-proportions' | 'ni-means' | 'tte' | 'crossover' | 'single'; p0?: number; p1?: number; delta?: number; sd?: number; margin?: number; hr?: number; eventProb?: number }
export interface MultiplicityPlan { method: 'none' | 'bonferroni' | 'holm' | 'hochberg' | 'fixed-sequence' | 'graphical'; hypotheses: { id: string; label: string; weight: number }[]; transitions: number[][] }
export interface InterimPlan { fractions: number[]; spending: 'obrien-fleming' | 'pocock'; purpose: string }

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
  // Codes the SDTM trial summary (TS) needs that M11 does not hold: dictionary codes for the
  // indication and treatments, and the pharmacologic class.
  adaptive?: Adaptive                        // ICH E20 (draft) adaptive design fields
  reviewedText?: string[]                   // sections whose standard text the writer marked as reviewed for this trial
  annex2?: string[]                         // ICH E6(R3) Annex 2 elements the trial uses (decentralised, pragmatic, RWD)
  sdtm?: { indic?: TsCode; trt?: TsCode; curtrt?: TsCode; pclas?: { value: string } & TsCode }
  multiplicity: string; multiplicityPlan?: MultiplicityPlan; interim?: InterimPlan; rescue: string; aeFrom: 'consent' | 'first dose'; aeTo: string
}

export interface TsCode { code: string; ref: string; ver: string }
export interface Finding { id: string; rule: string; severity: 'high' | 'medium' | 'low'; sections: string[]; text: string; fix: string }
export interface Mark { status: 'resolved' | 'justified'; note: string; utc: string }

export type Region = 'US' | 'EU' | 'IN'
export interface Change {
  id: string; sections: string[]; description: string; rationale: string; category: string
  answers: Partial<Record<Region, string>>   // the learner's classification per region
  justify: Partial<Record<Region, string>>   // why the learner's answer differs, where it does
}
// ICH M11 amendment details (title page) and the summary of changes.
export interface Amendment {
  identifier: string; scope: 'Global' | 'Not Global'; scopeDetail: string; enrolledPct: number
  primaryReason: string; secondaryReasons: string[]; summary: string
  safetyRights: '' | 'Yes' | 'No'; dataImpact: '' | 'Yes' | 'No'; changes: Change[]
}
export interface ProtocolVersion { number: string; date: string; status: 'draft' | 'approved'; data: ProtocolData; amendment?: Amendment; signatures?: import('./signoff').Signature[] }

export interface Project {
  format: 'protocol-builder-project'; schema: number
  id: string; name: string; userId: string; classId: string
  type: 'drug' | 'device'; phase: string; regions: string[]
  source: 'blank' | 'example' | 'library' | 'usdm' | 'mission' | 'lifecycle' | 'simulator'
  createdUtc: string; updatedUtc: string
  versions: ProtocolVersion[]          // the last one is being edited
  marks: Record<string, Mark>          // finding id -> resolved or justified
  ib?: Ib                              // the product's Investigator's Brochure (drug projects)
  cip?: Cip                            // the clinical investigation plan (device projects)
  reviews?: ReviewComment[]            // reviewer comments
  pls?: string                         // a plain-language (lay) summary written for the check
  feasibility?: { rates?: Record<string, number>; poolPerSiteMonth?: number; consentPct?: number; rampMonths?: number; seed?: number } // feasibility assumptions
  docs?: { icf?: Record<string, string>; budget?: Record<string, number>; registry?: Record<string, string> } // generated documents: the writer's edits
  mission?: { id: string; startedUtc: string; submittedUtc?: string; score?: number; level?: 'pass' | 'expert' | 'not yet'; answers?: Record<string, string>; detail?: { label: string; got: number; of: number }[] }
}

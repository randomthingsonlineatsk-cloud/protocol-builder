// Learn mode, Phase 1: the protocol as data, and M11 sections 1 to 5, each with the worked
// example (VERDANT-1) and a short quiz. Summaries of the guidelines, not their text.
export interface Lesson { id: string; title: string; sections: string[]; paras: string[]; example: string; quiz: { q: string; options: string[]; answer: number; why: string }[] }
export const LESSONS: Lesson[] = [
  { id: 'data', title: 'The protocol as data: ICH M11 and USDM', sections: ['TP'],
    paras: [
      'ICH M11, the Clinical electronic Structured Harmonised Protocol (CeSHarP), has three parts: a guideline, a template with a fixed table of contents and common text, and a technical specification that defines every data element. ICH adopted it at Step 4 on 19 November 2025; in the EU the template took effect on 11 June 2026, and FDA published it as final in May 2026.',
      'The technical specification gives each element a conformance (required, optional or conditional), a cardinality, a data type, a definition coded in the NCI Thesaurus and, where there is one, a code list. Trial Phase, for example, must be one of eleven values, Phase 3 being C15602; Trial Blind Schema is Double Blind (C15228), Observer Blind, Open Label or Single Blind.',
      'Because the protocol is data, an element is entered once and reused: the number of participants in the synopsis (1.1.2) and in the sample size (10.11) are the same element. CDISC’s Unified Study Definitions Model (USDM v4, June 2025) is the exchange model aligned with M11, so a protocol can travel to the systems that build the database, the trial design datasets and the registry entries.',
    ],
    example: 'VERDANT-1’s title page gives Trial Phase “Phase 3”, the Sponsor Protocol Identifier HRP-301 and the regulatory identifiers (EU CT, IND, CTRI). Its 324 participants appear once, in the key facts, and the synopsis and section 10.11 both show that number.',
    quiz: [
      { q: 'An element has conformance “C”. What does that mean?', options: ['It is required when its condition holds', 'It is optional', 'It is copied from another section'], answer: 0, why: 'Conditional elements are required when their condition is met, for example Amendment Scope when the protocol has been amended.' },
      { q: 'Why does M11 reuse an element instead of asking for it twice?', options: ['So the synopsis and the body cannot disagree', 'To save space in the PDF', 'Because USDM requires it'], answer: 0, why: 'A value held once and shown in several places cannot drift; most protocol inconsistencies are two copies of a fact that diverged.' },
    ] },
  { id: 's1', title: 'Section 1: synopsis, schema and schedule of activities', sections: ['1', '1.1', '1.1.1', '1.1.2', '1.2', '1.3'],
    paras: [
      'Section 1 is what a reader sees first. 1.1.1 lists the primary and secondary objectives with their estimands; 1.1.2 Overall Design holds the design data elements: intervention, intervention model, population type and diagnosis, age, control type, assignment method, stratification, sites and geography, master protocol, combination product and adaptive indicators, number of arms, blind schema and blinded roles, number of participants, durations and committees.',
      '1.2 Trial Schema is a diagram of arms and epochs. 1.3 Schedule of Activities is the grid of procedures by visit, with windows and footnotes. SPIRIT 2025 asks for the same diagram of enrolment, interventions and assessments.',
      'Every procedure in 1.3 needs a reason: it measures an endpoint, checks eligibility, protects safety or is needed to run the trial (consent, dispensing, disposition). A procedure without a reason costs participants time and sites money; an endpoint without a procedure cannot be analysed.',
    ],
    example: 'VERDANT-1 schedules IGA-CHE, HECSI and the itch scale at screening, Day 1 and Weeks 2, 4, 8, 12 and 16: baseline plus every timepoint the endpoints use. The central laboratory sample is taken at every visit from screening to follow-up because liver tests and HBV DNA monitoring are safety measures for this product.',
    quiz: [
      { q: 'An endpoint is the change from baseline at Week 12. Which visits must collect its measurement?', options: ['Week 12 only', 'The baseline visit and Week 12', 'Every visit'], answer: 1, why: 'A change from baseline needs the baseline value; other visits are needed only if the analysis (for example a repeated-measures model) uses them.' },
      { q: 'Where is the number of participants first shown?', options: ['1.1.2 Overall Design', '5.1', '11.4'], answer: 0, why: 'It is a 1.1.2 data element, reused in 10.11.' },
    ] },
  { id: 's2', title: 'Section 2: purpose, risks and benefits', sections: ['2', '2.1', '2.2', '2.2.1', '2.2.2', '2.2.3'],
    paras: [
      '2.1 states the question the trial answers. 2.2 assesses risks and benefits: 2.2.1 is a summary of each identified and potential risk with its source and the mitigation this protocol uses; 2.2.2 the expected benefits; 2.2.3 the sponsor’s overall conclusion.',
      'ICH E6(R3) and E8(R1) ask for quality by design: the factors critical to the quality of the trial and to participants’ safety are identified when the protocol is written, and each control is proportionate to its risk. A risk named in 2.2.1 should be traceable to a criterion, a procedure in the schedule, a stopping rule or a discontinuation rule.',
      'EU CTR Annex I asks for a summary of nonclinical and clinical findings and of the known and potential risks and benefits (paragraph 17(c) and (d)); the investigator’s brochure carries the detail.',
    ],
    example: 'VERDANT-1’s 2.2.1 names hepatitis B reactivation as a potential risk and points to its mitigations: EX01, HBV DNA every 4 weeks for anti-HBc-positive participants, and liver tests at every visit.',
    quiz: [
      { q: 'A potential risk of liver injury is named in 2.2.1. What should the protocol show elsewhere?', options: ['Liver tests in the schedule and a discontinuation rule', 'Nothing: 2.2.1 is enough', 'A sentence in the glossary'], answer: 0, why: 'A mitigation that is named must exist in the schedule, criteria or rules.' },
    ] },
  { id: 's3', title: 'Section 3: objectives and estimands (ICH E9(R1))', sections: ['3', '3.1', '3.2', '3.3'],
    paras: [
      'Each objective has one or more endpoints; primary and key secondary objectives have an estimand. ICH E9(R1) defines the estimand by five attributes: the treatment condition, the population, the variable (endpoint), the handling of intercurrent events and the population-level summary.',
      'Intercurrent events are events after randomisation that affect the interpretation or existence of the measurements: stopping treatment, taking rescue medication, death. Each has a strategy. Treatment policy uses the value whatever happened; hypothetical estimates what would have happened without the event; composite variable makes the event part of the outcome (for example, a non-responder); while on treatment uses values before the event; principal stratum restricts to participants in whom the event would not occur.',
      'The summary must fit the variable: a difference in proportions or an odds ratio for a binary variable, a difference in means for a continuous one, a hazard ratio for time to event. The estimator in section 10, its missing data handling and the sensitivity analyses then follow from the estimand.',
    ],
    example: 'VERDANT-1’s primary estimand: adults with moderate to severe chronic hand eczema (population), lumiravostat 25 or 10 mg vs placebo for 16 weeks (treatment), IGA-CHE success at Week 16 (variable), rescue therapy and discontinuation as non-response (composite), difference in proportions (summary).',
    quiz: [
      { q: 'Rescue therapy is counted as treatment failure. Which strategy is that?', options: ['Composite variable', 'Treatment policy', 'Hypothetical'], answer: 0, why: 'The intercurrent event becomes part of the variable.' },
      { q: 'The variable is change in blood pressure. Which summary fits?', options: ['Difference in means', 'Hazard ratio', 'Difference in proportions'], answer: 0, why: 'A continuous variable is summarised by a difference in means (or medians).' },
      { q: 'Participants who stop treatment stay in the trial. Which strategy needs that most?', options: ['Treatment policy', 'While on treatment', 'Principal stratum'], answer: 0, why: 'Treatment policy uses values after discontinuation, so they must be collected (section 7.1).' },
    ] },
  { id: 's4', title: 'Section 4: trial design and its rationale', sections: ['4', '4.1', '4.2', '4.3', '4.4', '4.5'],
    paras: [
      '4.1 describes the design in prose that must match 1.1.2; 4.1.1 records stakeholder input, including patient and public involvement, which SPIRIT 2025 and CTR Annex I 17(e) both ask about.',
      '4.2 gives the rationale: for the estimands (4.2.1), the intervention model (4.2.2), the control (4.2.3), the duration (4.2.4), an adaptive or novel design (4.2.5, only when the design is adaptive; ICH E20 is still a draft), an interim analysis (4.2.6) and other aspects (4.2.7).',
      '4.3 gives the trial stopping rules, 4.4 defines the start and the end of the trial, and 4.5 says what access participants have to the intervention after the trial (CTR Annex I 17(o), (p) and (ae)).',
    ],
    example: 'VERDANT-1 justifies placebo (4.2.3) by the need to separate the drug effect from the natural course of chronic hand eczema, with topical corticosteroid rescue so that no one is left untreated; the end of the trial is the last participant’s Week 20 visit (4.4).',
    quiz: [
      { q: 'Section 4.2.5 is conditional. When is it required?', options: ['When the Adaptive Trial Design Indicator is Yes', 'Always', 'For phase 1 trials only'], answer: 0, why: 'It is the rationale for an adaptive or novel design.' },
    ] },
  { id: 's5', title: 'Section 5: the trial population', sections: ['5', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6'],
    paras: [
      '5.1 describes the population and why it was chosen, including the age and sex distribution (CTR Annex I 17(y)). 5.2 and 5.3 list the inclusion and exclusion criteria, numbered; each must be checkable from a screening procedure, so the schedule must hold that procedure at screening.',
      '5.4 covers contraception when the intervention has a reproductive risk: who is of childbearing potential (5.4.1) and what methods are needed for how long (5.4.2). If participants of childbearing potential are included, the schedule needs pregnancy tests.',
      '5.5 lists lifestyle restrictions and 5.6 says how screen failures are recorded and whether rescreening is allowed. India’s NDCT Rules (Third Schedule, Table 2) list the same content under study population and subject eligibility.',
    ],
    example: 'VERDANT-1’s EX01 (hepatitis B) needs the hepatitis B screening panel at screening; EX03 (ALT above 2 × ULN) needs the central laboratory at screening; IN04 (contraception) needs the pregnancy test.',
    quiz: [
      { q: 'An exclusion criterion uses an ECG value. What must the schedule have?', options: ['An ECG at screening', 'An ECG at the end of treatment', 'Nothing'], answer: 0, why: 'Eligibility is decided at screening, so the test must be done then.' },
      { q: 'IN01 says 18 to 80 years; 1.1.2 says 18 to 75. Which is right?', options: ['Neither can be assumed: one is an inconsistency to resolve', 'IN01', '1.1.2'], answer: 0, why: 'The reviewer cannot know; the author fixes the source and both places agree.' },
    ] },
]

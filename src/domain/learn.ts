// Learn mode: the protocol as data, M11 sections 1 to 14 and protocol amendments, each with the worked
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
  { id: 's6', title: 'Section 6: trial intervention and concomitant therapy', sections: ['6', '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10'],
    paras: [
      '6.1 describes each investigational intervention (name, form, strength, dose, route, frequency, duration); 6.2 justifies the dose and regimen from nonclinical, pharmacokinetic and earlier clinical data; 6.3 to 6.6 cover administration, dose modification, overdose and how the product is prepared, stored and accounted for.',
      '6.7 explains assignment, randomisation (method, ratio, stratification factors, who generates the list) and blinding (who is blinded, how the blind is kept and how an investigator breaks it in an emergency). The stratification factors must match the design element in 1.1.2 and the analysis model in section 10.',
      '6.8 says how adherence is measured, 6.9 describes noninvestigational interventions (background or rescue therapy, challenge agents) and 6.10 lists permitted and prohibited concomitant therapy. A prohibited medicine that is also an intercurrent event (rescue therapy, say) needs a strategy in the estimand.',
    ],
    example: 'VERDANT-1 gives lumiravostat 10 mg or 25 mg, or a matching placebo tablet, once daily by mouth for 16 weeks. Randomisation is 1:1:1, stratified by baseline IGA-CHE (3 or 4) and region; the same two factors are the strata of the primary analysis. A class III topical corticosteroid is the rescue therapy (6.9) and its use is an intercurrent event; systemic corticosteroids are prohibited (6.10).',
    quiz: [
      { q: 'Randomisation is stratified by region and baseline severity. Where else must those factors appear?', options: ['In 1.1.2 and in the analysis model in section 10', 'Only in 6.7', 'In 12.2'], answer: 0, why: 'ICH E9: an analysis should account for the stratification used at randomisation, and 1.1.2 holds stratification as a design element.' },
      { q: 'Rescue medicine is allowed in 6.10. What else does the protocol need?', options: ['An intercurrent event strategy for rescue use in each affected estimand', 'Nothing more', 'An exclusion criterion'], answer: 0, why: 'Taking rescue medicine changes what the endpoint means, so ICH E9(R1) asks how it is handled.' },
    ] },
  { id: 's7', title: 'Section 7: discontinuation and withdrawal', sections: ['7', '7.1', '7.2', '7.3'],
    paras: [
      '7.1 separates stopping the trial intervention from leaving the trial. It lists the reasons for permanent discontinuation (safety thresholds, pregnancy, the participant’s request) and any temporary interruption and rechallenge rules, and says what assessments continue afterwards.',
      'Under ICH E9(R1) a participant who stops treatment but stays in the trial and keeps attending visits gives data for a treatment-policy strategy. A protocol that ends follow-up at discontinuation forces a different strategy, or missing data.',
      '7.2 covers withdrawal of consent and what is done with data already collected; 7.3 how sites try to reach participants before declaring them lost to follow-up.',
    ],
    example: 'VERDANT-1 stops lumiravostat for ALT above 5 × ULN, or above 3 × ULN with total bilirubin above 2 × ULN (the pattern of Hy’s law), and for pregnancy. It also stops for detectable HBV DNA. Participants who stop are asked to keep attending visits to Week 20, which supports the treatment-policy strategy for discontinuation.',
    quiz: [
      { q: 'Why ask participants who stop treatment to keep attending visits?', options: ['Their outcomes support a treatment-policy estimand and reduce missing data', 'To give them more treatment', 'Because GCP requires every visit'], answer: 0, why: 'Off-treatment data are what a treatment-policy strategy needs.' },
      { q: 'Section 2.2.1 names liver injury as a risk. What should section 7.1 contain?', options: ['A liver stopping rule (ALT and bilirubin thresholds)', 'Nothing about the liver', 'The liver test schedule'], answer: 0, why: 'A named risk needs a mitigation; for liver injury that is monitoring in 1.3 and a stopping rule in 7.1.' },
    ] },
  { id: 's8', title: 'Section 8: trial assessments and procedures', sections: ['8', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8'],
    paras: [
      '8.1 gives general considerations (who performs assessments, the order on a visit day, the blood volume); 8.2 screening and baseline procedures; 8.3 how each efficacy assessment is done and by whom (a rater trained on the scale, for example); 8.4 the safety assessments: vital signs, ECGs, physical examination and laboratory tests.',
      '8.5 to 8.8 cover pharmacokinetics, biomarkers, immunogenicity and health economics when the trial collects them. Each procedure described here should have its row in the schedule of activities, and each row in the schedule should be described here.',
      'The total blood drawn per participant and the time a visit takes are part of the burden on participants; ICH E8(R1) asks that data not needed for the trial’s purpose are not collected.',
    ],
    example: 'VERDANT-1’s IGA-CHE and HECSI are scored by a dermatologist trained on the scales, the same rater for a participant where possible; the itch scale is reported by the participant in an electronic diary. The central laboratory panel covers haematology, chemistry including ALT, AST and bilirubin, and HBV DNA for participants with resolved hepatitis B.',
    quiz: [
      { q: 'The schedule has a row for an ECG that section 8 never describes. What is wrong?', options: ['The procedure has no description of how it is done or why', 'Nothing', 'The ECG must move to 12.1'], answer: 0, why: 'Section 8 says how and by whom each scheduled procedure is done.' },
    ] },
  { id: 's9', title: 'Section 9: adverse events and other safety reporting', sections: ['9', '9.1', '9.2', '9.3', '9.4'],
    paras: [
      '9.1 defines adverse event, serious adverse event and, where used, adverse events of special interest, following ICH E2A. 9.2 gives the collection period (from consent or from first dose to the end of follow-up), how events are assessed for severity and causality, and the timelines for reporting SAEs to the sponsor (usually within 24 hours).',
      'Expedited reporting to authorities follows regional rules: in the US IND safety reports under 21 CFR 312.32 (7 or 15 calendar days); in the EU SUSARs to the EudraVigilance database under CTR Article 42 (7 or 15 days); in India the NDCT Rules require SAEs to be reported within 24 hours and an analysis within 14 days.',
      '9.3 covers pregnancy in a participant or a participant’s partner and how it is followed up; 9.4 special situations such as overdose, medication errors and misuse.',
    ],
    example: 'VERDANT-1 collects adverse events from consent to the follow-up visit at Week 20, makes liver injury an adverse event of special interest, and follows any pregnancy to its outcome.',
    quiz: [
      { q: 'An investigator learns of an SAE. Under a typical protocol, when must it reach the sponsor?', options: ['Within 24 hours', 'Within 15 days', 'At the next monitoring visit'], answer: 0, why: 'The sponsor needs the report fast enough to meet its own 7- and 15-day expedited timelines.' },
    ] },
  { id: 's10', title: 'Section 10: statistical considerations', sections: ['10', '10.1', '10.2', '10.3', '10.4', '10.5', '10.6', '10.7', '10.8', '10.9', '10.10', '10.11'],
    paras: [
      '10.1 states the hypotheses and general methods; 10.2 defines the analysis sets; 10.4 to 10.6 give, for each estimand, the main estimator, how intercurrent events and missing data are handled, and sensitivity and supplementary analyses (ICH E9(R1)). 10.7 covers safety analyses.',
      'Testing several hypotheses inflates the chance of a false positive. 10.10 says how the familywise error rate is controlled: Bonferroni, Holm, Hochberg, a fixed sequence, or a graphical approach (Bretz and colleagues, 2009) in which each hypothesis starts with a share of alpha and passes it on along weighted edges when rejected.',
      '10.9 describes any interim analysis: its timing as an information fraction, its purpose, the alpha spending function (Lan-DeMets with O’Brien-Fleming or Pocock-type boundaries) and who sees unblinded results. 10.11 gives the sample size with every assumption: effect, variability, alpha, power, allocation and the allowance for dropouts, so a reader can reproduce it.',
    ],
    example: 'VERDANT-1 assumes IGA-CHE success in 35% on each dose and 15% on placebo. With two-sided alpha 0.05 and 90% power, 97 participants per arm are needed; allowing 10% without a Week 16 assessment gives 108 per arm, 324 in total. A graphical procedure splits alpha between the two doses and passes it from IGA-CHE to HECSI-75 to itch within each dose.',
    quiz: [
      { q: 'A trial tests two doses against placebo on one endpoint, each at two-sided 0.05. What is the problem?', options: ['The familywise error rate is above 0.05 without a multiplicity adjustment', 'None', 'The power is too low'], answer: 0, why: 'Two tests each at 0.05 give up to about a 10% chance of at least one false positive.' },
      { q: 'With O’Brien-Fleming-type spending, how hard is it to stop at an early interim?', options: ['Very hard: the early boundary is far stricter than the final one', 'The same at every look', 'Easier than at the end'], answer: 0, why: 'O’Brien-Fleming boundaries spend little alpha early, so the final test keeps nearly the full alpha; Pocock boundaries are flat.' },
      { q: '10.11 says 300 participants; 1.1.2 says 324. What does a reviewer conclude?', options: ['The protocol is inconsistent and must be corrected', '324 is right', '300 is right'], answer: 0, why: 'It is one data element; both places must show the same value.' },
    ] },
  { id: 's11', title: 'Section 11: oversight and general considerations', sections: ['11', '11.1', '11.2', '11.3', '11.4', '11.5', '11.6', '11.7', '11.8', '11.9', '11.10', '11.11', '11.12'],
    paras: [
      '11.1 to 11.3 cover regulatory and ethical approval, oversight and the informed consent process (including consent for minors, legally acceptable representatives and re-consent after new information). 11.4 lists the committees: data monitoring, adjudication, steering; their membership and charters are separate documents.',
      'ICH E6(R3) asks for risk-based quality management (11.6): critical-to-quality factors, the risks to them, the controls and the quality tolerance limits that trigger review. 11.7 to 11.9 cover data governance, protection of personal data (the GDPR in the EU, the Digital Personal Data Protection Act 2023 in India) and what the source records are.',
      '11.10 defines protocol deviations and important deviations; 11.11 the conditions for closing a site early; 11.12 how results are published and shared, including registry posting.',
    ],
    example: 'VERDANT-1 has an independent data monitoring committee that reviews unblinded safety data every six months. Its critical-to-quality factors are the primary endpoint assessment, eligibility and safety reporting; a quality tolerance limit could be, for example, more than 10% of participants missing the Week 16 IGA-CHE.',
    quiz: [
      { q: 'What is a quality tolerance limit?', options: ['A predefined level of a trial-level parameter that triggers review when crossed', 'The maximum number of sites', 'A laboratory reference range'], answer: 0, why: 'ICH E6(R3): limits on parameters such as missing primary data or deviation rates, checked during the trial.' },
    ] },
  { id: 's12', title: 'Sections 12 to 14: appendices', sections: ['12', '12.1', '12.2', '12.3', '13', '14'],
    paras: [
      '12.1 lists the clinical laboratory tests (the panel behind the central laboratory row in the schedule); 12.2 country or region-specific differences, such as an extra test or a different age of consent; 12.3 summarises prior amendments when the protocol has been amended more than once.',
      '13 is the glossary of terms and abbreviations, and 14 the references cited in the protocol.',
    ],
    example: 'In India the NDCT Rules require audio-visual recording of the consent process in some situations; a difference like that belongs in 12.2. VERDANT-1’s 12.3 lists amendment 1 once amendment 2 is written.',
    quiz: [
      { q: 'Where does a country-specific extra test belong?', options: ['12.2 Country/Region-Specific Differences', 'A separate protocol', 'Section 13'], answer: 0, why: 'M11 keeps one protocol and records regional differences in 12.2.' },
    ] },
  { id: 'regions', title: 'One protocol, four checklists: SPIRIT 2025, EU CTR, India and the IND', sections: ['4.1.1', '11.8', '11.12', '12.2'],
    paras: [
      'M11 sets the structure of a protocol; other texts list what a protocol must contain. SPIRIT 2025 (34 items, published in 2025) is the reporting guideline for trial protocols, with new items on open science (registration, access to the protocol and analysis plan, data sharing) and on patient and public involvement. Regulation (EU) No 536/2014 lists the protocol content in Annex I, section D: identification (paragraph 15), the minimum content (paragraph 17, items (a) to (am)), safety reporting (19 and 20), and the synopsis and committee charter that go with it.',
      'India’s New Drugs and Clinical Trials Rules 2019 give the contents of a protocol in Table 2 of the Third Schedule: a title page (with the investigators, sites and laboratories) and 16 headings ending with the investigator’s undertaking (Table 4) and the appendices. In the US, 21 CFR 312.23(a)(6) lists what an IND protocol contains, and lets a phase 1 protocol be less detailed than a phase 2 or 3 one, provided the elements critical to safety are given in detail.',
      'Most items fall in the M11 sections already. The rest are regional: the EU asks for a description of patient involvement (17(e)), data protection and what happens after a data breach (17(ak) to (am)) and which serious adverse events need no immediate report (19(b)); India asks for the list of investigators and sites and the undertaking, which M11 puts in 12.2 (country-specific differences). The cross-walk view shows each item, the M11 sections that meet it, and the gaps.',
    ],
    example: 'VERDANT-1 is written for all four: 4.1.1 describes the patient panel, 9.2 names the adverse events of special interest and states that no serious adverse event is exempt, 11.8 covers the GDPR, India’s Digital Personal Data Protection Act and breaches, and 12.2 lists the Indian sites and the Table 4 undertaking.',
    quiz: [
      { q: 'Under the EU CTR, where does a protocol describe what happens after a data security breach?', options: ['Annex I, paragraph 17(am), usually met in M11 section 11.8', 'Nowhere: the GDPR covers it', 'In the investigator’s brochure'], answer: 0, why: 'Annex I 17(am) asks for measures to mitigate the effects of a data security breach.' },
      { q: 'India’s Table 2 asks for the investigators and sites on the title page. M11 has no such element. Where does it go?', options: ['12.2 Country/Region-Specific Differences', 'Section 13', 'It cannot be given'], answer: 0, why: 'M11 keeps one global protocol and puts regional content in 12.2.' },
      { q: 'What may a phase 1 IND protocol leave less detailed?', options: ['Elements not critical to safety; dosing, exclusions and safety monitoring must still be detailed', 'Everything', 'Nothing'], answer: 0, why: '21 CFR 312.23(a)(6)(i): phase 1 protocols may be less detailed and more flexible, but must detail the safety-critical elements.' },
    ] },
  { id: 'ib', title: 'The Investigator’s Brochure and the protocol', sections: ['2.2', '6.2', '9.2'],
    paras: [
      'The Investigator’s Brochure (IB) compiles what is known about an investigational product so investigators can judge the risks of a trial. ICH E6(R3) Appendix A gives its contents: a summary; an introduction; the physical, chemical and pharmaceutical properties and formulation; nonclinical studies (pharmacology, pharmacokinetics and metabolism in animals, toxicology); effects in humans (pharmacokinetics, safety and efficacy, marketing experience); and a summary of data and guidance for the investigator. It is reviewed at least once a year and revised when important new information arrives.',
      'The reference safety information (RSI) is the list of expected serious adverse reactions used to decide whether a suspected serious adverse reaction is unexpected, and so a SUSAR to report in expedited timelines. In the EU it sits in a clearly separated section of the IB, and the protocol (or the application) names the IB edition that holds it.',
      'The protocol and the IB must agree: every expected adverse reaction in the RSI belongs among the risks the protocol names in 2.2.1, with its mitigation; the doses in section 6 should not exceed what the IB shows humans have received without a justification; and section 9 says which RSI decides expectedness. When the IB changes, the protocol may need an amendment.',
    ],
    example: 'VERDANT-1 cites section 7 of the lumiravostat IB, edition 3, whose RSI lists upper respiratory tract infection and ALT increased; both are risks in 2.2.1. The protocol’s highest dose, 25 mg, is below the 50 mg a day given in phase 1.',
    quiz: [
      { q: 'What decides whether a suspected serious adverse reaction is a SUSAR?', options: ['Whether it is listed in the reference safety information of the IB edition in force', 'Whether the investigator expected it', 'Whether it is in the protocol’s exclusion criteria'], answer: 0, why: 'Expectedness is judged against the RSI, not the investigator’s opinion.' },
      { q: 'The IB adds dry mouth to the RSI. What should the protocol do?', options: ['Name dry mouth as a risk in 2.2.1 with its mitigation, and cite the new IB edition', 'Nothing', 'Exclude anyone with dry mouth'], answer: 0, why: 'The protocol’s risks and the RSI must agree, and the cited edition must be the one in force.' },
    ] },
  { id: 'device', title: 'Device trials: the ISO 14155:2026 clinical investigation plan', sections: ['TP'],
    paras: [
      'A clinical investigation of a medical device follows ISO 14155 (good clinical practice for devices); the fourth edition was published in March 2026. Its Annex A sets the contents of the clinical investigation plan (CIP): identification, sponsor and investigators, a synopsis, the device (manufacturer, model and software version, intended purpose, classification, materials, training), the justification for the design, benefits and risks, objectives and hypotheses, the design (subjects, procedures, monitoring), statistics, data management, amendments and deviations, device accountability, compliance, consent, safety reporting, vulnerable populations, suspension and termination, and publication.',
      'Risks come from the device’s ISO 14971 risk management file. The 2026 edition separates three categories: risks of the device, risks of procedures the CIP requires outside routine practice, and risks of conducting the investigation. Safety reporting uses device terms: adverse device effect (ADE), serious ADE (SADE), unanticipated SADE (USADE), and device deficiency, including deficiencies that might have led to a SADE.',
      'The 2026 edition also asks the sponsor to consider a data monitoring committee and, if there is none, to justify that in the CIP; to consider a clinical events committee for consistent adjudication of events and endpoints; to cover the calibration of measuring equipment; and to treat any exemption from the eligibility criteria as a CIP amendment rather than a deviation. In the EU, Annex XV of Regulation (EU) 2017/745 lists the CIP content; in the US a significant-risk device needs an IDE under 21 CFR 812; in India the Medical Devices Rules 2017 apply.',
    ],
    example: 'For a wearable ECG patch with arrhythmia software, the CIP names the software version, lists skin irritation (device), a missed arrhythmia (device), and data loss (conduct) with their controls, has cardiologists adjudicate rhythm strips as the clinical events committee, and calibrates the reference Holter recorders before each subject.',
    quiz: [
      { q: 'Under ISO 14155:2026, a subject just outside an inclusion criterion would benefit from taking part. What is needed?', options: ['A CIP amendment; individual exemptions are not deviations', 'A protocol deviation report', 'The investigator’s decision'], answer: 0, why: 'The 2026 edition treats eligibility exemptions as changes to the design, made only by amendment.' },
      { q: 'What is a USADE?', options: ['A serious adverse device effect whose nature, incidence, severity or outcome was not identified in the risk management file', 'Any adverse event in a device trial', 'A device malfunction'], answer: 0, why: 'Unanticipated SADEs are judged against the risk assessment, as SUSARs are against the RSI.' },
      { q: 'The sponsor sets up no data monitoring committee. What must the CIP contain?', options: ['A justification for not having one', 'Nothing', 'A DMC charter anyway'], answer: 0, why: 'ISO 14155:2026 clause 6.11: if no DMC is established, the CIP justifies the decision.' },
    ] },
  { id: 'amend', title: 'Protocol amendments in the US, EU and India', sections: ['TP', '12.3'],
    paras: [
      'An amended M11 protocol gets a new version number and, on its title page, the Amendment Identifier, the Amendment Scope (global or a named region or country) and the Original Protocol Indicator (No). The amendment details page gives the primary and secondary reasons (a CDISC code list), a summary, whether the changes substantially affect participants’ safety or rights or the reliability and robustness of the data, and an overview table of each change with its rationale. Earlier amendments move to 12.3.',
      'United States, 21 CFR 312.30: a change in a phase 2 or 3 protocol that significantly affects safety, scope or scientific quality is a protocol amendment submitted to FDA and approved by the IRB before it is implemented, except a change to remove an immediate hazard, which may be made at once and reported afterwards. In phase 1 any change that significantly affects safety is such an amendment. Changes that do not meet those tests can wait for the annual report.',
      'European Union, Clinical Trials Regulation 536/2014: a substantial modification (Article 2(2)(13)) is likely to have a substantial impact on safety or rights or on the reliability and robustness of the data. It is authorised through the CTIS before it is made: Part I (the protocol, the investigator’s brochure, the product) by all concerned Member States, Part II (consent, recruitment, sites, investigators) by each. Non-substantial changes are recorded and, where relevant to supervision, notified under Article 81(9). An urgent safety measure (Article 54) is taken at once and notified within 7 days.',
      'India, New Drugs and Clinical Trials Rules 2019, Third Schedule: amendments that do not affect safety or the scientific value are notified to the Central Licensing Authority within 30 days; others need prior approval, as does an amendment approved by the ethics committee before implementation. Changes to protect participants from immediate harm can be made at once.',
    ],
    example: 'Amendment 1 of VERDANT-1 adds liver tests at Weeks 2 and 12 and a liver stopping rule after a safety signal. Its primary reason is New Safety Information Available; it substantially affects participants’ safety. In the US it is a protocol amendment (312.30(b)); in the EU a substantial modification of Part I; in India it needs prior approval.',
    quiz: [
      { q: 'Under the EU CTR, a change of a site’s principal investigator is…', options: ['A substantial modification of Part II', 'A substantial modification of Part I', 'Never notified'], answer: 0, why: 'Investigators and sites are Part II matters, assessed by the Member State concerned.' },
      { q: 'A sponsor must stop dosing at once to protect participants. What can it do?', options: ['Act now, then notify (EU urgent safety measure within 7 days; US and India allow immediate changes for hazards)', 'Wait for approval', 'Nothing until the next annual report'], answer: 0, why: 'All three frameworks let the sponsor protect participants first and report afterwards.' },
      { q: 'A correction of a typing error with no effect on the trial is, in India…', options: ['Notified within 30 days', 'Needs prior approval', 'Needs a new protocol'], answer: 0, why: 'The NDCT Rules allow notification within 30 days for administrative, logistic or minor changes.' },
    ] },
]

# Protocol Builder

Write a clinical trial protocol in the **ICH M11** structure (the Clinical electronic Structured
Harmonised Protocol, CeSHarP) and see whether its parts agree. The objectives, endpoints and
**estimands** (ICH E9(R1)), the **schedule of activities**, the eligibility criteria, the
interventions and the **sample size** are held as data, and 40 consistency rules read the
synopsis and the body together. The finished protocol exports as **CDISC USDM v4** data, which the
[EDC Study Build Lab](https://randomthingsonlineatsk-cloud.github.io/edc-study-build-lab/) turns
into a first-pass database build, as a readable protocol to save as PDF, and as a Word file.
Approved versions are frozen; amendments carry tracked changes, the M11 amendment details and a
classification of each change for the US, the EU and India.

Live: https://randomthingsonlineatsk-cloud.github.io/protocol-builder/

Training only. All protocols, products and sponsors are fictional.

## What you do

1. **Start** from a blank protocol, a worked example, the library (product, indication, design,
   phase), a USDM v4 file, or a mission.
2. **Sections**: the full M11 table of contents, from the title page to section 14, with each
   section's conformance (required, optional, or conditional and when) and guidance. The title
   page and the 1.1.2 Overall Design are forms over the technical specification's data elements;
   coded elements use the M11 code lists with their NCI C-codes (Trial Phase C217045, Trial Blind
   Schema C217051, Intervention Model C217277 and others). Criteria, arms and interventions,
   analysis sets and the statistics have their own editors:
   - **Sample size** for two proportions or two means (superiority), non-inferiority for both,
     time to event (Schoenfeld, as events and participants), a 2×2 crossover and a single arm
     (exact binomial), with the working shown and the statement for 10.11 written from it.
   - **Multiplicity**: Bonferroni, Holm, Hochberg, a fixed sequence, or a graphical procedure
     (Bretz and colleagues, 2009) drawn as a graph of weights and transitions over the hypotheses
     (efficacy estimands × doses). Enter p-values to see which hypotheses are rejected and how
     alpha passes on; 10.10 is written from the plan.
   - **Interim analyses**: information fractions and Lan-DeMets alpha spending with
     O'Brien-Fleming or Pocock-type boundaries, computed by recursive numerical integration.
3. **Objectives and estimands**: objectives and endpoints at their levels, each endpoint linked to
   the procedures and visits that measure it, and estimands with population, treatment, variable,
   intercurrent events with a strategy each, and the population-level summary, plus the estimator,
   missing data and sensitivity analysis for section 10.
4. **Schedule of activities**: visits with study days, windows, epochs and type (on site, remote,
   phone, home nurse), procedures by visit, what each procedure serves, and the burden per
   participant (time on site, blood volume).
5. **Consistency checks**: 40 rules in eight groups (completeness, synopsis against body,
   objectives and estimands, schedule against endpoints, eligibility against population,
   intervention, statistics, safety and oversight). Fix a finding at its source, or justify it.
6. **Versions and amendments**: approve a version to freeze it, then start an amendment (the next
   version, with Original Protocol Indicator No and an Amendment Identifier). Tracked changes
   compare any two versions, element by element and word by word. The amendment details follow
   M11: scope, percentage enrolled, primary and secondary reasons (CDISC C207415), summary, and
   the impact on safety or rights and on the data. The summary of changes is drafted from the
   tracked changes; for each change you choose its kind and classify it for:
   - **US**, 21 CFR 312.30 (protocol amendment before implementation, immediate hazard,
     new investigator, new protocol, IRB only, annual report, no submission);
   - **EU**, Regulation (EU) No 536/2014 (substantial modification of Part I, Part II or both,
     non-substantial, Article 81(9) update, Article 54 urgent safety measure, new application);
   - **India**, NDCT Rules 2019, Third Schedule (prior approval, notification within 30 days,
     immediate change to remove a hazard, ethics committee approval with CDSCO informed, new
     application).
   The app's key, with the reason for each answer, checks your classification; a different
   answer counts when you justify it.
7. **Cross-walks**: the protocol read against four other lists of protocol content, item by
   item, with a coverage score and the gaps: SPIRIT 2025 (34 items), EU Regulation 536/2014 Annex I
   section D (paragraphs 15 to 24, with 17(a) to (am)), India's NDCT Rules 2019 Third Schedule
   Table 2 (title page and 16 headings) and 21 CFR 312.23(a)(6) (scaled by phase). Each item links to
   the M11 sections that meet it, and each section shows the items it serves.
8. **Investigator's brochure**: the product's IB in the ICH E6(R3) Appendix A sections (summary,
   introduction, properties and formulation, nonclinical studies, effects in humans, guidance for
   the investigator) with the reference safety information in its own section, started from the
   library product. Five checks read it against the protocol: the IB edition the protocol cites,
   every expected adverse reaction among the risks in 2.2.1, doses within the highest dose given to
   humans, and completeness.
9. **Review**: a readiness summary (required elements, consistency findings, SPIRIT score,
   cross-walks, IB, USDM), reviewer comments on a section or on quoted words (corrections and
   consistency comments block readiness until resolved), and a plain-language check of the
   synopsis and of a lay summary: Flesch-Kincaid grade, reading ease, sentence length and
   technical words with plainer ones.
10. **Export**: USDM v4 (full, with every amendment as a StudyAmendment, and the teaching subset
   the EDC lab reads), the print layout, a Word document (title page, amendment details and
   overview of changes, table of contents, every section, the schedule of activities in landscape),
   the project file, the hand-off for the pharmolecule Ostrevia lifecycle journey, and:
   - **SDTM trial design datasets** TA, TE, TV, TI and TS (SDTMIG v3.4) written from the protocol,
     as CSV and as a file the SDTM Mapping Trainer reads as the reference for its trial design
     mission. TS parameters that come from the data (ACTSUB, SSTDTC, SENDTC, the data cut-off and
     the standards versions) are left for the SDTM programmer.
   - **An application bundle** for the trial application step of the Clinical Trial Simulator: the
     protocol, a synopsis, the cross-walk results and, for an amendment, the summary of changes
     with a cover note for the US (312.30), the EU (CTIS) and India (Third Schedule 1(v) and (vi)).

**Device projects** hold a clinical investigation plan instead of an M11 protocol, in the topics of
ISO 14155:2026 Annex A (fourth edition, March 2026): identification, sponsor, investigators,
synopsis, the device (model, software version, intended purpose, classification), the design
justification, benefits and risks from the ISO 14971 risk management file in the three categories
of the 2026 edition, objectives, design, statistics, data management, amendments, deviations, device
accountability, compliance, consent, adverse device effects and device deficiencies, vulnerable
populations, suspension and publication. Ten device checks include the 2026 points: a justification
when there is no data monitoring committee, a clinical events committee considered, calibration of
measuring equipment, and eligibility exemptions only by CIP amendment. The section numbers are the
app's; check Annex A's own numbering in the standard.

A protocol can also start from a **Clinical Trial Simulator design**: the simulator's final report
exports the phase 2 and phase 3 choices, which fill the title page and sections 1 to 5 and 10.

Learn mode covers the protocol as data, every M11 section from 1 to 14, the four content
checklists, the Investigator's Brochure, device CIPs under ISO 14155:2026, and amendments in the
US, the EU and India, each lesson with the VERDANT-1 worked
example and a quiz.

## Missions

| Mission | Task |
| --- | --- |
| M1 | Read a protocol: 15 questions on VERDANT-1 |
| M2 | Objectives, endpoints and estimands for a phase 2 dose-finding study (NORTHFELL-2) |
| M3 | Build NORTHFELL-2's schedule of activities within a burden target |
| M4 | Write HRP-201, the phase 2 dose-ranging protocol for lumiravostat |
| M5 | Fix VASCLEAR-2's 20 planted inconsistencies without making new ones |
| M6 | Size VERDANT-1 and control multiplicity across its six hypotheses |
| M7 | Write amendment 1 of VERDANT-1 after a liver safety signal |
| M8 | Classify 15 proposed changes for the US, the EU and India |
| M9 | Region readiness: close VERDANT-1's gaps against EU CTR Annex I and NDCT Table 2 |
| M10 | Hand off: export USDM, let the EDC Study Build Lab draft a build, and report what it missed |
| M11 | Write teravelin's Investigator's Brochure and bring NORTHFELL-2 into line with it |
| M12 | Write the ISO 14155:2026 CIP for a fictional wearable ECG patch |

**Certificate**: M1 to M10 passed and every Learn quiz passed, with a verification code the
[Skills Passport](https://randomthingsonlineatsk-cloud.github.io/pharmolecule/passport.html) checks
(prefix PB-). Distinction: all twelve missions passed, three or more at expert level.

**Classroom mode** uses the shared classroom server (Cloudflare Worker and D1, kept in the eCTD
Dossier Builder repository) under `/pb/v1`: instructors create a class and assign missions,
students join with a code and send their mission projects, and instructors re-score each one in
their own browser, comment and see a leaderboard. The server's status page lists the Protocol
Builder with the other apps.

## Worked examples and the other apps

- **HRP-301 (VERDANT-1)**, lumiravostat (Ostrevia) in chronic hand eczema: the trial the
  [CDM Query & Edit-Check Console](https://randomthingsonlineatsk-cloud.github.io/cdm-query-console/)
  locks, the [SDTM Mapping Trainer](https://randomthingsonlineatsk-cloud.github.io/sdtm-mapping-trainer/)
  maps and the [TLF Programming Lab](https://randomthingsonlineatsk-cloud.github.io/tlf-programming-lab/)
  analyses. Visits, windows, criteria, assessments (IGA-CHE, HECSI, itch NRS), the hepatitis B
  rule and the responder definitions are the same.
- **HLV-204-201 (VASCLEAR-2)**, the hypertension trial of the CDM console's Protocol-to-Database
  Twin and the EDC Study Build Lab, with the twin's three inconsistencies resolved.
- **GLV-12-301**, Glyvantra (GLV-12) added on to metformin in type 2 diabetes: the study of the
  SDTM Mapping Trainer and the TLF Programming Lab, with their visits, criteria, laboratory schedule
  and TS codes, the ANCOVA of HbA1c at Week 26, the MMRM and placebo-based imputation, and the
  30-day window for treatment-emergent adverse events. Its trial design datasets match the
  trainer's reference.
- **NFR-118-201 (NORTHFELL-2)**, a teravelin dose-finding study in COPD.

The data model follows the CDM console's M11 object (title page, design, objectives, criteria,
visits, procedures): the console's Protocol-to-Database Twin opens a project file from here and
traces the protocol to that study's database build. The
[pharmolecule journey](https://randomthingsonlineatsk-cloud.github.io/pharmolecule/journey.html)
checks the VERDANT-1 hand-off at step 2, before the CDM step.

## Standards (checked November 2026)

- ICH M11 CeSHarP: guideline, template and technical specification, ICH Step 4 on
  19 November 2025; EMA Step 5, effective 11 June 2026; FDA final notice, 22 May 2026.
- CDISC USDM v4.0 (June 2025), Digital Data Flow. Every coded value in the export uses CDISC
  Controlled Terminology (release 2026-03-27) from the value set USDM names for the attribute;
  activities link CDISC Biomedical Concepts, grouped in a category per procedure, or a surrogate
  where the CDISC library has no concept (IGA-CHE, HECSI, itch NRS, a pregnancy test, dispensing).
  The exports of the worked examples pass the DDF conformance rules of the usdm4 reference library
  (0.30.0, d4k engine) with no errors. One warning remains (DDF00101, no Procedure linked to a study
  intervention) because CDISC terminology has no code for a dispensing procedure. Run
  `tools/validate_usdm.py` to check.
- ICH E9(R1) estimands; E6(R3) (EU effective 23 July 2025; Annex 2 effective 15 January 2027);
  E8(R1); E20 adaptive designs (draft).
- SPIRIT 2025 (BMJ 2025;389:e081477; JAMA 2025); Regulation (EU) No 536/2014 Annex I section D; New Drugs and
  Clinical Trials Rules 2019, Third Schedule Table 2; 21 CFR 312.23(a)(6) and 312.30. The
  ICH E6(R3) Appendix A (Investigator's Brochure). ISO 14155:2026 (fourth edition, March 2026),
  Annex A; ISO 14971 for risk management; Regulation (EU) 2017/745 Annex XV.
- Amendments: 21 CFR 312.30; Regulation (EU) No 536/2014, Articles 2(2)(13), 15 to 24, 54 and
  81(9); NDCT Rules 2019, Third Schedule. The classification key is this app's reading of those
  texts for teaching, not regulatory advice.

## Data

Browser only. Projects are kept in IndexedDB, and every project carries the learner ID and an
optional class ID for the classroom mode to come. Export a project file to keep a copy or move it.

## Development

```
npm install
npm run dev
npm test        # rules, statistics, amendments, cross-walks, trial design, USDM, Word, missions, hand-offs
npm run build
```

React, Vite, TypeScript and Tailwind CSS. Apache License 2.0 (see LICENSE and NOTICE).

Built by Khan Gulrez Shagufa Fazal Ahmed.

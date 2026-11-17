// M15: review an AI-drafted section set. A drafting assistant (simulated: there is no AI here; the
// text is fixed) wrote parts of VERDANT-1 from the sponsor's notes. Drafts like this read fluently
// and can still be wrong in ways a medical writer must catch: an invented reference, a number
// that disagrees with the protocol, a strategy that contradicts the estimand, an instruction no
// one decided, an overclaim, or a wrong guideline version. Each sentence is either correct
// (checked against HRP-301) or carries one planted error.
export type AiErr = 'reference' | 'number' | 'inconsistent' | 'invented' | 'overclaim' | 'citation'
export const AI_ERR: { id: AiErr; label: string }[] = [
  { id: 'reference', label: 'Invented or unverifiable reference' },
  { id: 'number', label: 'A number disagrees with the protocol' },
  { id: 'inconsistent', label: 'Contradicts another section' },
  { id: 'invented', label: 'Content no one decided (not in the source)' },
  { id: 'overclaim', label: 'Claims more than the trial can show' },
  { id: 'citation', label: 'Wrong guideline or regulation' },
]
export interface AiSentence { id: string; section: string; text: string; err?: AiErr; why: string }
export const AI_DRAFT: AiSentence[] = [
  { id: 'A01', section: '2.1', text: 'Lumiravostat is an oral, reversible inhibitor of the STRK1 kinase, which mediates cytokine signalling in skin inflammation.', why: 'Agrees with the IB and section 2.1.' },
  { id: 'A02', section: '2.1', text: 'In HRP-201, lumiravostat 25 mg achieved IGA-CHE success in 68% of participants against 9% on placebo (Lindqvist et al., J Dermatol Ther 2024;41:112–9).', err: 'reference', why: 'No such publication is in section 14 or the IB; the figures cannot be traced to a source. Drafting tools can produce plausible references that do not exist: every citation must be checked against the source.' },
  { id: 'A03', section: '2.1', text: 'This trial will establish that lumiravostat is safe for long-term use.', err: 'overclaim', why: 'A 16-week trial in 324 participants cannot establish long-term safety; the objective is to assess safety and tolerability over 16 weeks.' },
  { id: 'A04', section: '3.1', text: 'The primary estimand uses a treatment policy strategy for rescue therapy.', err: 'inconsistent', why: 'Section 3.1 uses a composite variable strategy: a participant who uses rescue therapy is a non-responder.' },
  { id: 'A05', section: '3.1', text: 'The population-level summary is the difference in proportions between each dose and placebo.', why: 'Agrees with the estimand.' },
  { id: 'A06', section: '6.1', text: 'Participants take lumiravostat 10 mg or 25 mg, or matching placebo, orally once daily for 16 weeks.', why: 'Agrees with 6.1.' },
  { id: 'A07', section: '6.3', text: 'A participant who misses a dose takes two tablets the next morning.', err: 'invented', why: 'The protocol says nothing of the kind, and doubling a dose is a clinical decision, not a drafting one. Missed doses are skipped and recorded.' },
  { id: 'A08', section: '10.11', text: 'A sample size of 300 participants (100 per arm) gives 90% power to detect a difference of 35% against 15%.', err: 'number', why: 'The protocol randomises 324 participants, 108 per arm (1.1.2 and 10.11).' },
  { id: 'A09', section: '10.10', text: 'The familywise type I error rate is controlled at a two-sided 0.05 by a fixed-sequence procedure.', why: 'Agrees with 10.10.' },
  { id: 'A10', section: '11.1', text: 'The trial is conducted in accordance with ICH E6(R4) Good Clinical Practice.', err: 'citation', why: 'The current guideline is ICH E6(R3), adopted in January 2025; there is no R4.' },
  { id: 'A11', section: '11.1', text: 'In India, the trial is conducted under the New Drugs and Clinical Trials Rules, 2019.', why: 'Correct.' },
  { id: 'A12', section: '9.2', text: 'Serious adverse events are reported to the sponsor within 24 hours of the investigator becoming aware of them.', why: 'Agrees with 9.2.' },
  { id: 'A13', section: '9.2', text: 'Adverse events are collected from the first dose until the Week 16 visit.', err: 'inconsistent', why: 'The schedule and 9.2.1 collect adverse events from informed consent until the Week 20 follow-up.' },
  { id: 'A14', section: '8.4', text: 'Central safety laboratory tests, including ALT, are done at screening, Weeks 2, 4, 8, 12 and 16, and at the Week 20 follow-up.', why: 'Agrees with the schedule (P07).' },
  { id: 'A15', section: '8.4', text: 'A 12-lead ECG is done at every visit to monitor QT prolongation, a known risk of lumiravostat.', err: 'invented', why: 'No ECG is in the schedule and the IB lists no QT risk: the draft invented both a procedure and a risk.' },
]

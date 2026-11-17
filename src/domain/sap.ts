// A statistical analysis plan (SAP) outline drafted from the protocol, following the headings of
// the published guidance on SAP content (Gamble et al., JAMA 2017) and ICH E9 and E9(R1). The
// protocol gives the estimands, analysis sets, sample size, multiplicity and interim plans; the
// outline carries them over and lists the tables, figures and listings each analysis needs, so
// the SAP starts consistent with the protocol. Headings the protocol cannot fill are marked.
import type { ProtocolData } from './types'
import type { DocSection } from './icf'
import { GAP } from './icf'

export interface Tlf { num: string; title: string; set: string }
export function tlfList(d: ProtocolData): Tlf[] {
  const set = (id: string) => d.analysisSets.find((a) => a.id === id)?.name ?? id
  const itt = d.estimands[0] ? set(d.estimands[0].analysisSetId) : d.analysisSets[0]?.name ?? 'Full analysis set'
  const saf = d.analysisSets.find((a) => /safety/i.test(a.name))?.name ?? 'Safety set'
  const out: Tlf[] = [
    { num: '14.1.1', title: 'Participant disposition', set: 'All screened participants' },
    { num: '14.1.2', title: 'Important protocol deviations', set: itt },
    { num: '14.1.3', title: 'Demographic and baseline characteristics', set: itt },
    { num: '14.1.4', title: 'Exposure to trial intervention and adherence', set: saf },
  ]
  let n = 1
  for (const e of d.endpoints.filter((x) => x.purpose !== 'Safety' && x.level !== 'Exploratory')) {
    const es = d.estimands.find((x) => x.endpointId === e.id)
    out.push({ num: `14.2.${n++}`, title: `${e.text} (${e.level.toLowerCase()}${es ? `, estimand ${es.id}` : ''})`, set: es ? set(es.analysisSetId) : itt })
    if (es && es.sensitivity && !/^none\.?$/i.test(es.sensitivity) && !/^as the primary/i.test(es.sensitivity)) out.push({ num: `14.2.${n++}`, title: `${e.text}: sensitivity analyses`, set: es ? set(es.analysisSetId) : itt })
  }
  out.push({ num: '14.3.1', title: 'Treatment-emergent adverse events by system organ class and preferred term', set: saf }, { num: '14.3.2', title: 'Serious adverse events and adverse events leading to discontinuation', set: saf })
  if (d.procedures.some((q) => q.form === 'LB')) out.push({ num: '14.3.3', title: 'Laboratory values and shifts; potential drug-induced liver injury', set: saf })
  if (d.procedures.some((q) => q.form === 'VS')) out.push({ num: '14.3.4', title: 'Vital signs: change from baseline', set: saf })
  if (d.procedures.some((q) => q.form === 'EG')) out.push({ num: '14.3.5', title: 'ECG: QTcF categories and change from baseline', set: saf })
  out.push({ num: '16.2.1', title: 'Listing of discontinued participants', set: 'All randomised participants' }, { num: '16.2.7', title: 'Listing of adverse events', set: saf })
  return out
}

export function sapOutline(d: ProtocolData): DocSection[] {
  const t = d.title, set = (id: string) => d.analysisSets.find((a) => a.id === id)?.name ?? id
  const objs = d.objectives.map((o) => `${o.level}: ${o.text}.`).join('\n')
  const est = d.estimands.map((e) => {
    const ep = d.endpoints.find((x) => x.id === e.endpointId)
    return `${e.id}${ep ? ` (${ep.text})` : ''}\n  Population: ${e.population}. Analysis set: ${set(e.analysisSetId)}.\n  Treatment: ${e.treatment}.\n  Intercurrent events: ${e.intercurrentEvents.map((i) => `${i.name}: ${i.strategy.toLowerCase()}`).join('; ')}.\n  Summary measure: ${e.summary}.\n  Main estimator: ${e.estimator}\n  Missing data: ${e.missing}\n  Sensitivity: ${e.sensitivity}`
  }).join('\n\n')
  const interim = d.interim ? `${d.interim.fractions.length} interim analysis(es) at ${d.interim.fractions.map((f) => `${Math.round(f * 100)}%`).join(', ')} of the information, with ${d.interim.spending === 'pocock' ? 'Pocock' : 'O’Brien-Fleming'}-type alpha spending; purpose: ${d.interim.purpose}.` : d.design['Adaptive Trial Design Indicator'] === 'Yes' ? 'Adaptive design: see the adaptation section (ICH E20 draft).' : 'No interim analysis of efficacy is planned.'
  return [
    { id: 'admin', heading: '1 Administrative information', text: `Title: ${t['Full Title'] ?? ''}\nProtocol: ${t['Sponsor Protocol Identifier'] ?? ''} version ${t['Version Number'] ?? ''} (${t['Version Date'] ?? ''}). Registry: ${[t['NCT Number'], t['EU CT Number'], t['CTRI Number']].filter(Boolean).join('; ')}.\nSAP version 0.1 (draft). ${GAP} SAP revision history, and the names, roles and signatures of the trial statistician, senior statistician and chief investigator]` },
    { id: 'intro', heading: '2 Introduction: background and objectives', text: objs || `${GAP} objectives]` },
    { id: 'design', heading: '3 Trial methods', text: `Design: ${[d.design['Intervention Model'], d.design['Trial Blind Schema'], d.design['Control Type'] && `${d.design['Control Type']}-controlled`].filter(Boolean).join(', ')}; ${d.arms.map((a) => a.name).join(', ')} (ratio ${d.arms.map((a) => a.ratio).join(':')}).\nRandomisation: ${d.design['Randomisation Type'] ?? `${GAP} randomisation method]`}\nSample size: ${d.statements['10.11'] ?? `${GAP} sample size justification]`}\nFramework: superiority, two-sided alpha ${d.facts.alpha}.\nInterim analyses and stopping: ${interim}\nTiming of the final analysis: after the last participant completes ${d.visits.slice().sort((a, b) => b.day - a.day)[0]?.name ?? 'the last visit'} and the database is locked.\nBlinding: ${d.design['Blinded Roles'] ?? ''}` },
    { id: 'principles', heading: '4 Statistical principles', text: `Confidence intervals are two-sided 95%; p-values are two-sided.\nMultiplicity: ${d.multiplicity || `${GAP} multiplicity strategy]`}\nAnalysis sets:\n${d.analysisSets.map((a) => `- ${a.name}: ${a.text}`).join('\n')}\nProtocol deviations: important deviations are identified before unblinding and listed by category.` },
    { id: 'population', heading: '5 Trial population', text: 'Screening and eligibility (numbers screened, screen failures by reason), recruitment by country and site, withdrawals and losses to follow-up with timing and reasons (CONSORT flow diagram), and baseline characteristics by arm. Baseline characteristics are summarised, not tested.' },
    { id: 'estimands', heading: '6 Analysis: estimands, estimators and missing data', text: est || `${GAP} the estimands (ICH E9(R1))]` },
    { id: 'safety', heading: '7 Safety analyses', text: `Adverse events are coded with MedDRA and collected from ${d.aeFrom === 'consent' ? 'informed consent' : 'the first dose'} to ${d.visits.find((v) => v.id === d.aeTo)?.name ?? d.aeTo}. Treatment-emergent: starting or worsening on or after the first dose. Summaries by system organ class and preferred term, severity and relationship; serious adverse events and those leading to discontinuation; laboratory values against reference ranges, with shift tables and Hy’s law screening; vital signs.` },
    { id: 'software', heading: '8 Statistical software and validation', text: `${GAP} the software and version, and how outputs are validated (independent double programming for the primary and key secondary analyses)]` },
    { id: 'tlf', heading: '9 Tables, figures and listings', text: tlfList(d).map((x) => `${x.num} ${x.title} (${x.set})`).join('\n') },
  ]
}

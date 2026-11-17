// The important protocol deviations plan, drafted from the protocol itself. ICH E6(R3) asks the
// sponsor to identify in advance the deviations that matter: those likely to affect participants'
// safety, rights or wellbeing, or the reliability of the results (ICH E3 Q&A on protocol deviations,
// and common sponsor practice of a deviation plan). Each criterion, the primary endpoint's visits and
// windows, the dosing, the stopping rules, the blinding and the safety reporting give one entry,
// with how it is detected and how it is handled in the analysis.
import type { ProtocolData } from './types'

export interface Deviation { id: string; category: string; text: string; important: boolean; detect: string; handling: string; source: string }

export function deviationPlan(d: ProtocolData): Deviation[] {
  const out: Deviation[] = [], add = (x: Omit<Deviation, 'id'>) => out.push({ id: `DV${String(out.length + 1).padStart(2, '0')}`, ...x })
  const pp = d.analysisSets.find((a) => /per.?protocol/i.test(a.name))?.name
  const exclude = pp ? `Considered for exclusion from the ${pp} set (decided blind, before unblinding).` : 'Listed and summarised; reviewed before unblinding.'
  add({ category: 'Informed consent', text: 'A trial procedure is done before written consent, or the participant signs an outdated version of the consent form', important: true, detect: 'Monitoring: consent date against first procedure date; form version against approval dates', handling: 'Report to the ethics committee as required; data before consent are not used if the participant does not consent.', source: '11.3' })
  for (const c of d.criteria) add({ category: 'Eligibility', text: `Randomised although ${c.category === 'Inclusion' ? 'not meeting' : 'meeting'} ${c.code}: ${c.text}`, important: true, detect: c.procedureIds.length ? `Edit check on the screening data (${c.procedureIds.join(', ')}); eligibility confirmation in the randomisation system` : 'Monitoring of source records', handling: exclude, source: c.category === 'Inclusion' ? '5.2' : '5.3' })
  for (const e of d.endpoints.filter((x) => x.level === 'Primary')) for (const vid of e.visitIds) {
    const v = d.visits.find((x) => x.id === vid); if (!v) continue
    add({ category: 'Primary endpoint', text: `${e.text}: assessment at ${v.name} missed or outside its window (Day ${v.lo} to ${v.hi})`, important: true, detect: 'Edit check on visit date and missing assessment', handling: `Handled as the estimand says for missing data; ${exclude.toLowerCase()}`, source: '1.3, 3' })
  }
  const inv = d.interventions.filter((i) => i.role === 'Investigational')
  if (inv.length) {
    add({ category: 'Trial intervention', text: 'Wrong treatment or kit dispensed (not the one the randomisation system assigned)', important: true, detect: 'Reconciliation of the randomisation system with the dispensing records', handling: 'Analysed as randomised; the as-treated arm is used for safety.', source: '6.7' })
    add({ category: 'Trial intervention', text: 'Adherence below 80% between two visits (tablet count)', important: false, detect: 'Edit check on returned tablets', handling: exclude, source: '6.8' })
  }
  if (d.narrative['6.10']) add({ category: 'Concomitant therapy', text: 'A prohibited medicine or therapy used (section 6.10)', important: true, detect: 'Coding review of concomitant medications against the prohibited list', handling: `${d.estimands[0] ? 'If it is an intercurrent event of the primary estimand, handled by its strategy; otherwise ' : ''}${exclude.charAt(0).toLowerCase()}${exclude.slice(1)}`, source: '6.10' })
  if (d.narrative['7.1']) add({ category: 'Stopping rule', text: 'Trial intervention not stopped when a discontinuation criterion in 7.1 was met', important: true, detect: 'Edit check on the laboratory and safety data that trigger the rule', handling: 'Escalated to the medical monitor at once; a safety matter, reported as the protocol and regulations require.', source: '7.1' })
  if (/double|blind/i.test(d.design['Trial Blind Schema'] ?? '')) add({ category: 'Blinding', text: 'Unblinding outside the emergency procedure', important: true, detect: 'Audit trail of the randomisation system', handling: 'Documented; the participant’s data are reviewed for bias before database lock.', source: '6.7' })
  add({ category: 'Safety reporting', text: 'A serious adverse event reported to the sponsor later than 24 hours after the investigator became aware', important: true, detect: 'Comparison of awareness and report dates in the safety database', handling: 'Corrective action with the site; regulatory clocks start from the sponsor’s awareness.', source: '9.2' })
  if (d.procedures.some((q) => /pregnan/i.test(q.name))) add({ category: 'Safety', text: 'A required pregnancy test not done before dosing', important: true, detect: 'Edit check on the pregnancy test at dosing visits', handling: 'Escalated to the medical monitor; the participant is not dosed until a negative result.', source: '1.3, 5.4' })
  add({ category: 'Visit schedule', text: 'A visit outside its window, other than for the primary endpoint', important: false, detect: 'Edit check on visit dates', handling: 'Listed; data are used as collected.', source: '1.3' })
  return out
}
export const deviationCsv = (rows: Deviation[]) => [['ID', 'Category', 'Deviation', 'Important', 'Detection', 'Handling', 'Protocol section'], ...rows.map((r) => [r.id, r.category, r.text, r.important ? 'Yes' : 'No', r.detect, r.handling, r.source])].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')

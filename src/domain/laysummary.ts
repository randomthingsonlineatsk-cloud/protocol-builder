// The summary of the trial's results for laypersons, EU Clinical Trials Regulation Annex V (ten
// required elements), submitted to the EU database with the results summary within one year of
// the end of the trial (Article 37(4)). The parts the protocol already knows are drafted from it in
// plain words; the results, adverse reactions and the sponsor's comments are left to write after
// the trial. The plain-language check of the Review page reads the drafted text.
import type { ProtocolData } from './types'
import { GAP, type DocSection } from './icf'

const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
export function laySummary(d: ProtocolData): DocSection[] {
  const t = d.title, cond = d.design['Population Diagnosis or Condition'] ?? 'the condition studied'
  const countries = d.design['Site Geographic Scope'] ?? ''
  const prim = d.objectives.find((o) => o.level === 'Primary')
  const inv = d.interventions.filter((i) => i.role === 'Investigational' || i.role === 'Placebo')
  const ages = d.design['Population Age (Minimum and Maximum)'] ?? `${d.facts.ageMin} to ${d.facts.ageMax} years`
  return [
    { id: 'id', heading: '1 Which trial is this?', text: `${t['Short Title'] ?? t['Full Title'] ?? ''}${t['Trial Acronym'] ? ` (${t['Trial Acronym']})` : ''}. Protocol number ${t['Sponsor Protocol Identifier'] ?? ''}. ${[t['EU CT Number'] && `EU trial number ${t['EU CT Number']}`, t['NCT Number'] && `ClinicalTrials.gov ${t['NCT Number']}`, t['CTRI Number'] && `CTRI ${t['CTRI Number']}`].filter(Boolean).join('; ')}.` },
    { id: 'sponsor', heading: '2 Who ran the trial?', text: `${t['Sponsor Name and Address'] || `${GAP} the sponsor’s name and address]`}. Contact: ${GAP} the sponsor’s contact point for questions about the trial].` },
    { id: 'general', heading: '3 Why was the trial done, and where and when?', text: `${prim ? `The main aim was to ${lc(prim.text.replace(/^To /, '')).replace(/\.$/, '')}.` : ''} The trial took place in ${countries || `${GAP} countries]`} from ${GAP} start date] to ${GAP} end date].` },
    { id: 'population', heading: '4 Who took part?', text: `The trial planned to include ${d.facts.participants} people aged ${ages.replace(/ to /, ' to ')} with ${lc(cond)}. ${GAP} how many took part, by age group and sex]. People could take part if: ${d.criteria.filter((c) => c.category === 'Inclusion').map((c) => lc(c.text)).join('; ')}. People could not take part if they had: ${d.criteria.filter((c) => c.category === 'Exclusion').map((c) => lc(c.text)).join('; ')}.` },
    { id: 'products', heading: '5 Which medicines were used?', text: `${inv.map((i) => `${i.name}: ${i.dose}, ${i.route.toLowerCase()}, ${i.frequency}`).join('. ')}. The participants were put into groups by chance${/double/i.test(d.design['Trial Blind Schema'] ?? '') ? ', and neither they nor the trial doctors knew who got which treatment' : ''}. Treatment lasted ${d.facts.treatmentWeeks} weeks.` },
    { id: 'reactions', heading: '6 What side effects did participants have?', text: `${GAP} the adverse reactions and how often they happened, the serious ones first, in plain words]` },
    { id: 'results', heading: '7 What were the results?', text: `${GAP} the overall results for the main question, in plain words, without claiming more than the trial showed]` },
    { id: 'comments', heading: '8 What does the sponsor say about the results?', text: `${GAP} the sponsor’s comments on the outcome, including that one trial alone does not answer all questions]` },
    { id: 'followup', heading: '9 Are more trials planned?', text: `${GAP} whether follow-up trials are planned]` },
    { id: 'more', heading: '10 Where can I find more information?', text: `${[t['EU CT Number'] && 'The EU clinical trials database (CTIS public portal)', t['NCT Number'] && 'ClinicalTrials.gov', t['CTRI Number'] && 'the Clinical Trials Registry – India'].filter(Boolean).join(', ') || `${GAP} registries]`}, searching for the numbers in section 1. ${GAP} other sources, such as a publication]` },
  ]
}
/** The drafted text only (without gaps), for the plain-language check. */
export const layText = (secs: DocSection[]) => secs.map((s) => s.text.replace(/\[(To be written|Site to complete):[^\]]*\]/g, '')).join('\n')

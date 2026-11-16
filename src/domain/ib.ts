// The Investigator's Brochure (IB) section set, ICH E6(R3) Appendix A: summary, introduction,
// physical, chemical and pharmaceutical properties and formulation, nonclinical studies, effects
// in humans, and the summary of data and guidance for the investigator, with the reference safety
// information (RSI) in its own clearly marked section, as the EU Clinical Trials Coordination Group
// asks. The IB belongs to the product; the protocol cites the edition that holds the RSI. The
// checks read the IB against protocol sections 2.2 (risks), 6 (doses) and 9 (safety reporting).
import type { Project, ProtocolData, Finding } from './types'
import { PRODUCTS, type LibraryProduct } from './examples'

export interface RsiTerm { term: string; soc: string; frequency: string; aka: string[] }
export interface Ib {
  productId: string; edition: number; date: string
  sections: Record<string, string>
  rsi: RsiTerm[]
  maxHumanDose: { value: number; unit: string; text: string }
}
export interface IbSection { id: string; num: string; title: string; required: boolean; guidance: string }
export const IB_SECTIONS: IbSection[] = [
  { id: 'summary', num: '1', title: 'Summary', required: true, guidance: 'About two pages: the significant physical, chemical, pharmaceutical, pharmacological, toxicological, pharmacokinetic, metabolic and clinical information known for the stage of development.' },
  { id: 'intro', num: '2', title: 'Introduction', required: true, guidance: 'The chemical name, generic and trade names, active ingredients, pharmacological class and expected position in the class, the rationale for research, and the anticipated indications.' },
  { id: 'physchem', num: '3', title: 'Physical, chemical and pharmaceutical properties and formulation', required: true, guidance: 'The substance (formula, structure) and its relevant properties; the formulation with excipients; storage and handling.' },
  { id: 'pharm', num: '4.1', title: 'Nonclinical pharmacology', required: true, guidance: 'Primary and secondary pharmacodynamics and safety pharmacology, with the doses or concentrations studied.' },
  { id: 'animalpk', num: '4.2', title: 'Pharmacokinetics and product metabolism in animals', required: true, guidance: 'Absorption, distribution, metabolism and excretion in the species studied.' },
  { id: 'tox', num: '4.3', title: 'Toxicology', required: true, guidance: 'Single and repeated dose toxicity, carcinogenicity, genotoxicity, reproductive and developmental toxicity, local tolerance, with the species, doses and findings.' },
  { id: 'humanpk', num: '5.1', title: 'Pharmacokinetics and product metabolism in humans', required: true, guidance: 'Absorption, half-life, metabolism, interactions, special populations.' },
  { id: 'humansafety', num: '5.2', title: 'Safety and efficacy', required: true, guidance: 'The trials so far (by phase), the doses given (including the highest), adverse reactions with their frequency, and efficacy results.' },
  { id: 'marketing', num: '5.3', title: 'Marketing experience', required: false, guidance: 'Countries where the product is marketed or approved, and significant information from marketed use. For an unauthorised product: state that there is none.' },
  { id: 'guidance', num: '6', title: 'Summary of data and guidance for the investigator', required: true, guidance: 'An overall discussion of the nonclinical and clinical data; what the investigator should expect, look for and do: risks and adverse reactions anticipated, precautions, monitoring, overdose and its management.' },
  { id: 'rsiIntro', num: '7', title: 'Reference safety information', required: true, guidance: 'The expected serious adverse reactions used to decide whether a suspected serious adverse reaction is expected (and so not a SUSAR): a table by system organ class with their frequency, kept apart from the rest of the IB.' },
]

export const blankIb = (productId: string): Ib => ({ productId, edition: 1, date: '', sections: {}, rsi: [], maxHumanDose: { value: 0, unit: '', text: '' } })

/** Pre-fills the sections the library product's data can give; the summary, introduction and guidance stay with the writer. */
export function ibFromLibrary(pr: LibraryProduct, base: Ib = blankIb(pr.id)): Ib {
  const f = pr.ib
  if (!f) return base
  return { ...base, productId: pr.id, sections: { ...base.sections, physchem: base.sections.physchem || f.physchem, pharm: base.sections.pharm || f.pharm, animalpk: base.sections.animalpk || f.animalPk, tox: base.sections.tox || f.tox, humanpk: base.sections.humanpk || f.humanPk, humansafety: base.sections.humansafety || f.safety, marketing: base.sections.marketing || 'None: the product is not authorised in any country.' },
    rsi: base.rsi.length ? base.rsi : structuredClone(f.rsi), maxHumanDose: base.maxHumanDose.value ? base.maxHumanDose : { ...f.maxHumanDose } }
}

const blank = (s?: string) => !s || !s.trim()
const has = (text: string, t: RsiTerm) => [t.term, ...t.aka].some((x) => new RegExp(`\\b${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text))
const numIn = (s: string) => Number(/(\d+(?:\.\d+)?)/.exec(s)?.[1] ?? NaN)

/** The edition of the IB the protocol cites as holding the reference safety information. */
export function citedEdition(d: ProtocolData): number | null {
  const t = [d.statements.IB ?? '', d.narrative['9.2'] ?? '', d.narrative['9.1'] ?? '', d.narrative['2.2.1'] ?? ''].join(' ')
  const m = /(?:investigator['’]s brochure|\bIB\b)[^.]{0,80}?edition\s*(\d+)|edition\s*(\d+)[^.]{0,40}?(?:investigator['’]s brochure|\bIB\b)/i.exec(t)
  return m ? Number(m[1] ?? m[2]) : null
}

export const IB_RULES = [
  { id: 'PB-B01', severity: 'high' as const, title: 'The protocol does not cite the IB edition that holds the reference safety information, or cites another edition' },
  { id: 'PB-B02', severity: 'high' as const, title: 'An expected adverse reaction in the reference safety information is not among the risks in section 2.2.1' },
  { id: 'PB-B03', severity: 'high' as const, title: 'The protocol gives a higher dose than any given to humans so far, as the IB states' },
  { id: 'PB-B04', severity: 'medium' as const, title: 'A required IB section is empty' },
  { id: 'PB-B05', severity: 'medium' as const, title: 'The reference safety information lists no expected adverse reactions' },
]

export function ibFindings(p: Project): Finding[] {
  const ib = p.ib
  if (!ib) return []
  const d = p.versions[p.versions.length - 1].data, out: Finding[] = []
  const add = (rule: string, key: string, sections: string[], text: string, fix: string) => out.push({ id: `${rule}:${key}`, rule, severity: IB_RULES.find((r) => r.id === rule)!.severity, sections, text, fix })
  const ed = citedEdition(d)
  if (ed === null) add('PB-B01', 'none', ['9.2'], 'The protocol does not say which IB edition holds the reference safety information.', `State in 9.2 that the RSI is section 7 of the Investigator's Brochure, edition ${ib.edition}.`)
  else if (ed !== ib.edition) add('PB-B01', 'edition', ['9.2'], `The protocol cites IB edition ${ed}; the IB is edition ${ib.edition}.`, 'Cite the current edition, or amend the protocol when the IB changes.')
  const risks = d.narrative['2.2.1'] ?? ''
  for (const t of ib.rsi) if (!has(risks, t)) add('PB-B02', t.term, ['2.2.1', 'IB 7'], `${t.term} is an expected adverse reaction in the IB's reference safety information but section 2.2.1 does not name it as a risk.`, `Name ${t.term.toLowerCase()} in 2.2.1 with its mitigation.`)
  const maxP = Math.max(0, ...d.interventions.filter((i) => i.role === 'Investigational' && i.doseUnit === ib.maxHumanDose.unit).map((i) => i.doseValue))
  if (ib.maxHumanDose.value > 0 && maxP > ib.maxHumanDose.value) add('PB-B03', 'dose', ['6.1', 'IB 5.2'], `The protocol gives up to ${maxP} ${ib.maxHumanDose.unit}; the IB's highest dose in humans is ${ib.maxHumanDose.value} ${ib.maxHumanDose.unit}.`, 'Justify the dose in 6.2 with new data, or lower it.')
  for (const s of IB_SECTIONS.filter((x) => x.required && x.id !== 'rsiIntro')) if (blank(ib.sections[s.id])) add('PB-B04', s.id, [`IB ${s.num}`], `IB section ${s.num} ${s.title} is empty.`, 'Write the section; the guidance beside it lists what it holds.')
  if (!ib.rsi.length) add('PB-B05', 'rsi', ['IB 7'], 'The reference safety information lists no expected adverse reactions.', 'List the expected serious adverse reactions with their system organ class and frequency.')
  return out
}

export { PRODUCTS }
export const numFromText = numIn

/** VERDANT-1's IB: lumiravostat, edition 3, with the RSI the protocol cites. */
export function hrpIb(): Ib {
  const pr = PRODUCTS.find((x) => x.id === 'lumiravostat')!
  const ib = ibFromLibrary(pr, { ...blankIb(pr.id), edition: 3, date: '2025-11-15' })
  ib.sections.summary = 'Lumiravostat (HRP-4417, Ostrevia) is an oral, reversible inhibitor of the STRK1 kinase (a fictional target) developed for moderate to severe chronic hand eczema. Nonclinical studies showed anti-inflammatory activity in models of contact dermatitis, no genotoxicity, and embryo-fetal toxicity in rats. In 148 healthy participants and 240 patients with chronic hand eczema, it was well tolerated at doses up to 50 mg a day; upper respiratory tract infections and reversible ALT increases were more frequent than with placebo. In HRP-201, 10 and 25 mg once daily improved IGA-CHE success at Week 12.'
  ib.sections.intro = 'Lumiravostat is the nonproprietary name of HRP-4417; Ostrevia is the proposed trade name. It is the first STRK1 inhibitor in clinical development. Chronic hand eczema that does not respond to topical corticosteroids has few oral options; blocking STRK1 interrupts the cytokine signalling that drives the inflammation and itch. The anticipated indication is adults with moderate to severe chronic hand eczema inadequately controlled with topical corticosteroids.'
  ib.sections.guidance = 'Expected adverse reactions are upper respiratory tract infection and increased ALT (section 7). Investigators should monitor liver tests and stop the drug for ALT above 5 × ULN or above 3 × ULN with bilirubin above 2 × ULN. Hepatitis B reactivation is a potential risk of the class: screen for HBsAg and anti-HBc, exclude HBsAg-positive patients and monitor HBV DNA in anti-HBc-positive ones. Because of embryo-fetal toxicity in rats, participants of childbearing potential must use highly effective contraception until 4 weeks after the last dose. Avoid strong CYP3A inhibitors. There is no antidote; manage overdose symptomatically.'
  ib.sections.rsiIntro = 'The expected adverse reactions below are the reference safety information for assessing the expectedness of suspected serious adverse reactions in trials of lumiravostat. Frequencies are from HRP-201 (lumiravostat 5 to 25 mg, 160 participants).'
  return ib
}

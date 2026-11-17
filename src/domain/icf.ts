// The participant information sheet and informed consent form (ICF), generated from the protocol
// and checked against the required elements of three regions:
//  - US: 21 CFR 50.25(a) basic elements, (b) additional elements and (c) the ClinicalTrials.gov statement.
//  - EU: Clinical Trials Regulation (EU) No 536/2014, Article 29(2) and 29(6).
//  - India: New Drugs and Clinical Trials Rules, 2019, Third Schedule, Table 3 (the checklist of
//    essential elements of the participant information sheet).
// Text the protocol cannot give (alternatives, payments, injury compensation) is left as a marked
// gap for the writer; site details are left for the site.
import type { ProtocolData, Project } from './types'

export { GAP, SITE } from '../shared/consent'
export type { DocSection } from '../shared/consent'
import { consentSections, CONSENT_ELEMENTS, GAP, studyFacts, type ConsentElement, type DocSection } from '../shared/consent'
export { studyFacts }

export function icfSections(p: Project, version = p.versions.length - 1): DocSection[] {
  return consentSections(studyFacts(p, version), version === p.versions.length - 1 ? p.docs?.icf ?? {} : {})
}

export type IcfElement = ConsentElement & { region: 'US' | 'EU' | 'IN' }
export const ICF_ELEMENTS = CONSENT_ELEMENTS.filter((e): e is IcfElement => e.region === 'US' || e.region === 'EU' || e.region === 'IN')

export function icfRegions(d: ProtocolData): IcfElement['region'][] {
  const scope = d.design['Site Geographic Scope'] ?? '', t = d.title
  const r: IcfElement['region'][] = []
  if (t['NCT Number'] || t['FDA IND Number'] || /United States|USA/i.test(scope)) r.push('US')
  if (t['EU CT Number'] || /Germany|France|Spain|Italy|Poland|Netherlands|Belgium|Ireland|EU\b|European/i.test(scope)) r.push('EU')
  if (t['CTRI Number'] || /India/i.test(scope)) r.push('IN')
  return r
}
export interface IcfCheck { el: IcfElement; ok: boolean; why: string }
export function icfChecks(p: Project): IcfCheck[] {
  const secs = icfSections(p), by = (id: string) => secs.find((s) => s.id === id)?.text ?? ''
  return ICF_ELEMENTS.map((el) => {
    const text = el.section.map(by).join('\n')
    if (text.includes(GAP)) return { el, ok: false, why: `Section “${secs.find((s) => el.section.includes(s.id) && s.text.includes(GAP))!.heading}” still has text to write.` }
    return el.re.test(text) ? { el, ok: true, why: '' } : { el, ok: false, why: `Not found in “${el.section.map((x) => secs.find((s) => s.id === x)?.heading).join('” or “')}”.` }
  })
}

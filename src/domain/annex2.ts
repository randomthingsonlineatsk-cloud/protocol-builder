// Decentralised and pragmatic trial elements: ICH E6(R3) Annex 2, adopted by ICH on 3 June 2026
// and effective in the EU from 15 January 2027 (the principles and Annex 1 have applied since
// 23 July 2025). Annex 2 does not stand alone: it adds considerations for activities outside the
// investigator's site, for elements of usual care, and for real-world data. Each element the
// protocol uses needs the arrangements below written into the protocol; the checks look for them.
import type { ProtocolData, Finding } from './types'
import { textOf } from './crosswalk'

export interface Element { id: string; name: string; what: string; sections: string[]; needs: { label: string; re: RegExp; where: string[] }[] }
export const ELEMENTS: Element[] = [
  { id: 'remote', name: 'Remote visits (telemedicine or telephone)', what: 'Visits or assessments done by video or telephone instead of at the site.', sections: ['1.3', '8.1'],
    needs: [{ label: 'which assessments are done remotely and how', re: /(telemedicine|video|telephone|remote)/i, where: ['8.1', '8'] }, { label: 'how the participant’s identity is confirmed and how safety concerns reach the investigator promptly', re: /(identity|escalat|contact the investigator|urgent|promptly)/i, where: ['8', '9', '11.2'] }] },
  { id: 'home', name: 'Home visits by a nurse or other health professional', what: 'Procedures done at the participant’s home by a trained professional on the investigator’s behalf.', sections: ['1.3', '8.1', '11.2'],
    needs: [{ label: 'who does the home visits, their training and delegation by the investigator', re: /(home)[^.]{0,120}(nurse|professional|staff)|(delegat|train)[^.]{0,120}home/i, where: ['8', '11.2'] }, { label: 'how the investigator keeps oversight and receives the records', re: /(oversight|supervis|records? (are|is) sent|report(ed)? to the investigator)/i, where: ['8', '11.2', '11.9'] }] },
  { id: 'local', name: 'Local laboratories or health professionals', what: 'Tests or care by laboratories or clinicians close to the participant, outside the trial site.', sections: ['8.4', '12.1', '11.9'],
    needs: [{ label: 'which tests or activities local providers do', re: /local (laborator|health|clinic|provider|physician|doctor)/i, where: ['8', '12.1', '11'] }, { label: 'their qualification (accreditation, reference ranges) and how results reach the investigator', re: /(accredit|certif|reference range|qualif)/i, where: ['8', '12.1', '11'] }] },
  { id: 'econsent', name: 'Remote or electronic informed consent', what: 'Consent obtained electronically or at a distance.', sections: ['11.3'],
    needs: [{ label: 'how consent is given remotely or electronically', re: /(electronic|remote|e-?consent|video)/i, where: ['11.3'] }, { label: 'how the participant’s identity is verified and their understanding checked, with a paper or in-person alternative', re: /identity/i, where: ['11.3'] }] },
  { id: 'dtp', name: 'Trial intervention sent to the participant’s home', what: 'The investigational product shipped or delivered directly to participants.', sections: ['6.6', '6.3'],
    needs: [{ label: 'how it is shipped, stored and kept at the right temperature', re: /(temperature|cold chain|excursion)/i, where: ['6.6'] }, { label: 'chain of custody, receipt confirmed by the participant, return and accountability', re: /(chain of custody|receipt|confirm(ed|s)? (delivery|receipt))/i, where: ['6.6'] }] },
  { id: 'dht', name: 'Digital health technologies for remote data', what: 'Wearables, apps or home devices that collect trial data.', sections: ['8.1', '8.3', '11.7'],
    needs: [{ label: 'that each technology is fit for its purpose (verified and validated for this use)', re: /(fit for (its )?purpose|validat|verif)/i, where: ['8', '11.7'] }, { label: 'how data are transmitted and secured, and how missing data are limited', re: /(transmi|upload|sync|secur|cyber)/i, where: ['8', '11.7', '11.8'] }] },
  { id: 'pragmatic', name: 'Pragmatic elements (usual care)', what: 'Parts of the trial that follow routine clinical practice: broad eligibility, usual-care visits, streamlined data.', sections: ['4.1', '4.2.7', '8.1'],
    needs: [{ label: 'which activities follow usual care and which are trial-specific', re: /(usual care|routine (clinical )?(care|practice))/i, where: ['4', '8'] }, { label: 'the minimum data collected and how safety information from usual care reaches the investigator', re: /(minimum (data|dataset)|safety information)/i, where: ['8', '9', '11.7'] }] },
  { id: 'rwd', name: 'Real-world data sources', what: 'Data from health records, registries or claims used in the trial.', sections: ['11.7', '10.1'],
    needs: [{ label: 'the source and that it is fit for purpose (provenance, reliability, relevance)', re: /(provenance|fit for purpose|reliab)/i, where: ['11.7', '10'] }, { label: 'how records are linked and access is agreed with the data custodian', re: /(link(age|ed)|custodian|access agreement)/i, where: ['11.7', '11.8'] }] },
]

/** The elements the protocol uses: chosen by the writer, plus remote and home visits found in the schedule. */
export function elementsIn(d: ProtocolData): string[] {
  const s = new Set(d.annex2 ?? [])
  if (d.visits.some((v) => v.type === 'Remote' || v.type === 'Phone')) s.add('remote')
  if (d.visits.some((v) => v.type === 'Home nurse')) s.add('home')
  return ELEMENTS.filter((e) => s.has(e.id)).map((e) => e.id)
}

export function annex2Findings(d: ProtocolData): Finding[] {
  const out: Finding[] = []
  for (const id of elementsIn(d)) {
    const e = ELEMENTS.find((x) => x.id === id)!
    e.needs.forEach((n, i) => { if (!n.re.test(textOf(d, ...n.where))) out.push({ id: `PB-DC:${id}:${i}`, rule: `PB-DC${String(ELEMENTS.indexOf(e) + 1).padStart(2, '0')}`, severity: 'medium', sections: n.where, text: `${e.name}: the protocol does not say ${n.label}.`, fix: `Write it in ${n.where.join(' or ')} (ICH E6(R3) Annex 2).` }) })
  }
  if (elementsIn(d).some((x) => x !== 'pragmatic' && x !== 'rwd') && !/(decentrali|remote|home|local|outside the site)/i.test(textOf(d, '11.6'))) out.push({ id: 'PB-DC:rbqm', rule: 'PB-DC09', severity: 'low', sections: ['11.6'], text: 'Activities happen outside the site, but 11.6 does not say how the risks of those activities are managed.', fix: 'Name the decentralised activities among the risks in 11.6 and the controls for them.' })
  return out
}

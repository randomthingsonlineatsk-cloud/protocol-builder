// Standard text: wording a sponsor's template gives for sections that read much the same in every
// protocol (definitions, ethics, consent, data protection and so on), in the way ICH M11 marks
// common text. A new protocol starts with it, and each section shows whether the writer has kept
// it, edited it, or marked it as reviewed for this trial. The wording is this app's own.
import type { ProtocolData } from './types'

export const STANDARD_TEXT: Record<string, string> = {
  '5.6': 'A participant who does not meet the criteria is a screen failure; the reason is recorded. A participant may be rescreened once, with a new participant number and new consent.',
  '6.5': 'There is no antidote. In case of overdose the participant is monitored and treated symptomatically; the overdose is recorded as a special safety situation (9.4).',
  '7.2': 'A participant may withdraw from the trial at any time without giving a reason and without affecting their care. Data collected until withdrawal are kept and used. The site asks, but cannot require, a final safety visit.',
  '7.3': 'Before a participant is considered lost to follow-up, the site makes at least three attempts to reach them by telephone and one by letter, and records them.',
  '9.1': 'An adverse event is any untoward medical occurrence in a participant, whether or not considered related to the trial intervention. A serious adverse event results in death, is life-threatening, requires inpatient hospitalisation or prolongs it, results in persistent or significant disability, is a congenital anomaly or birth defect, or is another important medical event.',
  '11.1': 'The trial is conducted in accordance with this protocol, ICH E6(R3) good clinical practice, the ethical principles of the Declaration of Helsinki, and the applicable laws and regulations. The protocol, the consent form and other required documents are approved by an ethics committee before the trial starts at a site.',
  '11.3': 'The investigator or a delegate explains the trial, its risks and benefits and the participant’s rights, and gives the participant time to ask questions before consent is signed and dated. Consent is renewed when new information may affect the participant’s willingness to continue.',
  '11.5': 'The sponsor holds insurance covering participants for harm arising from taking part, as the laws of each country require.',
  '11.7': 'Data are entered in a validated electronic data capture system with an audit trail. External data are transferred under data transfer agreements and reconciled.',
  '11.8': 'Participants are identified in trial records by a participant number only. Personal data are processed under the applicable data protection laws, and kept confidential.',
  '11.9': 'Source records are defined in the monitoring plan. The investigator and institution give direct access to source records for monitoring, audits and inspections.',
  '11.10': 'Protocol deviations are recorded and assessed; important deviations are reported as the regulations require.',
  '11.11': 'The sponsor or the investigator may close a site early, for example for poor recruitment, non-compliance with the protocol or good clinical practice, or safety reasons.',
}

export type TextState = 'none' | 'standard' | 'edited' | 'reviewed'
/** Whether a section still holds the standard text, was edited from it, or was marked as reviewed. */
export function textState(d: ProtocolData, num: string): TextState {
  const std = STANDARD_TEXT[num]
  if (!std) return 'none'
  if ((d.reviewedText ?? []).includes(num)) return 'reviewed'
  const t = (d.narrative[num] ?? '').trim()
  if (!t) return 'none'
  return t === std ? 'standard' : 'edited'
}
export const withStandardText = (d: ProtocolData): ProtocolData => ({ ...d, narrative: { ...STANDARD_TEXT, ...d.narrative } })

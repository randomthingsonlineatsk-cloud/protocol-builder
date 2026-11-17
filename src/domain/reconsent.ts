// Re-consent after an amendment: the consent form is drafted from the previous version and from the
// amended one, the sections that change are listed, and the app says whether participants already
// in the trial must be told and asked to sign again. New information that may affect a
// participant's willingness to continue must be given to them promptly and their consent
// documented again (ICH E6(R3) section 2.8; 21 CFR 50.25(b)(5)); the revised form needs ethics
// committee approval first (and, in the EU, the change is a substantial modification of Part II).
import type { Project } from './types'
import { icfSections } from './icf'

// Sections that bear on a participant's decision to stay in the trial.
const DECISIVE = new Set(['key', 'what', 'resp', 'risks', 'benefits', 'alternatives', 'voluntary', 'costs', 'injury', 'privacy'])
export interface IcfChange { id: string; heading: string; before: string; after: string; decisive: boolean }
export interface Reconsent { needed: 'Re-consent' | 'Inform' | 'None'; reason: string; changes: IcfChange[]; steps: string[] }

export function reconsent(p: Project): Reconsent | null {
  if (p.versions.length < 2) return null
  const a = icfSections(p, p.versions.length - 2), b = icfSections(p, p.versions.length - 1), am = p.versions[p.versions.length - 1].amendment
  const changes: IcfChange[] = b.map((s) => ({ s, o: a.find((x) => x.id === s.id) })).filter(({ s, o }) => (o?.text ?? '') !== s.text).map(({ s, o }) => ({ id: s.id, heading: s.heading, before: o?.text ?? '', after: s.text, decisive: DECISIVE.has(s.id) }))
  const decisive = changes.filter((c) => c.decisive)
  const safety = am?.safetyRights === 'Yes'
  const needed: Reconsent['needed'] = decisive.length || safety ? 'Re-consent' : changes.length ? 'Inform' : 'None'
  const reason = needed === 'Re-consent'
    ? `${decisive.length ? `What participants are told changes in: ${decisive.map((c) => c.heading.toLowerCase()).join('; ')}.` : ''}${safety ? ' The amendment is marked as affecting participants’ safety or rights.' : ''} This is information that may affect their willingness to continue.`.trim()
    : needed === 'Inform' ? `Only ${changes.map((c) => c.heading.toLowerCase()).join(', ')} change${changes.length === 1 ? 's' : ''}: tell participants at their next visit; a new signature is not needed.` : 'The consent form does not change.'
  const steps = needed === 'Re-consent' ? [
    'Revise the consent form (new version number and date) and mark the changes for the ethics committee.',
    'Get ethics committee approval before using it (EU: part of the Part II substantial modification; US: IRB approval; India: ethics committee approval, with CDSCO where the amendment needs it).',
    'Tell participants in treatment or follow-up promptly, at or before their next visit; they read and sign the new version, and the conversation is recorded in their notes.',
    'Participants who have finished the trial are told only if the new information affects their health.',
    'New participants sign only the new version from the date it is approved at their site.',
  ] : needed === 'Inform' ? ['Tell participants at their next visit and record it in their notes.', 'Use the revised form for new participants once approved.'] : []
  return { needed, reason, changes, steps }
}

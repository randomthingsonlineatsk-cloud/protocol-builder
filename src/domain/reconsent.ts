// Re-consent after an amendment: the consent form is drafted from the previous version and from the
// amended one, the sections that change are listed, and the app says whether participants already
// in the trial must be told and asked to sign again. New information that may affect a
// participant's willingness to continue must be given to them promptly and their consent
// documented again (ICH E6(R3) section 2.8; 21 CFR 50.25(b)(5)); the revised form needs ethics
// committee approval first (and, in the EU, the change is a substantial modification of Part II).
import type { Project } from './types'
import { icfSections } from './icf'
import { reconsentDecision, type Reconsent } from '../shared/consent'

export type { ConsentChange as IcfChange, Reconsent } from '../shared/consent'

export function reconsent(p: Project): Reconsent | null {
  if (p.versions.length < 2) return null
  const am = p.versions[p.versions.length - 1].amendment
  return reconsentDecision(icfSections(p, p.versions.length - 2), icfSections(p, p.versions.length - 1), am?.safetyRights === 'Yes')
}

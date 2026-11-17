// Author, reviewer and approver sign-off of a protocol version. Each signature shows the signer's
// printed name, the date and time, and the meaning of the signature (authorship, review,
// approval), as 21 CFR 11.50 asks of electronic signatures; it is linked to the exact content
// signed (a hash of the version), so an edit after signing voids the signatures that follow it
// (11.70: signatures linked to their records). The three roles must be different people, and the
// reviewer cannot sign while corrections or consistency comments are open. Practice signatures:
// this app is not a validated system.
import type { Project, ProtocolData } from './types'
import { hash } from './certificate'
import { approve, last } from './amend'

export type SignRole = 'Author' | 'Reviewer' | 'Approver'
export const SIGN_ROLES: { role: SignRole; meaning: string; who: string }[] = [
  { role: 'Author', meaning: 'I am the author of this version. It is complete and ready for review.', who: 'Medical writer' },
  { role: 'Reviewer', meaning: 'I have reviewed this version against its sources and find it acceptable.', who: 'Clinical scientist, statistician or quality reviewer' },
  { role: 'Approver', meaning: 'I approve this version of the protocol for use.', who: 'Sponsor’s medical director or delegate' },
]
export interface Signature { role: SignRole; name: string; title: string; meaning: string; utc: string; contentHash: string }

export const contentHash = (d: ProtocolData) => hash(JSON.stringify({ ...d, title: { ...d.title, 'Sponsor Approval': '', 'Version Date': '', 'Sponsor Signatory': '' } }))
const sigs = (p: Project) => last(p).signatures ?? []

export interface SignState { role: SignRole; sig?: Signature; valid: boolean; canSign: boolean; blocked: string }
export function signState(p: Project): SignState[] {
  const v = last(p), h = contentHash(v.data), all = sigs(p)
  const openBlocking = (p.reviews ?? []).filter((r) => r.status === 'open' && (r.kind === 'Correction' || r.kind === 'Consistency')).length
  const out: SignState[] = []
  SIGN_ROLES.forEach(({ role }, i) => {
    const sig = all.find((s) => s.role === role)
    const prevOk = i === 0 || out[i - 1].valid
    const valid = !!sig && sig.contentHash === h && prevOk
    let blocked = ''
    if (v.status === 'approved' && role !== 'Approver' && !sig) blocked = 'The version is already approved.'
    else if (!prevOk) blocked = `Waiting for the ${SIGN_ROLES[i - 1].role.toLowerCase()}’s valid signature.`
    else if (role === 'Reviewer' && openBlocking) blocked = `${openBlocking} open correction or consistency comment(s) on the Review page.`
    out.push({ role, sig, valid, canSign: !blocked && !valid && v.status !== 'approved', blocked })
  })
  return out
}

/** Signs as the role; the approver's signature approves the version. Throws if the rules are not met. */
export function sign(p: Project, role: SignRole, name: string, title: string, utc = new Date().toISOString()) {
  const st = signState(p).find((s) => s.role === role)!
  if (!st.canSign) throw new Error(st.blocked || `${role} has already signed this content.`)
  const others = sigs(p).filter((s) => s.role !== role && signState(p).find((x) => x.role === s.role)?.valid)
  if (others.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase())) throw new Error('Author, reviewer and approver must be different people.')
  const v = last(p)
  const meaning = SIGN_ROLES.find((r) => r.role === role)!.meaning
  v.signatures = [...(v.signatures ?? []).filter((s) => s.role !== role), { role, name: name.trim(), title: title.trim(), meaning, utc, contentHash: contentHash(v.data) }]
  if (role === 'Approver') { approve(p, utc.slice(0, 10)); v.data.title['Sponsor Approval'] = `${utc.slice(0, 10)}, electronic signature: ${name.trim()}, ${title.trim()} (meaning: approval)`; v.data.title['Sponsor Signatory'] = `${name.trim()}, ${title.trim()}` }
}

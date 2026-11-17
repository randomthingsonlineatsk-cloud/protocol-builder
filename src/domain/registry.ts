// Trial registry entries drafted from the protocol: ClinicalTrials.gov (the PRS registration data
// elements, 42 CFR 11.28), the EU Clinical Trials Information System (CTIS, the structured Part I
// data) and the Clinical Trials Registry – India (CTRI). Each field names its source in the
// protocol; length limits are those the registries apply to the free-text fields shown. After an
// amendment, the same fields are drafted from both versions and compared, so the changed fields
// and their update deadlines are listed.
import type { ProtocolData, Project } from './types'

export type RegistryId = 'ctgov' | 'ctis' | 'ctri'
export interface RegField { key: string; label: string; value: string; source: string; limit?: number }
export interface Registry { id: RegistryId; name: string; idField: string; fields: RegField[] }
export const REGISTRIES: { id: RegistryId; name: string; idField: string }[] = [
  { id: 'ctgov', name: 'ClinicalTrials.gov', idField: 'NCT Number' },
  { id: 'ctis', name: 'EU CTIS', idField: 'EU CT Number' },
  { id: 'ctri', name: 'CTRI (India)', idField: 'CTRI Number' },
]

const ages = (d: ProtocolData) => { const m = /(\d+)\D+(\d+)/.exec(d.design['Population Age (Minimum and Maximum)'] ?? ''); return m ? [Number(m[1]), Number(m[2])] : [d.facts.ageMin, d.facts.ageMax] }
const crit = (d: ProtocolData, cat: 'Inclusion' | 'Exclusion') => d.criteria.filter((c) => c.category === cat).map((c, i) => `${i + 1}. ${c.text}`).join('\n')
const outcomes = (d: ProtocolData, level: 'Primary' | 'Secondary') => d.endpoints.filter((e) => e.level === level).map((e) => { const tf = e.visitIds.map((v) => d.visits.find((x) => x.id === v)?.name.replace(/ \(.*\)/, '')).filter(Boolean).join(', '); return `${e.text}${tf && !/week \d+$/i.test(e.text) ? ` [Time frame: ${tf}]` : ''}` }).join('\n')
const masking = (d: ProtocolData) => { const roles = (d.design['Blinded Roles'] ?? '').split(/[,;]| and /).filter((x) => x.trim()).length; const s = d.design['Trial Blind Schema'] ?? ''; return /open/i.test(s) ? 'None (Open Label)' : roles >= 4 ? 'Quadruple' : roles === 3 ? 'Triple' : /double/i.test(s) ? 'Double' : s ? 'Single' : '' }
const phaseNo = (d: ProtocolData) => (d.title['Trial Phase'] ?? '').replace(/^Phase\s*/i, '')
const brief = (d: ProtocolData) => {
  const prim = d.endpoints.find((e) => e.level === 'Primary')
  return `${d.title['Trial Acronym'] ? d.title['Trial Acronym'] + ' ' : ''}is a ${(d.design['Trial Blind Schema'] ?? '').toLowerCase()} ${d.design['Control Type']?.toLowerCase() ?? ''}-controlled trial in about ${d.facts.participants} ${d.design['Population Diagnosis or Condition']?.toLowerCase() ?? 'participants'}. Participants are assigned to ${d.arms.map((a) => a.name).join(', ')} for ${d.facts.treatmentWeeks} weeks${d.facts.followUpWeeks ? `, with ${d.facts.followUpWeeks} weeks of follow-up` : ''}. The primary outcome is ${prim ? prim.text.charAt(0).toLowerCase() + prim.text.slice(1) : 'not yet set'}.`.replace(/\s+/g, ' ')
}
const countries = (d: ProtocolData) => (d.design['Site Geographic Scope'] ?? '').split(/,| and /).map((x) => x.trim().replace(/^the /i, '')).filter(Boolean)
const EU = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Iceland', 'Liechtenstein', 'Norway']
const share = (d: ProtocolData, where: string[]) => { const c = countries(d); const n = c.filter((x) => where.includes(x)).length; return c.length ? Math.round((d.facts.participants * n) / c.length) : 0 }

export function registries(d: ProtocolData, p?: Project): Registry[] {
  const t = d.title, [amin, amax] = ages(d), o = p?.docs?.registry ?? {}
  const F = (reg: RegistryId, key: string, label: string, value: string, source: string, limit?: number): RegField => ({ key, label, value: o[`${reg}.${key}`] ?? value, source, limit })
  const inv = d.interventions.filter((i) => i.role !== 'Rescue' && i.role !== 'Auxiliary')
  const ct: RegField[] = [
    F('ctgov', 'brief', 'Brief title', t['Short Title'] ?? '', 'Title page: Short Title', 300),
    F('ctgov', 'official', 'Official title', t['Full Title'] ?? '', 'Title page: Full Title', 600),
    F('ctgov', 'acronym', 'Acronym', t['Trial Acronym'] ?? '', 'Title page: Trial Acronym', 14),
    F('ctgov', 'orgId', 'Organisation’s unique protocol ID', t['Sponsor Protocol Identifier'] ?? '', 'Title page'),
    F('ctgov', 'summary', 'Brief summary', brief(d), '1.1 synopsis', 5000),
    F('ctgov', 'conditions', 'Conditions', d.design['Population Diagnosis or Condition'] ?? '', '1.1.2'),
    F('ctgov', 'phase', 'Study phase', t['Trial Phase'] ?? '', 'Title page: Trial Phase'),
    F('ctgov', 'allocation', 'Allocation', /random/i.test(d.design['Intervention Assignment Method'] ?? '') ? 'Randomized' : 'Non-Randomized', '1.1.2'),
    F('ctgov', 'model', 'Interventional study model', d.design['Intervention Model'] ?? '', '1.1.2'),
    F('ctgov', 'masking', 'Masking', masking(d), '1.1.2: Trial Blind Schema, Blinded Roles'),
    F('ctgov', 'arms', 'Arms', d.arms.map((a) => `${a.type === 'Investigational' ? 'Experimental' : a.type === 'Placebo' ? 'Placebo Comparator' : a.type}: ${a.name}. ${a.intervention}`).join('\n'), '1.2, 6.1'),
    F('ctgov', 'interventions', 'Interventions', inv.map((i) => `Drug: ${i.name} (${i.dose}, ${i.route.toLowerCase()}, ${i.frequency})`).join('\n'), '6.1'),
    F('ctgov', 'primary', 'Primary outcome measures', outcomes(d, 'Primary'), '3'),
    F('ctgov', 'secondary', 'Secondary outcome measures', outcomes(d, 'Secondary'), '3'),
    F('ctgov', 'enrollment', 'Enrollment (anticipated)', String(d.facts.participants), '1.1.2, 10.11'),
    F('ctgov', 'ages', 'Eligible ages', `${amin} to ${amax} years`, '1.1.2'),
    F('ctgov', 'healthy', 'Accepts healthy volunteers', d.design['Population Type'] === 'Healthy' ? 'Yes' : 'No', '1.1.2: Population Type'),
    F('ctgov', 'criteria', 'Eligibility criteria', `Inclusion criteria:\n${crit(d, 'Inclusion')}\n\nExclusion criteria:\n${crit(d, 'Exclusion')}`, '5.2, 5.3'),
    F('ctgov', 'countries', 'Location countries', countries(d).join(', '), '1.1.2: Site Geographic Scope'),
  ]
  const ctis: RegField[] = [
    F('ctis', 'full', 'Full title', t['Full Title'] ?? '', 'Title page'),
    F('ctis', 'public', 'Public title (for lay people)', t['Short Title'] ?? '', 'Title page: Short Title; write it for the public'),
    F('ctis', 'acronym', 'Trial short title or acronym', t['Trial Acronym'] ?? '', 'Title page'),
    F('ctis', 'code', 'Sponsor protocol code', t['Sponsor Protocol Identifier'] ?? '', 'Title page'),
    F('ctis', 'objMain', 'Main objective', d.objectives.filter((o2) => o2.level === 'Primary').map((x) => x.text).join('; '), '3'),
    F('ctis', 'objSec', 'Secondary objectives', d.objectives.filter((o2) => o2.level === 'Secondary').map((x) => x.text).join('; '), '3'),
    F('ctis', 'primary', 'Primary end points', outcomes(d, 'Primary'), '3'),
    F('ctis', 'secondary', 'Secondary end points', outcomes(d, 'Secondary'), '3'),
    F('ctis', 'condition', 'Medical condition', d.design['Population Diagnosis or Condition'] ?? '', '1.1.2'),
    F('ctis', 'phase', 'Trial phase', t['Trial Phase'] ?? '', 'Title page'),
    F('ctis', 'ageRange', 'Age range', [amin < 18 ? 'Under 18' : '', amin <= 64 ? '18–64 years' : '', amax >= 65 ? '65+ years' : ''].filter(Boolean).join(', '), '1.1.2'),
    F('ctis', 'products', 'Products and their role', d.interventions.map((i) => `${i.name}: ${i.role === 'Investigational' ? 'Test' : i.role === 'Placebo' ? 'Placebo' : i.role === 'Rescue' ? 'Rescue (auxiliary)' : 'Auxiliary'}`).join('\n'), '6.1'),
    F('ctis', 'msc', 'Member States concerned', countries(d).filter((c) => EU.includes(c)).join(', '), '1.1.2: Site Geographic Scope'),
    F('ctis', 'nEea', 'Planned participants in the EEA', String(share(d, EU)), 'An even split across countries; correct with the feasibility plan'),
    F('ctis', 'nTotal', 'Planned participants in the whole trial', String(d.facts.participants), '10.11'),
  ]
  const rand = d.design['Randomisation Type'] ?? ''
  const ctri: RegField[] = [
    F('ctri', 'public', 'Public title of study', t['Short Title'] ?? '', 'Title page'),
    F('ctri', 'scientific', 'Scientific title of study', t['Full Title'] ?? '', 'Title page'),
    F('ctri', 'secondary', 'Secondary IDs', [t['Sponsor Protocol Identifier'] && `Protocol ${t['Sponsor Protocol Identifier']}`, t['NCT Number'], t['EU CT Number']].filter(Boolean).join('; '), 'Title page'),
    F('ctri', 'condition', 'Health condition or problem studied', d.design['Population Diagnosis or Condition'] ?? '', '1.1.2'),
    F('ctri', 'intervention', 'Intervention and comparator agent', d.interventions.filter((i) => i.role !== 'Auxiliary').map((i) => `${i.role === 'Placebo' ? 'Comparator' : i.role === 'Rescue' ? 'Rescue' : 'Intervention'}: ${i.name}, ${i.dose}, ${i.route.toLowerCase()}, ${i.frequency}${i.durationWeeks ? `, ${i.durationWeeks} weeks` : ''}`).join('\n'), '6.1'),
    F('ctri', 'inclusion', 'Inclusion criteria (age from, age to, gender, details)', `Age from ${amin} years, age to ${amax} years. Gender: both.\n${crit(d, 'Inclusion')}`, '5.2'),
    F('ctri', 'exclusion', 'Exclusion criteria', crit(d, 'Exclusion'), '5.3'),
    F('ctri', 'sequence', 'Method of generating random sequence', /block/i.test(rand) ? 'Stratified block randomisation' : rand ? 'Computer generated randomisation' : 'Not applicable', '1.1.2: Randomisation Type'),
    F('ctri', 'concealment', 'Method of concealment', /interactive|IRT|IWRS|IVRS/i.test(rand) ? 'Centralised (interactive response technology)' : '', '1.1.2, 6.7'),
    F('ctri', 'blinding', 'Blinding and masking', d.design['Trial Blind Schema'] ? `${d.design['Trial Blind Schema']}${d.design['Blinded Roles'] ? ` (${d.design['Blinded Roles']})` : ''}` : '', '1.1.2'),
    F('ctri', 'primary', 'Primary outcome (with timepoints)', outcomes(d, 'Primary'), '3'),
    F('ctri', 'secondaryOut', 'Secondary outcomes (with timepoints)', outcomes(d, 'Secondary'), '3'),
    F('ctri', 'nTotal', 'Target sample size: total', String(d.facts.participants), '10.11'),
    F('ctri', 'nIndia', 'Target sample size: India', String(share(d, ['India'])), 'An even split across countries; correct with the feasibility plan'),
    F('ctri', 'phase', 'Phase of trial', phaseNo(d) ? `Phase ${phaseNo(d)}` : '', 'Title page'),
    F('ctri', 'summary', 'Brief summary', brief(d), '1.1'),
  ]
  return [{ ...REGISTRIES[0], fields: ct }, { ...REGISTRIES[1], fields: ctis }, { ...REGISTRIES[2], fields: ctri }]
}

export interface RegIssue { reg: RegistryId; key: string; text: string }
export function registryIssues(d: ProtocolData, p?: Project): RegIssue[] {
  const out: RegIssue[] = []
  for (const r of registries(d, p)) for (const f of r.fields) {
    if (!f.value.trim()) out.push({ reg: r.id, key: f.key, text: `${r.name}: ${f.label} is empty.` })
    else if (f.limit && f.value.length > f.limit) out.push({ reg: r.id, key: f.key, text: `${r.name}: ${f.label} has ${f.value.length} characters; the limit is ${f.limit}.` })
  }
  return out
}

/** Registries the trial is registered in (it has the number) or must be (it has sites in the region). */
export function registriesFor(d: ProtocolData): RegistryId[] {
  const c = countries(d), t = d.title
  return REGISTRIES.filter((r) => t[r.idField] || (r.id === 'ctgov' && (c.includes('United States') || t['FDA IND Number'])) || (r.id === 'ctis' && c.some((x) => EU.includes(x))) || (r.id === 'ctri' && c.includes('India'))).map((r) => r.id)
}

// ---------- updates after an amendment ----------
export const UPDATE_RULES: Record<RegistryId, { when: string; cite: string }> = {
  ctgov: { when: 'Within 30 days after the IRB approves an amendment that is communicated to participants; other changes at the next update, at least every 12 months. Recruitment status and site status changes within 30 days.', cite: '42 CFR 11.64(a)' },
  ctis: { when: 'A substantial modification is applied for through CTIS, and the public record changes when it is authorised. A non-substantial modification relevant to the supervision of the trial is entered in CTIS; others are kept in the trial master file.', cite: 'Regulation (EU) No 536/2014, Articles 15 to 24 and 81(9)' },
  ctri: { when: 'Enter the change in the CTRI record once the amendment is approved by the ethics committee (and CDSCO where it needs approval), before participants are enrolled under it. The rules set no number of days; registrants are expected to keep the record current.', cite: 'NDCT Rules 2019; CTRI registration requirements' },
}
export interface RegUpdate { reg: RegistryId; name: string; label: string; before: string; after: string; when: string; cite: string }
export function registryUpdates(p: Project): RegUpdate[] {
  if (p.versions.length < 2) return []
  const a = p.versions[p.versions.length - 2].data, b = p.versions[p.versions.length - 1].data, regs = registriesFor(b)
  const ra = registries(a), rb = registries(b), out: RegUpdate[] = []
  for (const r of rb) {
    if (!regs.includes(r.id)) continue
    const old = ra.find((x) => x.id === r.id)!
    for (const f of r.fields) { const o = old.fields.find((x) => x.key === f.key)?.value ?? ''; if (o !== f.value) out.push({ reg: r.id, name: r.name, label: f.label, before: o, after: f.value, ...UPDATE_RULES[r.id] }) }
  }
  return out
}

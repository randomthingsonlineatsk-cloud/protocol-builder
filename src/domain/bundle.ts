// The application bundle: what the Trial Application Step of the Clinical Trial Simulator needs to
// place a protocol in an IND, a CTA in CTIS, or a CT-04 application in India. It holds the
// protocol's identity, a synopsis, the readable protocol, the cross-walk results for each region,
// the consistency status and, for an amendment, the summary of changes with a cover note per region.
import type { Project, Region } from './types'
import { current, docOpts, status, usdmOfProject } from './project'
import { checkUsdm } from './usdm'
import { allCoverage } from './crosswalk'
import { protocolHtml, reasonName } from './print'
import { OPTIONS, REGIONS, categoryById } from './amend'

export const BUNDLE_FORMAT = 'protocol-builder-application-bundle' as const
const clean = (s = '') => s.replace(/\s*\(fictional[^)]*\)/gi, '').trim()

export function synopsis(p: Project): string {
  const d = current(p)
  const prim = d.objectives.filter((o) => o.level === 'Primary'), sec = d.objectives.filter((o) => o.level === 'Secondary')
  const eps = (ids: string[]) => d.endpoints.filter((e) => ids.includes(e.id)).map((e) => e.text).join('; ')
  return [
    `Title: ${d.title['Full Title'] ?? ''}`,
    `Protocol: ${d.title['Sponsor Protocol Identifier'] ?? ''}, version ${d.title['Version Number'] ?? ''} (${d.title['Version Date'] ?? ''}); ${d.title['Trial Phase'] ?? ''}`,
    `Sponsor: ${d.title['Sponsor Name and Address'] ?? ''}`,
    `Population: ${d.design['Population Diagnosis or Condition'] ?? ''}; age ${d.design['Population Age (Minimum and Maximum)'] ?? ''} ${d.design['Units of Age']?.toLowerCase() ?? ''}`,
    `Design: ${[d.design['Intervention Model'], d.design['Trial Blind Schema'], `${d.design['Control Type'] ?? ''} control`, d.design['Randomisation Type']].filter(Boolean).join(', ')}`,
    `Arms: ${d.arms.map((a) => `${a.name} (${a.intervention})`).join('; ')}`,
    `Participants: ${d.design['Target/Maximum Number of Participants'] ?? d.facts.participants}; sites: ${d.design['Site Distribution'] ?? ''} in ${d.design['Site Geographic Scope'] ?? ''}`,
    `Duration: ${d.design['Total Planned Duration of Trial Participation'] ?? ''}`,
    ...prim.map((o) => `Primary objective: ${o.text}. Endpoint: ${eps(o.endpointIds)}`),
    ...sec.map((o) => `Secondary objective: ${o.text}. Endpoint: ${eps(o.endpointIds)}`),
    `Sample size: ${d.statements['10.11'] ?? d.narrative['10.11'] ?? ''}`,
  ].join('\n')
}

const label = (r: Region, id?: string) => OPTIONS[r].find((o) => o.id === id)?.label ?? '(not classified)'
/** A cover note for each region, for an amendment. */
export function coverNotes(p: Project): Partial<Record<Region, string>> {
  const v = p.versions[p.versions.length - 1], a = v.amendment
  if (!a) return {}
  const d = v.data, id = d.title['Sponsor Protocol Identifier'] ?? '', sponsor = clean(d.title['Sponsor Name and Address']?.split(',')[0])
  const rows = (r: Region) => a.changes.map((c, i) => `${i + 1}. Section ${c.sections.join(', ')}: ${c.description} Rationale: ${c.rationale || '(none given)'} Classification: ${label(r, c.answers[r])}.`).join('\n')
  const head = `Protocol ${id}, amendment ${a.identifier} (version ${d.title['Version Number'] ?? ''}, ${d.title['Version Date'] ?? ''}). Primary reason: ${reasonName(a.primaryReason)}. ${a.summary}`
  const impact = `Substantial impact on the safety or rights of participants: ${a.safetyRights || 'not stated'}. Impact on the reliability and robustness of the data: ${a.dataImpact || 'not stated'}.`
  return {
    US: `To the Division (Form FDA 1571 enclosed). ${sponsor} submits a protocol amendment to IND ${d.title['FDA IND Number'] ?? '(number)'} under 21 CFR 312.30. ${head}\n${impact}\nChanges:\n${rows('US')}\nThe amended protocol and a summary of changes are enclosed in Module 5.`,
    EU: `Application for a modification of clinical trial ${d.title['EU CT Number'] ?? '(EU CT number)'} through CTIS (Regulation (EU) No 536/2014, Articles 15 to 24). ${head}\n${impact}\nChanges, with the Part they affect:\n${rows('EU')}\nEnclosed: cover letter, the amended protocol with changes highlighted, and the table of changes.`,
    IN: `To the Central Licencing Authority (CDSCO), with the ethics committee's approval where obtained. ${sponsor} submits amendment ${a.identifier} to clinical trial ${d.title['CTRI Number'] ?? '(CTRI number)'} under the Third Schedule, paragraph 1(v) and (vi), of the New Drugs and Clinical Trials Rules 2019. ${head}\n${impact}\nChanges:\n${rows('IN')}`,
  }
}

export function applicationBundle(p: Project) {
  const d = current(p), st = status(p), u = usdmOfProject(p), issues = checkUsdm(u)
  const v = p.versions[p.versions.length - 1], a = v.amendment
  return {
    format: BUNDLE_FORMAT, schema: 1, exportedUtc: new Date().toISOString(),
    notice: 'Training only. Fictional product, sponsor and trial.',
    app: { name: 'Protocol Builder', url: 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/' },
    learner: { userId: p.userId, classId: p.classId },
    protocol: {
      id: d.title['Sponsor Protocol Identifier'] ?? '', title: d.title['Full Title'] ?? '', shortTitle: d.title['Short Title'] ?? '', acronym: d.title['Trial Acronym'] ?? '',
      phase: d.title['Trial Phase'] ?? '', version: d.title['Version Number'] ?? '', versionDate: d.title['Version Date'] ?? '', status: v.status,
      product: d.title['Investigational Product Name(s)'] ?? '', productCode: d.title["Sponsor's Investigational Product Code(s)"] ?? '', sponsor: d.title['Sponsor Name and Address'] ?? '',
      indNumber: d.title['FDA IND Number'] ?? '', euCtNumber: d.title['EU CT Number'] ?? '', ctriNumber: d.title['CTRI Number'] ?? '', nctNumber: d.title['NCT Number'] ?? '',
      countries: d.design['Site Geographic Scope'] ?? '', participants: Number(d.design['Target/Maximum Number of Participants']) || d.facts.participants,
      healthy: d.design['Population Type'] === 'Without Disease', committees: d.design['Independent Committees'] ?? '',
    },
    synopsis: synopsis(p),
    crosswalks: allCoverage(d).map((c) => ({ id: c.id, name: c.name, pct: c.pct, covered: c.covered, scored: c.scored, gaps: c.gaps.map((g) => ({ id: g.item.id, text: g.item.text, hint: g.item.hint, m11: g.item.m11 })) })),
    consistency: { high: st.high, medium: st.medium, low: st.low, highOpen: st.highOpen },
    usdm: { version: u.usdmVersion, errors: issues.filter((i) => i.level === 'error').length, warnings: issues.filter((i) => i.level === 'warning').length },
    amendment: a ? {
      identifier: a.identifier, scope: a.scope, primaryReason: reasonName(a.primaryReason), summary: a.summary, safetyRights: a.safetyRights, dataImpact: a.dataImpact,
      changes: a.changes.map((c) => ({ sections: c.sections, description: c.description, rationale: c.rationale, kind: categoryById(c.category)?.label ?? '', classification: Object.fromEntries(REGIONS.map((r) => [r.id, label(r.id, c.answers[r.id])])) })),
      coverNotes: coverNotes(p),
    } : null,
    documents: { protocolHtml: protocolHtml(d, docOpts(p)) },
  }
}

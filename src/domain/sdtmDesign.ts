// The SDTM trial design datasets written from the protocol (SDTMIG v3.4, section 7): TA (arms),
// TE (elements), TV (visits), TI (inclusion and exclusion criteria) and TS (trial summary). They
// describe the plan, so everything here comes from the protocol. The TS parameters that come from
// the collected data (ACTSUB, SSTDTC, SENDTC, DCUTDTC, DCUTDESC) and the standards versions
// (SDTMVER, SDTIGVER) are left for the SDTM programmer, as the SDTM Mapping Trainer does.
import type { ProtocolData } from './types'
import { endOfTreatment } from './rules'

export type Row = Record<string, string>
export const TD_DOMAINS = ['TA', 'TE', 'TV', 'TI', 'TS'] as const
export type TdDomain = (typeof TD_DOMAINS)[number]
export const TD_VARS: Record<TdDomain, string[]> = {
  TA: ['STUDYID', 'DOMAIN', 'ARMCD', 'ARM', 'TAETORD', 'ETCD', 'ELEMENT', 'TABRANCH', 'TATRANS', 'EPOCH'],
  TE: ['STUDYID', 'DOMAIN', 'ETCD', 'ELEMENT', 'TESTRL', 'TEENRL', 'TEDUR'],
  TV: ['STUDYID', 'DOMAIN', 'VISITNUM', 'VISIT', 'VISITDY', 'ARMCD', 'ARM', 'TVSTRL', 'TVENRL'],
  TI: ['STUDYID', 'DOMAIN', 'IETESTCD', 'IETEST', 'IECAT', 'IESCAT', 'TIRL', 'TIVERS'],
  TS: ['STUDYID', 'DOMAIN', 'TSSEQ', 'TSGRPID', 'TSPARMCD', 'TSPARM', 'TSVAL', 'TSVAL1', 'TSVALNF', 'TSVALCD', 'TSVCDREF', 'TSVCDVER'],
}
export const TS_FROM_DATA = ['ACTSUB', 'SSTDTC', 'SENDTC', 'DCUTDTC', 'DCUTDESC', 'SDTMVER', 'SDTIGVER']

const PHASE: Record<string, string> = { 'Early Phase 1': 'PHASE 0 TRIAL', 'Phase 1': 'PHASE I TRIAL', 'Phase 1/Phase 2': 'PHASE I/II TRIAL', 'Phase 2': 'PHASE II TRIAL', 'Phase 2/Phase 3': 'PHASE II/III TRIAL', 'Phase 3': 'PHASE III TRIAL', 'Phase 3/Phase 4': 'PHASE III/IV TRIAL', 'Phase 4': 'PHASE IV TRIAL' }
const CONTROL: Record<string, string> = { Placebo: 'PLACEBO', 'Active Comparator': 'ACTIVE', 'Dose Response': 'DOSE RESPONSE', External: 'HISTORICAL', 'No Control': 'NONE', 'Different Dose or Regimen': 'ACTIVE', 'Sham Procedure': 'PLACEBO' }
const MODEL: Record<string, string> = { 'Single Group': 'SINGLE GROUP', 'Parallel Group': 'PARALLEL', 'Cross-over': 'CROSSOVER', Factorial: 'FACTORIAL', Sequential: 'SEQUENTIAL' }
const TTYPE: Record<string, string> = { Efficacy: 'EFFICACY', Safety: 'SAFETY', Pharmacokinetic: 'PHARMACOKINETIC' }
const ISO3: Record<string, string> = { 'United States': 'USA', USA: 'USA', US: 'USA', Japan: 'JPN', Germany: 'DEU', India: 'IND', Brazil: 'BRA', Canada: 'CAN', Ireland: 'IRL', 'United Kingdom': 'GBR', UK: 'GBR', France: 'FRA', Spain: 'ESP', Italy: 'ITA', China: 'CHN', Australia: 'AUS', Poland: 'POL', Netherlands: 'NLD', Mexico: 'MEX', 'South Korea': 'KOR', Korea: 'KOR', Switzerland: 'CHE', Belgium: 'BEL', Sweden: 'SWE', Denmark: 'DNK', Austria: 'AUT', Argentina: 'ARG', 'South Africa': 'ZAF', Czechia: 'CZE', Hungary: 'HUN', Israel: 'ISR', Taiwan: 'TWN', Singapore: 'SGP' }
const PARM: Record<string, string> = { TITLE: 'Trial Title', TPHASE: 'Trial Phase Classification', STYPE: 'Study Type', TTYPE: 'Trial Type', INDIC: 'Trial Disease/Condition Indication', TRT: 'Investigational Therapy or Treatment', COMPTRT: 'Comparative Treatment Name', CURTRT: 'Current Therapy or Treatment', PCLAS: 'Pharmacologic Class', TBLIND: 'Trial Blinding Schema', TCNTRL: 'Control Type', TINDTP: 'Trial Intent Type', RANDOM: 'Trial is Randomized', ADDON: 'Added on to Existing Treatments', NARMS: 'Planned Number of Arms', PLANSUB: 'Planned Number of Subjects', AGEMIN: 'Planned Minimum Age of Subjects', AGEMAX: 'Planned Maximum Age of Subjects', SEXPOP: 'Sex of Participants', HLTSUBJI: 'Healthy Subject Indicator', LENGTH: 'Trial Length', FCNTRY: 'Planned Country of Investigational Sites', SPONSOR: 'Clinical Study Sponsor', REGID: 'Registry Identifier', ADAPT: 'Adaptive Design', INTMODEL: 'Intervention Model', INTTYPE: 'Intervention Type', OBJPRIM: 'Trial Primary Objective', OBJSEC: 'Trial Secondary Objective', OUTMSPRI: 'Primary Outcome Measure', OUTMSSEC: 'Secondary Outcome Measure', STOPRULE: 'Study Stop Rules' }

const strip = (s = '') => s.replace(/\s*\(fictional[^)]*\)/gi, '').trim()
export const armCode = (a: { id: string; code?: string; name: string }) => a.code || a.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || a.id
const epochName = (t: string) => t.toUpperCase().replace(/^FOLLOW.?UP$/, 'FOLLOW-UP')

export function trialDesign(d: ProtocolData): Record<TdDomain, Row[]> {
  const studyid = d.title['Sponsor Protocol Identifier'] || 'STUDY'
  const base = (dom: string) => ({ STUDYID: studyid, DOMAIN: dom })
  const scr = d.epochs.find((e) => e.type === 'Screening'), fu = d.epochs.find((e) => e.type === 'Follow-up')
  const trtEpochs = d.epochs.filter((e) => e.type !== 'Screening' && e.type !== 'Follow-up')
  const scrDays = Math.max(0, ...d.visits.filter((v) => v.epoch === 'Screening').map((v) => -v.lo))

  // TA: one record per element per arm. Screening and follow-up are shared elements; each arm's
  // treatment element is its own, coded with the arm code.
  const ta: Row[] = d.arms.flatMap((a) => {
    const code = armCode(a), els: [string, string, string][] = []
    if (scr) els.push(['SCRN', 'Screening', epochName('Screening')])
    for (const e of trtEpochs) els.push([trtEpochs.length > 1 ? `${code}${trtEpochs.indexOf(e) + 1}` : code, trtEpochs.length > 1 ? `${a.name}, ${e.name}` : a.name, epochName(e.type === 'Treatment' ? 'Treatment' : e.name)])
    if (fu) els.push(['FU', 'Follow-up', 'FOLLOW-UP'])
    return els.map(([etcd, el, ep], i) => ({ ...base('TA'), ARMCD: code, ARM: a.name, TAETORD: String(i + 1), ETCD: etcd, ELEMENT: el, TABRANCH: i === 0 && scr && /random/i.test(d.design['Intervention Assignment Method'] ?? '') ? `Randomized to ${a.name}` : '', TATRANS: '', EPOCH: ep }))
  })
  // TE: start and end rules, and planned durations.
  const te: Row[] = []
  if (scr) te.push({ ...base('TE'), ETCD: 'SCRN', ELEMENT: 'Screening', TESTRL: 'Informed consent signed', TEENRL: `First dose of study drug, at most ${scrDays} days after informed consent`, TEDUR: '' })
  for (const a of d.arms) te.push({ ...base('TE'), ETCD: armCode(a), ELEMENT: a.name, TESTRL: `First dose of ${a.name}`, TEENRL: `${d.facts.treatmentWeeks} weeks after the first dose`, TEDUR: `P${d.facts.treatmentWeeks}W` })
  if (fu) te.push({ ...base('TE'), ETCD: 'FU', ELEMENT: 'Follow-up', TESTRL: 'Day after the last dose of study drug', TEENRL: `${d.facts.followUpWeeks} weeks after the last dose`, TEDUR: `P${d.facts.followUpWeeks}W` })
  // TV: planned visits in order.
  const vs = d.visits.slice().sort((a, b) => a.day - b.day)
  const first = vs.find((v) => v.epoch !== 'Screening')
  const tv: Row[] = vs.map((v, i) => ({ ...base('TV'), VISITNUM: String(i + 1), VISIT: v.epoch === 'Follow-up' && vs.filter((x) => x.epoch === 'Follow-up').length === 1 ? 'FOLLOW-UP' : v.name.toUpperCase().replace(/\s*\(.*\)$/, ''), VISITDY: String(v.day), ARMCD: '', ARM: '',
    TVSTRL: v.epoch === 'Screening' ? `Up to ${-v.lo} days before the first dose` : v === first ? 'Day of the first dose' : `Study day ${v.day} (window ${v.lo} to ${v.hi})`, TVENRL: '' }))
  // TI: the criteria, with the protocol version that holds them.
  const vers = (d.title['Version Number'] || '1').split('.')[0]
  const ti: Row[] = d.criteria.map((c) => ({ ...base('TI'), IETESTCD: c.code.slice(0, 8), IETEST: c.text.slice(0, 200), IECAT: c.category.toUpperCase(), IESCAT: '', TIRL: '', TIVERS: vers }))

  // TS: the trial summary parameters a protocol can give.
  const p = (cd: string, val: string, code?: { code: string; ref: string; ver: string }): Row => ({ ...base('TS'), TSSEQ: '', TSGRPID: '', TSPARMCD: cd, TSPARM: PARM[cd] ?? '', TSVAL: val, TSVAL1: '', TSVALNF: val ? '' : 'NA', TSVALCD: code?.code ?? '', TSVCDREF: code?.ref ?? '', TSVCDVER: code?.ver ?? '' })
  const inv = d.interventions.filter((i) => i.role === 'Investigational'), aux = d.interventions.filter((i) => i.role === 'Auxiliary')
  const product = d.title["Sponsor's Investigational Product Code(s)"] || inv[0]?.name || ''
  const age = (d.design['Population Age (Minimum and Maximum)'] ?? '').match(/\d+/g) ?? [String(d.facts.ageMin), String(d.facts.ageMax)]
  const unit = /month/i.test(d.design['Units of Age'] ?? '') ? 'M' : /week/i.test(d.design['Units of Age'] ?? '') ? 'W' : 'Y'
  const countries = (d.design['Site Geographic Scope'] ?? '').split(/,|\band\b/).map((s) => s.trim()).filter(Boolean).map((c) => ISO3[c] ?? c.toUpperCase().slice(0, 3))
  const reg = (d.title['NCT Number'] ?? '').match(/NCT\d+/)?.[0]
  const comp = d.arms.filter((a) => a.type !== 'Investigational')
  const kinds = [...new Set(d.objectives.filter((o) => o.level !== 'Exploratory').map((o) => TTYPE[o.kind]).filter(Boolean))]
  const prim = d.objectives.filter((o) => o.level === 'Primary'), sec = d.objectives.filter((o) => o.level === 'Secondary')
  const ts: Row[] = [
    p('TITLE', strip(d.title['Full Title'])), p('TPHASE', PHASE[d.title['Trial Phase'] ?? ''] ?? ''), p('STYPE', 'INTERVENTIONAL'),
    ...kinds.map((k) => p('TTYPE', k)),
    p('INDIC', d.design['Population Diagnosis or Condition']?.replace(/\s+inadequately.*$/i, '') ?? '', d.sdtm?.indic),
    p('TRT', product, d.sdtm?.trt),
    ...comp.map((a) => p('COMPTRT', a.type === 'Placebo' ? 'PLACEBO' : a.name.toUpperCase())),
    ...aux.map((a) => p('CURTRT', a.name.replace(/\s*\(.*\)/, '').toUpperCase(), d.sdtm?.curtrt)),
    ...(d.sdtm?.pclas ? [p('PCLAS', d.sdtm.pclas.value, d.sdtm.pclas)] : []),
    p('TBLIND', (d.design['Trial Blind Schema'] ?? '').toUpperCase()), p('TCNTRL', CONTROL[d.design['Control Type'] ?? ''] ?? ''), p('TINDTP', 'TREATMENT'),
    p('RANDOM', /random/i.test(d.design['Intervention Assignment Method'] ?? '') ? 'Y' : 'N'), p('ADDON', aux.length ? 'Y' : 'N'),
    p('NARMS', String(d.arms.length)), p('PLANSUB', d.design['Target/Maximum Number of Participants'] || String(d.facts.participants)),
    p('AGEMIN', `P${age[0]}${unit}`), p('AGEMAX', age[1] ? `P${age[1]}${unit}` : ''),
    p('SEXPOP', d.criteria.some((c) => /\b(women|female)\b/i.test(c.text) && /\bonly\b/i.test(c.text)) ? 'F' : 'BOTH'),
    p('HLTSUBJI', d.design['Population Type'] === 'Without Disease' ? 'Y' : 'N'),
    p('LENGTH', `P${d.facts.participationWeeks}W`),
    ...countries.map((c) => p('FCNTRY', c)),
    p('SPONSOR', strip((d.title['Sponsor Name and Address'] ?? '').split(',')[0])),
    ...(reg ? [p('REGID', reg)] : []),
    p('ADAPT', d.design['Adaptive Trial Design Indicator'] === 'Yes' ? 'Y' : 'N'), p('INTMODEL', MODEL[d.design['Intervention Model'] ?? ''] ?? ''), p('INTTYPE', 'DRUG'),
    ...prim.map((o) => p('OBJPRIM', o.text)), ...sec.map((o) => p('OBJSEC', o.text)),
    ...d.endpoints.filter((e) => e.level === 'Primary').map((e) => p('OUTMSPRI', e.text)),
    ...d.endpoints.filter((e) => e.level === 'Secondary').map((e) => p('OUTMSSEC', e.text)),
    p('STOPRULE', (d.narrative['4.3'] ?? '').split(/(?<=\.)\s/)[0] ?? ''),
  ]
  ts.sort((a, b) => a.TSPARMCD.localeCompare(b.TSPARMCD) || a.TSVAL.localeCompare(b.TSVAL))
  const seq = new Map<string, number>()
  for (const r of ts) { const n = (seq.get(r.TSPARMCD) ?? 0) + 1; seq.set(r.TSPARMCD, n); r.TSSEQ = String(n) }
  // Values over 200 characters continue in TSVAL1 (SDTMIG TS assumption), split at a space.
  for (const r of ts) if (r.TSVAL.length > 200) { const cut = r.TSVAL.lastIndexOf(' ', 200); r.TSVAL1 = r.TSVAL.slice(cut + 1); r.TSVAL = r.TSVAL.slice(0, cut) }
  void endOfTreatment
  return { TA: ta, TE: te, TV: tv, TI: ti, TS: ts }
}

/** Problems a reviewer would raise about the generated datasets. */
export function designNotes(d: ProtocolData): string[] {
  const out: string[] = []
  if (d.arms.some((a) => !a.code)) out.push('Some arms have no ARMCD: the code is made from the arm name. Set an arm code (up to 20 characters) in section 1.2.')
  if (!d.title['NCT Number']) out.push('No NCT number, so TS has no REGID record.')
  if (!d.sdtm?.indic) out.push('INDIC has no dictionary code (SNOMED CT or MedDRA in TSVALCD).')
  if (!d.sdtm?.trt) out.push('TRT has no UNII in TSVALCD.')
  for (const c of d.criteria) if (c.text.length > 200) out.push(`${c.code}: the criterion is over 200 characters; IETEST is cut and the full text belongs in the protocol.`)
  return out
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
export const toCsv = (dom: TdDomain, rows: Row[]) => [TD_VARS[dom].join(','), ...rows.map((r) => TD_VARS[dom].map((v) => csvCell(r[v] ?? '')).join(','))].join('\n')

export const TD_FORMAT = 'protocol-builder-trial-design' as const
/** The file the SDTM Mapping Trainer reads as the reference for its trial design mission. */
export function trialDesignFile(d: ProtocolData) {
  return { format: TD_FORMAT, schema: 1, exportedUtc: new Date().toISOString(), study: d.title['Sponsor Protocol Identifier'] ?? '', protocolVersion: d.title['Version Number'] ?? '', sdtmig: '3.4', fromData: TS_FROM_DATA, datasets: trialDesign(d) }
}

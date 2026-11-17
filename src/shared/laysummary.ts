// SHARED MODULE: the same file is in the Plain Language Lab and the Protocol Builder
// (src/shared/laysummary.ts); a test in each repo fails if the copies differ.
//
// The summary of a trial's results for laypersons, EU Clinical Trials Regulation Annex V (ten
// required elements), submitted with the results summary within one year of the end of the trial
// (Article 37(4)). From the protocol alone (the Protocol Builder) the results are left to write;
// with the analysis results of the TLF Programming Lab (its ARS reporting event) they are drafted
// in plain words: natural frequencies, differences with what they mean, confidence intervals in
// words, and no p-values. Following the EU recommendations on lay summaries (2017) and Good Lay
// Summary Practice (2021).
import { GAP, type DocSection, type StudyFacts } from './consent'

export interface GroupValue { group: string; n: number; resp?: number; pct?: number; mean?: number }
export interface Diff { group: string; est: number; lcl: number; ucl: number }
export interface Endpoint { name: string; kind: 'binary' | 'continuous'; values: GroupValue[]; diffs: Diff[] }
export interface LayResults {
  study: string; groups: string[]; n: Record<string, number>
  primary?: Endpoint; secondary?: Endpoint
  ae?: { any: { group: string; pct: number }[]; top: { term: string; pct: Record<string, number> }[] }
  age?: { mean: number; min: number; max: number }; femalePct?: number
}

// ---------- reading the TLF Programming Lab's ARS reporting event ----------
interface ArsResult { analysis: string; category?: string; resultGroups: { groupName: string }[]; operationId: string; rawValue: string | number | null }
interface ArsAnalysis { id: string; name: string; results: ArsResult[] }
const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v))
export function readReportingEvent(re: { id?: string; study?: string; analyses?: ArsAnalysis[] }): LayResults {
  if (!re || !Array.isArray(re.analyses)) throw new Error('This is not an analysis results (ARS) file from the TLF Programming Lab.')
  const study = re.study ?? String(re.id ?? '').replace(/^RE_/, '')
  const find = (re2: RegExp) => re.analyses!.find((a) => re2.test(a.name))
  const op = (r: ArsResult) => r.operationId.split('_').pop()!
  const val = (a: ArsAnalysis | undefined, analysis: string, o: string, group: string, category?: string) => num(a?.results.find((r) => r.analysis === analysis && op(r) === o && r.resultGroups[0]?.groupName === group && (category === undefined || r.category === category))?.rawValue)
  const groupsOf = (a?: ArsAnalysis) => [...new Set((a?.results ?? []).map((r) => r.resultGroups[0]?.groupName).filter((g) => g && g !== 'Total'))] as string[]
  function endpoint(a?: ArsAnalysis): Endpoint | undefined {
    if (!a) return undefined
    const gs = groupsOf(a), binary = a.results.some((r) => r.analysis === 'RESP')
    const values = gs.map((g) => binary ? { group: g, n: val(a, 'N', 'n', g), resp: val(a, 'RESP', 'n', g), pct: val(a, 'RESP', 'pct', g) } : { group: g, n: val(a, 'CHG', 'n', g), mean: val(a, 'LSMEAN', 'est', g) })
    const diffs = gs.map((g) => ({ group: g, est: val(a, 'DIFF', 'est', g), lcl: val(a, 'DIFF', 'lcl', g), ucl: val(a, 'DIFF', 'ucl', g) })).filter((d) => !isNaN(d.est))
    return { name: a.name.replace(/^Table [\d.]+:\s*/, ''), kind: binary ? 'binary' : 'continuous', values, diffs }
  }
  const t1 = find(/14\.1\.2/), t2 = find(/14\.3\.1/), groups = groupsOf(t1 ?? t2)
  const n = Object.fromEntries(groups.map((g) => [g, val(t1 ?? t2, 'POP', 'N', g)]))
  let ae: LayResults['ae']
  if (t2) {
    const terms = [...new Set(t2.results.filter((r) => r.analysis === 'PT').map((r) => r.category ?? ''))]
    const top = terms.map((t) => ({ term: t.split('|').pop()!.trim(), pct: Object.fromEntries(groups.map((g) => [g, val(t2, 'PT', 'pct', g, t) || 0])) }))
      .sort((a, b) => Math.max(...Object.values(b.pct)) - Math.max(...Object.values(a.pct))).slice(0, 5)
    ae = { any: groups.map((g) => ({ group: g, pct: val(t2, 'ANY', 'pct', g) })), top }
  }
  const tot = groups.reduce((s, g) => s + (n[g] || 0), 0)
  const fem = groups.reduce((s, g) => s + (val(t1, 'SEX', 'n', g, 'F') || 0), 0)
  const ages = groups.map((g) => ({ m: val(t1, 'AGE', 'mean', g), n: n[g] || 0, lo: val(t1, 'AGE', 'min', g), hi: val(t1, 'AGE', 'max', g) }))
  return { study, groups, n, primary: endpoint(find(/14\.2\.1/)), secondary: endpoint(find(/14\.2\.2/)), ae,
    age: t1 ? { mean: Math.round(ages.reduce((s, a) => s + a.m * a.n, 0) / Math.max(1, tot)), min: Math.min(...ages.map((a) => a.lo)), max: Math.max(...ages.map((a) => a.hi)) } : undefined,
    femalePct: t1 && tot ? Math.round((100 * fem) / tot) : undefined }
}

// ---------- plain numbers ----------
const r0 = (x: number) => Math.round(x)
export const inHundred = (pct: number) => (pct >= 1 || pct === 0 ? `${r0(pct)} in 100` : `${Math.round(pct * 10)} in 1,000`)
function endpointWords(e: Endpoint, control: string): string {
  const ctl = e.values.find((v) => v.group === control)
  if (e.kind === 'binary') {
    const parts = e.values.map((v) => `${v.group}: ${v.resp} of ${v.n} people (about ${inHundred(v.pct ?? 0)})`)
    const diffs = e.diffs.map((d) => `For ${d.group}, the difference from ${control.toLowerCase()} was about ${r0(d.est)} more ${r0(d.est) === 1 ? 'person' : 'people'} in every 100${d.lcl <= 0 && d.ucl >= 0 ? '. This difference could be due to chance: the true difference may be anywhere from about ' + r0(Math.abs(d.lcl)) + ' fewer to ' + r0(d.ucl) + ' more in every 100' : ', and the true difference is likely to be between about ' + r0(d.lcl) + ' and ' + r0(d.ucl) + ' more in every 100'}.`)
    return `${parts.join('; ')}. ${diffs.join(' ')}`.replace(/more in every 100 people, and/g, 'more in every 100, and')
  }
  const fmt = (x: number) => (Math.round(x * 10) / 10).toString()
  const parts = e.values.map((v) => `${v.group}: an average change of ${fmt(v.mean ?? 0)}`)
  const diffs = e.diffs.map((d) => `Compared with ${control.toLowerCase()}, ${d.group} ${d.est < 0 ? 'lowered' : 'raised'} it by about ${fmt(Math.abs(d.est))} more on average${d.lcl <= 0 && d.ucl >= 0 ? ', but this could be due to chance' : `; the true difference is likely to be between ${fmt(Math.min(Math.abs(d.lcl), Math.abs(d.ucl)))} and ${fmt(Math.max(Math.abs(d.lcl), Math.abs(d.ucl)))}`}.`)
  void ctl
  return `${parts.join('; ')}. ${diffs.join(' ')}`
}

const lc = (s: string) => (/^[A-Z][a-z]*\b(?![-\d])/.test(s) && !/^[A-Z][a-z]*[A-Z0-9]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
/** The ten Annex V elements, drafted from the study (and its results, when given). */
export function laySummarySections(f: StudyFacts, r?: LayResults, edits: Record<string, string> = {}): DocSection[] {
  const control = r?.groups.find((g) => /placebo/i.test(g)) ?? r?.groups[0] ?? 'placebo'
  const total = r ? Object.values(r.n).reduce((s, x) => s + (x || 0), 0) : 0
  const regs = [f.registry.euct && `EU trial number ${f.registry.euct}`, f.registry.nct && `ClinicalTrials.gov ${f.registry.nct}`, f.registry.ctri && `CTRI ${f.registry.ctri}`].filter(Boolean).join('; ')
  const s: DocSection[] = [
    { id: 'id', heading: '1 Which trial is this?', text: `${f.shortTitle || f.fullTitle}${f.acronym ? ` (${f.acronym})` : ''}. Protocol number ${f.protocolId}. ${regs}.` },
    { id: 'sponsor', heading: '2 Who ran the trial?', text: `${f.sponsor || `${GAP} the sponsor’s name and address]`}. Contact: ${GAP} the sponsor’s contact point for questions about the trial].` },
    { id: 'general', heading: '3 Why was the trial done, and where and when?', text: `${f.aim ? `The main aim was to ${lc(f.aim.replace(/^To /, '')).replace(/\.$/, '')}.` : ''} The trial took place in ${f.countries.join(', ').replace(/, ([^,]*)$/, ' and $1') || `${GAP} countries]`} from ${GAP} start date] to ${GAP} end date].` },
    { id: 'population', heading: '4 Who took part?', text: r
      ? `${total} people took part${r.age ? `, aged ${r.age.min} to ${r.age.max} (on average ${r.age.mean})` : ''}${r.femalePct !== undefined ? `; about ${r.femalePct} in 100 were women` : ''}. ${r.groups.map((g) => `${r.n[g]} took ${g.toLowerCase().startsWith('placebo') ? 'placebo' : g}`).join(', ')}. People could take part if they had ${lc(f.condition)}.`
      : `The trial planned to include ${f.participants} people aged ${f.ageMin} to ${f.ageMax} with ${lc(f.condition)}. ${GAP} how many took part, by age group and sex].` },
    { id: 'products', heading: '5 Which medicines were used?', text: `${f.arms.map((a) => a.name).join(', ')}${f.dosing ? `, taken ${f.dosing}` : ''}. The participants were put into groups by chance${f.blinded ? ', and neither they nor the trial doctors knew who got which treatment' : ''}. Treatment lasted ${f.treatmentWeeks} weeks.` },
    { id: 'reactions', heading: '6 What side effects did participants have?', text: r?.ae
      ? `Many people had at least one health problem during the trial, whether or not it was caused by the treatment: ${r.ae.any.map((a) => `about ${inHundred(a.pct)} on ${/placebo/i.test(a.group) ? 'placebo' : a.group}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}. The most common were:\n${r.ae.top.map((t) => `${t.term}: ${r.groups.map((g) => `${inHundred(t.pct[g] ?? 0)} on ${/placebo/i.test(g) ? 'placebo' : g}`).join(', ')}.`).join('\n')}\n ${GAP} which of these the doctors thought were caused by the medicine, and any serious ones]`
      : `${GAP} the adverse reactions and how often they happened, the serious ones first, in plain words]` },
    { id: 'results', heading: '7 What were the results?', text: r?.primary ? `The main question was the ${lc(r.primary.name.replace(/\s*\((primary|ANCOVA)[^)]*\)/gi, ''))}. ${endpointWords(r.primary, control)}${r.secondary ? ` Another question was the ${lc(r.secondary.name.replace(/\s*\([^)]*\)/g, ''))}. ${endpointWords(r.secondary, control)}` : ''}` : `${GAP} the overall results for the main question, in plain words, without claiming more than the trial showed]` },
    { id: 'comments', heading: '8 What does the sponsor say about the results?', text: `${GAP} the sponsor’s comments on the outcome]. The results of one trial alone do not answer every question about a medicine; more trials may be needed.` },
    { id: 'followup', heading: '9 Are more trials planned?', text: `${GAP} whether follow-up trials are planned]` },
    { id: 'more', heading: '10 Where can I find more information?', text: `${[f.registry.euct && 'the EU clinical trials database (CTIS public portal)', f.registry.nct && 'ClinicalTrials.gov', f.registry.ctri && 'the Clinical Trials Registry – India'].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()) || `${GAP} registries]`}, searching for the numbers in section 1. ${GAP} other sources, such as a publication]` },
  ]
  return s.map((x) => ({ ...x, text: edits[x.id] ?? x.text }))
}
export const layText = (secs: DocSection[]) => secs.map((s) => s.text.replace(/\[(To be written|Site to complete):[^\]]*\]/g, '')).join('\n')

// ---------- checks (PL-L01 to L10) ----------
export interface LayCheck { id: string; label: string; ok: boolean; why: string }
const PROMO = /\b(breakthrough|miracle|amazing|revolutionary|cure[sd]?|proves?|proven|best|superior|excellent|exciting|game-changing)\b/i
export function layChecks(secs: DocSection[]): LayCheck[] {
  const t = (id: string) => secs.find((s) => s.id === id)?.text ?? ''
  const all = secs.map((s) => s.text).join('\n')
  const el = (id: string, n: number, label: string) => ({ id: `PL-L${String(n).padStart(2, '0')}`, label, ok: !!t(id).trim() && !t(id).includes(GAP), why: !t(id).trim() ? 'Missing.' : t(id).includes(GAP) ? 'Still has text to write.' : '' })
  return [
    el('id', 1, 'Trial identification (title, protocol and registry numbers)'), el('sponsor', 2, 'Sponsor name and contact'), el('general', 3, 'Why, where and when the trial was done'),
    el('population', 4, 'Who took part: number, age and sex'), el('products', 5, 'The medicines used'), el('reactions', 6, 'Adverse reactions and how often'),
    el('results', 7, 'The overall results'), el('comments', 8, 'The sponsor’s comments on the outcome'), el('followup', 9, 'Whether follow-up trials are planned'),
    { id: 'PL-L10', label: 'Plain, neutral and honest: no promotional words, no p-values, and it says one trial is not the whole answer', ok: !PROMO.test(all) && !/\bp\s*[<=>]\s*0?\.\d|statistically significant/i.test(all) && /one trial|single trial|alone do(es)? not/i.test(all), why: PROMO.test(all) ? `Promotional word: “${PROMO.exec(all)![0]}”.` : /\bp\s*[<=>]|statistically significant/i.test(all) ? 'A p-value or “statistically significant” is in the text.' : 'Say that the results of one trial alone do not answer every question.' },
  ]
}

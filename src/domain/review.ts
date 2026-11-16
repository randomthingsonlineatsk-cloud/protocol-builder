// Review and feedback: a reviewer's comments on sections and on quoted words, as a medical writing
// QC would make them; a readiness summary; and a plain-language check of the synopsis and of a
// lay summary (reading level), ahead of the Plain Language Lab.
import type { Project } from './types'
import { current, status, usdmOfProject } from './project'
import { checkUsdm } from './usdm'
import { REQUIRED_TEXT, CONDITIONAL } from './rules'
import { TITLE_ELEMENTS, DESIGN_ELEMENTS } from './m11'
import { allCoverage } from './crosswalk'
import { ibFindings } from './ib'
import { cipCoverage, cipFindings } from './cip'

export type CommentKind = 'Correction' | 'Consistency' | 'Clarity' | 'Style' | 'Question'
export const COMMENT_KINDS: CommentKind[] = ['Correction', 'Consistency', 'Clarity', 'Style', 'Question']
export interface ReviewComment {
  id: string; section: string; quote: string; kind: CommentKind; comment: string
  status: 'open' | 'resolved'; author: string; utc: string; reply?: string
}
export function addComment(p: Project, c: Omit<ReviewComment, 'id' | 'status' | 'utc'>): ReviewComment {
  const r: ReviewComment = { ...c, id: `RC-${Math.random().toString(36).slice(2, 8)}`, status: 'open', utc: new Date().toISOString() }
  ;(p.reviews ??= []).push(r)
  return r
}
/** Whether the quoted words are still in the section (they may have been rewritten since). */
export function quoteFound(p: Project, c: ReviewComment): boolean {
  if (!c.quote.trim()) return true
  const d = current(p)
  const text = p.type === 'device' ? (p.cip?.sections[c.section] ?? '') : c.section === 'TP' ? Object.values(d.title).join(' ') : d.narrative[c.section] ?? ''
  return text.includes(c.quote)
}

// ---------- readiness ----------
export interface Readiness { items: { label: string; ok: boolean; detail: string }[]; ready: boolean }
export function readiness(p: Project): Readiness {
  const open = (p.reviews ?? []).filter((r) => r.status === 'open')
  const blocking = open.filter((r) => r.kind === 'Correction' || r.kind === 'Consistency')
  if (p.type === 'device') {
    const cov = p.cip ? cipCoverage(p.cip) : null, f = p.cip ? cipFindings(p.cip) : []
    const items = [
      { label: 'ISO 14155 Annex A topics covered', ok: !!cov && cov.pct === 100, detail: cov ? `${cov.covered} of ${cov.total} (${cov.pct}%)` : 'No CIP yet' },
      { label: 'No high device findings', ok: !f.some((x) => x.severity === 'high'), detail: `${f.filter((x) => x.severity === 'high').length} high, ${f.filter((x) => x.severity === 'medium').length} medium` },
      { label: 'No open corrections or consistency comments', ok: blocking.length === 0, detail: `${open.length} open comment(s), ${blocking.length} blocking` },
    ]
    return { items, ready: items.every((i) => i.ok) }
  }
  const d = current(p), st = status(p)
  const missingText = [...REQUIRED_TEXT, ...CONDITIONAL.filter((c) => c.when(d)).map((c) => c.num)].filter((n) => !(d.narrative[n] ?? '').trim())
  const missingEl = [...TITLE_ELEMENTS, ...DESIGN_ELEMENTS].filter((e) => e.conf === 'R' && !((e.term in d.title ? d.title : d.design)[e.term] ?? '').trim()).map((e) => e.term)
  const cw = allCoverage(d), spirit = cw.find((c) => c.id === 'spirit')!
  const ib = ibFindings(p), usdm = checkUsdm(usdmOfProject(p)).filter((i) => i.level === 'error').length
  const items = [
    { label: 'Every required element and section written', ok: !missingText.length && !missingEl.length, detail: missingText.length || missingEl.length ? `Missing: ${[...missingEl, ...missingText.map((n) => `section ${n}`)].slice(0, 8).join(', ')}${missingText.length + missingEl.length > 8 ? '…' : ''}` : 'All written' },
    { label: 'No high consistency findings', ok: st.highOpen === 0, detail: `${st.high} high, ${st.medium} medium, ${st.low} low open` },
    { label: 'SPIRIT 2025 score', ok: spirit.gaps.length === 0, detail: `${spirit.pct}% (${spirit.covered} of ${spirit.scored} items)` },
    { label: 'Region cross-walks (EU CTR, NDCT, 312.23)', ok: cw.filter((c) => c.id !== 'spirit').every((c) => !c.gaps.length), detail: cw.filter((c) => c.id !== 'spirit').map((c) => `${c.name.split(',')[0]} ${c.pct}%`).join(' · ') },
    { label: 'IB agrees with the protocol', ok: !p.ib || !ib.some((f) => f.severity === 'high'), detail: p.ib ? `${ib.length} IB finding(s)` : 'No IB attached' },
    { label: 'USDM export without errors', ok: usdm === 0, detail: `${usdm} error(s)` },
    { label: 'No open corrections or consistency comments', ok: blocking.length === 0, detail: `${open.length} open comment(s), ${blocking.length} blocking` },
  ]
  return { items, ready: items.every((i) => i.ok) }
}

// ---------- plain language ----------
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)
  return Math.max(1, s?.length ?? 1)
}
// Words a lay reader may not know, with plainer words (EU CTR Annex V lay summaries; common
// plain-language guidance for patient documents).
export const JARGON: [RegExp, string][] = [
  [/\brandomi[sz]ed\b/i, 'put into a group by chance'], [/\bplacebo\b/i, 'a dummy treatment with no medicine in it'], [/\bdouble[- ]blind\b/i, 'neither you nor the study team know which treatment you get'],
  [/\befficacy\b/i, 'how well it works'], [/\badverse events?\b/i, 'side effects or other health problems'], [/\bendpoints?\b/i, 'what the study measures'],
  [/\bestimands?\b/i, 'the exact question the study answers'], [/\bintercurrent\b/i, 'something that happens during the study, such as stopping treatment'], [/\bprimary objective\b/i, 'main aim'],
  [/\bparticipants?\b/i, 'people taking part'], [/\bpharmacokinetic/i, 'how the body handles the medicine'], [/\bconcomitant\b/i, 'other medicines you take'],
  [/\bcontraindicat/i, 'reasons not to use'], [/\bbaseline\b/i, 'the start of the study'], [/\binclusion criteria\b/i, 'who can take part'], [/\bexclusion criteria\b/i, 'who cannot take part'],
  [/\bsuperiority\b/i, 'better than'], [/\bnon-?inferiority\b/i, 'no worse than'], [/\bstatistically significant\b/i, 'unlikely to be due to chance'], [/\bcohort\b/i, 'group'],
  [/\bsubcutaneous/i, 'under the skin'], [/\bintravenous/i, 'into a vein'], [/\boral(ly)?\b/i, 'by mouth'], [/\bhepat/i, 'liver'], [/\brenal\b/i, 'kidney'],
  [/\bULN\b/, 'the upper limit of normal'], [/\bALT\b/, 'a liver blood test'], [/\bmitigat/i, 'reduce'], [/\bsponsor\b/i, 'the company running the study'], [/\bprotocol\b/i, 'the study plan'],
]
export interface PlainResult { words: number; sentences: number; wordsPerSentence: number; longWordsPct: number; fre: number; fkGrade: number; longSentences: string[]; jargon: { word: string; plain: string }[]; verdict: string }
export function plainLanguage(text: string): PlainResult {
  const clean = text.replace(/\s+/g, ' ').trim()
  const sents = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])|\n+/).map((s) => s.trim()).filter((s) => /[a-z]/i.test(s))
  const words = clean.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []
  const syl = words.reduce((n, w) => n + syllables(w), 0)
  const W = Math.max(1, words.length), S = Math.max(1, sents.length)
  const fre = Math.round((206.835 - 1.015 * (W / S) - 84.6 * (syl / W)) * 10) / 10
  const fk = Math.round((0.39 * (W / S) + 11.8 * (syl / W) - 15.59) * 10) / 10
  const longWords = words.filter((w) => syllables(w) >= 3).length
  const jargon = JARGON.flatMap(([re, plain]) => { const m = re.exec(clean); return m ? [{ word: m[0], plain }] : [] })
  const longSentences = sents.filter((s) => (s.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length > 25)
  const verdict = fk <= 8 ? 'Plain: most adults can read it.' : fk <= 12 ? 'Fairly difficult: shorten sentences and replace technical words for a lay reader.' : 'Difficult: written for specialists. A lay summary needs shorter sentences and everyday words.'
  return { words: words.length, sentences: sents.length, wordsPerSentence: Math.round((W / S) * 10) / 10, longWordsPct: Math.round((100 * longWords) / W), fre, fkGrade: fk, longSentences, jargon, verdict }
}

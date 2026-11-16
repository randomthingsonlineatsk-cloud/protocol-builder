// The readable protocol: a print layout the browser saves as PDF. Title page, table of contents,
// every M11 section in order with its structured content drawn as tables, and the schedule of
// activities grid. Headers repeat the protocol identifier and version.
import { TOC, TITLE_ELEMENTS, DESIGN_ELEMENTS } from './m11'
import { CODELISTS } from './m11'
import CT from './ct-usdm.json'
import type { ProtocolData, Amendment } from './types'
import { categoryById } from './amend'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const para = (s?: string) => (s ?? '').split(/\n{2,}/).filter((x) => x.trim()).map((x) => `<p>${esc(x)}</p>`).join('')
const table = (head: string[], rows: string[][]) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`

export function soaGrid(d: ProtocolData) {
  const vs = d.visits.slice().sort((a, b) => a.day - b.day)
  const head = ['Procedure', 'Section', ...vs.map((v) => `${v.name}\nDay ${v.day}${v.lo !== v.hi ? ` (${v.lo} to ${v.hi})` : ''}`)]
  const rows = d.procedures.map((p) => [esc(p.name) + (p.footnote ? ` <sup>${esc(p.footnote.split(':')[0])}</sup>` : ''), esc(p.section), ...vs.map((v) => (p.visits === 'continuous' ? (v.day >= (d.visits.find((x) => x.id === p.from)?.day ?? 1) ? '●' : '') : p.visits.includes(v.id) ? '●' : ''))])
  return table(head, rows) + d.procedures.filter((p) => p.footnote).map((p) => `<p class="fn">${esc(p.footnote)}</p>`).join('')
}

export interface DocOpts { amendment?: Amendment; prior?: Amendment[] }
export const reasonName = (c: string) => (CT.codelists as unknown as Record<string, { terms: [string, string, string][] }>).C207415.terms.find((t) => t[0] === c)?.[2] ?? c
export function amendmentRows(a: Amendment): [string, string][] {
  return [['Amendment identifier', a.identifier], ['Amendment scope', a.scope + (a.scopeDetail ? ` (${a.scopeDetail})` : '')], ['Approximate % enrolled at sponsor approval', a.enrolledPct ? `${a.enrolledPct}%` : ''], ['Primary reason', reasonName(a.primaryReason)], ['Secondary reasons', a.secondaryReasons.map(reasonName).join('; ')], ['Amendment summary', a.summary], ['Substantial impact on safety or rights', a.safetyRights], ['Impact on reliability and robustness of the data', a.dataImpact]]
}
export const changeRows = (a: Amendment) => a.changes.map((c) => [c.sections.join(', '), c.description, c.rationale, categoryById(c.category)?.label ?? ''])
export function protocolHtml(d: ProtocolData, opts: DocOpts = {}) {
  const id = d.title['Sponsor Protocol Identifier'] ?? '', ver = d.title['Version Number'] ?? ''
  const body: string[] = []
  for (const s of TOC) {
    const depth = s.num === 'TP' ? 1 : s.num.split('.').length
    const h = `h${Math.min(depth + 1, 5)}`
    if (s.num === 'TP') continue
    let content = ''
    if (s.num === '1.1.1') content = table(['Objective', 'Endpoint', 'Estimand'], d.objectives.map((o) => { const eps = d.endpoints.filter((e) => o.endpointIds.includes(e.id)); const es = d.estimands.filter((e) => e.objectiveId === o.id); return [`<b>${esc(o.level)}</b>: ${esc(o.text)}`, eps.map((e) => esc(e.text)).join('<br>'), es.map((e) => `${esc(e.population)}; ${esc(e.treatment)}; ${e.intercurrentEvents.map((i) => `${esc(i.name)}: ${esc(i.strategy)}`).join('; ')}; ${esc(e.summary)}`).join('<br>')] }))
    if (s.num === '1.1.2') content = table(['Element', 'Value'], DESIGN_ELEMENTS.filter((e) => d.design[e.term]).map((e) => [esc(e.term), esc(d.design[e.term]) + (e.list ? ` <span class="code">${esc(CODELISTS[e.list].values.find((c) => c.decode === d.design[e.term])?.code ?? '')}</span>` : '')]))
    if (s.num === '1.2') content = table(['Arm', ...d.epochs.map((e) => e.name)], d.arms.map((a) => [esc(a.name), ...d.epochs.map((e) => (e.type === 'Treatment' ? esc(a.intervention) : esc(e.name)))]))
    if (s.num === '1.3') content = soaGrid(d)
    if (s.num === '3.1' || s.num === '3.2' || s.num === '3.3') {
      const lvl = s.num === '3.1' ? 'Primary' : s.num === '3.2' ? 'Secondary' : 'Exploratory'
      content = d.objectives.filter((o) => o.level === lvl).map((o, i) => {
        const es = d.estimands.filter((e) => e.objectiveId === o.id)
        return `<h${Math.min(depth + 2, 5)}>${s.num}.${i + 1} ${esc(lvl)} objective ${i + 1}</h${Math.min(depth + 2, 5)}><p>${esc(o.text)}</p>${d.endpoints.filter((e) => o.endpointIds.includes(e.id)).map((e) => `<p><b>Endpoint:</b> ${esc(e.text)}</p>`).join('')}` +
          es.map((e) => table(['Attribute', 'Estimand ' + e.id], [['Population', esc(e.population)], ['Treatment', esc(e.treatment)], ['Variable', esc(d.endpoints.find((x) => x.id === e.endpointId)?.text)], ['Intercurrent events', e.intercurrentEvents.map((i) => `${esc(i.name)}: <b>${esc(i.strategy)}</b>. ${esc(i.description)}`).join('<br>')], ['Population-level summary', esc(e.summary)]])).join('')
      }).join('')
    }
    if (s.num === '5.2' || s.num === '5.3') content = `<ol class="crit">${d.criteria.filter((c) => c.category === (s.num === '5.2' ? 'Inclusion' : 'Exclusion')).map((c) => `<li><b>${esc(c.code)}</b> ${esc(c.text)}</li>`).join('')}</ol>`
    if (s.num === '6.1') content = table(['Intervention', 'Role', 'Dose', 'Route', 'Frequency', 'Duration'], d.interventions.map((i) => [esc(i.name), esc(i.role), esc(i.dose), esc(i.route), esc(i.frequency), i.durationWeeks ? `${i.durationWeeks} weeks` : '']))
    if (s.num === '10.2') content = table(['Analysis set', 'Definition'], d.analysisSets.map((a) => [esc(a.name), esc(a.text)]))
    if (s.num === '12.3') content = `<p>${!opts.prior?.length ? (d.title['Original Protocol Indicator'] === 'No' ? 'This is the first protocol amendment.' : 'This protocol has not been amended.') : 'This protocol has been amended previously. Details of prior amendments are below.'}</p>` + (opts.prior ?? []).map((a) => `<h4>Amendment ${esc(a.identifier)}</h4><p>${esc(a.summary)}</p>` + table(['Section', 'Change', 'Rationale'], changeRows(a).map((r) => r.slice(0, 3).map(esc)))).join('')
    body.push(`<${h} id="s${s.num}">${esc(s.num)} ${esc(s.title)}</${h}>${content}${para(d.narrative[s.num])}`)
  }
  const tp = table(['', ''], TITLE_ELEMENTS.filter((e) => d.title[e.term] && e.term !== 'Full Title').map((e) => [esc(e.term), esc(d.title[e.term])]))
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(id)} protocol ${esc(ver)}</title><style>
  @page { size: A4; margin: 20mm 18mm; @top-right { content: "${esc(id)} · version ${esc(ver)}"; font: 9pt sans-serif; color: #555 } @bottom-center { content: counter(page); font: 9pt sans-serif } }
  body { font: 10.5pt/1.45 Georgia, serif; color: #111; max-width: 180mm; margin: 0 auto; padding: 8mm }
  h1 { font: 600 18pt sans-serif; margin: 0 0 6mm } h2 { font: 600 13pt sans-serif; margin: 8mm 0 2mm; break-after: avoid; border-bottom: 1px solid #999 } h3, h4, h5 { font: 600 11pt sans-serif; margin: 5mm 0 1.5mm; break-after: avoid }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; font: 8.5pt sans-serif } th, td { border: 1px solid #999; padding: 1.5mm; vertical-align: top; text-align: left; white-space: pre-line } th { background: #eee }
  .code { color: #666; font-size: 7.5pt } .fn { font-size: 8pt; margin: 0.5mm 0 } .tp { break-after: page } .toc { break-after: page; columns: 2; font: 9pt sans-serif } .toc a { color: inherit; text-decoration: none; display: block }
  .note { font: 8pt sans-serif; color: #555 } ol.crit { list-style: none; padding: 0 } ol.crit li { margin-bottom: 1mm }
  </style></head><body>
  <section class="tp"><p class="note">Fictional protocol written in the Protocol Builder (training only). ICH M11 CeSHarP structure.</p><h1>${esc(d.title['Full Title'])}</h1>${tp}</section>
  ${opts.amendment ? `<section class="tp"><h2>Amendment details</h2>${table(['', ''], amendmentRows(opts.amendment).filter((r) => r[1]).map((r) => r.map(esc)))}<h3>Overview of changes in the current amendment</h3>${table(['Section', 'Description of change', 'Brief rationale'], changeRows(opts.amendment).map((r) => r.slice(0, 3).map(esc)))}</section>` : ''}
  <nav class="toc"><h2>Table of contents</h2>${TOC.filter((s) => s.num !== 'TP' && s.num.split('.').length <= 2).map((s) => `<a href="#s${s.num}">${esc(s.num)} ${esc(s.title)}</a>`).join('')}</nav>
  ${body.join('\n')}
  </body></html>`
}

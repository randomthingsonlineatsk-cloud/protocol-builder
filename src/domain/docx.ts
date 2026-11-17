// The protocol as a Word document (Office Open XML): title page, amendment details and summary of
// changes, a table of contents written with its entries and page numbers already filled in (the
// page layout is worked out as the file is made, so it reads correctly in any app), every
// M11 section as a numbered heading with its structured content as tables, and the schedule of
// activities in landscape. Header: protocol identifier and version; footer: page numbers.
import { AlignmentType, Document, Footer, Header, HeadingLevel, PageNumber, PageOrientation, Packer, Paragraph, SectionType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType, ShadingType } from 'docx'
import { estimatePageNumbers } from 'docx/layout'
import { TOC, TITLE_ELEMENTS, DESIGN_ELEMENTS } from './m11'
import type { ProtocolData } from './types'
import { amendmentRows, changeRows, type DocOpts } from './print'

const P = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) => new Paragraph({ children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size })], spacing: { after: 120 } })
const cell = (text: string, head = false) => new TableCell({ children: text.split('\n').map((t) => new Paragraph({ children: [new TextRun({ text: t, bold: head, size: 18 })] })), shading: head ? { type: ShadingType.CLEAR, fill: 'E7E6E6', color: 'auto' } : undefined })
const table = (head: string[], rows: string[][]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: head.map((h) => cell(h, true)) }), ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) }))] })
const HEAD = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5]

function soa(d: ProtocolData) {
  const vs = d.visits.slice().sort((a, b) => a.day - b.day)
  return table(['Procedure', 'Section', ...vs.map((v) => `${v.id}\nDay ${v.day}${v.lo !== v.hi ? `\n(${v.lo} to ${v.hi})` : ''}`)],
    d.procedures.map((p) => [p.name + (p.footnote ? ` (${p.footnote.split(':')[0]})` : ''), p.section, ...vs.map((v) => (p.visits === 'continuous' ? (v.day >= (d.visits.find((x) => x.id === p.from)?.day ?? 1) ? 'X' : '') : p.visits.includes(v.id) ? 'X' : ''))]))
}

export function protocolDocx(d: ProtocolData, opts: DocOpts = {}): Document {
  const id = d.title['Sponsor Protocol Identifier'] ?? '', ver = d.title['Version Number'] ?? ''
  const body: (Paragraph | Table)[] = []
  for (const s of TOC) {
    if (s.num === 'TP') continue
    const depth = s.num.split('.').length
    body.push(new Paragraph({ text: `${s.num} ${s.title}`, heading: HEAD[Math.min(depth - 1, 4)] }))
    if (s.num === '1.1.1') body.push(table(['Objective', 'Endpoint', 'Estimand'], d.objectives.map((o) => [`${o.level}: ${o.text}`, d.endpoints.filter((e) => o.endpointIds.includes(e.id)).map((e) => e.text).join('\n'), d.estimands.filter((e) => e.objectiveId === o.id).map((e) => `${e.population}; ${e.treatment}; ${e.intercurrentEvents.map((i) => `${i.name}: ${i.strategy}`).join('; ')}; ${e.summary}`).join('\n')])))
    if (s.num === '1.1.2') body.push(table(['Element', 'Value'], DESIGN_ELEMENTS.filter((e) => d.design[e.term]).map((e) => [e.term, d.design[e.term]])))
    if (s.num === '1.2') body.push(table(['Arm', ...d.epochs.map((e) => e.name)], d.arms.map((a) => [a.name, ...d.epochs.map((e) => (e.type === 'Treatment' ? a.intervention : e.name))])))
    if (s.num === '1.3') body.push(P('The schedule of activities is in the landscape section at the end of this document.', { italics: true }))
    if (['3.1', '3.2', '3.3'].includes(s.num)) {
      const lvl = s.num === '3.1' ? 'Primary' : s.num === '3.2' ? 'Secondary' : 'Exploratory'
      d.objectives.filter((o) => o.level === lvl).forEach((o, i) => {
        body.push(new Paragraph({ text: `${s.num}.${i + 1} ${lvl} objective ${i + 1}`, heading: HEAD[Math.min(depth, 4)] }), P(o.text))
        for (const e of d.endpoints.filter((x) => o.endpointIds.includes(x.id))) body.push(P(`Endpoint: ${e.text}`))
        for (const e of d.estimands.filter((x) => x.objectiveId === o.id)) body.push(table(['Attribute', `Estimand ${e.id}`], [['Population', e.population], ['Treatment', e.treatment], ['Variable', d.endpoints.find((x) => x.id === e.endpointId)?.text ?? ''], ['Intercurrent events', e.intercurrentEvents.map((i) => `${i.name}: ${i.strategy}. ${i.description}`).join('\n')], ['Population-level summary', e.summary]]))
      })
    }
    if (s.num === '5.2' || s.num === '5.3') for (const c of d.criteria.filter((x) => x.category === (s.num === '5.2' ? 'Inclusion' : 'Exclusion'))) body.push(new Paragraph({ children: [new TextRun({ text: `${c.code} `, bold: true }), new TextRun(c.text)], spacing: { after: 80 } }))
    if (s.num === '6.1') body.push(table(['Intervention', 'Role', 'Dose', 'Route', 'Frequency', 'Duration'], d.interventions.map((i) => [i.name, i.role, i.dose, i.route, i.frequency, i.durationWeeks ? `${i.durationWeeks} weeks` : ''])))
    if (s.num === '10.2') body.push(table(['Analysis set', 'Definition'], d.analysisSets.map((a) => [a.name, a.text])))
    if (s.num === '12.3') {
      body.push(P(!opts.prior?.length ? (d.title['Original Protocol Indicator'] === 'No' ? 'This is the first protocol amendment.' : 'This protocol has not been amended.') : 'This protocol has been amended previously. Details of prior amendments are below.'))
      for (const a of opts.prior ?? []) body.push(P(`Amendment ${a.identifier}: ${a.summary}`, { bold: true }), table(['Section', 'Change', 'Rationale'], changeRows(a).map((r) => r.slice(0, 3))))
    }
    for (const para of (d.narrative[s.num] ?? '').split(/\n{2,}/).filter((x) => x.trim())) body.push(P(para))
  }
  const titlePage = [
    P('Fictional protocol written in the Protocol Builder (training only). ICH M11 CeSHarP structure.', { italics: true, size: 18 }),
    new Paragraph({ children: [new TextRun({ text: d.title['Full Title'] ?? '', bold: true, size: 32 })], spacing: { after: 300 } }),
    table(['Title page element', 'Value'], TITLE_ELEMENTS.filter((e) => d.title[e.term] && e.term !== 'Full Title').map((e) => [e.term, d.title[e.term]])),
    ...(opts.amendment ? [new Paragraph({ children: [new TextRun({ text: 'Amendment details', bold: true, size: 28 })], pageBreakBefore: true, spacing: { after: 200 } }), table(['Amendment element', 'Value'], amendmentRows(opts.amendment).filter((r) => r[1])),
      new Paragraph({ children: [new TextRun({ text: 'Overview of changes in the current amendment', bold: true, size: 24 })], spacing: { before: 240, after: 120 } }), table(['Section', 'Description of change', 'Brief rationale'], changeRows(opts.amendment).map((r) => r.slice(0, 3)))] : []),
    new Paragraph({ children: [new TextRun({ text: 'Table of contents', bold: true, size: 28 })], pageBreakBefore: true, spacing: { after: 200 } }),
    new TableOfContents('Table of contents', { hyperlink: true, headingStyleRange: '1-2' }),
  ]
  const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${id} · version ${ver}`, size: 16, color: '666666' })] })] })
  const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16 })] })] })
  return new Document({
    creator: 'Protocol Builder', title: `${id} protocol ${ver}`, description: 'Fictional training protocol in the ICH M11 structure',
    pageNumbers: estimatePageNumbers,
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [
      { properties: {}, headers: { default: header }, footers: { default: footer }, children: [...titlePage, new Paragraph({ text: '', pageBreakBefore: true }), ...body] },
      { properties: { type: SectionType.NEXT_PAGE, page: { size: { orientation: PageOrientation.LANDSCAPE } } }, headers: { default: header }, footers: { default: footer }, children: [new Paragraph({ text: '1.3 Schedule of Activities (table)', heading: HeadingLevel.HEADING_2 }), soa(d), ...d.procedures.filter((p) => p.footnote).map((p) => P(p.footnote!, { size: 16 }))] },
    ],
  })
}
export const protocolDocxBlob = (d: ProtocolData, opts: DocOpts = {}) => Packer.toBlob(protocolDocx(d, opts))
export const protocolDocxBuffer = (d: ProtocolData, opts: DocOpts = {}) => Packer.toBuffer(protocolDocx(d, opts))

/** A generated document (consent form, SAP outline, RTSM specification) as Word: a title and one heading per section. */
export function sectionsDocxBlob(title: string, secs: { heading: string; text: string }[]) {
  const doc = new Document({ creator: 'Protocol Builder', title, sections: [{ children: [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
    ...secs.flatMap((s) => [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s.heading)] }),
      ...s.text.split('\n').map((t) => new Paragraph({ spacing: { after: 120 }, children: t.split(/(\[(?:To be written|Site to complete):[^\]]*\])/).filter(Boolean).map((x) => new TextRun({ text: x, highlight: /^\[(To be written|Site to complete):/.test(x) ? 'yellow' : undefined })) }))]),
  ] }] })
  return Packer.toBlob(doc)
}

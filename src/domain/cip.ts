// The device variant: a clinical investigation plan (CIP) for a medical device, following the
// topics of ISO 14155:2026 Annex A (normative), fourth edition, March 2026. The section numbers
// below are this app's; Annex A's own numbering is in the standard (a paid document), so check it
// against your copy. The 2026 edition adds points the checks look for: risks in three categories
// (the device, procedures outside routine practice, the conduct of the investigation; clause 6.2),
// a justification when there is no data monitoring committee (6.11), a clinical events committee
// considered and, if there is one, described (6.12), calibration of measuring equipment in the
// procedures, and exemptions from the eligibility criteria handled only by a CIP amendment.
import type { Finding } from './types'

export interface Hazard { hazard: string; harm: string; category: 'device' | 'procedure' | 'conduct'; control: string; residual: string }
export interface Cip {
  title: string; number: string; version: string; date: string
  device: { name: string; model: string; manufacturer: string; intendedPurpose: string; classification: string; software: string; description: string; contact: string; training: string }
  riskFile: string; hazards: Hazard[]
  dmc: '' | 'yes' | 'no'; dmcText: string
  cec: '' | 'yes' | 'no'; cecText: string
  sections: Record<string, string>
}
export interface CipSection { id: string; num: string; title: string; guidance: string; structured?: boolean }
export const CIP_SECTIONS: CipSection[] = [
  { id: 'ident', num: '1', title: 'Identification of the clinical investigation plan', structured: true, guidance: 'Title, reference number, version and date; a version history once amended.' },
  { id: 'sponsor', num: '2', title: 'Sponsor', guidance: 'Name and address of the sponsor, and of the legal representative where the sponsor is outside the region.' },
  { id: 'investigators', num: '3', title: 'Principal investigator, coordinating investigator and investigation sites', guidance: 'Names, qualifications and addresses; the investigation sites; other institutions involved (core laboratories, the CEC).' },
  { id: 'synopsis', num: '4', title: 'Overall synopsis of the clinical investigation', guidance: 'A summary of the CIP: design, population, device, endpoints, sample size and duration.' },
  { id: 'device', num: '5', title: 'Identification and description of the investigational device', structured: true, guidance: 'Manufacturer, name, model and version (including software), intended purpose, classification, materials in contact with the body, how it is used, and the training users need.' },
  { id: 'justification', num: '6', title: 'Justification for the design of the clinical investigation', guidance: 'The clinical evaluation and preclinical testing that support it, and why this design answers the question.' },
  { id: 'risks', num: '7', title: 'Benefits and risks of the investigational device, clinical procedures and clinical investigation', structured: true, guidance: 'Anticipated benefits; risks in three categories (the device, procedures the CIP requires outside routine practice, and the conduct of the investigation), each with its control and the residual risk, from the ISO 14971 risk management file; the benefit-risk evaluation.' },
  { id: 'objectives', num: '8', title: 'Objectives and hypotheses', guidance: 'Primary and secondary objectives, endpoints and the hypotheses tested; claims for safety and performance.' },
  { id: 'design', num: '9.1', title: 'Design: general', guidance: 'Type of investigation (pivotal, early feasibility…), controls, randomisation and blinding, endpoints and how they are assessed.' },
  { id: 'subjects', num: '9.2', title: 'Design: subjects', guidance: 'Inclusion and exclusion criteria, enrolment, withdrawal, the number of subjects and the duration of participation.' },
  { id: 'procedures', num: '9.3', title: 'Design: procedures', guidance: 'Every procedure and visit, the measurements and the equipment used, including how measuring equipment is calibrated; the activities performed by sponsor representatives.' },
  { id: 'monitoring', num: '9.4', title: 'Design: monitoring plan and committees', structured: true, guidance: 'The risk-based monitoring approach; the data monitoring committee (or why there is none) and the clinical events committee (or why there is none).' },
  { id: 'stats', num: '10', title: 'Statistical design and analysis', guidance: 'Analysis populations, sample size with its assumptions, analysis methods, interim analyses, missing data; estimands where used (Annex K).' },
  { id: 'data', num: '11', title: 'Data management', guidance: 'Data collection, the electronic system and its validation, data review and retention.' },
  { id: 'amendments', num: '12', title: 'Amendments to the CIP', guidance: 'How amendments are made and approved, including that any exemption from the eligibility criteria needs an amendment.' },
  { id: 'deviations', num: '13', title: 'Deviations from the CIP', guidance: 'Recording, reporting and analysing deviations; that no waivers are granted.' },
  { id: 'accountability', num: '14', title: 'Device accountability', guidance: 'Receipt, storage, use, return and disposal of investigational devices, with traceability by lot or serial number.' },
  { id: 'compliance', num: '15', title: 'Statements of compliance', guidance: 'Compliance with ISO 14155:2026, the Declaration of Helsinki and the applicable regulations (for example EU MDR 2017/745, Annex XV; 21 CFR 812; India MDR 2017); insurance.' },
  { id: 'consent', num: '16', title: 'Informed consent process', guidance: 'Who obtains consent and how, new information, re-consent (including after a suspension is lifted).' },
  { id: 'safety', num: '17', title: 'Adverse events, adverse device effects and device deficiencies', guidance: 'Definitions (AE, SAE, ADE, SADE, USADE, device deficiency); how they are recorded, assessed and reported, with timelines; device deficiencies that could have led to a SADE; the foreseeable ADEs.' },
  { id: 'vulnerable', num: '18', title: 'Vulnerable population', guidance: 'Whether vulnerable subjects take part, why, and the extra protections; or that none are enrolled.' },
  { id: 'termination', num: '19', title: 'Suspension or premature termination of the clinical investigation', guidance: 'Criteria, who decides, and how subjects are followed up; how the investigation resumes after a suspension.' },
  { id: 'publication', num: '20', title: 'Publication policy', guidance: 'Registration in a public database and publication of results whatever the outcome.' },
  { id: 'bibliography', num: '21', title: 'Bibliography', guidance: 'References cited in the CIP.' },
]

export const blankCip = (): Cip => ({ title: '', number: '', version: '0.1', date: '', device: { name: '', model: '', manufacturer: '', intendedPurpose: '', classification: '', software: '', description: '', contact: '', training: '' }, riskFile: '', hazards: [], dmc: '', dmcText: '', cec: '', cecText: '', sections: {} })

const blank = (s?: string) => !s || !s.trim()
const t = (c: Cip, id: string) => c.sections[id] ?? ''

/** Annex A coverage: each section with its content, written or structured. */
export function cipCoverage(c: Cip) {
  const done = (s: CipSection): boolean => {
    if (s.id === 'ident') return !blank(c.title) && !blank(c.number) && !blank(c.version) && !blank(c.date)
    if (s.id === 'device') return ['name', 'model', 'manufacturer', 'intendedPurpose', 'classification', 'description'].every((k) => !blank(c.device[k as keyof Cip['device']]))
    if (s.id === 'risks') return c.hazards.length > 0 && !blank(t(c, 'risks'))
    if (s.id === 'monitoring') return !blank(t(c, 'monitoring')) && !!c.dmc && !!c.cec
    return t(c, s.id).trim().length >= 40
  }
  const rows = CIP_SECTIONS.map((s) => ({ s, ok: done(s) }))
  return { rows, covered: rows.filter((r) => r.ok).length, total: rows.length, pct: Math.round((100 * rows.filter((r) => r.ok).length) / rows.length) }
}

export const DEVICE_RULES = [
  { id: 'PB-D01', severity: 'high' as const, title: 'The investigational device is not fully identified (name, model or version, manufacturer, intended purpose, classification)' },
  { id: 'PB-D02', severity: 'high' as const, title: 'The risks are not traced to the ISO 14971 risk management file, or a risk has no control or residual risk' },
  { id: 'PB-D03', severity: 'high' as const, title: 'The risks do not cover the three categories: the device, procedures outside routine practice, and the conduct of the investigation' },
  { id: 'PB-D04', severity: 'high' as const, title: 'The safety section does not define ADE, SADE, USADE and device deficiency, or does not say how device deficiencies are reported' },
  { id: 'PB-D05', severity: 'medium' as const, title: 'There is no data monitoring committee and no justification for that (ISO 14155:2026, 6.11)' },
  { id: 'PB-D06', severity: 'medium' as const, title: 'A clinical events committee was not considered, or its role is not described (6.12)' },
  { id: 'PB-D07', severity: 'medium' as const, title: 'The procedures do not say how measuring equipment is calibrated' },
  { id: 'PB-D08', severity: 'medium' as const, title: 'The CIP does not say that an exemption from the eligibility criteria needs a CIP amendment' },
  { id: 'PB-D09', severity: 'medium' as const, title: 'Device accountability does not give traceability by lot or serial number' },
  { id: 'PB-D10', severity: 'low' as const, title: 'The statement of compliance does not name ISO 14155:2026' },
]

export function cipFindings(c: Cip): Finding[] {
  const out: Finding[] = []
  const add = (rule: string, key: string, sections: string[], text: string, fix: string) => out.push({ id: `${rule}:${key}`, rule, severity: DEVICE_RULES.find((r) => r.id === rule)!.severity, sections, text, fix })
  const miss = (['name', 'model', 'manufacturer', 'intendedPurpose', 'classification'] as const).filter((k) => blank(c.device[k]))
  if (miss.length) add('PB-D01', 'device', ['5'], `The device description lacks: ${miss.map((k) => ({ name: 'name', model: 'model or version', manufacturer: 'manufacturer', intendedPurpose: 'intended purpose', classification: 'classification' })[k]).join(', ')}.`, 'Fill every identification field in section 5.')
  if (/software|algorithm|app\b/i.test(c.device.description + c.device.intendedPurpose) && blank(c.device.software)) add('PB-D01', 'software', ['5'], 'The device includes software, but no software version is given.', 'Give the software version under investigation.')
  if (blank(c.riskFile)) add('PB-D02', 'file', ['7'], 'Section 7 does not cite the ISO 14971 risk management file (its reference and version).', 'Cite the risk management file the hazards come from.')
  c.hazards.forEach((h, i) => { if (blank(h.control) || blank(h.residual)) add('PB-D02', `h${i}`, ['7'], `Risk “${h.hazard || `row ${i + 1}`}” has no ${blank(h.control) ? 'control' : 'residual risk'}.`, 'Give each risk its risk control and the residual risk after it.') })
  if (!c.hazards.length) add('PB-D02', 'none', ['7'], 'No risks are listed.', 'List the risks from the risk management file with their controls and residual risks.')
  const cats = new Set(c.hazards.map((h) => h.category))
  const lack = (['device', 'procedure', 'conduct'] as const).filter((k) => !cats.has(k))
  if (c.hazards.length && lack.length) add('PB-D03', 'cats', ['7'], `No risk is listed for: ${lack.map((k) => ({ device: 'the investigational device', procedure: 'procedures outside routine clinical practice', conduct: 'the conduct of the investigation' })[k]).join('; ')}.`, 'ISO 14155:2026 clause 6.2 separates the three; list the risks of each, or say there are none and why.')
  const s = t(c, 'safety')
  const defs = ['adverse device effect', 'serious adverse device effect', 'unanticipated serious adverse device effect', 'device deficienc'].filter((w) => !s.toLowerCase().includes(w))
  if (defs.length || !/report/i.test(s)) add('PB-D04', 'defs', ['17'], defs.length ? `Section 17 does not define: ${defs.map((w) => w.replace('deficienc', 'deficiency')).join(', ')}.` : 'Section 17 does not say how events and device deficiencies are reported.', 'Define each term and give who reports what, to whom, and how fast.')
  else if (!/deficienc[^.]{0,120}(could have|might have|led to)|(could have|might have) led to[^.]{0,80}serious/i.test(s)) add('PB-D04', 'dd', ['17'], 'Section 17 does not say that device deficiencies that could have led to a serious adverse device effect are reported like SADEs.', 'Add the reporting of device deficiencies that might have led to a SADE.')
  if (c.dmc === '' || (c.dmc === 'no' && c.dmcText.trim().length < 30)) add('PB-D05', 'dmc', ['9.4'], c.dmc === '' ? 'The CIP does not say whether there is a data monitoring committee.' : 'There is no data monitoring committee and the justification is missing or too short.', 'Say whether a DMC is set up; if not, justify it (low risk, short duration, no interim decisions…).')
  if (c.dmc === 'yes' && c.dmcText.trim().length < 30) add('PB-D05', 'dmcrole', ['9.4'], 'A data monitoring committee is set up but its role and stopping conditions are not described.', 'Describe its membership, what it reviews and the conditions for suspending or stopping.')
  if (c.cec === '' || c.cecText.trim().length < 30) add('PB-D06', 'cec', ['9.4'], c.cec === 'yes' ? 'A clinical events committee is set up but its role is not described.' : c.cec === 'no' ? 'No clinical events committee, and the reason is not given.' : 'The CIP does not say whether a clinical events committee was considered.', 'Say whether a CEC adjudicates events or endpoints; describe it, or say why it is not needed.')
  if (!/calibrat/i.test(t(c, 'procedures'))) add('PB-D07', 'cal', ['9.3'], 'The procedures do not say how the measuring equipment is calibrated.', 'Name the equipment used for measurements (for example the reference ECG or blood pressure monitor) and how and when it is calibrated.')
  if (!/(exempt|waiver)[^.]{0,120}amend|amend[^.]{0,120}(exempt|waiver)/i.test(t(c, 'amendments') + ' ' + t(c, 'deviations') + ' ' + t(c, 'subjects'))) add('PB-D08', 'elig', ['12'], 'The CIP does not say that an exemption from the eligibility criteria needs a CIP amendment.', 'State that no eligibility waivers are granted and that any exemption is a CIP amendment reviewed by the ethics committee and, where required, the authority.')
  if (!/(lot|serial|batch|UDI)/i.test(t(c, 'accountability'))) add('PB-D09', 'acc', ['14'], 'Device accountability does not track devices by lot, batch, serial number or UDI.', 'Record each device by serial number or lot from receipt to return or disposal.')
  if (!/14155\s*:\s*2026/.test(t(c, 'compliance'))) add('PB-D10', 'iso', ['15'], 'The statement of compliance does not name ISO 14155:2026.', 'State compliance with ISO 14155:2026 and the applicable regulations.')
  return out
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
export function cipHtml(c: Cip) {
  const para = (x?: string) => (x ?? '').split(/\n{2,}/).filter((y) => y.trim()).map((y) => `<p>${esc(y)}</p>`).join('')
  const dev = c.device, body = CIP_SECTIONS.map((s) => {
    let extra = ''
    if (s.id === 'ident') extra = `<table><tr><th>Title</th><td>${esc(c.title)}</td></tr><tr><th>Reference</th><td>${esc(c.number)}</td></tr><tr><th>Version and date</th><td>${esc(c.version)}, ${esc(c.date)}</td></tr></table>`
    if (s.id === 'device') extra = `<table>${[['Name', dev.name], ['Model and version', dev.model], ['Software version', dev.software], ['Manufacturer', dev.manufacturer], ['Intended purpose', dev.intendedPurpose], ['Classification', dev.classification], ['Description', dev.description], ['Materials in contact with the body', dev.contact], ['Training', dev.training]].filter((r) => r[1]).map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>`
    if (s.id === 'risks') extra = `<p>Risk management file: ${esc(c.riskFile)}</p><table><tr><th>Category</th><th>Hazard</th><th>Harm</th><th>Control</th><th>Residual risk</th></tr>${c.hazards.map((h) => `<tr><td>${esc(h.category)}</td><td>${esc(h.hazard)}</td><td>${esc(h.harm)}</td><td>${esc(h.control)}</td><td>${esc(h.residual)}</td></tr>`).join('')}</table>`
    if (s.id === 'monitoring') extra = `<p><b>Data monitoring committee:</b> ${esc(c.dmc || 'not stated')}. ${esc(c.dmcText)}</p><p><b>Clinical events committee:</b> ${esc(c.cec || 'not stated')}. ${esc(c.cecText)}</p>`
    return `<h2>${esc(s.num)} ${esc(s.title)}</h2>${extra}${para(c.sections[s.id])}`
  }).join('\n')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.number)} clinical investigation plan ${esc(c.version)}</title><style>@page{size:A4;margin:20mm 18mm}body{font:10.5pt/1.45 Georgia,serif;max-width:180mm;margin:0 auto;padding:8mm}h1{font:600 18pt sans-serif}h2{font:600 12pt sans-serif;border-bottom:1px solid #999;margin-top:7mm}table{width:100%;border-collapse:collapse;font:8.5pt sans-serif}th,td{border:1px solid #999;padding:1.5mm;text-align:left;vertical-align:top}th{background:#eee;width:30%}.n{font:8pt sans-serif;color:#555}</style></head><body><p class="n">Fictional clinical investigation plan written in the Protocol Builder (training only). Structure: the topics of ISO 14155:2026 Annex A.</p><h1>${esc(c.title)}</h1>${body}</body></html>`
}

// The participant information sheet and informed consent form (ICF), generated from the protocol
// and checked against the required elements of three regions:
//  - US: 21 CFR 50.25(a) basic elements, (b) additional elements and (c) the ClinicalTrials.gov statement.
//  - EU: Clinical Trials Regulation (EU) No 536/2014, Article 29(2) and 29(6).
//  - India: New Drugs and Clinical Trials Rules, 2019, Third Schedule, Table 3 (the checklist of
//    essential elements of the participant information sheet).
// Text the protocol cannot give (alternatives, payments, injury compensation) is left as a marked
// gap for the writer; site details are left for the site.
import type { ProtocolData, Project } from './types'

export const GAP = '[To be written:'
export const SITE = '[Site to complete:'
export interface DocSection { id: string; heading: string; text: string }

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
function chance(d: ProtocolData) {
  const tot = d.arms.reduce((n, a) => n + a.ratio, 0) || 1
  const pbo = d.arms.filter((a) => a.type === 'Placebo').reduce((n, a) => n + a.ratio, 0)
  const frac = (x: number) => (tot % x === 0 ? `1 in ${tot / x}` : `${x} in ${tot}`)
  return { groups: d.arms.length, pbo: pbo ? frac(pbo) : '', each: d.arms.map((a) => `${a.name} (${frac(a.ratio)})`).join(', ') }
}

export function icfSections(p: Project): DocSection[] {
  const d = p.versions[p.versions.length - 1].data, t = d.title, f = d.facts
  const cond = d.design['Population Diagnosis or Condition'] || 'the condition studied'
  const prod = t['Investigational Product Name(s)'] || 'the study medicine'
  const onSite = d.visits.filter((v) => v.type === 'On site').length, other = d.visits.length - onSite
  const blood = d.procedures.reduce((n, q) => n + (q.bloodMl ?? 0) * (q.visits === 'continuous' ? 0 : q.visits.length), 0)
  const invasive = d.procedures.filter((q) => (q.bloodMl ?? 0) > 0).map((q) => lc(q.name))
  const c = chance(d), prim = d.objectives.find((o) => o.level === 'Primary')
  const ib = p.ib ?? null, rsi = ib?.rsi.map((x) => `${x.term.toLowerCase()} (${x.frequency.toLowerCase()})`) ?? []
  const where = d.design['Site Geographic Scope'] || 'several countries'
  const regulators = [t['NCT Number'] || t['FDA IND Number'] ? 'the US Food and Drug Administration' : '', t['EU CT Number'] ? 'the medicines regulators of the European Union countries' : '', t['CTRI Number'] ? 'the Central Drugs Standard Control Organisation (CDSCO) of India' : ''].filter(Boolean)
  const stop = (d.narrative['7.1'] ?? '').replace(/^The trial intervention is stopped permanently for:?/i, '').trim()
  const s: DocSection[] = [
    { id: 'key', heading: 'Key information', text: `You are invited to take part in a research study. ${t['Short Title'] || t['Full Title']}. Taking part is your choice. The study tests ${prod}, which is not yet approved, in people with ${lc(cond)}. If you join, you will be in the study for about ${f.participationWeeks} weeks and come to ${onSite} visits at the study site${other ? ` with ${other} more by telephone, video or at home` : ''}. The main risks are described in “Risks and discomforts”. You can stop at any time without giving a reason.` },
    { id: 'why', heading: 'Why is this study being done?', text: `${prim ? `The main aim is ${lc(prim.text.replace(/^To /, 'to '))}.` : GAP + ' the main aim of the study]'} ${d.narrative['2.1'] ?? ''}`.trim() },
    { id: 'what', heading: 'What will happen if I take part?', text: `You will be put into one of ${c.groups} groups by chance (like rolling a dice): ${c.each}.${c.pbo ? ` You have a ${c.pbo} chance of receiving placebo. A placebo looks like the study medicine but has no medicine in it and is not expected to have any effect on your condition.` : ''} ${d.design['Trial Blind Schema']?.match(/double/i) ? 'Neither you nor the study team will know which group you are in, but this can be found out quickly in an emergency.' : ''} You will take the study treatment for ${f.treatmentWeeks} weeks${d.interventions[0] ? ` (${d.interventions[0].route.toLowerCase()}, ${d.interventions[0].frequency})` : ''}, then be followed for ${f.followUpWeeks} weeks. At the visits the study team will: ${[...new Set(d.procedures.filter((q) => q.visits !== 'continuous').map((q) => lc(q.name)))].join('; ')}. ${invasive.length ? `Blood samples (${invasive.join('; ')}) add up to about ${blood} mL over the whole study, about ${Math.max(1, Math.round(blood / 15))} tablespoons.` : ''} Some of these procedures are done only because you are in the study.`.replace(/\s+/g, ' ').trim() },
    { id: 'resp', heading: 'What will I be asked to do?', text: `Come to the visits, take the study treatment as instructed, tell the study team about any health problems or new medicines, and do not take part in another study at the same time.${d.narrative['5.4'] ? ' If you could become pregnant or father a child, use effective contraception as the study team explains.' : ''}` },
    { id: 'risks', heading: 'Risks and discomforts', text: `${rsi.length ? `Side effects seen so far with ${prod} include ${rsi.join(', ')}.` : ''} ${d.narrative['2.2.1'] ?? GAP + ' the known risks of the study treatment]'} Blood draws can cause brief pain or bruising. There may be risks that are not known yet. ${d.narrative['5.4'] ? 'The study medicine may harm an unborn baby: if you become pregnant during the study, tell the study doctor straight away.' : ''} The study treatment may not help your condition.`.replace(/\s+/g, ' ').trim() },
    { id: 'benefits', heading: 'Possible benefits', text: `Your ${lc(cond.split(' inadequately')[0])} may or may not improve. What is learned may help others in the future.` },
    { id: 'alternatives', heading: 'What other treatments are there?', text: `You do not have to take part to receive treatment. ${GAP} the treatments available outside the study for ${lc(cond)}]. If you stop the study treatment early, the study doctor will discuss your care and follow-up with you.` },
    { id: 'voluntary', heading: 'Taking part is voluntary', text: `You may stop taking part at any time without giving a reason. ${d.narrative['7.2'] && !/without giving a reason/i.test(d.narrative['7.2']) ? d.narrative['7.2'] : ''} Deciding not to take part or to stop will not affect your care or any benefits you are otherwise entitled to. If you stop, you will be asked to come to a final visit for your safety. The study doctor may stop your treatment without your agreement if it is in your interest${stop ? `, for example for ${lc(stop.replace(/\.$/, ''))}` : ''}, or if the study is stopped.`.replace(/\s+/g, ' ') },
    { id: 'newinfo', heading: 'New information', text: 'You will be told promptly of any new information that might affect your wish to continue, and may be asked to sign an updated form.' },
    { id: 'number', heading: 'How many people will take part?', text: `About ${f.participants} people at ${d.design['Site Distribution']?.toLowerCase().replace(/^about /, 'about ') || 'several sites'} in ${where}.` },
    { id: 'privacy', heading: 'Confidentiality and your data', text: `${d.narrative['11.8'] ?? 'Your records are kept confidential.'} People who check that the study is done correctly may see your medical records: the sponsor’s monitors and auditors, the ethics committee, and ${regulators.join(', ') || 'regulatory authorities'}. Your name will not appear in any report or publication.` },
    { id: 'costs', heading: 'Costs and payments', text: `The study treatment and study procedures are free. ${GAP} travel and other expenses that are paid back, and any payment for taking part, prorated if you leave early]` },
    { id: 'injury', heading: 'If you are harmed', text: `If you are injured as a result of taking part, you will receive medical treatment free of charge. ${GAP} the compensation for study-related injury or death and the insurance that covers it]` },
    { id: 'results', heading: 'Study registration and results', text: [
      t['NCT Number'] ? 'A description of this clinical trial will be available on http://www.ClinicalTrials.gov, as required by U.S. Law. This Web site will not include information that can identify you. At most, the Web site will include a summary of the results. You can search this Web site at any time.' : '',
      t['EU CT Number'] ? `The EU trial number of this study is ${t['EU CT Number']}. A summary of the results, and a summary written for the public, will be available in the EU clinical trials database whatever the results.` : '',
      t['CTRI Number'] ? `This study is registered with the Clinical Trials Registry – India, number ${t['CTRI Number']}.` : '',
    ].filter(Boolean).join(' ') || `${GAP} the registry where the study is described and its results will be posted]` },
    { id: 'contacts', heading: 'Who to contact', text: `For questions about the study or if you think you have been harmed by it: ${SITE} the study doctor’s name and 24-hour telephone number]. For questions about your rights as a participant: ${SITE} the ethics committee’s name and telephone number].` },
    { id: 'consent', heading: 'Consent', text: 'I have read this information (or it has been read to me), had time to ask questions and to discuss it with others, and my questions were answered. I agree to take part. I will receive a signed copy of this form.\n\nParticipant name, signature, date: ____________\nPerson obtaining consent, signature, date: ____________\nImpartial witness (if the participant cannot read), signature, date: ____________' },
  ]
  const o = p.docs?.icf ?? {}
  return s.map((x) => ({ ...x, text: o[x.id] ?? x.text }))
}

export interface IcfElement { id: string; region: 'US' | 'EU' | 'IN'; cite: string; label: string; section: string[]; re: RegExp }
const E = (region: IcfElement['region'], id: string, cite: string, label: string, section: string[], re: RegExp): IcfElement => ({ id: `${region}-${id}`, region, cite, label, section, re })
export const ICF_ELEMENTS: IcfElement[] = [
  E('US', 'a1', '50.25(a)(1)', 'It is research; purpose, duration, procedures, and which are experimental', ['key', 'what'], /research[\s\S]*weeks[\s\S]*only because you are in the study/i),
  E('US', 'a2', '50.25(a)(2)', 'Reasonably foreseeable risks or discomforts', ['risks'], /risk|side effect/i),
  E('US', 'a3', '50.25(a)(3)', 'Benefits to the participant or others', ['benefits'], /benefit|improve|help/i),
  E('US', 'a4', '50.25(a)(4)', 'Appropriate alternative treatments', ['alternatives'], /treatment/i),
  E('US', 'a5', '50.25(a)(5)', 'Confidentiality, and that FDA may inspect the records', ['privacy'], /Food and Drug Administration/),
  E('US', 'a6', '50.25(a)(6)', 'Compensation and medical treatment for injury', ['injury'], /treatment[\s\S]*compensat/i),
  E('US', 'a7', '50.25(a)(7)', 'Whom to contact about the research, rights and injury', ['contacts'], /rights/i),
  E('US', 'a8', '50.25(a)(8)', 'Participation is voluntary; no penalty or loss of benefits for refusing or stopping', ['voluntary'], /benefits/i),
  E('US', 'b1', '50.25(b)(1)', 'Unforeseeable risks, including to an embryo or fetus', ['risks'], /not known yet[\s\S]*(unborn|pregnan)/i),
  E('US', 'b2', '50.25(b)(2)', 'When the investigator may end participation without consent', ['voluntary'], /without your agreement/i),
  E('US', 'b3', '50.25(b)(3)', 'Additional costs to the participant', ['costs'], /free|cost/i),
  E('US', 'b4', '50.25(b)(4)', 'Consequences of withdrawal and orderly withdrawal', ['voluntary'], /final visit/i),
  E('US', 'b5', '50.25(b)(5)', 'Significant new findings will be provided', ['newinfo'], /new information/i),
  E('US', 'b6', '50.25(b)(6)', 'Approximate number of participants', ['number'], /about \d+/i),
  E('US', 'c', '50.25(c)', 'The ClinicalTrials.gov statement, word for word', ['results'], /A description of this clinical trial will be available on http:\/\/www\.ClinicalTrials\.gov, as required by U\.S\. Law\./),
  E('EU', 'a1', 'Art. 29(2)(a)(i)', 'Nature, objectives, benefits, implications, risks and inconveniences', ['why', 'risks', 'benefits'], /aim[\s\S]*risk/i),
  E('EU', 'a2', 'Art. 29(2)(a)(ii)', 'Rights and guarantees: to refuse and to withdraw without detriment and without justification', ['voluntary'], /without giving a reason/i),
  E('EU', 'a3', 'Art. 29(2)(a)(iii)', 'Conditions of the trial, including the expected duration', ['key', 'what'], /\d+ weeks/i),
  E('EU', 'a4', 'Art. 29(2)(a)(iv)', 'Treatment alternatives, including follow-up if participation stops', ['alternatives'], /stop[\s\S]*follow-up/i),
  E('EU', 'd', 'Art. 29(2)(d)', 'The damage compensation system (Article 76(1))', ['injury'], /compensat/i),
  E('EU', 'e', 'Art. 29(2)(e), 29(6)', 'The EU trial number, and that the results summary and lay summary will be in the EU database', ['results'], /EU trial number[\s\S]*summary/i),
  E('IN', '1', 'Table 3', 'It is research; its nature and purpose', ['key', 'why'], /research[\s\S]*aim/i),
  E('IN', '2', 'Table 3', 'Expected duration of participation', ['key'], /\d+ weeks/i),
  E('IN', '3', 'Table 3', 'Procedures, including all invasive procedures', ['what'], /blood/i),
  E('IN', '4', 'Table 3', 'Treatment schedule and the probability of random assignment to each group', ['what'], /by chance[\s\S]*in \d/i),
  E('IN', '5', 'Table 3', 'Foreseeable risks, and unforeseeable risks including to an embryo or fetus', ['risks'], /not known yet/i),
  E('IN', '6', 'Table 3', 'That the product may not have the intended effect, and that placebo has no therapeutic effect', ['risks', 'what'], /may not help[\s\S]*|placebo[\s\S]*no medicine/i),
  E('IN', '7', 'Table 3', 'Benefits, or that none are expected', ['benefits'], /benefit|improve/i),
  E('IN', '8', 'Table 3', 'Alternative treatments available', ['alternatives'], /treatment/i),
  E('IN', '9', 'Table 3', 'Confidentiality, and who may see the records', ['privacy'], /records/i),
  E('IN', '10', 'Table 3', 'Compensation and treatment for trial-related injury, disability or death', ['injury'], /compensat[\s\S]*death|death[\s\S]*compensat/i),
  E('IN', '11', 'Table 3', 'Anticipated prorated payment and additional costs', ['costs'], /prorated/i),
  E('IN', '12', 'Table 3', 'Participant responsibilities', ['resp'], /take the study treatment/i),
  E('IN', '13', 'Table 3', 'Voluntary; may withdraw at any time without penalty; consequences of withdrawal', ['voluntary'], /any time[\s\S]*final visit/i),
  E('IN', '14', 'Table 3', 'When the investigator may remove the participant without consent', ['voluntary'], /without your agreement/i),
  E('IN', '15', 'Table 3', 'Timely notice of significant new findings', ['newinfo'], /new information/i),
  E('IN', '16', 'Table 3', 'Approximate number of participants', ['number'], /about \d+/i),
  E('IN', '17', 'Table 3', 'Contacts for trial questions, rights and injury', ['contacts'], /rights/i),
]

export function icfRegions(d: ProtocolData): IcfElement['region'][] {
  const scope = d.design['Site Geographic Scope'] ?? '', t = d.title
  const r: IcfElement['region'][] = []
  if (t['NCT Number'] || t['FDA IND Number'] || /United States|USA/i.test(scope)) r.push('US')
  if (t['EU CT Number'] || /Germany|France|Spain|Italy|Poland|Netherlands|Belgium|Ireland|EU\b|European/i.test(scope)) r.push('EU')
  if (t['CTRI Number'] || /India/i.test(scope)) r.push('IN')
  return r
}
export interface IcfCheck { el: IcfElement; ok: boolean; why: string }
export function icfChecks(p: Project): IcfCheck[] {
  const secs = icfSections(p), by = (id: string) => secs.find((s) => s.id === id)?.text ?? ''
  return ICF_ELEMENTS.map((el) => {
    const text = el.section.map(by).join('\n')
    if (text.includes(GAP)) return { el, ok: false, why: `Section “${secs.find((s) => el.section.includes(s.id) && s.text.includes(GAP))!.heading}” still has text to write.` }
    return el.re.test(text) ? { el, ok: true, why: '' } : { el, ok: false, why: `Not found in “${el.section.map((x) => secs.find((s) => s.id === x)?.heading).join('” or “')}”.` }
  })
}

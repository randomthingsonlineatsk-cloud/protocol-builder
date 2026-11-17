// SHARED MODULE: the same file is in the Plain Language Lab (src/shared/consent.ts) and the
// Protocol Builder (src/shared/consent.ts); a test in each repo fails if the two copies differ.
// Change it in one, copy it to the other.
//
// The participant information sheet and consent form, drafted from a study's facts and checked
// against the required elements of:
//  - ICH E6(R3) section 2.8 (the information given to participants, for every region);
//  - US: 21 CFR 50.25(a) basic elements, (b) additional elements and (c) the ClinicalTrials.gov
//    statement; key information first, as FDA's 2022 proposed rule and 2024 draft guidance ask
//    (already required for federally funded research under 45 CFR 46.116(a)(5));
//  - EU: Regulation (EU) No 536/2014, Article 29(2) and (6), and Article 32 for minors;
//  - India: New Drugs and Clinical Trials Rules, 2019, Third Schedule, Table 3; audio-video
//    recording of consent for vulnerable participants in trials of new chemical entities (audio
//    only for anti-HIV and anti-leprosy drugs); an impartial witness for illiterate participants.
// Text the facts cannot give (alternatives, payments, injury compensation) is left as a marked
// gap; site details are left for the site. No AI: everything here is rules.

export const GAP = '[To be written:'
export const SITE = '[Site to complete:'
export interface DocSection { id: string; heading: string; text: string }

/** What a consent form needs to know about a study. The Protocol Builder fills it from the protocol. */
export interface StudyFacts {
  id: string; acronym: string; shortTitle: string; fullTitle: string; protocolId: string; version: string
  sponsor: string; product: string; condition: string; phase: string
  registry: { nct?: string; euct?: string; ctri?: string; ind?: string }
  countries: string[]; sites: string
  ageMin: number; ageMax: number; participants: number
  treatmentWeeks: number; followUpWeeks: number; participationWeeks: number
  arms: { name: string; placebo: boolean; ratio: number }[]
  blinded: boolean; dosing: string
  visits: { name: string; onSite: boolean }[]
  procedures: { name: string; visits: number; bloodMl: number }[]
  aim: string; background: string
  risks: string; knownReactions: string[]; reproductiveRisk: boolean
  stopRules: string; withdrawal: string; privacy: string
  newChemicalEntity: boolean; hivOrLeprosy: boolean
}

const lc = (s: string) => (/^[A-Z][a-z]*\b(?![-\d])/.test(s) && !/^[A-Z][a-z]*[A-Z0-9]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const sp = (s: string) => s.replace(/\s+/g, ' ').trim()
function chance(f: StudyFacts) {
  const tot = f.arms.reduce((n, a) => n + a.ratio, 0) || 1
  const pbo = f.arms.filter((a) => a.placebo).reduce((n, a) => n + a.ratio, 0)
  const frac = (x: number) => (tot % x === 0 ? `1 in ${tot / x}` : `${x} in ${tot}`)
  return { groups: f.arms.length, pbo: pbo ? frac(pbo) : '', each: f.arms.map((a) => `${a.name} (${frac(a.ratio)})`).join(', ') }
}
const blood = (f: StudyFacts) => f.procedures.reduce((n, q) => n + q.bloodMl * q.visits, 0)
export const regulatorsOf = (f: StudyFacts) => [f.registry.nct || f.registry.ind ? 'the US Food and Drug Administration' : '', f.registry.euct ? 'the medicines regulators of the European Union countries' : '', f.registry.ctri ? 'the Central Drugs Standard Control Organisation (CDSCO) of India' : ''].filter(Boolean)

/** The adult participant information sheet and consent form, key information first. */
export function consentSections(f: StudyFacts, edits: Record<string, string> = {}): DocSection[] {
  const onSite = f.visits.filter((v) => v.onSite).length, other = f.visits.length - onSite
  const invasive = f.procedures.filter((q) => q.bloodMl > 0).map((q) => lc(q.name)), ml = blood(f)
  const c = chance(f), cond = f.condition || 'the condition studied', prod = f.product || 'the study medicine'
  const rsi = f.knownReactions
  const stop = f.stopRules.replace(/^The trial intervention is stopped permanently for:?/i, '').trim()
  const regs = regulatorsOf(f)
  const s: DocSection[] = [
    { id: 'key', heading: 'Key information', text: sp(`You are invited to take part in a research study. ${f.shortTitle || f.fullTitle}. Taking part is your choice. The study tests ${prod}, which is not yet approved, in people with ${lc(cond)}. If you join, you will be in the study for about ${f.participationWeeks} weeks and come to ${onSite} visits at the study site${other ? ` with ${other} more by telephone, video or at home` : ''}. ${rsi.length ? `The most common side effects seen so far are ${rsi.slice(0, 2).map((x) => x.replace(/ \(.*\)$/, '')).join(' and ')}.` : ''} The main risks are described in “Risks and discomforts”. You may not benefit, and there are other treatments. You can stop at any time without giving a reason.`) },
    { id: 'why', heading: 'Why is this study being done?', text: sp(`${f.aim ? `The main aim is ${lc(f.aim.replace(/^To /, 'to ')).replace(/\.$/, '')}.` : GAP + ' the main aim of the study]'} ${f.background}`) },
    { id: 'what', heading: 'What will happen if I take part?', text: sp(`You will be put into one of ${c.groups} groups by chance (like rolling a dice): ${c.each}.${c.pbo ? ` You have a ${c.pbo} chance of receiving placebo. A placebo looks like the study medicine but has no medicine in it and is not expected to have any effect on your condition.` : ''} ${f.blinded ? 'Neither you nor the study team will know which group you are in, but this can be found out quickly in an emergency.' : ''} You will take the study treatment for ${f.treatmentWeeks} weeks${f.dosing ? ` (${f.dosing})` : ''}, then be followed for ${f.followUpWeeks} weeks. At the visits the study team will: ${[...new Set(f.procedures.map((q) => lc(q.name)))].join('; ')}. ${invasive.length ? `Blood samples (${invasive.join('; ')}) add up to about ${ml} mL over the whole study, about ${Math.max(1, Math.round(ml / 15))} tablespoons.` : ''} Some of these procedures are done only because you are in the study.`) },
    { id: 'resp', heading: 'What will I be asked to do?', text: `Come to the visits, take the study treatment as instructed, tell the study team about any health problems or new medicines, and do not take part in another study at the same time.${f.reproductiveRisk ? ' If you could become pregnant or father a child, use effective contraception as the study team explains.' : ''}` },
    { id: 'risks', heading: 'Risks and discomforts', text: sp(`${rsi.length ? `Side effects seen so far with ${prod} include ${rsi.join(', ')}.` : ''} ${f.risks || GAP + ' the known risks of the study treatment]'} Blood draws can cause brief pain or bruising. There may be risks that are not known yet. ${f.reproductiveRisk ? 'The study medicine may harm an unborn baby: if you become pregnant during the study, tell the study doctor straight away.' : ''} The study treatment may not help your condition.`) },
    { id: 'benefits', heading: 'Possible benefits', text: `Your ${lc(cond.split(' inadequately')[0])} may or may not improve. What is learned may help others in the future.` },
    { id: 'alternatives', heading: 'What other treatments are there?', text: `You do not have to take part to receive treatment. ${GAP} the treatments available outside the study for ${lc(cond)}]. If you stop the study treatment early, the study doctor will discuss your care and follow-up with you.` },
    { id: 'voluntary', heading: 'Taking part is voluntary', text: sp(`You may stop taking part at any time without giving a reason. ${f.withdrawal && !/without giving a reason/i.test(f.withdrawal) ? f.withdrawal : ''} Deciding not to take part or to stop will not affect your care or any benefits you are otherwise entitled to. If you stop, you will be asked to come to a final visit for your safety. The study doctor may stop your treatment without your agreement if it is in your interest${stop ? `, for example for ${lc(stop.replace(/\.$/, ''))}` : ''}, or if the study is stopped.`) },
    { id: 'newinfo', heading: 'New information', text: 'You will be told promptly of any new information that might affect your wish to continue, and may be asked to sign an updated form.' },
    { id: 'number', heading: 'How many people will take part?', text: `About ${f.participants} people at ${f.sites ? lc(f.sites) : 'several sites'} in ${f.countries.join(', ').replace(/, ([^,]*)$/, ' and $1') || 'several countries'}.` },
    { id: 'privacy', heading: 'Confidentiality and your data', text: `${f.privacy || 'Your records are kept confidential.'} People who check that the study is done correctly may see your medical records: the sponsor’s monitors and auditors, the ethics committee, and ${regs.join(', ') || 'regulatory authorities'}. Your name will not appear in any report or publication.` },
    { id: 'costs', heading: 'Costs and payments', text: `The study treatment and study procedures are free. ${GAP} travel and other expenses that are paid back, and any payment for taking part, prorated if you leave early]` },
    { id: 'injury', heading: 'If you are harmed', text: `If you are injured as a result of taking part, you will receive medical treatment free of charge. ${GAP} the compensation for study-related injury or death and the insurance that covers it]` },
    { id: 'results', heading: 'Study registration and results', text: [
      f.registry.nct ? 'A description of this clinical trial will be available on http://www.ClinicalTrials.gov, as required by U.S. Law. This Web site will not include information that can identify you. At most, the Web site will include a summary of the results. You can search this Web site at any time.' : '',
      f.registry.euct ? `The EU trial number of this study is ${f.registry.euct}. A summary of the results, and a summary written for the public, will be available in the EU clinical trials database whatever the results.` : '',
      f.registry.ctri ? `This study is registered with the Clinical Trials Registry – India, number ${f.registry.ctri}.` : '',
    ].filter(Boolean).join(' ') || `${GAP} the registry where the study is described and its results will be posted]` },
    { id: 'contacts', heading: 'Who to contact', text: `For questions about the study or if you think you have been harmed by it: ${SITE} the study doctor’s name and 24-hour telephone number]. For questions about your rights as a participant: ${SITE} the ethics committee’s name and telephone number].` },
    { id: 'consent', heading: 'Consent', text: 'I have read this information (or it has been read to me), had time to ask questions and to discuss it with others, and my questions were answered. I agree to take part. I will receive a signed copy of this form.\n\nParticipant name, signature, date: ____________\nPerson obtaining consent, signature, date: ____________\nImpartial witness (if the participant cannot read), signature, date: ____________' },
  ]
  return s.map((x) => ({ ...x, text: edits[x.id] ?? x.text }))
}

/** The consent form for a legally acceptable representative of an adult who cannot consent. */
export function representativeSections(f: StudyFacts, edits: Record<string, string> = {}): DocSection[] {
  const base = consentSections(f)
  const intro: DocSection = { id: 'lar', heading: 'About this form', text: 'You are being asked to decide whether the person you represent should take part in this study, because they cannot decide for themselves at the moment. In this form, “you” means that person. Please decide as you believe they would want. If they become able to decide, they will be asked for their own consent and may stop at any time.' }
  const sig: DocSection = { id: 'consent', heading: 'Consent', text: 'I have read this information (or it has been read to me), had time to ask questions, and my questions were answered. I agree that the person I represent may take part. I will receive a signed copy of this form.\n\nName of the participant: ____________\nRepresentative name, relationship, signature, date: ____________\nPerson obtaining consent, signature, date: ____________\nImpartial witness (if the representative cannot read), signature, date: ____________' }
  return [intro, ...base.filter((s) => s.id !== 'consent'), sig].map((x) => ({ ...x, text: edits[x.id] ?? x.text }))
}

export type AssentBand = '7-11' | '12-17'
/** Assent for children: an oral script for younger children and a written form for adolescents. */
export function assentSections(f: StudyFacts, band: AssentBand, edits: Record<string, string> = {}): DocSection[] {
  const c = chance(f), ml = blood(f)
  const young = band === '7-11'
  const s: DocSection[] = young ? [
    { id: 'what', heading: 'What is this study?', text: `We are doctors. We want to find out if a new medicine helps children with ${lc(f.condition.split(' inadequately')[0])}. We are asking if you want to help.` },
    { id: 'do', heading: 'What will happen?', text: sp(`You will come to see us ${f.visits.filter((v) => v.onSite).length} times. You will take a medicine every day. ${c.pbo ? 'Some children get a pretend medicine with nothing in it. No one picks which one: it is decided by chance.' : ''} ${ml ? 'We will take a little blood from your arm. It may hurt for a moment.' : ''}`) },
    { id: 'feel', heading: 'Could it make me feel bad?', text: 'The medicine might make you feel unwell. Tell your mum, dad or the doctor if you feel bad. We will look after you.' },
    { id: 'no', heading: 'Do I have to?', text: 'No. You can say no, and no one will be cross with you. You can say yes now and change your mind later. Your doctor will still look after you.' },
    { id: 'ask', heading: 'Questions', text: 'You can ask us anything, at any time.' },
    { id: 'sign', heading: 'Your answer', text: 'The child said yes / no (circle one).\n\nPerson who explained the study, signature, date: ____________\nParent or guardian present, signature, date: ____________' },
  ] : [
    { id: 'what', heading: 'What is this study about?', text: `This is a research study of ${f.product}, a medicine that is not yet approved, in young people with ${lc(f.condition.split(' inadequately')[0])}. We want to find out if it works and if it is safe. Your parent or guardian will also be asked.` },
    { id: 'do', heading: 'What would I have to do?', text: sp(`You would be in the study for about ${f.participationWeeks} weeks and come to ${f.visits.filter((v) => v.onSite).length} visits. You would take the study medicine ${f.dosing || 'as the doctor explains'}. ${c.pbo ? `You have a ${c.pbo} chance of getting a placebo, which looks the same but has no medicine in it. A computer decides by chance.` : ''} ${ml ? `We would take about ${ml} mL of blood in total over the study.` : ''}`) },
    { id: 'risks', heading: 'Could anything bad happen?', text: sp(`The medicine may cause side effects${f.knownReactions.length ? `, such as ${f.knownReactions.slice(0, 2).map((x) => x.replace(/ \(.*\)$/, '')).join(' and ')}` : ''}. There may be side effects no one knows about yet. Blood tests can hurt for a moment or leave a bruise. ${f.reproductiveRisk ? 'The medicine could harm an unborn baby, so the doctor will talk to you about pregnancy and contraception in private.' : ''}`) },
    { id: 'good', heading: 'Could it help me?', text: 'It might help your skin or it might not. What we learn may help other young people.' },
    { id: 'no', heading: 'Do I have to take part?', text: 'No. It is your choice. You can say no even if your parent says yes. You can stop at any time without giving a reason, and your doctor will still look after you.' },
    { id: 'private', heading: 'Who will know?', text: 'Your study records are kept private. Your name will not be in any report.' },
    { id: 'ask', heading: 'Questions', text: `You can ask the study doctor anything. ${SITE} the study doctor’s name and telephone number].` },
    { id: 'sign', heading: 'Your decision', text: 'I have read this or had it read to me, and my questions were answered. I want to take part.\n\nYour name, signature, date: ____________\nPerson who explained the study, signature, date: ____________' },
  ]
  return s.map((x) => ({ ...x, text: edits[x.id] ?? x.text }))
}

// ---------- reading a Protocol Builder project ----------
/** The parts of a Protocol Builder project that the consent form uses (structural, so the Plain
 *  Language Lab can read a Protocol Builder project file without that app's code). */
export interface ProtocolProjectLike {
  id: string
  ib?: { rsi: { term: string; frequency: string }[] }
  versions: { data: {
    title: Record<string, string | undefined>; design: Record<string, string | undefined>; narrative: Record<string, string | undefined>
    facts: { ageMin: number; ageMax: number; participants: number; treatmentWeeks: number; followUpWeeks: number; participationWeeks: number }
    arms: { name: string; type: string; ratio: number }[]
    interventions: { route: string; frequency: string }[]
    visits: { name: string; type: string }[]
    procedures: { name: string; visits: string[] | 'continuous'; bloodMl?: number }[]
    objectives: { level: string; text: string }[]
  } }[]
}
/** The study facts, read from a version of a Protocol Builder project (its project file holds the same). */
export function studyFacts(p: ProtocolProjectLike, version = p.versions.length - 1): StudyFacts {
  const d = p.versions[version].data, t = d.title, f = d.facts
  const iv = d.interventions[0]
  return {
    id: t['Sponsor Protocol Identifier'] ?? p.id, acronym: t['Trial Acronym'] ?? '', shortTitle: t['Short Title'] ?? '', fullTitle: t['Full Title'] ?? '', protocolId: t['Sponsor Protocol Identifier'] ?? '', version: t['Version Number'] ?? '',
    sponsor: t['Sponsor Name and Address'] ?? '', product: t['Investigational Product Name(s)'] ?? '', condition: d.design['Population Diagnosis or Condition'] ?? '', phase: t['Trial Phase'] ?? '',
    registry: { nct: t['NCT Number'] || undefined, euct: t['EU CT Number'] || undefined, ctri: t['CTRI Number'] || undefined, ind: t['FDA IND Number'] || undefined },
    countries: (d.design['Site Geographic Scope'] ?? '').split(/,| and /).map((x) => x.trim()).filter(Boolean), sites: d.design['Site Distribution'] ?? '',
    ageMin: f.ageMin, ageMax: f.ageMax, participants: f.participants, treatmentWeeks: f.treatmentWeeks, followUpWeeks: f.followUpWeeks, participationWeeks: f.participationWeeks,
    arms: d.arms.map((a) => ({ name: a.name, placebo: a.type === 'Placebo', ratio: a.ratio })), blinded: /double/i.test(d.design['Trial Blind Schema'] ?? ''),
    dosing: iv ? `${/^oral/i.test(iv.route) ? 'by mouth' : iv.route.toLowerCase()}, ${iv.frequency}` : '',
    visits: d.visits.map((v) => ({ name: v.name, onSite: v.type === 'On site' })),
    procedures: d.procedures.filter((q) => q.visits !== 'continuous').map((q) => ({ name: q.name, visits: (q.visits as string[]).length, bloodMl: q.bloodMl ?? 0 })),
    aim: d.objectives.find((o) => o.level === 'Primary')?.text ?? '', background: d.narrative['2.1'] ?? '',
    risks: d.narrative['2.2.1'] ?? '', knownReactions: p.ib?.rsi.map((x) => `${x.term.toLowerCase()} (${x.frequency.toLowerCase()})`) ?? [], reproductiveRisk: !!d.narrative['5.4'],
    stopRules: d.narrative['7.1'] ?? '', withdrawal: d.narrative['7.2'] ?? '', privacy: d.narrative['11.8'] ?? '',
    newChemicalEntity: true, hivOrLeprosy: /HIV|lepros/i.test(d.design['Population Diagnosis or Condition'] ?? ''),
  }
}


// ---------- required elements ----------
export type Region = 'GCP' | 'US' | 'EU' | 'IN' | 'KEY'
export interface ConsentElement { id: string; region: Region; cite: string; label: string; section: string[]; re: RegExp }
const E = (region: Region, id: string, cite: string, label: string, section: string[], re: RegExp): ConsentElement => ({ id: `${region}-${id}`, region, cite, label, section, re })
export const CONSENT_ELEMENTS: ConsentElement[] = [
  E('GCP', '1', 'E6(R3) 2.8', 'The trial involves research, and its purpose', ['key', 'why'], /research[\s\S]*aim/i),
  E('GCP', '2', 'E6(R3) 2.8', 'The trial treatments and the probability of random assignment to each', ['what'], /by chance[\s\S]*in \d/i),
  E('GCP', '3', 'E6(R3) 2.8', 'The procedures, including invasive ones', ['what'], /study team will[\s\S]*blood/i),
  E('GCP', '4', 'E6(R3) 2.8', 'The participant’s responsibilities', ['resp'], /take the study treatment/i),
  E('GCP', '5', 'E6(R3) 2.8', 'Aspects that are experimental', ['key', 'what'], /not yet approved|only because you are in the study/i),
  E('GCP', '6', 'E6(R3) 2.8', 'Reasonably foreseeable risks or inconveniences, including to an embryo, fetus or nursing infant when relevant', ['risks'], /risk[\s\S]*(not known yet)/i),
  E('GCP', '7', 'E6(R3) 2.8', 'Reasonably expected benefits, or that none are intended', ['benefits'], /benefit|improve|may or may not/i),
  E('GCP', '8', 'E6(R3) 2.8', 'Alternative treatments and their benefits and risks', ['alternatives'], /treatment/i),
  E('GCP', '9', 'E6(R3) 2.8', 'Compensation or treatment available for trial-related injury', ['injury'], /treatment[\s\S]*compensat/i),
  E('GCP', '10', 'E6(R3) 2.8', 'Anticipated payment, prorated, and expenses', ['costs'], /prorated|paid back|expenses/i),
  E('GCP', '11', 'E6(R3) 2.8', 'Participation is voluntary; refusal or withdrawal without penalty', ['voluntary'], /any time[\s\S]*not affect/i),
  E('GCP', '12', 'E6(R3) 2.8', 'Monitors, auditors, the ethics committee and regulators may see the records', ['privacy'], /monitors[\s\S]*ethics committee/i),
  E('GCP', '13', 'E6(R3) 2.8', 'Records that identify the participant are kept confidential', ['privacy'], /confidential|name will not/i),
  E('GCP', '14', 'E6(R3) 2.8', 'New information that may affect willingness to continue is given promptly', ['newinfo'], /new information/i),
  E('GCP', '15', 'E6(R3) 2.8', 'Whom to contact for information, rights and trial-related injury', ['contacts'], /rights/i),
  E('GCP', '16', 'E6(R3) 2.8', 'When participation may end without consent', ['voluntary'], /without your agreement/i),
  E('GCP', '17', 'E6(R3) 2.8', 'Expected duration of participation', ['key', 'what'], /\d+ weeks/i),
  E('GCP', '18', 'E6(R3) 2.8', 'Approximate number of participants', ['number'], /about \d+/i),
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
  E('KEY', '1', 'Key information', 'Comes first in the form', ['key'], /[\s\S]/),
  E('KEY', '2', 'Key information', 'Says it is research and that taking part is voluntary', ['key'], /research[\s\S]*(choice|voluntary)|(choice|voluntary)[\s\S]*research/i),
  E('KEY', '3', 'Key information', 'Gives the duration and what taking part involves', ['key'], /\d+ weeks[\s\S]*visits|visits[\s\S]*\d+ weeks/i),
  E('KEY', '4', 'Key information', 'Names the main risks, the chance of no benefit and that there are alternatives', ['key'], /(risk|side effect)[\s\S]*(benefit)[\s\S]*(other treatments|alternative)/i),
]
export const REGION_NAMES: Record<Region, string> = { GCP: 'ICH E6(R3) 2.8 (all regions)', US: 'US: 21 CFR 50.25', EU: 'EU: CTR Article 29', IN: 'India: NDCT Rules, Third Schedule Table 3', KEY: 'Key information (US proposed rule; good practice everywhere)' }

export interface ElementCheck { el: ConsentElement; ok: boolean; why: string }
/** Each element is looked for in its sections; a section that still holds a gap to write fails. */
export function checkElements(secs: DocSection[], regions: Region[] = ['GCP', 'US', 'EU', 'IN', 'KEY']): ElementCheck[] {
  const by = (id: string) => secs.find((s) => s.id === id)?.text ?? ''
  const head = (id: string) => secs.find((s) => s.id === id)?.heading ?? id
  return CONSENT_ELEMENTS.filter((e) => regions.includes(e.region)).map((el) => {
    if (el.id === 'KEY-1') { const i = secs.findIndex((s) => s.id === 'key'); const first = secs.filter((s) => s.id !== 'lar').findIndex((s) => s.id === 'key'); return i < 0 ? { el, ok: false, why: 'There is no key information section.' } : first === 0 ? { el, ok: true, why: '' } : { el, ok: false, why: 'The key information is not the first section.' } }
    const present = el.section.filter((x) => secs.some((s) => s.id === x))
    if (!present.length) return { el, ok: false, why: `The section “${el.section.map(head).join('” or “')}” is missing.` }
    const text = present.map(by).join('\n')
    if (text.includes(GAP)) return { el, ok: false, why: `“${head(present.find((x) => by(x).includes(GAP))!)}” still has text to write.` }
    return el.re.test(text) ? { el, ok: true, why: '' } : { el, ok: false, why: `Not found in “${present.map(head).join('” or “')}”.` }
  })
}

/** The regions whose rules apply, from the registry numbers and countries. */
export function regionsOf(f: StudyFacts): Region[] {
  const r: Region[] = ['GCP', 'KEY']
  const EU = /Austria|Belgium|Bulgaria|Croatia|Cyprus|Czechia|Denmark|Estonia|Finland|France|Germany|Greece|Hungary|Ireland|Italy|Latvia|Lithuania|Luxembourg|Malta|Netherlands|Poland|Portugal|Romania|Slovakia|Slovenia|Spain|Sweden/
  if (f.registry.nct || f.registry.ind || f.countries.some((c) => /United States|USA/.test(c))) r.push('US')
  if (f.registry.euct || f.countries.some((c) => EU.test(c))) r.push('EU')
  if (f.registry.ctri || f.countries.includes('India')) r.push('IN')
  return r
}

// ---------- India: audio-video recording of consent ----------
export interface RecordingCase { newChemicalEntity: boolean; hivOrLeprosy: boolean; vulnerable: boolean }
export type Recording = 'audio-video' | 'audio' | 'not required'
/** NDCT Rules 2019: the consent process of vulnerable participants in trials of a new chemical or
 *  molecular entity is recorded on audio and video; for anti-HIV and anti-leprosy drugs, audio only.
 *  The recording is kept in the investigator's files. */
export function indiaRecording(c: RecordingCase): { need: Recording; why: string } {
  if (!c.newChemicalEntity) return { need: 'not required', why: 'The trial is not of a new chemical or molecular entity, so the recording rule does not apply (consent is still written, with an impartial witness when needed).' }
  if (!c.vulnerable) return { need: 'not required', why: 'The participants are not vulnerable, so the recording rule does not apply.' }
  if (c.hivOrLeprosy) return { need: 'audio', why: 'Vulnerable participants in a trial of an anti-HIV or anti-leprosy drug: an audio recording of the consent process only.' }
  return { need: 'audio-video', why: 'Vulnerable participants in a trial of a new chemical or molecular entity: the consent process is recorded on audio and video, and the recording kept in the investigator’s files.' }
}

// ---------- re-consent after an amendment ----------
// New information that may affect a participant's willingness to continue must be given promptly
// and consent documented again (ICH E6(R3) section 2.8; 21 CFR 50.25(b)(5)); the revised form needs
// ethics committee approval first (in the EU, a substantial modification of Part II).
const DECISIVE = new Set(['key', 'what', 'resp', 'risks', 'benefits', 'alternatives', 'voluntary', 'costs', 'injury', 'privacy'])
export interface ConsentChange { id: string; heading: string; before: string; after: string; decisive: boolean }
export interface Reconsent { needed: 'Re-consent' | 'Inform' | 'None'; reason: string; changes: ConsentChange[]; steps: string[] }
export function reconsentDecision(a: DocSection[], b: DocSection[], safetyRights = false): Reconsent {
  const changes: ConsentChange[] = b.map((s) => ({ s, o: a.find((x) => x.id === s.id) })).filter(({ s, o }) => (o?.text ?? '') !== s.text).map(({ s, o }) => ({ id: s.id, heading: s.heading, before: o?.text ?? '', after: s.text, decisive: DECISIVE.has(s.id) }))
  const decisive = changes.filter((c) => c.decisive)
  const needed: Reconsent['needed'] = decisive.length || safetyRights ? 'Re-consent' : changes.length ? 'Inform' : 'None'
  const reason = needed === 'Re-consent'
    ? `${decisive.length ? `What participants are told changes in: ${decisive.map((c) => c.heading.toLowerCase()).join('; ')}.` : ''}${safetyRights ? ' The amendment is marked as affecting participants’ safety or rights.' : ''} This is information that may affect their willingness to continue.`.trim()
    : needed === 'Inform' ? `Only ${changes.map((c) => c.heading.toLowerCase()).join(', ')} change${changes.length === 1 ? 's' : ''}: tell participants at their next visit; a new signature is not needed.` : 'The consent form does not change.'
  const steps = needed === 'Re-consent' ? [
    'Revise the consent form (new version number and date) and mark the changes for the ethics committee.',
    'Get ethics committee approval before using it (EU: part of the Part II substantial modification; US: IRB approval; India: ethics committee approval, with CDSCO where the amendment needs it).',
    'Tell participants in treatment or follow-up promptly, at or before their next visit; they read and sign the new version, and the conversation is recorded in their notes.',
    'Participants who have finished the trial are told only if the new information affects their health.',
    'New participants sign only the new version from the date it is approved at their site.',
  ] : needed === 'Inform' ? ['Tell participants at their next visit and record it in their notes.', 'Use the revised form for new participants once approved.'] : []
  return { needed, reason, changes, steps }
}

// ---------- word-level differences, for tracked changes ----------
export type Seg = { t: '=' | '-' | '+'; s: string }
export function wordDiff(a: string, b: string): Seg[] {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/)
  if (A.length * B.length > 400000) return [{ t: '-', s: a }, { t: '+', s: b }]
  const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1))
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out: Seg[] = [], push = (t: Seg['t'], s: string) => { const l = out[out.length - 1]; if (l && l.t === t) l.s += s; else out.push({ t, s }) }
  let i = 0, j = 0
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { push('=', A[i]); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]); else push('+', B[j++]) }
  while (i < A.length) push('-', A[i++]); while (j < B.length) push('+', B[j++])
  return out
}

import { useStore } from '../state'
import { useNav } from '../App'
import { current, status } from '../domain/project'
import { REQUIRED_TEXT, GROUPS, RULES } from '../domain/rules'
import { burden } from '../domain/missions'
import { complexity } from '../domain/complexity'
import { checkUsdm, usdmOf } from '../domain/usdm'
import { Panel, Stat, Table, Btn } from './ui'

export default function Overview() {
  const { p } = useStore(), { go } = useNav()
  const d = current(p!), st = status(p!)
  const written = REQUIRED_TEXT.filter((n) => (d.narrative[n] ?? '').trim()).length
  const b = burden(d), usdm = checkUsdm(usdmOf(d))
  const byGroup = GROUPS.map((g) => [g, st.open.filter((f) => RULES.find((r) => r.id === f.rule)!.group === g).length] as const)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="High findings" value={st.high} tone={st.high ? 'red' : 'green'} />
        <Stat label="Medium" value={st.medium} tone={st.medium ? 'amber' : 'green'} />
        <Stat label="Low" value={st.low} />
        <Stat label="Required sections written" value={`${written}/${REQUIRED_TEXT.length}`} tone={written === REQUIRED_TEXT.length ? 'green' : 'amber'} />
        <Stat label="USDM errors" value={usdm.filter((i) => i.level === 'error').length} tone={usdm.some((i) => i.level === 'error') ? 'red' : 'green'} />
        <Stat label="Complexity score" value={`${complexity(d).score} (${complexity(d).band.toLowerCase()})`} tone={complexity(d).band === 'High' ? 'red' : complexity(d).band === 'Moderate' ? 'amber' : 'green'} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Open findings by group" right={<Btn tone="grey" onClick={() => go('checks')}>Open the checks</Btn>}>
          <Table head={['Group', 'Open']} rows={byGroup.map(([g, n]) => [g, n])} />
        </Panel>
        <Panel title="The protocol at a glance">
          <Table head={['', '']} rows={[
            ['Title', d.title['Full Title'] || '—'], ['Phase', d.title['Trial Phase'] || '—'], ['Design', [d.design['Intervention Model'], d.design['Trial Blind Schema'], d.design['Control Type']].filter(Boolean).join(', ') || '—'],
            ['Arms', d.arms.map((a) => a.name).join(', ') || '—'], ['Participants', d.facts.participants ? `${d.facts.participants} (${d.facts.perArm} per arm)` : '—'],
            ['Treatment', d.facts.treatmentWeeks ? `${d.facts.treatmentWeeks} weeks, then ${d.facts.followUpWeeks} weeks of follow-up` : '—'],
            ['Objectives', `${d.objectives.length} (${d.estimands.length} estimands)`], ['Schedule', `${d.visits.length} visits, ${d.procedures.length} procedures, ${b.blood} mL of blood per participant`],
          ]} />
        </Panel>
      </div>
      <Panel title="How to work" sub="Write section by section; the checks run as you type.">
        <ol className="list-decimal pl-5 text-sm space-y-1">
          <li><b>Sections</b>: the full M11 table of contents. Structured sections (title page, overall design, criteria, interventions, analysis sets, sample size) have forms; the rest is text, with the template guidance beside it.</li>
          <li><b>Objectives and estimands</b>: each objective with its endpoints; each estimand with the five ICH E9(R1) attributes.</li>
          <li><b>Schedule of activities</b>: visits with windows, procedures by visit, and what each procedure is for, with the complexity and burden score and its amendment-risk flags.</li>
          <li><b>Feasibility</b>: the criteria run against a synthetic population: the screening funnel and the months to full recruitment.</li>
          <li><b>Consistency checks</b>: 40 rules across the synopsis and body. Fix a finding at its source, or justify it.</li>
          <li><b>Cross-walks</b>: the protocol against SPIRIT 2025, EU CTR Annex I, India’s NDCT Table 2 and 21 CFR 312.23(a)(6), with the gaps for each.</li>
          <li><b>Versions and amendments</b>: author, reviewer and approver sign-off; amendments with tracked changes, each change classified for the US, the EU and India, and the downstream documents to update.</li>
          <li><b>Review</b>: reviewer comments, readiness and a plain-language check.</li>
          <li><b>Documents</b>: the consent form (checked for the US, EU and India), a SAP outline, registry entries, a site budget and an RTSM specification, drafted from the protocol.</li>
          <li><b>Export</b>: USDM v4 (full, and the teaching subset for the EDC Study Build Lab), the readable protocol as PDF or Word, the SDTM trial design datasets, the application bundle for the Clinical Trial Simulator, the project file and the hand-off for the pharmolecule journey.</li>
        </ol>
      </Panel>
    </div>
  )
}

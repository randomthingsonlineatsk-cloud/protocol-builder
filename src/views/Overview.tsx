import { useStore } from '../state'
import { useNav } from '../App'
import { current, status } from '../domain/project'
import { REQUIRED_TEXT, GROUPS, RULES } from '../domain/rules'
import { burden } from '../domain/missions'
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
        <Stat label="Time on site per participant" value={`${Math.round(b.minutes / 60 * 10) / 10} h`} />
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
          <li><b>Schedule of activities</b>: visits with windows, procedures by visit, and what each procedure is for.</li>
          <li><b>Consistency checks</b>: 40 rules across the synopsis and body. Fix a finding at its source, or justify it.</li>
          <li><b>Export</b>: USDM v4 (full, and the teaching subset for the EDC Study Build Lab), the readable protocol as PDF, the project file and the hand-off for the pharmolecule journey.</li>
        </ol>
      </Panel>
    </div>
  )
}

// Feasibility: the eligibility criteria run against a synthetic population, with the screening
// funnel and the recruitment time for the planned sites.
import { useStore } from '../state'
import { current } from '../domain/project'
import { feasibility, FEAS_DEFAULTS, type FeasKey } from '../domain/feasibility'
import { enrolment } from '../domain/enrolment'
import { Panel, Pill, Stat, inputCls } from './ui'

const LABELS: Record<FeasKey, string> = { poolPerSiteMonth: 'Patients with the condition per site per month', consentPct: 'Pre-screened who consent (%)', rampMonths: 'Months to activate all sites', seed: 'Random seed' }

export default function Feasibility() {
  const { p, act } = useStore()
  const d = current(p!), f = feasibility(d, p!)
  const set = (fn: (x: NonNullable<typeof p>) => void) => act((x) => { x.feasibility ??= {}; fn(x) })
  const max = f.curve[f.curve.length - 1]?.total || 1, W = 560, H = 160
  const pts = f.curve.map((c, i) => `${(i / Math.max(1, f.curve.length - 1)) * W},${H - (c.total / Math.max(max, f.target)) * H}`).join(' ')
  return (
    <div className="space-y-4">
      <Panel title="Feasibility estimate" sub={`${f.simulated.toLocaleString('en-US')} synthetic patients with ${d.design['Population Diagnosis or Condition']?.toLowerCase() ?? 'the condition'} are checked against each criterion. Pass rates are assumptions: replace them with health-record queries or site survey results.`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Randomised per 100 patients" value={`${f.yieldPct}`} />
          <Stat label="Screen failure rate" value={`${f.screenFailPct}%`} tone={f.screenFailPct > 50 ? 'amber' : undefined} />
          <Stat label="Randomised per site per month" value={`${f.perSiteMonth}`} />
          <Stat label="Sites" value={`${f.sites}`} />
          <Stat label={`Months to ${f.target} participants`} value={f.months ? `${f.months}` : 'over 120'} tone={!f.months || f.months > 24 ? 'red' : f.months > 12 ? 'amber' : 'green'} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs mt-3">{(Object.keys(FEAS_DEFAULTS) as FeasKey[]).map((k) => <label key={k} className="w-44">{LABELS[k]}<input type="number" className={inputCls} value={p!.feasibility?.[k] ?? FEAS_DEFAULTS[k]} onChange={(e) => set((x) => { x.feasibility![k] = Number(e.target.value) })} /></label>)}</div>
      </Panel>
      <Panel title="Screening funnel" sub="Criteria that need no test are checked from records before consent (pre-screening); criteria that need a test are checked at the screening visit, where a failure is a screen failure.">
        <div className="overflow-x-auto"><table className="text-xs w-full min-w-[36rem]"><thead><tr className="text-left text-lab-text-muted"><th>Criterion</th><th>Stage</th><th className="w-24">Pass rate</th><th className="text-right pr-3">Lost</th><th className="w-1/3">Remaining</th></tr></thead>
          <tbody>
            {f.steps.map((s) => <tr key={s.code} className="border-t border-lab-line/60"><td className="py-1 pr-2"><span className="font-mono">{s.code}</span> {s.text}{f.worst?.code === s.code && <> <Pill tone="amber">loses most</Pill></>}</td><td>{s.stage}</td>
              <td><input type="number" step="0.01" min="0" max="1" aria-label={`Pass rate for ${s.code}`} className="w-20 rounded border border-lab-line bg-lab-panel-strong px-1" value={s.rate} onChange={(e) => set((x) => { x.feasibility!.rates = { ...x.feasibility!.rates, [s.code]: Math.max(0, Math.min(1, Number(e.target.value))) } })} /></td>
              <td className="text-right font-mono pr-3">{s.lost}</td><td><div className="flex items-center gap-2"><div className="h-2 bg-lab-ema rounded" style={{ width: `${(100 * s.left) / f.simulated}%` }} /><span className="font-mono">{s.left}</span></div></td></tr>)}
            <tr className="border-t-2 border-lab-line font-semibold"><td colSpan={3}>Pre-screened {f.prescreened}, consented {f.consented}, randomised {f.randomised}</td><td /><td /></tr>
          </tbody></table></div>
      </Panel>
      <EnrolmentPlan />
      <Panel title="Recruitment over time" sub={`Sites open evenly over ${p!.feasibility?.rampMonths ?? FEAS_DEFAULTS.rampMonths} months; each recruits ${f.perSiteMonth} a month once open.`}>
        <svg viewBox={`-30 -10 ${W + 40} ${H + 30}`} className="w-full max-w-2xl" role="img" aria-label="Cumulative participants randomised by month">
          <line x1="0" y1={H - (f.target / Math.max(max, f.target)) * H} x2={W} y2={H - (f.target / Math.max(max, f.target)) * H} stroke="currentColor" strokeDasharray="4 4" opacity="0.5" />
          <text x={W} y={H - (f.target / Math.max(max, f.target)) * H - 4} fontSize="10" textAnchor="end" fill="currentColor">target {f.target}</text>
          <polyline points={pts} fill="none" stroke="var(--color-lab-ema, #6b8afd)" strokeWidth="2" />
          <line x1="0" y1={H} x2={W} y2={H} stroke="currentColor" opacity="0.4" /><text x={W / 2} y={H + 20} fontSize="10" textAnchor="middle" fill="currentColor">months (1 to {f.curve.length})</text>
        </svg>
      </Panel>
    </div>
  )
}

// Enrolment plan: targets by sex, age group and country against who has the condition.
function EnrolmentPlan() {
  const { p, act } = useStore()
  const d = current(p!), e = enrolment(d, p!)
  const set = (fn: (x: NonNullable<NonNullable<typeof p>['enrolment']>) => void) => act((x) => { x.enrolment ??= {}; fn(x.enrolment) })
  const T = ({ title, rows }: { title: string; rows: typeof e.sex }) => (
    <table className="text-xs w-full"><thead><tr className="text-left text-lab-text-muted"><th>{title}</th><th className="text-right">Share %</th><th className="text-right">Target</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.group} className="border-t border-lab-line/60"><td className="py-0.5">{r.group}{r.note && <span className="text-lab-text-muted"> ({r.note})</span>}</td><td className="text-right font-mono">{r.share}</td><td className="text-right font-mono">{r.target}</td></tr>)}</tbody></table>)
  return (
    <Panel title="Enrolment plan" sub={`Targets for the ${d.facts.participants} participants, set against who has the condition, so the results apply to the people who will use the medicine. EU CTR Annex I 17(y), ICH E7 (older patients) and ICH E17 (regions). In the US, diversity action plans under the 2022 FDORA apply once FDA finalises its guidance, which it had not done as of mid-2026.`}>
      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <label className="w-48">Women among patients with the condition (%)<input type="number" className={inputCls} value={e.settings.femalePct} onChange={(ev) => set((x) => { x.femalePct = Number(ev.target.value) })} /></label>
        <label className="w-48">Patients aged 65 or over (%)<input type="number" className={inputCls} value={e.settings.olderPct} onChange={(ev) => set((x) => { x.olderPct = Number(ev.target.value) })} /></label>
        <label className="w-48">Patients aged 75 or over (%)<input type="number" className={inputCls} value={e.settings.oldestPct} onChange={(ev) => set((x) => { x.oldestPct = Number(ev.target.value) })} /></label>
        {e.country.map((c) => <label key={c.group} className="w-32">{c.group} weight<input type="number" className={inputCls} value={p!.enrolment?.countryPct?.[c.group] ?? Math.round(100 / Math.max(1, e.country.length))} onChange={(ev) => set((x) => { x.countryPct = { ...x.countryPct, [c.group]: Number(ev.target.value) } })} /></label>)}
      </div>
      <div className="grid md:grid-cols-3 gap-4"><T title="Sex" rows={e.sex} /><T title="Age group" rows={e.age} /><T title="Country" rows={e.country} /></div>
      {e.flags.length ? <ul className="text-xs space-y-1 mt-3">{e.flags.map((f) => <li key={f.id}><span className="text-lab-amber">⚑</span> {f.text} <i className="text-lab-text-muted">{f.fix}</i></li>)}</ul> : <p className="text-xs text-lab-cdsco mt-3">No enrolment flags.</p>}
    </Panel>
  )
}

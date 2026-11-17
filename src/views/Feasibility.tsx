// Feasibility: the eligibility criteria run against a synthetic population, with the screening
// funnel and the recruitment time for the planned sites.
import { useStore } from '../state'
import { current } from '../domain/project'
import { feasibility, FEAS_DEFAULTS, type FeasKey } from '../domain/feasibility'
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
        <table className="text-xs w-full"><thead><tr className="text-left text-lab-text-muted"><th>Criterion</th><th>Stage</th><th className="w-24">Pass rate</th><th className="text-right pr-3">Lost</th><th className="w-1/3">Remaining</th></tr></thead>
          <tbody>
            {f.steps.map((s) => <tr key={s.code} className="border-t border-lab-line/60"><td className="py-1 pr-2"><span className="font-mono">{s.code}</span> {s.text}{f.worst?.code === s.code && <> <Pill tone="amber">loses most</Pill></>}</td><td>{s.stage}</td>
              <td><input type="number" step="0.01" min="0" max="1" aria-label={`Pass rate for ${s.code}`} className="w-20 rounded border border-lab-line bg-lab-panel-strong px-1" value={s.rate} onChange={(e) => set((x) => { x.feasibility!.rates = { ...x.feasibility!.rates, [s.code]: Math.max(0, Math.min(1, Number(e.target.value))) } })} /></td>
              <td className="text-right font-mono pr-3">{s.lost}</td><td><div className="flex items-center gap-2"><div className="h-2 bg-lab-ema rounded" style={{ width: `${(100 * s.left) / f.simulated}%` }} /><span className="font-mono">{s.left}</span></div></td></tr>)}
            <tr className="border-t-2 border-lab-line font-semibold"><td colSpan={3}>Pre-screened {f.prescreened}, consented {f.consented}, randomised {f.randomised}</td><td /><td /></tr>
          </tbody></table>
      </Panel>
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

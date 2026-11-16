import { createContext, useContext, useState } from 'react'
import { StoreProvider, useStore } from './state'
import { status, protocolId } from './domain/project'
import { Btn, Pill } from './views/ui'
import Home from './views/Home'
import Learn from './views/Learn'
import Overview from './views/Overview'
import Sections from './views/Sections'
import Estimands from './views/Estimands'
import Schedule from './views/Schedule'
import Checks from './views/Checks'
import Export from './views/Export'
import Amendments from './views/Amendments'
import Crosswalks from './views/Crosswalks'
import Brochure from './views/Brochure'
import DeviceCip from './views/DeviceCip'
import Review from './views/Review'
import Classroom from './views/Classroom'
import { cipFindings } from './domain/cip'
import { MissionBar } from './views/Missions'

export type View = 'overview' | 'sections' | 'estimands' | 'schedule' | 'checks' | 'crosswalks' | 'ib' | 'cip' | 'review' | 'amendments' | 'export'
interface Nav { view: View; arg?: string; go: (v: View, arg?: string) => void }
const NavCtx = createContext<Nav>({ view: 'overview', go: () => {} })
export const useNav = () => useContext(NavCtx)

const VIEWS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'sections', label: 'Sections' }, { id: 'estimands', label: 'Objectives and estimands' },
  { id: 'schedule', label: 'Schedule of activities' }, { id: 'checks', label: 'Consistency checks' }, { id: 'crosswalks', label: 'Cross-walks' }, { id: 'ib', label: 'Investigator’s brochure' }, { id: 'amendments', label: 'Versions and amendments' }, { id: 'review', label: 'Review' }, { id: 'export', label: 'Export' },
]
const DEVICE_VIEWS: { id: View; label: string }[] = [{ id: 'cip', label: 'Clinical investigation plan' }, { id: 'review', label: 'Review' }]

function Shell() {
  const { p, close, error, setError, saved } = useStore()
  const [nav, setNav] = useState<{ view: View; arg?: string }>({ view: 'overview' })
  const [page, setPage] = useState<'home' | 'learn' | 'classroom'>(() => (location.hash === '#/learn' ? 'learn' : location.hash === '#/classroom' ? 'classroom' : 'home'))
  const go = (view: View, arg?: string) => { setNav({ view, arg }); window.scrollTo({ top: 0 }) }
  const device = p?.type === 'device'
  const st = p ? (device ? (() => { const f = p.cip ? cipFindings(p.cip) : []; return { high: f.filter((x) => x.severity === 'high').length, medium: f.filter((x) => x.severity === 'medium').length, low: f.filter((x) => x.severity === 'low').length } })() : status(p)) : null
  const views = device ? DEVICE_VIEWS : VIEWS
  const view: View = views.some((v) => v.id === nav.view) ? nav.view : views[0].id
  const V = { overview: Overview, sections: Sections, estimands: Estimands, schedule: Schedule, checks: Checks, crosswalks: Crosswalks, ib: Brochure, cip: DeviceCip, review: Review, amendments: Amendments, export: Export }[view]
  return (
    <NavCtx.Provider value={{ ...nav, go }}>
      <div className="min-h-screen bg-lab-bg text-lab-text flex flex-col">
        <header className="border-b border-lab-line bg-lab-panel/90 sticky top-0 z-40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="mr-auto">
              <button className="font-mono text-sm text-lab-fda text-left" onClick={() => { close(); setPage('home') }}>Protocol Builder</button>
              <p className="text-[11px] text-lab-text-muted">{p ? `${p.name} · ${protocolId(p)} · version ${p.versions.at(-1)!.number}` : 'Write a clinical trial protocol in the ICH M11 structure · training only'}</p>
            </div>
            {p && st && (
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => go(device ? 'cip' : 'checks')}><Pill tone={st.high ? 'red' : st.medium ? 'amber' : 'green'}>Checks: {st.high} high, {st.medium} medium, {st.low} low</Pill></button>
                <Btn tone="grey" onClick={() => { close(); setPage('home') }}>All protocols</Btn>
              </div>
            )}
            {!p && (
              <nav className="flex gap-1" aria-label="Main">
                {(['home', 'learn', 'classroom'] as const).map((x) => <button key={x} onClick={() => setPage(x)} aria-current={page === x ? 'page' : undefined} className={`px-3 py-1.5 font-mono text-xs border-b-2 ${page === x ? 'border-lab-fda text-lab-fda' : 'border-transparent text-lab-text-muted hover:text-lab-text'}`}>{x === 'home' ? 'Protocols and missions' : x === 'learn' ? 'Learn' : 'Classroom'}</button>)}
              </nav>
            )}
          </div>
          {p && (
            <nav className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1" aria-label="Protocol">
              {views.map((v) => (
                <button key={v.id} onClick={() => go(v.id)} aria-current={view === v.id ? 'page' : undefined}
                  className={`px-3 py-1.5 font-mono text-xs border-b-2 ${view === v.id ? 'border-lab-fda text-lab-fda' : 'border-transparent text-lab-text-muted hover:text-lab-text'}`}>{v.label}</button>
              ))}
            </nav>
          )}
        </header>
        {error && <div role="alert" className="max-w-7xl mx-auto w-full px-4 pt-3"><div className="rounded border border-lab-red/60 bg-lab-red-soft px-3 py-2 text-sm text-lab-red flex justify-between gap-2"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">✕</button></div></div>}
        <main className="max-w-7xl mx-auto w-full px-4 py-4 flex-1">
          {p ? <><MissionBar /><V key={nav.arg ?? nav.view} /></> 
            : page === 'learn' ? <Learn /> : page === 'classroom' ? <Classroom /> : <Home onOpen={() => go('overview')} />}
        </main>
        <footer className="border-t border-lab-line text-[11px] text-lab-text-muted">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between gap-2">
            <span>Built by Khan Gulrez Shagufa Fazal Ahmed · Apache-2.0</span>
            <span>Training only. Fictional protocols, products and sponsors; not a validated system. Saved in this browser{saved ? ` · saved ${saved}` : ''}.</span>
          </div>
        </footer>
      </div>
    </NavCtx.Provider>
  )
}

export default function App() { return <StoreProvider><Shell /></StoreProvider> }

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { StoreProvider, useStore } from './state'
import { status, protocolId } from './domain/project'
import { Btn, Modal, Pill } from './views/ui'
import Home from './views/Home'
import Learn from './views/Learn'
import Overview from './views/Overview'
import Sections from './views/Sections'
import Estimands from './views/Estimands'
import Schedule from './views/Schedule'
import Feasibility from './views/Feasibility'
import Checks from './views/Checks'
import Documents from './views/Documents'
import Export from './views/Export'
import Amendments from './views/Amendments'
import Crosswalks from './views/Crosswalks'
import Brochure from './views/Brochure'
import DeviceCip from './views/DeviceCip'
import Review from './views/Review'
import Classroom from './views/Classroom'
import { cipFindings } from './domain/cip'
import { MissionBar } from './views/Missions'

export type View = 'overview' | 'sections' | 'estimands' | 'schedule' | 'feasibility' | 'checks' | 'crosswalks' | 'ib' | 'cip' | 'review' | 'amendments' | 'documents' | 'export'
interface Nav { view: View; arg?: string; go: (v: View, arg?: string) => void }
const NavCtx = createContext<Nav>({ view: 'overview', go: () => {} })
export const useNav = () => useContext(NavCtx)

const VIEWS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'sections', label: 'Sections' }, { id: 'estimands', label: 'Objectives and estimands' },
  { id: 'schedule', label: 'Schedule of activities' }, { id: 'feasibility', label: 'Feasibility' }, { id: 'checks', label: 'Consistency checks' }, { id: 'crosswalks', label: 'Cross-walks' }, { id: 'ib', label: 'Investigator’s brochure' }, { id: 'amendments', label: 'Versions and amendments' }, { id: 'review', label: 'Review' }, { id: 'documents', label: 'Documents' }, { id: 'export', label: 'Export' },
]
// Keyboard shortcuts, as in the Labelling Workbench: g then a letter goes to a page.
const GO_PROJECT: Record<string, View> = { o: 'overview', s: 'sections', e: 'estimands', a: 'schedule', f: 'feasibility', k: 'checks', w: 'crosswalks', i: 'ib', v: 'amendments', r: 'review', d: 'documents', x: 'export' }
const GO_HOME: Record<string, 'home' | 'learn' | 'classroom'> = { h: 'home', l: 'learn', c: 'classroom' }
export const SHORTCUTS: [string, string][] = [['?', 'Show these shortcuts'], ['g then h / l / c', 'Protocols and missions, Learn, Classroom (outside a protocol)'],
  ['g then o / s / e / a / f', 'Overview, Sections, Objectives and estimands, Schedule of activities, Feasibility'], ['g then k / w / i / v / r / d / x', 'Consistency checks, Cross-walks, IB, Versions and amendments, Review, Documents, Export'],
  ['Alt + 1 to 9', 'In a protocol: the first to ninth tab'], ['Ctrl or ⌘ + S', 'Work is saved as you type; this confirms it'], ['Esc', 'Close a dialog']]
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

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
  const [keys, setKeys] = useState(false), [toast, setToast] = useState(''), [online, setOnline] = useState(() => navigator.onLine)
  const gAt = useRef(0)
  useEffect(() => {
    const on = () => setOnline(navigator.onLine)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); setToast('Your work is saved automatically in this browser.'); setTimeout(() => setToast(''), 2500); return }
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key) && p) { const v = views[Number(e.key) - 1]; if (v) { e.preventDefault(); go(v.id) } return }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      if (e.key === '?') { e.preventDefault(); setKeys(true); return }
      if (e.key === 'g') { gAt.current = Date.now(); return }
      if (Date.now() - gAt.current < 1200) {
        gAt.current = 0
        if (p && GO_PROJECT[e.key] && views.some((v) => v.id === GO_PROJECT[e.key])) { e.preventDefault(); go(GO_PROJECT[e.key]) }
        else if (GO_HOME[e.key]) { e.preventDefault(); if (p) close(); setPage(GO_HOME[e.key]) }
      }
    }
    window.addEventListener('keydown', onKey); window.addEventListener('online', on); window.addEventListener('offline', on)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('online', on); window.removeEventListener('offline', on) }
  })
  const V = { overview: Overview, sections: Sections, estimands: Estimands, schedule: Schedule, feasibility: Feasibility, checks: Checks, crosswalks: Crosswalks, ib: Brochure, cip: DeviceCip, review: Review, amendments: Amendments, documents: Documents, export: Export }[view]
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
                <button className="text-xs text-lab-text-muted underline" onClick={() => setKeys(true)} title="Keyboard shortcuts (?)">Shortcuts</button>
              </div>
            )}
            {!p && (
              <nav className="flex gap-1" aria-label="Main">
                <button className="px-2 text-xs text-lab-text-muted underline" onClick={() => setKeys(true)} title="Keyboard shortcuts (?)">Shortcuts</button>
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
        {toast && <div role="status" className="fixed bottom-4 right-4 z-50 rounded border border-lab-line bg-lab-panel px-3 py-2 text-sm shadow">{toast}</div>}
        {keys && <Modal title="Keyboard shortcuts" onClose={() => setKeys(false)}><table className="text-sm w-full"><tbody>{SHORTCUTS.map(([k, what]) => <tr key={k} className="border-t border-lab-line/60"><td className="py-1 pr-4 font-mono whitespace-nowrap">{k}</td><td>{what}</td></tr>)}</tbody></table></Modal>}
        <footer className="border-t border-lab-line text-[11px] text-lab-text-muted">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between gap-2">
            <span>Built by Khan Gulrez Shagufa Fazal Ahmed · Apache-2.0</span>
            <span>Training only. Fictional protocols, products and sponsors; not a validated system. Saved in this browser{saved ? ` · saved ${saved}` : ''}. {online ? 'Works offline after the first visit.' : 'Offline: everything except the Classroom still works.'}</span>
          </div>
        </footer>
      </div>
    </NavCtx.Provider>
  )
}

export default function App() { return <StoreProvider><Shell /></StoreProvider> }

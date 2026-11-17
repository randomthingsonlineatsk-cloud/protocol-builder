import { useState } from 'react'
import { useStore } from '../state'
import { startAmendment, diff, wordDiff, draftChanges, amendmentFindings, CATEGORIES, OPTIONS, REGIONS, grade, categoryById, last } from '../domain/amend'
import { signState, sign, SIGN_ROLES } from '../domain/signoff'
import { impactOf } from '../domain/amend'
import { CODELISTS } from '../domain/m11'
import CT from '../domain/ct-usdm.json'
import type { Amendment, Change, Region } from '../domain/types'
import { SignForm, Btn, Panel, Pill, Select, TextArea, inputCls } from './ui'

const REASONS = (CT.codelists as unknown as Record<string, { terms: [string, string, string][] }>).C207415.terms.map(([c, , pt]) => ({ value: c, label: pt }))

export function DiffView({ before, after }: { before: string; after: string }) {
  if (before.length + after.length < 120 && !before.includes(' ') && !after.includes(' ')) return <span><del className="text-lab-red">{before}</del> → <ins className="text-lab-cdsco no-underline">{after}</ins></span>
  return <span className="whitespace-pre-wrap">{wordDiff(before, after).map((s, i) => s.t === '=' ? <span key={i}>{s.s}</span> : s.t === '-' ? <del key={i} className="bg-lab-red-soft text-lab-red">{s.s}</del> : <ins key={i} className="bg-lab-cdsco-soft text-lab-cdsco no-underline">{s.s}</ins>)}</span>
}

export default function Amendments() {
  const { p, act } = useStore()
  const v = last(p!), n = p!.versions.length
  const [from, setFrom] = useState(Math.max(0, n - 2)), [to, setTo] = useState(n - 1)
  const [checked, setChecked] = useState(false)
  // A new version (or another project) moves the comparison to the latest two versions.
  const [seen, setSeen] = useState(`${p!.id}:${n}`)
  if (seen !== `${p!.id}:${n}`) { setSeen(`${p!.id}:${n}`); setFrom(Math.max(0, n - 2)); setTo(n - 1) }
  const items = n > 1 ? diff(p!.versions[Math.min(from, n - 1)].data, p!.versions[Math.min(to, n - 1)].data) : []
  const a = v.amendment, phase = v.data.title['Trial Phase'] ?? ''
  const setA = (fn: (a: Amendment) => void) => act((x) => { const am = last(x).amendment; if (am) fn(am) })
  const setC = (i: number, fn: (c: Change) => void) => setA((am) => fn(am.changes[i]))
  const findings = amendmentFindings(p!)
  const prevItems = n > 1 ? diff(p!.versions[n - 2].data, v.data) : []
  return (
    <div className="space-y-4">
      <Panel title="Versions" sub="A version is approved by sign-off: the author, a reviewer and the approver each sign, with the meaning of the signature recorded. Approval freezes the version; an amendment starts the next version from it.">
        <ul className="space-y-1 text-sm">{p!.versions.map((x, i) => <li key={i} className="flex flex-wrap items-center gap-2"><span className="font-mono">Version {x.number}</span><Pill tone={x.status === 'approved' ? 'green' : 'amber'}>{x.status}</Pill><span className="text-xs text-lab-text-muted">{x.date}{x.amendment ? ` · amendment ${x.amendment.identifier}` : ' · original protocol'}</span></li>)}</ul>
        <div className="flex gap-2">
          <Btn disabled={v.status !== 'approved'} onClick={() => act((x) => startAmendment(x))}>Start amendment (version {Math.floor(Number(v.number) || 0) + 1}.0)</Btn>
        </div>
        <SignOff />
      </Panel>

      {n > 1 && (
        <Panel title="Tracked changes" right={<div className="flex gap-2 text-xs items-center">From <Select aria-label="From version" className="w-24 py-1" value={String(from)} onChange={(e) => setFrom(Number(e.target.value))} options={p!.versions.map((x, i) => ({ value: String(i), label: x.number }))} /> to <Select aria-label="To version" className="w-24 py-1" value={String(to)} onChange={(e) => setTo(Number(e.target.value))} options={p!.versions.map((x, i) => ({ value: String(i), label: x.number }))} /></div>}>
          {items.length === 0 ? <p className="text-sm text-lab-text-muted">No differences.</p> : (
            <ul className="space-y-2 text-xs">{items.map((it, i) => <li key={i} className="border-l-2 border-lab-line pl-2"><p className="font-mono text-lab-text-muted">{it.section === 'TP' ? 'Title page' : it.section} · {it.label}</p><DiffView before={it.before} after={it.after} /></li>)}</ul>)}
        </Panel>
      )}

      {a && (<>
        <Panel title={`Amendment ${a.identifier}: details (ICH M11 title page)`}>
          <div className="grid md:grid-cols-3 gap-2 text-xs text-lab-text-muted">
            <label>Amendment scope<Select value={a.scope} onChange={(e) => { const val = e.target.value as Amendment['scope']; act((x) => { last(x).amendment!.scope = val; last(x).data.title['Amendment Scope'] = val }) }} options={CODELISTS.scope.values.map((c) => ({ value: c.decode, label: `${c.decode} (${c.code})` }))} /></label>
            <label>Countries, regions or sites (if not global)<input className={inputCls} value={a.scopeDetail} onChange={(e) => { const val = e.target.value; act((x) => { last(x).amendment!.scopeDetail = val; last(x).data.title['Country, Region, or Site Identifier'] = val }) }} /></label>
            <label>Approximate % enrolled at sponsor approval<input type="number" className={inputCls} value={a.enrolledPct} onChange={(e) => setA((am) => { am.enrolledPct = Number(e.target.value) })} /></label>
            <label>Primary reason (C207415)<Select value={a.primaryReason} onChange={(e) => setA((am) => { am.primaryReason = e.target.value })} options={[{ value: '', label: '(choose)' }, ...REASONS]} /></label>
            <label>Secondary reasons<select multiple className={inputCls + ' h-20'} value={a.secondaryReasons} onChange={(e) => { const vals = [...e.target.selectedOptions].map((o) => o.value); setA((am) => { am.secondaryReasons = vals }) }}>{REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2">
              <label>Substantial impact on safety or rights?<Select value={a.safetyRights} onChange={(e) => setA((am) => { am.safetyRights = e.target.value as 'Yes' })} options={[{ value: '', label: '(choose)' }, { value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} /></label>
              <label>Impact on reliability and robustness of the data?<Select value={a.dataImpact} onChange={(e) => setA((am) => { am.dataImpact = e.target.value as 'Yes' })} options={[{ value: '', label: '(choose)' }, { value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} /></label>
            </div>
            <label className="md:col-span-3">Amendment summary<TextArea value={a.summary} onChange={(e) => setA((am) => { am.summary = e.target.value })} /></label>
          </div>
        </Panel>

        <Panel title="Summary of changes and their classification" sub="One entry per change: the sections, what changed, why, and how each region treats it."
          right={<div className="flex gap-2"><Btn tone="grey" disabled={!prevItems.length} onClick={() => setA((am) => { const have = new Set(am.changes.flatMap((c) => c.sections)); const add = draftChanges(prevItems.filter((x) => !have.has(x.section))); am.changes.push(...add.map((c, i) => ({ ...c, id: `C${am.changes.length + i + 1}` }))) })}>Draft from tracked changes</Btn>
            <Btn tone="grey" onClick={() => setA((am) => { am.changes.push({ id: `C${am.changes.length + 1}`, sections: [], description: '', rationale: '', category: '', answers: {}, justify: {} }) })}>Add a change</Btn>
            <Btn tone="purple" onClick={() => setChecked(true)}>Check the classification</Btn></div>}>
          <div className="space-y-3">
            {a.changes.map((c, i) => { const g = grade(c, phase), cat = categoryById(c.category); return (
              <div key={c.id} className="rounded border border-lab-line p-2 space-y-2 text-xs">
                <div className="grid md:grid-cols-[3rem_8rem_1fr_1fr_auto] gap-2 items-start">
                  <span className="font-mono pt-2">{c.id}</span>
                  <input aria-label="Sections" className={inputCls} value={c.sections.join(', ')} placeholder="Sections" onChange={(e) => { const s = e.target.value.split(/[\s,]+/).filter(Boolean); setC(i, (x) => { x.sections = s }) }} />
                  <TextArea aria-label="What changed" className="min-h-10" placeholder="What changed" value={c.description} onChange={(e) => setC(i, (x) => { x.description = e.target.value })} />
                  <TextArea aria-label="Rationale" className="min-h-10" placeholder="Why (rationale)" value={c.rationale} onChange={(e) => setC(i, (x) => { x.rationale = e.target.value })} />
                  <Btn tone="red" onClick={() => setA((am) => { am.changes.splice(i, 1) })}>✕</Btn>
                </div>
                <label className="block text-lab-text-muted">Kind of change<Select value={c.category} onChange={(e) => setC(i, (x) => { x.category = e.target.value })} options={[{ value: '', label: '(choose)' }, ...CATEGORIES.map((k) => ({ value: k.id, label: `${k.label} (e.g. ${k.example})` }))]} /></label>
                <div className="grid md:grid-cols-3 gap-2">
                  {REGIONS.map((r) => { const gr = g.find((x) => x.region === r.id)!; return (
                    <div key={r.id} className="space-y-1">
                      <label className="block text-lab-text-muted">{r.name}<Select value={c.answers[r.id] ?? ''} onChange={(e) => setC(i, (x) => { x.answers[r.id as Region] = e.target.value })} options={[{ value: '', label: '(choose)' }, ...OPTIONS[r.id].map((o) => ({ value: o.id, label: o.label }))]} /></label>
                      {checked && c.category && c.answers[r.id] && (gr.ok ? <p className="text-lab-cdsco">Agrees with the key. {cat?.why[r.id]}</p> : <div className="space-y-1"><p className="text-lab-amber">The key says: {OPTIONS[r.id].find((o) => o.id === gr.key)?.label}. {cat?.why[r.id]}</p>
                        <input aria-label={`Justify for ${r.id}`} className={inputCls} placeholder="If you disagree, justify your answer (20 characters or more)" value={c.justify[r.id] ?? ''} onChange={(e) => setC(i, (x) => { x.justify[r.id as Region] = e.target.value })} />{gr.justified && <Pill tone="purple">justified alternative</Pill>}</div>)}
                    </div>) })}
                </div>
              </div>) })}
          </div>
          <p className="text-[11px] text-lab-text-muted">Bases: {REGIONS.map((r) => `${r.id}: ${r.basis}`).join(' · ')}. The key is this app's reading of those texts for teaching, not regulatory advice.</p>
        </Panel>

        <Panel title="Downstream impact" sub="The documents and systems built from the protocol that must change with this amendment, read from the sections it touches and its reasons.">
          <ul className="space-y-1 text-sm">{impactOf(p!).map((x) => <li key={x.doc}><b>{x.doc}</b>{x.sections.length && x.doc !== 'Site training and the trial master file' ? <span className="text-xs text-lab-text-muted"> (sections {x.sections.join(', ')})</span> : null}. {x.why} <span className="text-lab-text-muted">{x.action}</span></li>)}</ul>
        </Panel>
        <Panel title="Amendment checks">{findings.length ? <ul className="text-xs space-y-0.5">{findings.map((f) => <li key={f.id}><span className="font-mono text-lab-amber">{f.id.split(':')[0]}</span> {f.text}</li>)}</ul> : <p className="text-sm text-lab-cdsco">The amendment is complete.</p>}</Panel>
      </>)}
    </div>
  )
}

// Author, reviewer and approver signatures; the approver's signature approves the version.
function SignOff() {
  const { p, act } = useStore()
  const [err, setErr] = useState('')
  const st = signState(p!)
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold">Sign-off of version {last(p!).number}</p>
      <div className="grid md:grid-cols-3 gap-2">{st.map((s) => { const r = SIGN_ROLES.find((x) => x.role === s.role)!; return (
        <div key={s.role} className="rounded border border-lab-line/60 p-2 text-xs space-y-1">
          <p className="flex items-center gap-2"><b>{s.role}</b>{s.valid ? <Pill tone="green">signed</Pill> : s.sig ? <Pill tone="red">void: content changed</Pill> : <Pill>not signed</Pill>}</p>
          {s.sig && <p className="text-lab-text-muted">{s.sig.name}, {s.sig.title} · {s.sig.utc.replace('T', ' ').slice(0, 16)} UTC<br />Meaning: {s.sig.meaning}</p>}
          {s.canSign ? <SignForm meaning={r.meaning} label={`Sign as ${s.role.toLowerCase()}`} who={{ name: '', role: r.who }} onSign={(x) => { try { act((pp) => sign(pp, s.role, x.name, x.role)); setErr('') } catch (e) { setErr((e as Error).message) } }} /> : !s.valid && <p className="text-lab-amber">{s.blocked}</p>}
        </div>) })}</div>
      {err && <p className="text-xs text-lab-red">{err}</p>}
    </div>
  )
}

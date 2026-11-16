import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../App'
import { current, getLearner } from '../domain/project'
import { TOC } from '../domain/m11'
import { CIP_SECTIONS } from '../domain/cip'
import { synopsis } from '../domain/bundle'
import { addComment, quoteFound, readiness, plainLanguage, COMMENT_KINDS, type CommentKind, type PlainResult } from '../domain/review'
import { Btn, Panel, Pill, Select, TextArea, fmtUtc } from './ui'

// The reviewer's view: readiness, comments on sections and quoted words, and the plain-language check.
export default function Review() {
  const { p, act } = useStore(), { go } = useNav()
  const device = p!.type === 'device', d = current(p!)
  const secs = device ? CIP_SECTIONS.map((s) => ({ num: s.id, label: `${s.num} ${s.title}`, text: p!.cip?.sections[s.id] ?? '' })) : TOC.filter((s) => s.num !== 'TP').map((s) => ({ num: s.num, label: `${s.num} ${s.title}`, text: d.narrative[s.num] ?? '' }))
  const [sec, setSec] = useState(secs.find((s) => s.text.trim())?.num ?? secs[0].num)
  const [quote, setQuote] = useState(''), [kind, setKind] = useState<CommentKind>('Clarity'), [text, setText] = useState('')
  const [show, setShow] = useState<'open' | 'all'>('open')
  const r = readiness(p!), cur = secs.find((s) => s.num === sec)!
  const comments = (p!.reviews ?? []).filter((c) => show === 'all' || c.status === 'open')
  const takeSelection = () => { const s = window.getSelection()?.toString().trim() ?? ''; if (s && cur.text.includes(s)) setQuote(s) }
  const label = (n: string) => secs.find((s) => s.num === n)?.label ?? n
  return (
    <div className="space-y-4">
      <Panel title={`Readiness: ${r.ready ? 'ready for sponsor approval' : 'not ready yet'}`} sub="What a reviewer checks before the protocol goes for approval.">
        <ul className="space-y-1 text-sm">{r.items.map((i) => <li key={i.label} className="flex gap-2"><span className={i.ok ? 'text-lab-cdsco' : 'text-lab-red'}>{i.ok ? '✓' : '✗'}</span><span><b>{i.label}.</b> <span className="text-lab-text-muted">{i.detail}</span></span></li>)}</ul>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Comment on a section" sub="Select words in the section text, quote them, and say what is wrong, as a medical writing QC would. Corrections and consistency comments block readiness until resolved.">
          <Select aria-label="Section" value={sec} onChange={(e) => { setSec(e.target.value); setQuote('') }} options={secs.map((s) => ({ value: s.num, label: `${s.label}${s.text.trim() ? '' : ' (empty)'}` }))} />
          <div className="rounded border border-lab-line bg-lab-panel-strong p-2 text-sm max-h-48 overflow-auto whitespace-pre-wrap" onMouseUp={takeSelection}>{cur.text || <span className="text-lab-text-muted">No text in this section.</span>}</div>
          <p className="text-xs text-lab-text-muted">Quoted: {quote ? <q className="text-lab-text">{quote}</q> : 'select words above, or comment on the whole section'} {quote && <button className="underline text-lab-fda" onClick={() => setQuote('')}>clear</button>}</p>
          <div className="flex gap-2"><Select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as CommentKind)} options={COMMENT_KINDS.map((k) => ({ value: k, label: k }))} /></div>
          <TextArea placeholder="The comment: what is wrong and what it should say" value={text} onChange={(e) => setText(e.target.value)} />
          <Btn disabled={!text.trim()} onClick={() => { act((pp) => { addComment(pp, { section: sec, quote, kind, comment: text.trim(), author: getLearner().name || 'Reviewer' }) }); setText(''); setQuote('') }}>Add the comment</Btn>
        </Panel>
        <Panel title={`Comments (${(p!.reviews ?? []).filter((c) => c.status === 'open').length} open)`} right={<Select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value as 'open' | 'all')} options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }]} />}>
          {!comments.length && <p className="text-sm text-lab-text-muted">No comments.</p>}
          <ul className="space-y-2">{comments.map((c) => { const found = quoteFound(p!, c); return (
            <li key={c.id} className={`rounded border p-2 text-sm ${c.status === 'resolved' ? 'border-lab-line opacity-70' : c.kind === 'Correction' || c.kind === 'Consistency' ? 'border-lab-red/60' : 'border-lab-line'}`}>
              <div className="flex flex-wrap items-center gap-2"><Pill tone={c.kind === 'Correction' || c.kind === 'Consistency' ? 'red' : c.kind === 'Question' ? 'blue' : 'grey'}>{c.kind}</Pill>
                <button className="text-xs underline text-lab-fda" onClick={() => (device ? go('cip') : go('sections', c.section))}>{label(c.section)}</button>
                <span className="text-xs text-lab-text-muted ml-auto">{c.author} · {fmtUtc(c.utc)}</span></div>
              {c.quote && <p className="text-xs mt-1"><q className={found ? '' : 'line-through text-lab-text-muted'}>{c.quote}</q>{!found && <span className="text-lab-text-muted"> (no longer in the section)</span>}</p>}
              <p className="mt-1">{c.comment}</p>
              {c.reply && <p className="text-xs text-lab-text-muted mt-1">Reply: {c.reply}</p>}
              <div className="flex gap-2 mt-1">
                <Btn tone="grey" className="px-2 py-0.5 text-xs" onClick={() => act((pp) => { const x = pp.reviews!.find((y) => y.id === c.id)!; x.status = x.status === 'open' ? 'resolved' : 'open' })}>{c.status === 'open' ? 'Resolve' : 'Reopen'}</Btn>
                <Btn tone="grey" className="px-2 py-0.5 text-xs" onClick={() => { const v = window.prompt('Reply to the comment', c.reply ?? ''); if (v !== null) act((pp) => { pp.reviews!.find((y) => y.id === c.id)!.reply = v }) }}>Reply</Btn>
                <Btn tone="red" className="px-2 py-0.5 text-xs" onClick={() => act((pp) => { pp.reviews = pp.reviews!.filter((y) => y.id !== c.id) })}>Delete</Btn>
              </div>
            </li>) })}</ul>
        </Panel>
      </div>
      {!device && <PlainPanel synopsisText={synopsis(p!)} />}
    </div>
  )
}

function Result({ r }: { r: PlainResult }) {
  return (
    <div className="text-sm space-y-1">
      <p className="flex flex-wrap gap-2"><Pill tone={r.fkGrade <= 8 ? 'green' : r.fkGrade <= 12 ? 'amber' : 'red'}>Reading grade {r.fkGrade}</Pill><Pill tone="grey">Reading ease {r.fre}</Pill><Pill tone="grey">{r.wordsPerSentence} words a sentence</Pill><Pill tone="grey">{r.longWordsPct}% long words</Pill></p>
      <p>{r.verdict}</p>
      {r.jargon.length > 0 && <p className="text-xs">Technical words: {r.jargon.map((j) => <span key={j.word} className="mr-2"><b>{j.word}</b> → {j.plain}</span>)}</p>}
      {r.longSentences.length > 0 && <details className="text-xs"><summary className="cursor-pointer">{r.longSentences.length} sentence(s) over 25 words</summary><ul className="list-disc pl-5">{r.longSentences.map((s, i) => <li key={i}>{s}</li>)}</ul></details>}
    </div>
  )
}
function PlainPanel({ synopsisText }: { synopsisText: string }) {
  const { p, act } = useStore()
  const syn = plainLanguage(synopsisText), pls = plainLanguage(p!.pls ?? '')
  return (
    <Panel title="Plain-language check" sub="Reading level by the Flesch-Kincaid grade and Flesch reading ease, sentence length and technical words. A synopsis is for specialists; a lay summary for participants (and the EU CTR summary of results for laypersons, Annex V) should read at about grade 8 or below. The Plain Language Lab takes this further.">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2"><h3 className="font-mono text-xs text-lab-text-muted">The synopsis (1.1)</h3><Result r={syn} /><details className="text-xs"><summary className="cursor-pointer">The text checked</summary><pre className="whitespace-pre-wrap">{synopsisText}</pre></details></div>
        <div className="space-y-2"><h3 className="font-mono text-xs text-lab-text-muted">Your lay summary</h3>
          <TextArea className="min-h-32" placeholder="Write the trial in words a participant understands: why it is done, what taking part involves, the possible risks and benefits." value={p!.pls ?? ''} onChange={(e) => act((pp) => { pp.pls = e.target.value })} />
          {(p!.pls ?? '').trim() ? <Result r={pls} /> : null}</div>
      </div>
    </Panel>
  )
}

// Classroom mode: the only feature that talks to a server. It uses the shared classroom Worker
// (Cloudflare Worker + D1) kept in the eCTD Dossier Builder repository, routes under /pb/v1, with
// pb_ tables. Instructors create a class and set missions as assignments; students join with a
// code, run the mission and submit its project; instructors re-score each submission in their
// own browser with this app's scoring, comment, and see a leaderboard.
import type { Project } from './types'
import { grade } from './missions'
import { upgrade } from './project'

export const DEFAULT_API = 'https://ectd-classroom.randomthingsonlineatsk.workers.dev/pb/v1'
export const BUILT_IN_API = (import.meta.env?.VITE_CLASSROOM_API as string | undefined) || DEFAULT_API
export const STATUS_PAGE = DEFAULT_API.replace(/\/pb\/v1$/, '/')
export const SUBMISSION_KIND = 'protocol-builder/mission-submission'
const KEY = 'protocol-builder:classroom'

export interface Session { api: string; token?: string; role?: 'instructor' | 'student'; className?: string; name?: string }
export function loadSession(): Session {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { ...s, api: s.api || BUILT_IN_API } } catch { return { api: BUILT_IN_API } }
}
export function saveSession(s: Session) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private window: the session lasts for this page only */ } }

export async function api<T = Record<string, unknown>>(s: Session, method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(s.api.replace(/\/+$/, '') + path, { method, headers: { 'content-type': 'application/json', ...(s.token ? { authorization: `Bearer ${s.token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  } catch { throw new Error('Could not reach the classroom server. Check the address and your connection.') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `The classroom server answered ${res.status}.`)
  return data as T
}

export async function gzip(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = new Uint8Array(await new Response(stream).arrayBuffer())
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}
export async function gunzip(b64: string): Promise<string> {
  const bin = atob(b64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export interface Submission { kind: typeof SUBMISSION_KIND; missionId: string; level: string; startedUtc: string; score: number; detail: string[]; gz: string; size: number }
export async function submissionPayload(p: Project) {
  const m = p.mission
  if (!m?.submittedUtc || m.score === undefined) throw new Error('Submit the mission in the app first, so it has a score.')
  const text = JSON.stringify(p)
  const detail = (m.detail ?? []).map((d) => `${d.label}: ${Math.round(d.got * 10) / 10} of ${d.of}`)
  const sub: Submission = { kind: SUBMISSION_KIND, missionId: m.id, level: 'standard', startedUtc: m.startedUtc, score: m.score, detail, gz: await gzip(text), size: text.length }
  return { project: sub, score: m.score, checks: (m.detail ?? []).map((d, i) => ({ id: `d${i + 1}`, label: d.label, ok: d.got >= d.of })) }
}

/** Re-score a submitted mission project with this copy of the app's scoring. */
export async function verifySubmission(file: Submission): Promise<{ score: number; detail: string[]; project: Project }> {
  if (file?.kind !== SUBMISSION_KIND) throw new Error('This is not a Protocol Builder mission submission.')
  const p = upgrade(JSON.parse(await gunzip(file.gz)) as Project)
  if (p.mission?.id !== file.missionId) throw new Error(`The submitted project is not a run of ${file.missionId}.`)
  const g = grade(p)
  return { score: g.score, detail: g.detail.map((d) => `${d.label}: ${Math.round(d.got * 10) / 10} of ${d.of}`), project: p }
}

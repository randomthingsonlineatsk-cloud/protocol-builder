// The summary of results for laypersons (EU CTR Annex V), drafted from the protocol by the module
// shared with the Plain Language Lab. Without results, the results, side effects and comments are
// left to write; the Plain Language Lab drafts them from the TLF Programming Lab's results.
import type { ProtocolData } from './types'
import { studyFacts } from '../shared/consent'
import { laySummarySections, layText } from '../shared/laysummary'
import type { DocSection } from '../shared/consent'

export function laySummary(d: ProtocolData): DocSection[] {
  return laySummarySections(studyFacts({ id: d.title['Sponsor Protocol Identifier'] ?? 'study', versions: [{ data: d }] }))
}
export { layText }

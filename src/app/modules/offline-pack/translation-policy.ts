// Canonical sources must not mix translated duplicates or different editions.
const sources: Record<string, string> = {
  hadith: 'en', dua: 'en', knowledge: 'de', book: 'de', fatwa: 'de',
  quran: 'en', tafsir: 'ar',
}
const markers: Record<string, string[]> = {
  hadith: ['TRANSLATION', 'CHAPTER', 'CATEGORY'], dua: ['TITLE', 'TRANSLATION'],
  knowledge: ['TITLE', 'CONTENT'], book: ['TITLE', 'CONTENT'],
  fatwa: ['QUESTION', 'ANSWER'], quran: ['AYAH'], tafsir: ['TAFSIR'],
}
export const translationSourceLanguage = (module: string) => {
  if (!sources[module]) throw new Error('Unsupported translation module')
  return sources[module]
}
export const assertFullTranslationInput = (text: string, id: string) => {
  // Conservative single-request policy, not a model context-window limit.
  // Never turn a long book into a translated snippet labelled as a full book.
  if (text.length > 6000) throw new Error(`Record ${id} exceeds the single-document translation policy. Upload a complete manual translation; no batch has been submitted.`)
}
export const parseTranslationResponse = (module: string, result: any): Record<string, string> => {
  const choice = result.response?.body?.choices?.[0]
  if (result.error || result.response?.status_code !== 200 || choice?.finish_reason !== 'stop' || choice?.message?.refusal)
    throw new Error('Incomplete or refused translation response')
  const text = choice.message.content
  if (typeof text !== 'string') throw new Error('Missing translation body')
  const required = markers[module]
  if (!required) throw new Error('Unsupported translation module')
  const matches = [...text.matchAll(/^(TITLE|CONTENT|AYAH|TAFSIR|TRANSLATION|QUESTION|ANSWER|CHAPTER|CATEGORY):[ \t]*/gm)]
  if (matches.length !== required.length || matches.some((match, i) => match[1] !== required[i]) || text.slice(0, matches[0]?.index).trim())
    throw new Error('Malformed translation fields')
  const fields: Record<string, string> = {}
  matches.forEach((match, i) => {
    const body = text.slice(match.index! + match[0].length, matches[i + 1]?.index ?? text.length).trim()
    if (!body) throw new Error('Empty translated field')
    fields[match[1]] = body
  })
  return fields
}

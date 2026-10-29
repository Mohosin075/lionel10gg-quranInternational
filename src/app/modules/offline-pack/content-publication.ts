// Keep incomplete source/import records editable in the dashboard, but never
// advertise them as readable selected-language content on mobile.
const bodyFields: Record<string, string[]> = {
  hadith: ['translation'], dua: ['title', 'arabic', 'translation'],
  knowledge: ['title', 'content'], book: ['title', 'content'],
  fatwa: ['question', 'answer'], tafsir: ['text'],
}
const translatedBody: Record<string, string> = {
  hadith: 'translation', dua: 'translation', knowledge: 'content',
  book: 'content', fatwa: 'answer', tafsir: 'text',
}
export const publishedContentFilter = (module: string, lang: string): Record<string, unknown> => {
  const filter: Record<string, unknown> = { lang, isActive: { $ne: false } }
  for (const field of bodyFields[module] || []) filter[field] = /\S/
  // Existing Bengali imports include untranslated German bodies. A Bengali
  // title alone must not qualify their body as a Bengali offline download.
  if (lang === 'bn' && translatedBody[module])
    filter[translatedBody[module]] = new RegExp('[' + String.fromCharCode(0x980) + '-' + String.fromCharCode(0x9ff) + ']')
  return filter
}

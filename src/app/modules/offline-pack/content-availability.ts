import { contentModels } from './content-snapshot'
import { publishedModuleFilter } from './content-publication'
import { readCompleteEditionKeys } from '../quran/available-editions'
import { Language } from '../quran/quran.model'

export const REQUIRED_CONTENT_MODULES = ['quran', 'hadith', 'dua', 'knowledge', 'book', 'fatwa', 'tafsir']
export const hasAllContentModules = (details: Record<string, number>) =>
  REQUIRED_CONTENT_MODULES.every(module => (details[module] || 0) > 0)

export const readCompleteContentLanguages = async () => {
  const details = new Map<string, Record<string, number>>()
  const [editionKeys, counts] = await Promise.all([
    readCompleteEditionKeys(),
    Promise.all(Object.entries(contentModels).map(async ([module, model]) => ({
      module,
      rows: await model.aggregate<{ _id: string; count: number }>([
        { $match: publishedModuleFilter(module) },
        { $group: { _id: '$lang', count: { $sum: 1 } } },
      ]),
    }))),
  ])
  for (const { module, rows } of counts) for (const row of rows) {
    if (!row._id) continue
    const code = row._id.toLowerCase()
    const value = details.get(code) || {}
    value[module] = row.count
    details.set(code, value)
  }
  const editions = await Language.find({ key: { $in: editionKeys } }).select('iso key').lean()
  for (const edition of editions) {
    const code = edition.iso?.toLowerCase()
    if (!code) continue
    const value = details.get(code) || {}
    value.quran = 6236
    details.set(code, value)
  }
  const languages = [...details].filter(([, value]) => hasAllContentModules(value)).map(([code, value]) => ({
    code, details: value, modules: [...REQUIRED_CONTENT_MODULES],
    totalRecords: Object.values(value).reduce((sum, count) => sum + count, 0), hasPacks: false,
  }))
  const codes = new Set(languages.map(row => row.code))
  return { languages, availableCodes: [...codes], editionKeys: editions.filter(row => codes.has(row.iso?.toLowerCase() || '')).map(row => row.key) }
}

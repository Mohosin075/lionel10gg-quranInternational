import { Translation } from './quran.model'
import { SURAH_LIST } from './quran.constants'

export type EditionCoverage = { _id: { edition: string; lang: string; surah: number }; count: number; valid: number; first: number; last: number }
export const completeEditionKeys = (rows: EditionCoverage[]) => {
  const editions = new Map<string, Set<number>>()
  for (const row of rows) {
    const expected = SURAH_LIST.find(s => s.number === row._id.surah)?.numberOfAyahs
    if (!expected || row.count !== expected || row.valid !== expected || row.first !== 1 || row.last !== expected) continue
    const key = row._id.edition + '\0' + row._id.lang
    const surahs = editions.get(key) || new Set<number>()
    surahs.add(row._id.surah)
    editions.set(key, surahs)
  }
  return [...new Set([...editions].filter(([, surahs]) => surahs.size === 114).map(([key]) => key.split('\0')[0]))]
}

export const readCompleteEditionKeys = async () => {
  const arabic = new RegExp('[' + String.fromCharCode(0x600) + '-' + String.fromCharCode(0x6ff) + ']')
  const rows = await Translation.aggregate<EditionCoverage>([
    { $group: {
      _id: { edition: '$edition', lang: '$lang', surah: '$surah' },
      count: { $sum: 1 }, first: { $min: '$ayah' }, last: { $max: '$ayah' },
      valid: { $sum: { $cond: [{ $and: [
        { $regexMatch: { input: { $ifNull: ['$arabicText', ''] }, regex: arabic } },
        { $regexMatch: { input: { $ifNull: ['$text', ''] }, regex: /\S/ } },
      ] }, 1, 0] } },
    } },
  ]).allowDiskUse(true)
  return completeEditionKeys(rows)
}

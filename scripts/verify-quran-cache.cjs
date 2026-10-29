// Read-only cache inventory: no upstream ingestion or translation jobs.
require('ts-node/register/transpile-only')
const mongoose = require('mongoose')
const config = require('../src/config').default
const { Translation } = require('../src/app/modules/quran/quran.model')
const { SURAH_LIST } = require('../src/app/modules/quran/quran.constants')
;(async () => {
  try {
    await mongoose.connect(config.database_url)
    const arabic = new RegExp('[' + String.fromCharCode(0x600) + '-' + String.fromCharCode(0x6ff) + ']')
    const groups = await Translation.aggregate([
      { $group: { _id: { edition: '$edition', lang: '$lang', surah: '$surah' }, count: { $sum: 1 }, first: { $min: '$ayah' }, last: { $max: '$ayah' }, valid: { $sum: { $cond: [{ $and: [ { $regexMatch: { input: { $ifNull: ['$arabicText', ''] }, regex: arabic } }, { $regexMatch: { input: { $ifNull: ['$text', ''] }, regex: /\S/ } } ] }, 1, 0] } } } },
    ]).allowDiskUse(true)
    const editions = new Map()
    for (const row of groups) {
      const { edition, lang, surah } = row._id
      const key = edition + ':' + lang
      const item = editions.get(key) || { edition, lang, records: 0, completeSurahs: 0, invalidRows: 0 }
      const expected = SURAH_LIST.find(s => s.number === surah)?.numberOfAyahs
      item.records += row.count
      item.invalidRows += row.count - row.valid
      if (row.count === expected && row.valid === expected && row.first === 1 && row.last === expected) item.completeSurahs++
      editions.set(key, item)
    }
    for (const value of editions.values()) console.log(JSON.stringify({ ...value, complete: value.completeSurahs === 114 }))
    console.log(JSON.stringify({ editions: editions.size, completeEditions: [...editions.values()].filter(e => e.completeSurahs === 114).length }))
  } finally { await mongoose.disconnect() }
})().catch(e => { console.error(e.name); process.exitCode = 1 })

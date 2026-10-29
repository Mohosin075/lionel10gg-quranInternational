// Read-only: compare every published non-Quran snapshot page with MongoDB.
require('ts-node/register/transpile-only')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const config = require('../src/config').default
const { contentModels } = require('../src/app/modules/offline-pack/content-snapshot')
const { publishedContentFilter } = require('../src/app/modules/offline-pack/content-publication')
const fields = {
  hadith: ['translation'], dua: ['title', 'arabic', 'translation'],
  knowledge: ['title', 'content'], book: ['title', 'content'],
  fatwa: ['question', 'answer'], tafsir: ['text'],
}
async function get(module, params) {
  const response = await fetch('http://127.0.0.1:5005/api/v1/offline-pack/snapshot/' + module + '?' + new URLSearchParams(params), { signal: AbortSignal.timeout(60000) })
  assert.equal(response.status, 200, module + ' HTTP ' + response.status)
  return response.json()
}
;(async () => {
  try {
    await mongoose.connect(config.database_url)
    for (const [module, model] of Object.entries(contentModels)) {
      const languages = await model.distinct('lang', { isActive: { $ne: false } })
      for (const lang of languages) {
        const started = Date.now()
        const sourceFilter = { lang, isActive: { $ne: false } }
        const filter = publishedContentFilter(module, lang)
        const expected = new Set((await model.find(filter).select('_id').lean()).map(row => String(row._id)))
        const manifest = await get(module, { lang, metadata: 'true', limit: '1000' })
        assert.equal(manifest.meta.total, expected.size)
        const seen = new Set()
        let bytes = 0
        for (let page = 1; page <= manifest.meta.totalPages; page++) {
          const result = await get(module, { lang, limit: '1000', page: String(page), revision: manifest.meta.revision })
          assert.equal(result.meta.revision, manifest.meta.revision)
          for (const row of result.data) {
            assert.equal(row.lang, lang)
            assert.notEqual(row.isActive, false)
            const id = String(row._id)
            assert.ok(expected.has(id) && !seen.has(id), module + ': unexpected/duplicate ID')
            seen.add(id)
          }
          bytes += Buffer.byteLength(JSON.stringify(result.data))
        }
        assert.equal(seen.size, expected.size, module + ': truncated snapshot')
        const blank = {}
        const withheld = await model.countDocuments(sourceFilter) - expected.size
        for (const field of fields[module]) {
          blank[field] = await model.countDocuments({ ...filter, $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: /^\s*$/ }] })
        }
        if (module === 'book' && expected.size) {
          const sample = await model.findOne(filter).select('_id content').lean()
          const response = await fetch('http://127.0.0.1:5005/api/v1/knowledge-library/books/' + sample._id + '?lang=' + encodeURIComponent(lang), { signal: AbortSignal.timeout(60000) })
          assert.equal(response.status, 200)
          const body = await response.json()
          assert.equal(body.data.content, sample.content)
          assert.equal(body.data.lang, lang)
        }
        console.log(JSON.stringify({ module, lang, records: seen.size, pages: manifest.meta.totalPages, bytes, blank, withheld, milliseconds: Date.now() - started }))
      }
      const empty = await get(module, { lang: 'qzz', metadata: 'true' })
      assert.equal(empty.meta.total, 0, module + ': unrelated-language fallback')
    }
    console.log('All published module/language snapshot IDs match the database; book detail samples match.')
  } finally {
    await mongoose.disconnect()
  }
})().catch(error => { console.error(error.name + ': ' + error.message); process.exitCode = 1 })

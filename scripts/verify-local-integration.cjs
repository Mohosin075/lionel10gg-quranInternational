// Run from the backend repository while its local API is running.
// Creates isolated temporary fixtures; never sends notifications or charges a card.
require('ts-node/register/transpile-only')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const sharp = require('sharp')
process.chdir(path.resolve(__dirname, '..'))
const config = require('../src/config').default
const { User } = require('../src/app/modules/user/user.model')
const { Bookmark } = require('../src/app/modules/bookmark/bookmark.model')
const { Highlight } = require('../src/app/modules/highlight/highlight.model')
const { LastRead } = require('../src/app/modules/lastRead/lastRead.model')
const { Hadith } = require('../src/app/modules/hadith/hadith.model')
const base = 'http://127.0.0.1:5005/api/v1'
const nonce = crypto.randomUUID()
const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
const hadithId = new mongoose.Types.ObjectId()
const results = []
let uploaded
const token = index => jwt.sign({ authId: ids[index].toString(), role: 'user', email: 'integration-' + nonce + '-' + index + '@example.invalid' }, config.jwt.jwt_secret, { expiresIn: '5m' })
async function request(url, index, data, method = 'GET') {
  const response = await fetch(base + url, {
    method, signal: AbortSignal.timeout(30000),
    headers: { ...(index == null ? {} : { Authorization: 'Bearer ' + token(index) }), ...(data && !(data instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
  })
  const body = await response.json()
  assert.equal(response.status, 200, method + ' ' + url + ' returned HTTP ' + response.status)
  assert.equal(body.success, true)
  return body
}
;(async () => {
  try {
    await mongoose.connect(config.database_url, { serverSelectionTimeoutMS: 15000 })
    await User.collection.insertMany(ids.map((_id, index) => ({ _id, email: 'integration-' + nonce + '-' + index + '@example.invalid', name: 'Integration fixture', role: 'user', status: 'active', verified: true, totalHasanat: 0, hasanatEventIds: [], settings: { pushNotification: false, emailNotification: false }, createdAt: new Date(), updatedAt: new Date() })))
    const events = [
      { id: 'hasanat-' + nonce, kind: 'hasanat', payload: { amount: 25 } },
      { id: 'bookmark-' + nonce, kind: 'bookmark', payload: { surahNumber: 1, ayahNumber: 1, enabled: true, editionIdentifier: 'english_saheeh', text: '\u0627', translation: 'Fixture' } },
      { id: 'highlight-' + nonce, kind: 'highlight', payload: { surahNumber: 1, ayahNumber: 1, color: '#ffffff', text: '\u0627' } },
      { id: 'lastread-' + nonce, kind: 'lastRead', payload: { surahNumber: 1, ayahNumber: 2, editionIdentifier: 'english_saheeh' } },
    ]
    await request('/user/reading-sync', 0, { events }, 'POST')
    await request('/user/reading-sync', 0, { events }, 'POST')
    const state = (await request('/user/reading-sync', 0)).data
    assert.equal(state.totalHasanat, 25)
    assert.equal(state.bookmarks.length, 1)
    assert.equal(state.highlights.length, 1)
    assert.equal(state.lastRead.ayahNumber, 2)
    const other = (await request('/user/reading-sync', 1)).data
    assert.equal(other.bookmarks.length, 0)
    assert.equal(other.totalHasanat, 0)
    await request('/user/reading-sync', 0, { events: [
      { ...events[1], id: 'remove-bookmark-' + nonce, payload: { surahNumber: 1, ayahNumber: 1, enabled: false } },
      { ...events[2], id: 'remove-highlight-' + nonce, payload: { surahNumber: 1, ayahNumber: 1, color: null } },
    ] }, 'POST')
    const removed = (await request('/user/reading-sync', 0)).data
    assert.equal(removed.bookmarks.length, 0); assert.equal(removed.highlights.length, 0)
    results.push('reading replay, removals, account isolation: passed')
    const entitlement = await request('/subscription/my-subscription', 0)
    assert.equal(entitlement.data, null)
    results.push('explicit null entitlement: passed')
    const form = new FormData()
    form.append('data', JSON.stringify({ name: 'Integration updated fixture' }))
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toBuffer()
    form.append('images', new Blob([image], { type: 'image/png' }), 'fixture.png')
    await request('/user/profile', 0, form, 'PATCH')
    const profile = (await request('/user/profile', 0)).data
    assert.equal(profile.name, 'Integration updated fixture')
    uploaded = profile.profile
    const imageResponse = await fetch('http://127.0.0.1:5005' + uploaded, { signal: AbortSignal.timeout(10000) })
    assert.equal(imageResponse.status, 200)
    results.push('profile name and image upload/public serving: passed')
    const before = (await request('/offline-pack/snapshot/hadith?lang=qaa&metadata=true')).meta.revision
    await Hadith.create({ _id: hadithId, hadithNo: 'fixture-' + nonce, source: 'Integration fixture', chapter: 'Fixture', arabicText: '\u0627', translation: 'Fixture', category: 'Fixture', lang: 'qaa', version: 1, isActive: true })
    const snapshot = await request('/offline-pack/snapshot/hadith?lang=qaa&limit=1000')
    assert.ok(snapshot.data.some(row => row._id === hadithId.toString()))
    assert.notEqual(snapshot.meta.revision, before)
    await Hadith.updateOne({ _id: hadithId }, { $set: { isActive: false } })
    const after = await request('/offline-pack/snapshot/hadith?lang=qaa&limit=1000')
    assert.ok(!after.data.some(row => row._id === hadithId.toString()))
    assert.notEqual(after.meta.revision, snapshot.meta.revision)
    results.push('live snapshot create/delete revision: passed')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        Bookmark.deleteMany({ user: { $in: ids } }), Highlight.deleteMany({ user: { $in: ids } }),
        LastRead.deleteMany({ user: { $in: ids } }), User.deleteMany({ _id: { $in: ids } }), Hadith.deleteOne({ _id: hadithId }),
      ])
      results.push('temporary database fixtures removed')
    }
    if (uploaded) {
      const imageDir = path.resolve(process.cwd(), 'uploads/images')
      const target = path.resolve(imageDir, path.basename(uploaded))
      assert.ok(target.startsWith(imageDir + path.sep))
      if (fs.existsSync(target)) fs.unlinkSync(target)
      results.push('temporary uploaded image removed')
    }
    await mongoose.disconnect()
    for (const result of results) console.log(result)
  }
})().catch(error => { console.error('Live integration verification failed:', error.name, error.code || '', (error.stack || '').split('\n').slice(1,4).join('\n')); process.exitCode = 1 })

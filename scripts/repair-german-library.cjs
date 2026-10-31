// One-time, reviewed German library repair. Dry-run unless --apply is supplied.
// Titles come from the existing German body; Arabic body text is never edited.
require('ts-node/register/transpile-only')
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto')
const mongoose = require('mongoose')
const config = require('../src/config').default
const { KnowledgeBook } = require('../src/app/modules/knowledge-library/knowledge-book.model')
const { KnowledgeArticle } = require('../src/app/modules/knowledge-library/knowledge-library.model')
const { OfflinePack } = require('../src/app/modules/offline-pack/offline-pack.model')
const { readScopedContentRevision } = require('../src/app/modules/offline-pack/content-snapshot')
const sourceDir = path.join(os.tmpdir(), 'quran-german-language-audit')
const books = JSON.parse(fs.readFileSync(path.join(sourceDir, 'books.json'), 'utf8'))
const articles = JSON.parse(fs.readFileSync(path.join(sourceDir, 'articles.json'), 'utf8'))
const selected = new Set([
  1,2,3,6,8,9,10,11,12,16,17,18,19,20,21,22,27,28,29,30,31,
  37,38,39,40,41,42,43,44,45,46,47,48,49,50,64,65,66,67,68,69,71,
  74,75,76,77,78,81,83,84,85,86,88,89,90,91,92,93,94,98,99,100,
  106,107,113,116,117,118,122,123,124,125,126,127,128,132,133,137,
  140,141,142,145,147,148,150,151,152,153,154,155,156,157,158,159,
  160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,
  176,177,178,179,180,181,182,183,184,186,189,190,191,194,195,196,
  198,199,200,201,202,203,204,205,206,207,208,210,211,215,216,217,
  224,226,227,228,230,231,232,233,234,235,236,237,238,240,242,
  245,246,248,249,252,253,254,255,256,258,259,260,261,262,263,264,
  265,266,267,268,270,271,272,273,275,286,298,299,301,302,304,305,306,310,311,
])
const overrides = {
  1: 'Auszüge aus dem Sahih Muslim – Band 1',
  2: 'Muhammad (s) ist wahrlich Allahs Gesandter',
  6: 'Rechtschaffenheit und Sünde',
  74: 'Kurzer Hinweis zu Fasten und Zakatu-l-Fitr',
  91: 'Missverständnisse über Menschenrechte im Islam',
  106: 'Ist der Muslim der Fremde in dieser Welt?',
  116: 'Heirat und Ehe im Islam',
  125: 'Umar – der Unterscheider',
  127: 'Und seid standhaft',
  152: 'Die Grundlagen des politischen Systems im Islam',
  153: 'Die Grundlagen des politischen Systems im Islam',
  161: 'Die islamische Brüderlichkeit und ihr Nutzen',
  186: 'Valerie Wright, Ex-Christin, USA',
  201: 'Was sie über den Qur´an sagten',
  249: 'Äußerungen über den Propheten Muhammad',
  270: 'Der Islam: Die Religion der natürlichen Veranlagung („Fiṭrah“), des Verstands und der Glückseligkeit',
  271: 'Wer hat das Universum erschaffen? Und wer hat mich erschaffen? Und wieso?',
  275: 'Kurzabhandlung über den Ḥadīth: Wer mit dem Sprechen beginnt, ohne erst (mit As-Salām) zu grüßen, dem antwortet nicht',
  286: 'Wie geht der Islam mit Naturkatastrophen und Epidemien um?',
  298: 'Wahres Flehen und Lob an Gott, den Allmächtigen',
  299: 'Wahres Flehen und Lob an Gott, den Allmächtigen',
  301: 'Einige Kapitel über das Witr-Gebet',
  302: 'Anleitung zur Gebetswaschung, Ersatzwaschung und Ganzkörperwaschung',
  304: 'Das Bittgebet mittwochs, zwischen dem Mittags- und Nachmittagsgebet',
  305: 'Das Verbinden der Schultern und Füße im Gebet',
  306: 'Die Eheschließung ohne Vormund',
  310: 'Die Bestätigung der beiden Augen Aḷḷāhs',
  311: 'Die Biografie von Al-Ḥāfiẓ ʿAbdul-Ġanī Al-Maqdisī',
}
const articleOverrides = {
  'art-the-fruit-piety': 'Über die Früchte von Taqwah',
  'art-flow-fasting-and-falaah': '„Flow“, Fasten und Falaah',
  'art-mulakhas-huquq-daeat-iilayha-alfitrat-waqararatha-alshariea': 'Zusammenfassung der von der Fitrah geforderten und von der Scharia anerkannten Rechte',
  'art-sunan-alfitra': 'Natürliche Reinheitsrituale',
  'art-al-haiyyah-1': 'Das Gedicht Al-Ḥāʾiyyah über die Glaubensdoktrin der Ahlus-Sunnah wal-Jamāʿah',
  'art-al-haiyyah': 'Das Gedicht Al-Ḥāʾiyyah über die Glaubensdoktrin der Ahlus-Sunnah wal-Jamāʿah',
  'art-alhisab-alfalaky': 'Die astronomische Berechnung des Neumondes',
  'art-nawaqid-alislam': 'Nawāqiḍ Al-Islām – Die Auslöscher des Islams',
}
const englishArticleTitles = new Set([
  'Are We Alone','Prophets of Quran','Sorcery in Islam 1','Sorcery in Islam',
  'Liquid Gold The Benefits of Honey','Mormonism','Out of Egypt The Story of Passover in the Quran',
  'Principles of Self Development in Islam','Flow Fasting and Falaah','Fortunetelling','The Fruit Piety',
])
const plain = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const firstHeading = content => {
  const paragraphs = [...String(content).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  for (const p of paragraphs) {
    const lines = p[1].split(/<br\s*\/?\s*>/i).map(plain).filter(Boolean)
    if (!lines.length) continue
    // Reviewed candidates start with the German heading, followed by Arabic or metadata.
    return lines[0].replace(/\s*[\u0600-\u06ff\u0750-\u077f\ufb50-\ufeff].*$/, '').trim()
  }
  throw new Error('No source heading')
}
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex')
const broken = books.filter(row => (row.plainBody.match(/\p{L}/gu) || []).length === 0)
const planned = []
for (const [i, row] of books.entries()) if (selected.has(i + 1)) {
  const title = overrides[i + 1] || firstHeading(row.content)
  if (title.length < 3 || title.length > 200 || /^Deutsch|^German|\[Deutsch|^--|^\d+$/.test(title)) throw new Error('Invalid heading: ' + row.title)
  if (title !== row.title) planned.push({ module: 'book', id: row._id, title, oldTitle: row.title, bodyHash: hash(row.content) })
}
for (const row of articles) if (englishArticleTitles.has(row.title) || articleOverrides[row.articleId]) {
  const title = articleOverrides[row.articleId] || firstHeading(row.content)
  planned.push({ module: 'knowledge', id: String(row._id), title, oldTitle: row.title, bodyHash: hash(row.content) })
}
const apply = process.argv.includes('--apply')
;(async () => {
  try {
    await mongoose.connect(config.database_url)
    const models = {book: KnowledgeBook, knowledge: KnowledgeArticle}
    const before = {book: await KnowledgeBook.find({lang:'de'}).lean(), knowledge: await KnowledgeArticle.find({lang:'de'}).lean()}
    const otherLanguages = {}
    for (const [module,model] of Object.entries(models)) otherLanguages[module]=await readScopedContentRevision(model,{lang:{$ne:'de'}})
    const packs = await OfflinePack.find({lang:'de', module:{$in:['book','knowledge']}}).lean()
    for (const change of planned) {
      const row = before[change.module].find(row => String(row._id) === change.id)
      if (!row || row.title !== change.oldTitle || hash(row.content) !== change.bodyHash) throw new Error('Concurrent/source change: ' + change.id)
    }
    const root = path.join(os.tmpdir(), 'quran-german-language-audit')
    fs.writeFileSync(path.join(root,'repair-plan.json'), JSON.stringify({titles:planned,unpublish:broken.map(r=>({id:r._id,title:r.title,reason:'PDF extraction contains only page markers; full source text requires recovery'}))},null,2))
    console.log(JSON.stringify({apply,bookTitles:planned.filter(r=>r.module==='book').length,articleTitles:planned.filter(r=>r.module==='knowledge').length,unreadableBooks:broken.length}))
    if (!apply) return
    const backupDir = path.join('D:/Mohosin/backups/quran-international', 'german-library-' + new Date().toISOString().replace(/[:.]/g,'-'))
    fs.mkdirSync(backupDir,{recursive:true})
    // BSON Extended JSON preserves ObjectIds and dates for exact restoration.
    const EJSON = require('bson').EJSON
    fs.writeFileSync(path.join(backupDir,'before.ejson'),EJSON.stringify({before,packs,otherLanguages},null,2))
    fs.copyFileSync(path.join(root,'repair-plan.json'),path.join(backupDir,'repair-plan.json'))
    console.log('Backup saved: ' + backupDir)
    for (const change of planned) {
      const original = before[change.module].find(r=>String(r._id)===change.id)
      const result = await models[change.module].updateOne({_id:change.id,lang:'de',title:change.oldTitle,version:original.version},{$set:{title:change.title},$inc:{version:1}},{runValidators:true})
      if (result.modifiedCount!==1) throw new Error('Concurrent update: '+change.id)
    }
    for (const row of broken) {
      const original=before.book.find(r=>String(r._id)===row._id)
      const result=await KnowledgeBook.updateOne({_id:row._id,lang:'de',version:original.version},{$set:{isActive:false},$inc:{version:1}},{runValidators:true})
      if(result.modifiedCount!==1)throw new Error('Concurrent update: '+row._id)
    }
    for (const [module,model]of Object.entries(models)) {
      const after=await model.find({lang:'de'}).lean()
      if(after.length!==before[module].length)throw new Error('Unexpected record deletion')
      for(const row of after){const old=before[module].find(r=>String(r._id)===String(row._id));if(hash(row.content)!==hash(old.content))throw new Error('Body changed: '+row._id)}
      if(await readScopedContentRevision(model,{lang:{$ne:'de'}})!==otherLanguages[module])throw new Error('Other-language data changed during repair')
    }
    fs.writeFileSync(path.join(backupDir,'result.json'),JSON.stringify({verified:true,bookTitles:planned.filter(r=>r.module==='book').length,articleTitles:planned.filter(r=>r.module==='knowledge').length,unpublishedBooks:broken.length,allArabicAndGermanBodiesUnchanged:true},null,2))
    console.log('Verified: all original bodies unchanged, no record deleted; title versions advanced and unreadable books unpublished.')
  } finally {await mongoose.disconnect()}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1})

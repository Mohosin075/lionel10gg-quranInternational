// Publish the reviewed repair packs without deleting or overwriting old S3 objects.
// Dry-run by default. Explicit publication: node scripts/publish-german-repair-packs.cjs --publish
require('ts-node/register/transpile-only')
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib')
const mongoose = require('mongoose')
const { EJSON } = require('bson')
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const config = require('../src/config').default
const { KnowledgeBook } = require('../src/app/modules/knowledge-library/knowledge-book.model')
const { KnowledgeArticle } = require('../src/app/modules/knowledge-library/knowledge-library.model')
const { OfflinePack } = require('../src/app/modules/offline-pack/offline-pack.model')
const { publishedContentFilter } = require('../src/app/modules/offline-pack/content-publication')
const backup = 'D:/Mohosin/backups/quran-international/german-library-2026-10-31T03-57-07-139Z'
const publish = process.argv.includes('--publish')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const canonical = value => JSON.stringify(JSON.parse(JSON.stringify(value)), function (key, item) {
  return item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item
})
const rowHash = rows => hash(canonical([...rows].sort((a,b)=>String(a._id).localeCompare(String(b._id)))))
;(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g,'-')
  const result = {published: false, oldObjectsRetained: true, packs: []}
  let s3
  try {
    await mongoose.connect(config.database_url)
    const plan = JSON.parse(fs.readFileSync(path.join(backup,'repair-plan.json'),'utf8'))
    const prepared = []
    for (const [module, model, expected, previewVersion] of [
      ['book', KnowledgeBook, 306, 4], ['knowledge', KnowledgeArticle, 28, 6],
    ]) {
      const preview = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(backup,module+'_de_v'+previewVersion+'.preview.json.gz'))))
      const rows = await model.find(publishedContentFilter(module,'de')).lean()
      if (rows.length !== expected || rowHash(rows)!==rowHash(preview.data)) throw new Error('Database differs from reviewed preview: '+module)
      for (const edit of plan.titles.filter(r=>r.module===module)) {
        if (rows.find(r=>String(r._id)===edit.id)?.title!==edit.title) throw new Error('Missing corrected title')
      }
      if (module==='book' && rows.some(row=>plan.unpublish.some(b=>b.id===String(row._id)))) throw new Error('Unreadable book still published')
      const previous = await OfflinePack.findOne({module,lang:'de'}).lean()
      const version = Math.max(previewVersion,(previous?.version||0)+1)
      const payload = {...preview,version,generatedAt:new Date().toISOString()}
      const bytes = zlib.gzipSync(Buffer.from(JSON.stringify(payload)),{level:9})
      const sha256 = hash(bytes)
      const key = 'offline-packs/german-repair-'+stamp+'/'+module+'_de_v'+version+'.json.gz'
      prepared.push({module,model,previous,version,bytes,sha256,key,count:rows.length,sourceHash:rowHash(rows)})
      console.log(JSON.stringify({module,version,records:rows.length,sha256,publish}))
    }
    fs.writeFileSync(path.join(backup,'pack-metadata-before-'+stamp+'.ejson'),EJSON.stringify(prepared.map(r=>r.previous),null,2))
    if (!publish) return
    s3 = new S3Client({region:config.aws.region||'ap-southeast-1',maxAttempts:1,credentials:{accessKeyId:config.aws.access_key_id,secretAccessKey:config.aws.secret_access_key}})
    for (const item of prepared) {
      const {module,model,previous,version,bytes,sha256,key,count}=item
      // IfNoneMatch guarantees this operation cannot replace an existing object.
      await s3.send(new PutObjectCommand({Bucket:config.aws.bucket_name,Key:key,Body:bytes,IfNoneMatch:'*',ContentType:'application/octet-stream',ContentEncoding:'gzip',Metadata:{sha256,generatedAt:new Date().toISOString()}}),{abortSignal:AbortSignal.timeout(45000)})
      const remote = await s3.send(new GetObjectCommand({Bucket:config.aws.bucket_name,Key:key}),{abortSignal:AbortSignal.timeout(45000)})
      const downloaded = Buffer.from(await remote.Body.transformToByteArray())
      if (hash(downloaded)!==sha256 || remote.Metadata?.sha256!==sha256) throw new Error('S3 checksum mismatch: '+module)
      const decoded = JSON.parse(zlib.gunzipSync(downloaded))
      if (decoded.data.length!==count || rowHash(decoded.data)!==item.sourceHash) throw new Error('S3 content mismatch')
      if (rowHash(await model.find(publishedContentFilter(module,'de')).lean())!==item.sourceHash) throw new Error('Content changed during upload')
      const localDir=path.join(process.cwd(),'uploads/offline-packs')
      fs.mkdirSync(localDir,{recursive:true})
      if(previous){const oldFile=path.join(localDir,module+'_de_v'+previous.version+'.json.gz');if(fs.existsSync(oldFile))fs.copyFileSync(oldFile,path.join(backup,'old-'+module+'_de_v'+previous.version+'-'+stamp+'.json.gz'))}
      const local=path.join(localDir,module+'_de_v'+version+'.json.gz')
      if(fs.existsSync(local)&&hash(fs.readFileSync(local))!==sha256)throw new Error('Local version already exists with other content')
      fs.writeFileSync(local,bytes)
      const values={module,lang:'de',version,sha256,packSizeMb:Number((bytes.length/1048576).toFixed(3)),s3Key:key,recordCount:count,generatedAt:new Date()}
      if(previous){const update=await OfflinePack.updateOne({_id:previous._id,version:previous.version,sha256:previous.sha256},{$set:values},{runValidators:true});if(update.modifiedCount!==1)throw new Error('Concurrent pack metadata change')}
      else await OfflinePack.create(values)
      result.packs.push({module,version,sha256,records:count,s3Key:key,downloadVerified:true})
      fs.writeFileSync(path.join(backup,'pack-publication-'+stamp+'.json'),JSON.stringify(result,null,2))
      console.log('Published and verified: '+module+' v'+version)
    }
    result.published=true
    fs.writeFileSync(path.join(backup,'pack-publication-'+stamp+'.json'),JSON.stringify(result,null,2))
    console.log('Both packs verified in S3 and metadata updated. All previous local/S3 packs retained.')
  } finally {s3?.destroy();await mongoose.disconnect()}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1})

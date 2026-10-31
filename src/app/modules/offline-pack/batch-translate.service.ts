/**
 * OpenAI Batch Translation Service
 * ─────────────────────────────────
 * Uses OpenAI Batch API (gpt-4o-mini, 50% cheaper) to translate
 * Hadith / Dua / Knowledge content into 99+ languages asynchronously.
 *
 * Flow:
 *  1. Admin calls POST /offline-pack/batch-translate { module, targetLang }
 *  2. We create an OpenAI batch job (JSONL file upload → batch create)
 *  3. Admin polls GET /offline-pack/batch-status/:jobId
 *  4. When completed, we call processBatchResult → save to MongoDB
 *  5. Admin calls POST /offline-pack/generate to create the .json.gz pack
 */

import axios, { AxiosResponse } from 'axios'
import { Types, AnyBulkWriteOperation } from 'mongoose'
interface TranslationSource {
  _id: Types.ObjectId
  title?: string
  translation?: string
  chapter?: string
  category?: string
  text?: string
  content?: string
  question?: string
  answer?: string
}
const getApiError = (error: unknown) => {
  if (axios.isAxiosError(error))
    return {
      message: error.response?.data?.error?.message || error.message,
      status: error.response?.status || 500,
      data: error.response?.data,
    }
  return {
    message: error instanceof Error ? error.message : String(error),
    status: 500,
    data: undefined,
  }
}

import FormData from 'form-data'
import { Hadith } from '../hadith/hadith.model'
import { Dua } from '../dua/dua.model'
import { KnowledgeArticle } from '../knowledge-library/knowledge-library.model'
import { Translation } from '../quran/quran.model'
import { Tafsir } from '../tafsir/tafsir.model'
import { KnowledgeBook } from '../knowledge-library/knowledge-book.model'
import { KnowledgeFatwa } from '../knowledge-library/knowledge-fatwa.model'
import { BatchJob } from './batch-job.model'
import { SupportedModule } from './offline-pack.service'
import { publishedContentFilter } from './content-publication'
import { translationSourceLanguage, parseTranslationResponse, assertFullTranslationInput } from './translation-policy'

const OPENAI_API_URL = 'https://api.openai.com/v1'
const MODEL = 'gpt-4o-mini'

const authHeader = () => ({
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
})

// ─── Build system prompt ───────────────────────────────────────────────────────
const buildTranslationPrompt = (targetLang: string): string =>
  `You are an expert Islamic scholar and professional translator. Translate the following Islamic religious text accurately into language code "${targetLang}".
Preserve Islamic theological integrity, respect, and proper terminology.
Keep any structural keys like TITLE:, CONTENT:, AYAH:, TAFSIR:, TRANSLATION:, QUESTION:, ANSWER:, CHAPTER:, CATEGORY: intact in your response.
Return ONLY the translated formatted text, nothing else.`

// ─── Fetch source documents ────────────────────────────────────────────────────
const getSourceDocs = async (module: SupportedModule) => {
  const models = {hadith: Hadith, dua: Dua, knowledge: KnowledgeArticle, quran: Translation, tafsir: Tafsir, book: KnowledgeBook, fatwa: KnowledgeFatwa}
  const filter = publishedContentFilter(module, translationSourceLanguage(module))
  if (module === 'quran') filter.edition = 'english_saheeh'
  if (module === 'tafsir') filter.edition = 'arabic_moyassar'
  return await (models[module] as typeof Hadith).find(filter).lean() as unknown as TranslationSource[]
}

// ─── Build JSONL batch request payload ────────────────────────────────────────
const buildBatchJsonl = (
  docs: TranslationSource[],
  module: SupportedModule,
  targetLang: string,
): string => {
  const lines: string[] = []

  for (const doc of docs) {
    // Determine text fields to translate per module
    let textToTranslate: string
    if (module === 'hadith') {
      textToTranslate = `TRANSLATION: ${doc.translation}\nCHAPTER: ${doc.chapter}\nCATEGORY: ${doc.category}`
    } else if (module === 'dua') {
      textToTranslate = `TITLE: ${doc.title}\nTRANSLATION: ${doc.translation}`
    } else if (module === 'quran') {
      textToTranslate = `AYAH: ${doc.text}`
    } else if (module === 'tafsir') {
      textToTranslate = `TAFSIR: ${doc.text}`
    } else if (module === 'book') {
      const contentSnippet = doc.content || ''
      textToTranslate = `TITLE: ${doc.title}\nCONTENT: ${contentSnippet}`
    } else if (module === 'fatwa') {
      textToTranslate = `QUESTION: ${doc.question}\nANSWER: ${doc.answer || ''}`
    } else {
      // Always submit full content. Oversized records require a full manual translation.
      const contentSnippet = doc.content || ''
      textToTranslate = `TITLE: ${doc.title}\nCONTENT: ${contentSnippet}`
    }

    assertFullTranslationInput(textToTranslate, String(doc._id))
    const request = {
      custom_id: String(doc._id),
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: buildTranslationPrompt(targetLang) },
          { role: 'user', content: textToTranslate },
        ],
      },
    }
    lines.push(JSON.stringify(request))
  }

  return lines.join('\n')
}

// ─── Upload JSONL file to OpenAI ──────────────────────────────────────────────
const uploadBatchFile = async (jsonlContent: string): Promise<string> => {
  const formData = new FormData()
  formData.append('purpose', 'batch')
  formData.append('file', Buffer.from(jsonlContent, 'utf8'), {
    filename: 'batch_requests.jsonl',
    contentType: 'application/jsonl',
  })

  try {
    const res = await axios.post(`${OPENAI_API_URL}/files`, formData, {
      headers: { ...authHeader(), ...formData.getHeaders() },
    })
    return res.data.id // file_id
  } catch (err: unknown) {
    const openAiMsg = getApiError(err).message
    const wrapped = new Error(
      `OpenAI API Error (${getApiError(err).status}): ${openAiMsg}`,
    )
    Object.defineProperty(wrapped, 'cause', { value: err })
    throw wrapped
  }
}

// ─── Create OpenAI Batch Job ──────────────────────────────────────────────────
const createBatchJob = async (
  module: SupportedModule,
  targetLang: string,
): Promise<{
  jobId: string
  fileId: string
  recordCount: number
  estimatedMinutes: number
}> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in environment variables.')
  }

  if (targetLang.toLowerCase() === translationSourceLanguage(module)) {
    throw new Error(
      'The target matches this module source language. Manage its original content instead.',
    )
  }

  const existingActiveJob = await BatchJob.findOne({
    module,
    targetLang,
    status: { $in: ['in_progress', 'validating', 'finalizing'] },
  })
  if (existingActiveJob) {
    throw new Error(
      `An active translation job is already running for ${module.toUpperCase()} [${targetLang}]. Please wait for it to complete.`,
    )
  }

  const docs = await getSourceDocs(module)
  if (docs.length === 0)
    throw new Error(
      `No source documents found in database for module "${module}". Please add or seed initial content for ${module} first.`,
    )

  const jsonl = buildBatchJsonl(docs, module, targetLang)

  // 1. Upload JSONL file
  const fileId = await uploadBatchFile(jsonl)

  // 2. Create batch
  let batchRes: AxiosResponse<{ id: string }>
  try {
    batchRes = await axios.post(
      `${OPENAI_API_URL}/batches`,
      {
        input_file_id: fileId,
        endpoint: '/v1/chat/completions',
        completion_window: '24h',
        metadata: { module, targetLang, recordCount: String(docs.length) },
      },
      { headers: authHeader() },
    )
  } catch (err: unknown) {
    const openAiMsg = getApiError(err).message
    const wrapped = new Error(
      `OpenAI Batch Creation Failed (${getApiError(err).status}): ${openAiMsg}`,
    )
    Object.defineProperty(wrapped, 'cause', { value: err })
    throw wrapped
  }

  const batchId = batchRes.data.id
  const estimatedMinutes = Math.ceil(docs.length / 500) // rough estimate

  // 3. Persist job record
  await BatchJob.create({
    batchId,
    fileId,
    module,
    targetLang,
    status: 'in_progress',
    recordCount: docs.length,
    processedCount: 0,
  })

  console.log(
    `[BatchTranslate] ✅ Batch job created: ${batchId} | module=${module} lang=${targetLang} | ${docs.length} records`,
  )
  return { jobId: batchId, fileId, recordCount: docs.length, estimatedMinutes }
}

// ─── Check Batch Job Status ────────────────────────────────────────────────────
const checkBatchStatus = async (jobId: string) => {
  const res = await axios.get(`${OPENAI_API_URL}/batches/${jobId}`, {
    headers: authHeader(),
  })
  const batch = res.data

  // Update our local record
  await BatchJob.findOneAndUpdate(
    { batchId: jobId },
    {
      status: batch.status,
      processedCount: batch.request_counts?.completed || 0,
      outputFileId: batch.output_file_id || undefined,
      errorFileId: batch.error_file_id || undefined,
    },
  )

  return {
    jobId,
    status: batch.status, // in_progress | completed | failed | cancelled
    requestCounts: batch.request_counts,
    outputFileId: batch.output_file_id,
    errorFileId: batch.error_file_id,
    createdAt: batch.created_at,
    completedAt: batch.completed_at,
  }
}

// ─── Process Completed Batch → Save to MongoDB ───────────────────────────────
const processBatchResult = async (
  jobId: string,
): Promise<{ savedCount: number; errorCount: number }> => {
  const localJob = await BatchJob.findOne({ batchId: jobId })
  if (!localJob) throw new Error(`Batch job "${jobId}" not found in database.`)
  if (!localJob.outputFileId)
    throw new Error(
      `Batch "${jobId}" has no output file yet. Check status first.`,
    )

  const module = localJob.module as SupportedModule
  const targetLang = localJob.targetLang

  // Download output JSONL
  const fileRes = await axios.get(
    `${OPENAI_API_URL}/files/${localJob.outputFileId}/content`,
    {
      headers: authHeader(),
      responseType: 'text',
    },
  )

  const lines = (fileRes.data as string).split('\n').filter(l => l.trim())
  let savedCount = 0
  let errorCount = 0

  const bulkOps: AnyBulkWriteOperation<Record<string, unknown>>[] = []

  for (const line of lines) {
    try {
      const result = JSON.parse(line)
      if (result.error) {
        errorCount++
        continue
      }

      const docId = result.custom_id
      const fields = parseTranslationResponse(module, result)
      const translatedText: string = result.response.body.choices[0].message.content
      if (!translatedText) {
        errorCount++
        continue
      }

      if (module === 'hadith') {
        // Parse structured response
        const translationMatch = translatedText.match(
          /TRANSLATION:\s*([\s\S]*?)(?:\nCHAPTER:|$)/,
        )
        const chapterMatch = translatedText.match(
          /CHAPTER:\s*([\s\S]*?)(?:\nCATEGORY:|$)/,
        )
        const categoryMatch = translatedText.match(/CATEGORY:\s*([\s\S]*?)$/)

        const sourceDoc = await Hadith.findById(docId).lean()
        if (!sourceDoc) continue

        bulkOps.push({
          updateOne: {
            filter: { hadithNo: sourceDoc.hadithNo, lang: targetLang },
            update: {
              $set: {
                hadithNo: sourceDoc.hadithNo,
                source: sourceDoc.source,
                arabicText: sourceDoc.arabicText,
                authenticity: sourceDoc.authenticity,
                translation: fields.TRANSLATION,
                chapter: fields.CHAPTER,
                category: fields.CATEGORY,
                lang: targetLang,
                version: 1,
                isActive: true,
              },
            },
            upsert: true,
          },
        })
      } else if (module === 'dua') {
        const titleMatch = translatedText.match(
          /(?:TITLE|Title|শিরোনাম|TITRE|TITEL|TÍTULO):\s*([\s\S]*?)(?:\n(?:TRANSLATION|Translation|অনুবাদ|TRADUCTION|ÜBERSETZUNG|TRADUCCIÓN):|$)/i,
        )
        const translationMatch = translatedText.match(
          /(?:TRANSLATION|Translation|অনুবাদ|TRADUCTION|ÜBERSETZUNG|TRADUCCIÓN):\s*([\s\S]*?)$/i,
        )

        const sourceDoc = await Dua.findById(docId).lean()
        if (!sourceDoc) continue

        const title = fields.TITLE
        const translation = fields.TRANSLATION

        const filter = sourceDoc.externalId
          ? { externalId: sourceDoc.externalId, lang: targetLang }
          : { arabic: sourceDoc.arabic, lang: targetLang }

        bulkOps.push({
          updateOne: {
            filter,
            update: {
              $set: {
                externalId: sourceDoc.externalId,
                arabic: sourceDoc.arabic,
                audio: sourceDoc.audio,
                repeat: sourceDoc.repeat,
                reference: sourceDoc.reference,
                category: sourceDoc.category,
                transliteration: sourceDoc.transliteration,
                title: fields.TITLE,
                translation: fields.TRANSLATION,
                lang: targetLang,
                version: 1,
              },
            },
            upsert: true,
          },
        })
      } else if (module === 'knowledge') {
        const titleMatch = translatedText.match(
          /(?:TITLE|Title|শিরোনাম|TITRE):\s*([\s\S]*?)(?:\n(?:CONTENT|Content|বিষয়বস্তু|CONTENU):|$)/i,
        )
        const contentMatch = translatedText.match(
          /(?:CONTENT|Content|বিষয়বস্তু|CONTENU):\s*([\s\S]*?)$/i,
        )

        const sourceDoc = await KnowledgeArticle.findById(docId).lean()
        if (!sourceDoc) continue

        const title = fields.TITLE
        const content = fields.CONTENT

        bulkOps.push({
          updateOne: {
            filter: { articleId: sourceDoc.articleId, lang: targetLang },
            update: {
              $set: {
                articleId: sourceDoc.articleId,
                slug: sourceDoc.slug,
                category: sourceDoc.category,
                source: sourceDoc.source,
                readTime: sourceDoc.readTime,
                imageUrl: sourceDoc.imageUrl,
                audioUrl: sourceDoc.audioUrl,
                title: fields.TITLE,
                content: fields.CONTENT,
                lang: targetLang,
                version: 1,
                isActive: true,
              },
            },
            upsert: true,
          },
        })
      } else if (module === 'quran') {
        const ayahMatch = translatedText.match(
          /(?:AYAH|Ayah|আয়াত):\s*([\s\S]*?)$/i,
        )
        const sourceDoc = await Translation.findById(docId).lean()
        if (!sourceDoc) continue
        const text = fields.AYAH
        bulkOps.push({
          updateOne: {
            filter: {
              surah: sourceDoc.surah,
              ayah: sourceDoc.ayah,
              lang: targetLang,
              edition: `translated_${targetLang}`,
            },
            update: {
              $set: {
                surah: sourceDoc.surah,
                ayah: sourceDoc.ayah,
                lang: targetLang,
                edition: `translated_${targetLang}`,
                arabicText: sourceDoc.arabicText,
                text,
                footnotes: sourceDoc.footnotes,
                version: 1,
              },
            },
            upsert: true,
          },
        })
      } else if (module === 'tafsir') {
        const tafsirMatch = translatedText.match(
          /(?:TAFSIR|Tafsir|তাফসীর):\s*([\s\S]*?)$/i,
        )
        const sourceDoc = await Tafsir.findById(docId).lean()
        if (!sourceDoc) continue
        const text = fields.TAFSIR
        bulkOps.push({
          updateOne: {
            filter: {
              surah: sourceDoc.surah,
              ayah: sourceDoc.ayah,
              lang: targetLang,
              edition: `translated_${targetLang}`,
            },
            update: {
              $set: {
                surah: sourceDoc.surah,
                ayah: sourceDoc.ayah,
                lang: targetLang,
                edition: `translated_${targetLang}`,
                text,
                version: 1,
              },
            },
            upsert: true,
          },
        })
      } else if (module === 'book') {
        const titleMatch = translatedText.match(
          /(?:TITLE|Title):\s*([\s\S]*?)(?:\n(?:CONTENT|Content|DESCRIPTION|Description):|$)/i,
        )
        const contentMatch = translatedText.match(
          /(?:CONTENT|Content|DESCRIPTION|Description):\s*([\s\S]*?)$/i,
        )
        const sourceDoc = await KnowledgeBook.findById(docId).lean()
        if (!sourceDoc) continue
        const title = fields.TITLE
        const content = fields.CONTENT
        bulkOps.push({
          updateOne: {
            filter: { bookId: sourceDoc.bookId, lang: targetLang },
            update: {
              $set: {
                bookId: sourceDoc.bookId,
                title,
                content,
                author: sourceDoc.author,
                source: sourceDoc.source,
                lang: targetLang,
                version: 1,
                isActive: true,
              },
            },
            upsert: true,
          },
        })
      } else if (module === 'fatwa') {
        const qMatch = translatedText.match(
          /(?:QUESTION|Question):\s*([\s\S]*?)(?:\n(?:ANSWER|Answer):|$)/i,
        )
        const aMatch = translatedText.match(/(?:ANSWER|Answer):\s*([\s\S]*?)$/i)
        const sourceDoc = await KnowledgeFatwa.findById(docId).lean()
        if (!sourceDoc) continue
        const question = fields.QUESTION
        const answer = fields.ANSWER
        bulkOps.push({
          updateOne: {
            filter: { fatwaId: sourceDoc.fatwaId, lang: targetLang },
            update: {
              $set: {
                fatwaId: sourceDoc.fatwaId,
                question,
                answer,
                scholar: sourceDoc.scholar,
                lang: targetLang,
                version: 1,
                isActive: true,
              },
            },
            upsert: true,
          },
        })
      }

      savedCount++
    } catch (err) {
      errorCount++
      console.error(`[BatchTranslate] Error processing result line:`, err)
    }
  }

  // Bulk write in chunks of 1000
  const CHUNK = 1000
  for (let i = 0; i < bulkOps.length; i += CHUNK) {
    const chunk = bulkOps.slice(i, i + CHUNK)
    if (module === 'hadith') await Hadith.bulkWrite(chunk)
    else if (module === 'dua') await Dua.bulkWrite(chunk)
    else if (module === 'knowledge') await KnowledgeArticle.bulkWrite(chunk)
    else if (module === 'quran') await Translation.bulkWrite(chunk)
    else if (module === 'tafsir') await Tafsir.bulkWrite(chunk)
    else if (module === 'book') await KnowledgeBook.bulkWrite(chunk)
    else if (module === 'fatwa') await KnowledgeFatwa.bulkWrite(chunk)
  }

  // Mark job as processed
  await BatchJob.findOneAndUpdate(
    { batchId: jobId },
    { status: 'processed', processedCount: savedCount },
  )

  console.log(
    `[BatchTranslate] ✅ Processed job ${jobId}: saved=${savedCount} errors=${errorCount}`,
  )
  return { savedCount, errorCount }
}

const listBatchJobs = async () => {
  // Auto-sync status with OpenAI for any active jobs!
  if (process.env.OPENAI_API_KEY) {
    const activeJobs = await BatchJob.find({
      status: { $in: ['in_progress', 'validating', 'finalizing'] },
    }).limit(10)

    for (const job of activeJobs) {
      try {
        const res = await axios.get(
          `${OPENAI_API_URL}/batches/${job.batchId}`,
          {
            headers: authHeader(),
            timeout: 7000,
          },
        )
        const batch = res.data
        const newStatus = batch.status
        const completedCount = batch.request_counts?.completed || 0
        const outputFileId = batch.output_file_id || job.outputFileId

        await BatchJob.findOneAndUpdate(
          { batchId: job.batchId },
          {
            status: newStatus,
            processedCount: completedCount,
            outputFileId,
            errorFileId: batch.error_file_id,
          },
        )

        // If batch completed on OpenAI, auto-process into database!
        if (newStatus === 'completed' && outputFileId) {
          try {
            await processBatchResult(job.batchId)
          } catch (pErr) {
            console.error(
              `[BatchTranslate] Auto-process error for ${job.batchId}:`,
              pErr,
            )
          }
        }
      } catch (pollErr: unknown) {
        // Continue silently if rate-limited or transient network error
        console.warn(
          `[BatchTranslate] Poll error for ${job.batchId}:`,
          getApiError(pollErr).message,
        )
      }
    }
  }

  return await BatchJob.find({}).sort({ createdAt: -1 }).limit(100).lean()
}

const cancelBatchJob = async (jobId: string) => {
  if (process.env.OPENAI_API_KEY) {
    try {
      await axios.post(
        `${OPENAI_API_URL}/batches/${jobId}/cancel`,
        {},
        { headers: authHeader(), timeout: 7000 },
      )
      console.log(
        `[BatchTranslate] OpenAI batch ${jobId} cancellation requested.`,
      )
    } catch (err: unknown) {
      console.warn(
        `[BatchTranslate] OpenAI cancel call note:`,
        getApiError(err).data || getApiError(err).message,
      )
    }
  }

  const job = await BatchJob.findOneAndUpdate(
    { batchId: jobId },
    { status: 'cancelled', updatedAt: new Date() },
    { new: true },
  )
  return job
}

export const BatchTranslateService = {
  createBatchJob,
  checkBatchStatus,
  processBatchResult,
  listBatchJobs,
  cancelBatchJob,
}

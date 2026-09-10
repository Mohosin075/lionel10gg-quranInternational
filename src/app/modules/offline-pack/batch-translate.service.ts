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

import axios from 'axios';
import FormData from 'form-data';
import { Hadith } from '../hadith/hadith.model';
import { Dua } from '../dua/dua.model';
import { KnowledgeArticle } from '../knowledge-library/knowledge-library.model';
import { BatchJob } from './batch-job.model';
import { SupportedModule } from './offline-pack.service';

const OPENAI_API_URL = 'https://api.openai.com/v1';
const MODEL = 'gpt-4o-mini';

const authHeader = () => ({
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
});

// ─── Build system prompt ───────────────────────────────────────────────────────
const buildTranslationPrompt = (targetLang: string): string =>
  `You are a professional Islamic scholar and translator. Translate the following Islamic text accurately into language code "${targetLang}". 
  Always output each field with its exact English uppercase prefix (e.g. "TITLE: ...", "TRANSLATION: ...", "CHAPTER: ...", "CATEGORY: ...", "CONTENT: ...").
  Preserve all Arabic terms (like "Allah", "Hadith", "Sahih", "Du'a") accurately. 
  Return ONLY the translated formatted text, nothing else.`;

// ─── Fetch source documents ────────────────────────────────────────────────────
const getSourceDocs = async (module: SupportedModule) => {
  switch (module) {
    case 'hadith':
      return await Hadith.find({ lang: 'en', isActive: true })
        .select('_id hadithNo translation chapter category source authenticity arabicText')
        .lean();
    case 'dua':
      return await Dua.find({ lang: 'en' })
        .select('_id externalId title translation transliteration category reference arabic')
        .lean();
    case 'knowledge':
      return await KnowledgeArticle.find({ lang: 'en' })
        .select('_id articleId slug title content category source readTime imageUrl audioUrl')
        .lean();
    default:
      throw new Error(`Unsupported module: ${module}`);
  }
};

// ─── Build JSONL batch request payload ────────────────────────────────────────
const buildBatchJsonl = (
  docs: any[],
  module: SupportedModule,
  targetLang: string,
): string => {
  const lines: string[] = [];

  for (const doc of docs) {
    // Determine text fields to translate per module
    let textToTranslate: string;
    if (module === 'hadith') {
      textToTranslate = `TRANSLATION: ${doc.translation}\nCHAPTER: ${doc.chapter}\nCATEGORY: ${doc.category}`;
    } else if (module === 'dua') {
      textToTranslate = `TITLE: ${doc.title}\nTRANSLATION: ${doc.translation}`;
    } else {
      // Knowledge: translate title + first 2000 chars of content (to stay within token limit)
      const contentSnippet = (doc.content || '').slice(0, 2000);
      textToTranslate = `TITLE: ${doc.title}\nCONTENT: ${contentSnippet}`;
    }

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
    };
    lines.push(JSON.stringify(request));
  }

  return lines.join('\n');
};

// ─── Upload JSONL file to OpenAI ──────────────────────────────────────────────
const uploadBatchFile = async (jsonlContent: string): Promise<string> => {
  const formData = new FormData();
  formData.append('purpose', 'batch');
  formData.append('file', Buffer.from(jsonlContent, 'utf8'), {
    filename: 'batch_requests.jsonl',
    contentType: 'application/jsonl',
  });

  const res = await axios.post(`${OPENAI_API_URL}/files`, formData, {
    headers: { ...authHeader(), ...formData.getHeaders() },
  });
  return res.data.id; // file_id
};

// ─── Create OpenAI Batch Job ──────────────────────────────────────────────────
const createBatchJob = async (
  module: SupportedModule,
  targetLang: string,
): Promise<{ jobId: string; fileId: string; recordCount: number; estimatedMinutes: number }> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in environment variables.');
  }

  if (targetLang.toLowerCase() === 'en') {
    throw new Error('English is the primary source language and does not require translation.');
  }

  const existingActiveJob = await BatchJob.findOne({
    module,
    targetLang,
    status: { $in: ['in_progress', 'validating', 'finalizing'] },
  });
  if (existingActiveJob) {
    throw new Error(`An active translation job is already running for ${module.toUpperCase()} [${targetLang}]. Please wait for it to complete.`);
  }

  const docs = await getSourceDocs(module);
  if (docs.length === 0) throw new Error(`No English source documents found for module "${module}".`);

  const jsonl = buildBatchJsonl(docs, module, targetLang);

  // 1. Upload JSONL file
  const fileId = await uploadBatchFile(jsonl);

  // 2. Create batch
  const batchRes = await axios.post(
    `${OPENAI_API_URL}/batches`,
    {
      input_file_id: fileId,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
      metadata: { module, targetLang, recordCount: String(docs.length) },
    },
    { headers: authHeader() },
  );

  const batchId = batchRes.data.id;
  const estimatedMinutes = Math.ceil(docs.length / 500); // rough estimate

  // 3. Persist job record
  await BatchJob.create({
    batchId,
    fileId,
    module,
    targetLang,
    status: 'in_progress',
    recordCount: docs.length,
    processedCount: 0,
  });

  console.log(`[BatchTranslate] ✅ Batch job created: ${batchId} | module=${module} lang=${targetLang} | ${docs.length} records`);
  return { jobId: batchId, fileId, recordCount: docs.length, estimatedMinutes };
};

// ─── Check Batch Job Status ────────────────────────────────────────────────────
const checkBatchStatus = async (jobId: string) => {
  const res = await axios.get(`${OPENAI_API_URL}/batches/${jobId}`, {
    headers: authHeader(),
  });
  const batch = res.data;

  // Update our local record
  await BatchJob.findOneAndUpdate(
    { batchId: jobId },
    {
      status: batch.status,
      processedCount: batch.request_counts?.completed || 0,
      outputFileId: batch.output_file_id || undefined,
      errorFileId: batch.error_file_id || undefined,
    },
  );

  return {
    jobId,
    status: batch.status, // in_progress | completed | failed | cancelled
    requestCounts: batch.request_counts,
    outputFileId: batch.output_file_id,
    errorFileId: batch.error_file_id,
    createdAt: batch.created_at,
    completedAt: batch.completed_at,
  };
};

// ─── Process Completed Batch → Save to MongoDB ───────────────────────────────
const processBatchResult = async (jobId: string): Promise<{ savedCount: number; errorCount: number }> => {
  const localJob = await BatchJob.findOne({ batchId: jobId });
  if (!localJob) throw new Error(`Batch job "${jobId}" not found in database.`);
  if (!localJob.outputFileId) throw new Error(`Batch "${jobId}" has no output file yet. Check status first.`);

  const module = localJob.module as SupportedModule;
  const targetLang = localJob.targetLang;

  // Download output JSONL
  const fileRes = await axios.get(`${OPENAI_API_URL}/files/${localJob.outputFileId}/content`, {
    headers: authHeader(),
    responseType: 'text',
  });

  const lines = (fileRes.data as string).split('\n').filter((l) => l.trim());
  let savedCount = 0;
  let errorCount = 0;

  const bulkOps: any[] = [];

  for (const line of lines) {
    try {
      const result = JSON.parse(line);
      if (result.error) { errorCount++; continue; }

      const docId = result.custom_id;
      const translatedText: string = result.response?.body?.choices?.[0]?.message?.content || '';
      if (!translatedText) { errorCount++; continue; }

      if (module === 'hadith') {
        // Parse structured response
        const translationMatch = translatedText.match(/TRANSLATION:\s*([\s\S]*?)(?:\nCHAPTER:|$)/);
        const chapterMatch = translatedText.match(/CHAPTER:\s*([\s\S]*?)(?:\nCATEGORY:|$)/);
        const categoryMatch = translatedText.match(/CATEGORY:\s*([\s\S]*?)$/);

        const sourceDoc = await Hadith.findById(docId).lean();
        if (!sourceDoc) continue;

        bulkOps.push({
          updateOne: {
            filter: { hadithNo: sourceDoc.hadithNo, lang: targetLang },
            update: {
              $set: {
                hadithNo: sourceDoc.hadithNo,
                source: sourceDoc.source,
                arabicText: sourceDoc.arabicText,
                authenticity: sourceDoc.authenticity,
                translation: translationMatch?.[1]?.trim() || translatedText,
                chapter: chapterMatch?.[1]?.trim() || sourceDoc.chapter,
                category: categoryMatch?.[1]?.trim() || sourceDoc.category,
                lang: targetLang,
                version: 1,
                isActive: true,
              },
            },
            upsert: true,
          },
        });
      } else if (module === 'dua') {
        const titleMatch = translatedText.match(/(?:TITLE|Title|শিরোনাম|TITRE|TITEL|TÍTULO):\s*([\s\S]*?)(?:\n(?:TRANSLATION|Translation|অনুবাদ|TRADUCTION|ÜBERSETZUNG|TRADUCCIÓN):|$)/i);
        const translationMatch = translatedText.match(/(?:TRANSLATION|Translation|অনুবাদ|TRADUCTION|ÜBERSETZUNG|TRADUCCIÓN):\s*([\s\S]*?)$/i);

        const sourceDoc = await Dua.findById(docId).lean();
        if (!sourceDoc) continue;

        let title = titleMatch?.[1]?.trim();
        let translation = translationMatch?.[1]?.trim();

        if (!title || !translation) {
          const parts = translatedText.split('\n\n');
          if (parts.length >= 2) {
            title = title || parts[0].replace(/^(?:TITLE|Title|শিরোনাম|TITRE):\s*/i, '').trim();
            translation = translation || parts.slice(1).join('\n\n').replace(/^(?:TRANSLATION|Translation|অনুবাদ|TRADUCTION):\s*/i, '').trim();
          } else {
            const lines = translatedText.split('\n');
            if (lines.length >= 2) {
              title = title || lines[0].replace(/^(?:TITLE|Title|শিরোনাম|TITRE):\s*/i, '').trim();
              translation = translation || lines.slice(1).join('\n').replace(/^(?:TRANSLATION|Translation|অনুবাদ|TRADUCTION):\s*/i, '').trim();
            } else {
              title = title || sourceDoc.title;
              translation = translation || translatedText;
            }
          }
        }

        if (title === sourceDoc.title && translation.includes(':')) {
          const colonIdx = translation.indexOf(':');
          title = translation.slice(0, colonIdx).trim();
          translation = translation.slice(colonIdx + 1).trim();
        }

        const filter = sourceDoc.externalId
          ? { externalId: sourceDoc.externalId, lang: targetLang }
          : { arabic: sourceDoc.arabic, lang: targetLang };

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
                title: title || sourceDoc.title,
                translation: translation || translatedText,
                lang: targetLang,
                version: 1,
              },
            },
            upsert: true,
          },
        });
      } else if (module === 'knowledge') {
        const titleMatch = translatedText.match(/(?:TITLE|Title|শিরোনাম|TITRE):\s*([\s\S]*?)(?:\n(?:CONTENT|Content|বিষয়বস্তু|CONTENU):|$)/i);
        const contentMatch = translatedText.match(/(?:CONTENT|Content|বিষয়বস্তু|CONTENU):\s*([\s\S]*?)$/i);

        const sourceDoc = await KnowledgeArticle.findById(docId).lean();
        if (!sourceDoc) continue;

        let title = titleMatch?.[1]?.trim();
        let content = contentMatch?.[1]?.trim();

        if (!title || !content) {
          const parts = translatedText.split('\n\n');
          if (parts.length >= 2) {
            title = title || parts[0].trim();
            content = content || parts.slice(1).join('\n\n').trim();
          } else {
            title = title || sourceDoc.title;
            content = content || translatedText;
          }
        }

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
                title: title || sourceDoc.title,
                content: content || sourceDoc.content,
                lang: targetLang,
                version: 1,
                isActive: true,
              },
            },
            upsert: true,
          },
        });
      }

      savedCount++;
    } catch (err) {
      errorCount++;
      console.error(`[BatchTranslate] Error processing result line:`, err);
    }
  }

  // Bulk write in chunks of 1000
  const CHUNK = 1000;
  for (let i = 0; i < bulkOps.length; i += CHUNK) {
    const chunk = bulkOps.slice(i, i + CHUNK);
    if (module === 'hadith') await Hadith.bulkWrite(chunk);
    else if (module === 'dua') await Dua.bulkWrite(chunk);
    else if (module === 'knowledge') await KnowledgeArticle.bulkWrite(chunk);
  }

  // Mark job as processed
  await BatchJob.findOneAndUpdate({ batchId: jobId }, { status: 'processed', processedCount: savedCount });

  console.log(`[BatchTranslate] ✅ Processed job ${jobId}: saved=${savedCount} errors=${errorCount}`);
  return { savedCount, errorCount };
};

const listBatchJobs = async () => {
  // Auto-sync status with OpenAI for any active jobs!
  if (process.env.OPENAI_API_KEY) {
    const activeJobs = await BatchJob.find({
      status: { $in: ['in_progress', 'validating', 'finalizing'] },
    }).limit(10);

    for (const job of activeJobs) {
      try {
        const res = await axios.get(`${OPENAI_API_URL}/batches/${job.batchId}`, {
          headers: authHeader(),
          timeout: 7000,
        });
        const batch = res.data;
        const newStatus = batch.status;
        const completedCount = batch.request_counts?.completed || 0;
        const outputFileId = batch.output_file_id || job.outputFileId;

        await BatchJob.findOneAndUpdate(
          { batchId: job.batchId },
          {
            status: newStatus,
            processedCount: completedCount,
            outputFileId,
            errorFileId: batch.error_file_id,
          },
        );

        // If batch completed on OpenAI, auto-process into database!
        if (newStatus === 'completed' && outputFileId) {
          try {
            await processBatchResult(job.batchId);
          } catch (pErr) {
            console.error(`[BatchTranslate] Auto-process error for ${job.batchId}:`, pErr);
          }
        }
      } catch (pollErr: any) {
        // Continue silently if rate-limited or transient network error
        console.warn(`[BatchTranslate] Poll error for ${job.batchId}:`, pollErr?.message);
      }
    }
  }

  return await BatchJob.find({}).sort({ createdAt: -1 }).limit(100).lean();
};

const cancelBatchJob = async (jobId: string) => {
  if (process.env.OPENAI_API_KEY) {
    try {
      await axios.post(
        `${OPENAI_API_URL}/batches/${jobId}/cancel`,
        {},
        { headers: authHeader(), timeout: 7000 }
      );
      console.log(`[BatchTranslate] OpenAI batch ${jobId} cancellation requested.`);
    } catch (err: any) {
      console.warn(`[BatchTranslate] OpenAI cancel call note:`, err?.response?.data || err?.message);
    }
  }

  const job = await BatchJob.findOneAndUpdate(
    { batchId: jobId },
    { status: 'cancelled', updatedAt: new Date() },
    { new: true }
  );
  return job;
};

export const BatchTranslateService = {
  createBatchJob,
  checkBatchStatus,
  processBatchResult,
  listBatchJobs,
  cancelBatchJob,
};


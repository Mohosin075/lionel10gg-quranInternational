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
  Preserve all Arabic terms (like "Allah", "Hadith", "Sahih") as-is. 
  Return ONLY the translated text, nothing else.`;

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
        const titleMatch = translatedText.match(/TITLE:\s*([\s\S]*?)(?:\nTRANSLATION:|$)/);
        const translationMatch = translatedText.match(/TRANSLATION:\s*([\s\S]*?)$/);

        const sourceDoc = await Dua.findById(docId).lean();
        if (!sourceDoc) continue;

        bulkOps.push({
          updateOne: {
            // externalId may be null/sparse — fall back to _id-based upsert if missing
            filter: sourceDoc.externalId
              ? { externalId: sourceDoc.externalId, lang: targetLang }
              : { _id: new (require('mongoose').Types.ObjectId)(), lang: targetLang }, // new doc
            update: {
              $set: {
                externalId: sourceDoc.externalId,
                arabic: sourceDoc.arabic,
                audio: sourceDoc.audio,
                repeat: sourceDoc.repeat,
                reference: sourceDoc.reference,
                category: sourceDoc.category,
                title: titleMatch?.[1]?.trim() || sourceDoc.title,
                translation: translationMatch?.[1]?.trim() || translatedText,
                lang: targetLang,
                version: 1,
              },
            },
            upsert: true,
          },
        });
      } else if (module === 'knowledge') {
        const titleMatch = translatedText.match(/TITLE:\s*([\s\S]*?)(?:\nCONTENT:|$)/);
        const contentMatch = translatedText.match(/CONTENT:\s*([\s\S]*?)$/);

        const sourceDoc = await KnowledgeArticle.findById(docId).lean();
        if (!sourceDoc) continue;

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
                title: titleMatch?.[1]?.trim() || sourceDoc.title,
                content: contentMatch?.[1]?.trim() || sourceDoc.content,
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
  return await BatchJob.find({}).sort({ createdAt: -1 }).limit(100).lean();
};

export const BatchTranslateService = {
  createBatchJob,
  checkBatchStatus,
  processBatchResult,
  listBatchJobs,
};

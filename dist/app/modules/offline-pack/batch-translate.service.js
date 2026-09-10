"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchTranslateService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const hadith_model_1 = require("../hadith/hadith.model");
const dua_model_1 = require("../dua/dua.model");
const knowledge_library_model_1 = require("../knowledge-library/knowledge-library.model");
const batch_job_model_1 = require("./batch-job.model");
const OPENAI_API_URL = 'https://api.openai.com/v1';
const MODEL = 'gpt-4o-mini';
const authHeader = () => ({
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
});
// ─── Build system prompt ───────────────────────────────────────────────────────
const buildTranslationPrompt = (targetLang) => `You are a professional Islamic scholar and translator. Translate the following Islamic text accurately into language code "${targetLang}". 
  Preserve all Arabic terms (like "Allah", "Hadith", "Sahih") as-is. 
  Return ONLY the translated text, nothing else.`;
// ─── Fetch source documents ────────────────────────────────────────────────────
const getSourceDocs = async (module) => {
    switch (module) {
        case 'hadith':
            return await hadith_model_1.Hadith.find({ lang: 'en', isActive: true })
                .select('_id hadithNo translation chapter category source authenticity arabicText')
                .lean();
        case 'dua':
            return await dua_model_1.Dua.find({ lang: 'en' })
                .select('_id externalId title translation transliteration category reference arabic')
                .lean();
        case 'knowledge':
            return await knowledge_library_model_1.KnowledgeArticle.find({ lang: 'en' })
                .select('_id articleId slug title content category source readTime imageUrl audioUrl')
                .lean();
        default:
            throw new Error(`Unsupported module: ${module}`);
    }
};
// ─── Build JSONL batch request payload ────────────────────────────────────────
const buildBatchJsonl = (docs, module, targetLang) => {
    const lines = [];
    for (const doc of docs) {
        // Determine text fields to translate per module
        let textToTranslate;
        if (module === 'hadith') {
            textToTranslate = `TRANSLATION: ${doc.translation}\nCHAPTER: ${doc.chapter}\nCATEGORY: ${doc.category}`;
        }
        else if (module === 'dua') {
            textToTranslate = `TITLE: ${doc.title}\nTRANSLATION: ${doc.translation}`;
        }
        else {
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
const uploadBatchFile = async (jsonlContent) => {
    const formData = new form_data_1.default();
    formData.append('purpose', 'batch');
    formData.append('file', Buffer.from(jsonlContent, 'utf8'), {
        filename: 'batch_requests.jsonl',
        contentType: 'application/jsonl',
    });
    const res = await axios_1.default.post(`${OPENAI_API_URL}/files`, formData, {
        headers: { ...authHeader(), ...formData.getHeaders() },
    });
    return res.data.id; // file_id
};
// ─── Create OpenAI Batch Job ──────────────────────────────────────────────────
const createBatchJob = async (module, targetLang) => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not set in environment variables.');
    }
    const docs = await getSourceDocs(module);
    if (docs.length === 0)
        throw new Error(`No English source documents found for module "${module}".`);
    const jsonl = buildBatchJsonl(docs, module, targetLang);
    // 1. Upload JSONL file
    const fileId = await uploadBatchFile(jsonl);
    // 2. Create batch
    const batchRes = await axios_1.default.post(`${OPENAI_API_URL}/batches`, {
        input_file_id: fileId,
        endpoint: '/v1/chat/completions',
        completion_window: '24h',
        metadata: { module, targetLang, recordCount: String(docs.length) },
    }, { headers: authHeader() });
    const batchId = batchRes.data.id;
    const estimatedMinutes = Math.ceil(docs.length / 500); // rough estimate
    // 3. Persist job record
    await batch_job_model_1.BatchJob.create({
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
const checkBatchStatus = async (jobId) => {
    var _a;
    const res = await axios_1.default.get(`${OPENAI_API_URL}/batches/${jobId}`, {
        headers: authHeader(),
    });
    const batch = res.data;
    // Update our local record
    await batch_job_model_1.BatchJob.findOneAndUpdate({ batchId: jobId }, {
        status: batch.status,
        processedCount: ((_a = batch.request_counts) === null || _a === void 0 ? void 0 : _a.completed) || 0,
        outputFileId: batch.output_file_id || undefined,
        errorFileId: batch.error_file_id || undefined,
    });
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
const processBatchResult = async (jobId) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const localJob = await batch_job_model_1.BatchJob.findOne({ batchId: jobId });
    if (!localJob)
        throw new Error(`Batch job "${jobId}" not found in database.`);
    if (!localJob.outputFileId)
        throw new Error(`Batch "${jobId}" has no output file yet. Check status first.`);
    const module = localJob.module;
    const targetLang = localJob.targetLang;
    // Download output JSONL
    const fileRes = await axios_1.default.get(`${OPENAI_API_URL}/files/${localJob.outputFileId}/content`, {
        headers: authHeader(),
        responseType: 'text',
    });
    const lines = fileRes.data.split('\n').filter((l) => l.trim());
    let savedCount = 0;
    let errorCount = 0;
    const bulkOps = [];
    for (const line of lines) {
        try {
            const result = JSON.parse(line);
            if (result.error) {
                errorCount++;
                continue;
            }
            const docId = result.custom_id;
            const translatedText = ((_e = (_d = (_c = (_b = (_a = result.response) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '';
            if (!translatedText) {
                errorCount++;
                continue;
            }
            if (module === 'hadith') {
                // Parse structured response
                const translationMatch = translatedText.match(/TRANSLATION:\s*([\s\S]*?)(?:\nCHAPTER:|$)/);
                const chapterMatch = translatedText.match(/CHAPTER:\s*([\s\S]*?)(?:\nCATEGORY:|$)/);
                const categoryMatch = translatedText.match(/CATEGORY:\s*([\s\S]*?)$/);
                const sourceDoc = await hadith_model_1.Hadith.findById(docId).lean();
                if (!sourceDoc)
                    continue;
                bulkOps.push({
                    updateOne: {
                        filter: { hadithNo: sourceDoc.hadithNo, lang: targetLang },
                        update: {
                            $set: {
                                hadithNo: sourceDoc.hadithNo,
                                source: sourceDoc.source,
                                arabicText: sourceDoc.arabicText,
                                authenticity: sourceDoc.authenticity,
                                translation: ((_f = translationMatch === null || translationMatch === void 0 ? void 0 : translationMatch[1]) === null || _f === void 0 ? void 0 : _f.trim()) || translatedText,
                                chapter: ((_g = chapterMatch === null || chapterMatch === void 0 ? void 0 : chapterMatch[1]) === null || _g === void 0 ? void 0 : _g.trim()) || sourceDoc.chapter,
                                category: ((_h = categoryMatch === null || categoryMatch === void 0 ? void 0 : categoryMatch[1]) === null || _h === void 0 ? void 0 : _h.trim()) || sourceDoc.category,
                                lang: targetLang,
                                version: 1,
                                isActive: true,
                            },
                        },
                        upsert: true,
                    },
                });
            }
            else if (module === 'dua') {
                const titleMatch = translatedText.match(/TITLE:\s*([\s\S]*?)(?:\nTRANSLATION:|$)/);
                const translationMatch = translatedText.match(/TRANSLATION:\s*([\s\S]*?)$/);
                const sourceDoc = await dua_model_1.Dua.findById(docId).lean();
                if (!sourceDoc)
                    continue;
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
                                title: ((_j = titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[1]) === null || _j === void 0 ? void 0 : _j.trim()) || sourceDoc.title,
                                translation: ((_k = translationMatch === null || translationMatch === void 0 ? void 0 : translationMatch[1]) === null || _k === void 0 ? void 0 : _k.trim()) || translatedText,
                                lang: targetLang,
                                version: 1,
                            },
                        },
                        upsert: true,
                    },
                });
            }
            else if (module === 'knowledge') {
                const titleMatch = translatedText.match(/TITLE:\s*([\s\S]*?)(?:\nCONTENT:|$)/);
                const contentMatch = translatedText.match(/CONTENT:\s*([\s\S]*?)$/);
                const sourceDoc = await knowledge_library_model_1.KnowledgeArticle.findById(docId).lean();
                if (!sourceDoc)
                    continue;
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
                                title: ((_l = titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[1]) === null || _l === void 0 ? void 0 : _l.trim()) || sourceDoc.title,
                                content: ((_m = contentMatch === null || contentMatch === void 0 ? void 0 : contentMatch[1]) === null || _m === void 0 ? void 0 : _m.trim()) || sourceDoc.content,
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
        }
        catch (err) {
            errorCount++;
            console.error(`[BatchTranslate] Error processing result line:`, err);
        }
    }
    // Bulk write in chunks of 1000
    const CHUNK = 1000;
    for (let i = 0; i < bulkOps.length; i += CHUNK) {
        const chunk = bulkOps.slice(i, i + CHUNK);
        if (module === 'hadith')
            await hadith_model_1.Hadith.bulkWrite(chunk);
        else if (module === 'dua')
            await dua_model_1.Dua.bulkWrite(chunk);
        else if (module === 'knowledge')
            await knowledge_library_model_1.KnowledgeArticle.bulkWrite(chunk);
    }
    // Mark job as processed
    await batch_job_model_1.BatchJob.findOneAndUpdate({ batchId: jobId }, { status: 'processed', processedCount: savedCount });
    console.log(`[BatchTranslate] ✅ Processed job ${jobId}: saved=${savedCount} errors=${errorCount}`);
    return { savedCount, errorCount };
};
const listBatchJobs = async () => {
    return await batch_job_model_1.BatchJob.find({}).sort({ createdAt: -1 }).limit(100).lean();
};
exports.BatchTranslateService = {
    createBatchJob,
    checkBatchStatus,
    processBatchResult,
    listBatchJobs,
};

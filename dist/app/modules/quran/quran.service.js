"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuranServices = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const quran_model_1 = require("./quran.model");
const quran_worker_1 = require("./quran.worker");
const quran_constants_1 = require("./quran.constants");
const QURAN_ENC_URL = 'https://quranenc.com/api/v1';
const QURAN_COM_URL = 'https://api.quran.com/api/v4';
const resolveAudioUrl = (surahNumber, ayahNumber, reciterId) => {
    const s = surahNumber.toString().padStart(3, '0');
    const a = ayahNumber.toString().padStart(3, '0');
    if (reciterId) {
        const reciter = quran_constants_1.POPULAR_RECITERS.find((r) => r.id === reciterId.toLowerCase() || r.urlKey.toLowerCase() === reciterId.toLowerCase());
        if (reciter) {
            return `https://everyayah.com/data/${reciter.urlKey}/${s}${a}.mp3`;
        }
    }
    // Global Audio Logic: Recitation is always in original Arabic. Default is Mishary Rashid Alafasy.
    return `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
};
const fetchLanguages = async (page = 1, limit = 200, language, localization, edition) => {
    const skip = (page - 1) * limit;
    // 1. Try to fetch from DB first
    let query = {};
    if (language) {
        query.language = language;
    }
    if (edition) {
        query.key = edition;
    }
    let dbLanguages = await quran_model_1.Language.find(query).sort({ language: 1, name: 1 }).skip(skip).limit(limit).lean();
    let total = await quran_model_1.Language.countDocuments(query);
    // 2. If DB is empty or missing full_language_name/iso, fetch from API
    const needsRefresh = dbLanguages.length > 0 && !dbLanguages.every(l => l.full_language_name && l.iso);
    if (dbLanguages.length === 0 || needsRefresh) {
        // Fetch from API
        let encUrl = `${QURAN_ENC_URL}/translations/list`;
        if (language) {
            encUrl += `/${language}`;
        }
        if (localization) {
            encUrl += `?localization=${localization}`;
        }
        const comTranslationsUrl = `${QURAN_COM_URL}/resources/translations`;
        const comLanguagesUrl = `${QURAN_COM_URL}/resources/languages`;
        const [encResponse, comTransResponse, comLangResponse] = await Promise.all([
            axios_1.default.get(encUrl).catch(() => ({ data: { translations: [] } })),
            axios_1.default.get(comTranslationsUrl).catch(() => ({ data: { translations: [] } })),
            axios_1.default.get(comLanguagesUrl).catch(() => ({ data: { languages: [] } }))
        ]);
        const langMap = new Map();
        const isoToNameMap = new Map();
        (comLangResponse.data.languages || []).forEach((l) => {
            langMap.set(l.name.toLowerCase(), l.iso_code);
            isoToNameMap.set(l.iso_code, l.name);
        });
        const encTranslations = (encResponse.data.translations || []).map((t) => ({
            key: t.key,
            name: t.title,
            language: t.language_iso_code,
            iso: t.language_iso_code,
            full_language_name: isoToNameMap.get(t.language_iso_code) || t.language_iso_code,
            author: t.description,
            source: 'quranenc'
        }));
        const comTranslations = (comTransResponse.data.translations || []).map((t) => {
            const langName = t.language_name.toLowerCase();
            const iso = langMap.get(langName) || t.language_name;
            return {
                key: `qcom:${t.id}`,
                name: t.name,
                language: iso,
                iso: iso,
                full_language_name: t.language_name,
                author: t.author_name,
                source: 'qurancom'
            };
        });
        const allTranslations = [...encTranslations, ...comTranslations];
        // Save to DB
        if (allTranslations.length > 0) {
            await quran_model_1.Language.bulkWrite(allTranslations.map((t) => ({
                updateOne: {
                    filter: { key: t.key },
                    update: { $set: t },
                    upsert: true,
                },
            })));
        }
        dbLanguages = await quran_model_1.Language.find(query).sort({ language: 1, name: 1 }).skip(skip).limit(limit).lean();
        total = await quran_model_1.Language.countDocuments(query);
    }
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        },
        data: dbLanguages
    };
};
const fetchSurahs = async (page = 1, limit = 10, language) => {
    const skip = (page - 1) * limit;
    const total = quran_constants_1.SURAH_LIST.length;
    let data = quran_constants_1.SURAH_LIST.slice(skip, skip + limit);
    if (language && language !== 'en') {
        try {
            const response = await axios_1.default.get(`${QURAN_COM_URL}/chapters?language=${language}`);
            const chapters = response.data.chapters;
            if (chapters && chapters.length > 0) {
                data = data.map(surah => {
                    const chapter = chapters.find((c) => c.id === surah.number);
                    if (chapter && chapter.translated_name) {
                        return {
                            ...surah,
                            translatedName: chapter.translated_name.name
                        };
                    }
                    return surah;
                });
            }
        }
        catch (error) {
            console.error('Failed to fetch translated surah names:', error);
        }
    }
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        },
        data
    };
};
const resolveTranslationKey = async (translationKey) => {
    if (!translationKey)
        return 'english_saheeh';
    const langDoc = await quran_model_1.Language.findOne({
        $or: [
            { key: translationKey },
            { language: translationKey.toLowerCase() },
            { iso: translationKey.toLowerCase() }
        ]
    }).lean();
    if (langDoc) {
        return langDoc.key;
    }
    return translationKey;
};
const getSurahDetail = async (surahNumber, translationKey = 'english_saheeh', lang, reciter) => {
    // 1. Get Surah Metadata from local constant
    const surahInfo = quran_constants_1.SURAH_LIST.find((s) => s.number === surahNumber);
    if (!surahInfo) {
        throw new Error(`Surah ${surahNumber} not found`);
    }
    // Handle 'ar' or 'quran-uthmani' as edition
    const isArabicOnly = translationKey === 'ar' || translationKey === 'quran-uthmani';
    if (isArabicOnly) {
        translationKey = 'quran-uthmani';
    }
    translationKey = await resolveTranslationKey(translationKey);
    // 2. Check if translations exist in DB
    let ayahsData = await getSurahTranslations(surahNumber, translationKey);
    // 3. If not found, trigger ingestion (ETL)
    if (!ayahsData.length) {
        // Determine the correct language for this edition
        let targetLang = lang;
        if (!targetLang || targetLang === 'en') {
            const langInfo = await quran_model_1.Language.findOne({ key: translationKey });
            if (langInfo) {
                targetLang = langInfo.language;
            }
            else {
                targetLang = targetLang || 'en';
            }
        }
        await (0, quran_worker_1.ingestSurahTranslations)(surahNumber, translationKey, targetLang);
        ayahsData = await getSurahTranslations(surahNumber, translationKey);
    }
    // 4. Format response
    const ayahs = ayahsData.map((item) => {
        return {
            number: item.ayah,
            text: item.arabicText || '',
            translation: isArabicOnly ? '' : (item.text || ''),
            footnotes: isArabicOnly ? '' : (item.footnotes || ''),
            audio: resolveAudioUrl(surahNumber, item.ayah, reciter),
        };
    });
    return {
        ...surahInfo,
        ayahs,
        edition: translationKey,
    };
};
const getAyah = async (surah, ayah, translationKey = 'english_saheeh', lang, reciter) => {
    translationKey = await resolveTranslationKey(translationKey);
    let result = await quran_model_1.Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    if (!result) {
        // Determine the correct language for this edition
        let targetLang = lang;
        if (!targetLang || targetLang === 'en') {
            const langInfo = await quran_model_1.Language.findOne({ key: translationKey });
            if (langInfo) {
                targetLang = langInfo.language;
            }
            else {
                targetLang = targetLang || 'en';
            }
        }
        // Trigger ingestion for the whole surah for better UX later
        await (0, quran_worker_1.ingestSurahTranslations)(surah, translationKey, targetLang);
        result = await quran_model_1.Translation.findOne({ surah, ayah, edition: translationKey }).lean();
    }
    if (result) {
        result.audio = resolveAudioUrl(surah, ayah, reciter);
        result.shareUrl = `quraninternational://surah/${surah}/ayah/${ayah}`;
        result.shareText = `${result.arabicText || ''}\n[Quran ${surah}:${ayah}]`;
    }
    return result;
};
const searchQuran = async (keyword, translationKey = 'english_saheeh', page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    translationKey = await resolveTranslationKey(translationKey);
    const query = {
        edition: translationKey,
        text: { $regex: keyword, $options: 'i' },
    };
    const results = await quran_model_1.Translation.find(query)
        .sort({ surah: 1, ayah: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await quran_model_1.Translation.countDocuments(query);
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: results,
    };
};
const getDailyInspiration = async (translationKey = 'english_saheeh') => {
    translationKey = await resolveTranslationKey(translationKey);
    const count = await quran_model_1.Translation.countDocuments({ edition: translationKey });
    if (count === 0) {
        return { surah: 1, ayah: 1, text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' };
    }
    const randomSkip = Math.floor(Math.random() * count);
    let ayah = await quran_model_1.Translation.findOne({ edition: translationKey }).skip(randomSkip).lean();
    if (!ayah) {
        return { surah: 1, ayah: 1, text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' };
    }
    return ayah;
};
const upsertTranslations = async (batch) => {
    return await quran_model_1.Translation.bulkWrite(batch.map((doc) => ({
        updateOne: {
            filter: {
                surah: doc.surah,
                ayah: doc.ayah,
                lang: doc.lang,
                edition: doc.edition,
            },
            update: { $set: doc },
            upsert: true,
        },
    })));
};
const getSurahTranslations = async (surah, translationKey) => {
    return await quran_model_1.Translation.find({
        surah,
        edition: translationKey,
    }).sort({ ayah: 1 }).lean();
};
const getTranslationVersion = async (translationKey) => {
    const latest = await quran_model_1.Translation.findOne({ edition: translationKey }).sort({ version: -1 }).select('version');
    return (latest === null || latest === void 0 ? void 0 : latest.version) || 1;
};
// Sync System Logic
const checkSyncMetadata = async (translationKey, clientVersion) => {
    const serverVersion = await getTranslationVersion(translationKey);
    return {
        updateAvailable: serverVersion > clientVersion,
        serverVersion,
        clientVersion
    };
};
const clampSyncLimit = (limit) => {
    const n = Number(limit) || 500;
    return Math.min(Math.max(n, 1), 1000);
};
/**
 * Paginated dump for offline-first clients.
 * Pages in Mongo (skip/limit) — does not load the full edition into RAM.
 * Returns ayah rows the Flutter app can insert into SQLite.
 */
const getSyncData = async (translationKey, fromVersion = 0, page = 1, limit = 500) => {
    const safeLimit = clampSyncLimit(limit);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const filter = {
        edition: translationKey,
        version: { $gt: fromVersion },
    };
    let total = await quran_model_1.Translation.countDocuments(filter);
    // First fill: empty edition → ingest all 114 surahs once, then dump
    if (total === 0 && fromVersion === 0) {
        const langInfo = await quran_model_1.Language.findOne({ key: translationKey });
        await (0, quran_worker_1.syncLanguage)(translationKey, langInfo === null || langInfo === void 0 ? void 0 : langInfo.language);
        total = await quran_model_1.Translation.countDocuments(filter);
    }
    const data = await quran_model_1.Translation.find(filter)
        .sort({ surah: 1, ayah: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean();
    const rows = data.map(item => ({
        surah: item.surah,
        number: item.ayah,
        text: item.arabicText || '',
        translation: item.text || '',
        footnotes: item.footnotes || '',
        audio: resolveAudioUrl(item.surah, item.ayah),
        edition: item.edition,
        lang: item.lang,
        version: item.version,
    }));
    return {
        data: rows,
        meta: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
    };
};
const getGzippedLanguagePack = async (translationKey) => {
    const latestVersion = await getTranslationVersion(translationKey);
    const dirPath = path_1.default.join(process.cwd(), 'uploads/lang-packs');
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path_1.default.join(dirPath, `lang_${translationKey}_v${latestVersion}.json.gz`);
    // Check if cached file exists
    if (fs_1.default.existsSync(filePath)) {
        return filePath;
    }
    // Fetch from Mongo
    let data = await quran_model_1.Translation.find({ edition: translationKey }).sort({ surah: 1, ayah: 1 }).lean();
    // Ingest if empty
    if (data.length === 0) {
        const langInfo = await quran_model_1.Language.findOne({ key: translationKey });
        await (0, quran_worker_1.syncLanguage)(translationKey, langInfo === null || langInfo === void 0 ? void 0 : langInfo.language);
        data = await quran_model_1.Translation.find({ edition: translationKey }).sort({ surah: 1, ayah: 1 }).lean();
    }
    const rows = data.map(item => ({
        surah: item.surah,
        number: item.ayah,
        text: item.arabicText || '',
        translation: item.text || '',
        footnotes: item.footnotes || '',
        audio: resolveAudioUrl(item.surah, item.ayah),
        edition: item.edition,
        lang: item.lang,
        version: item.version,
    }));
    const jsonStr = JSON.stringify(rows);
    const compressed = zlib_1.default.gzipSync(jsonStr);
    fs_1.default.writeFileSync(filePath, compressed);
    // Clean up older versions
    try {
        const files = fs_1.default.readdirSync(dirPath);
        for (const file of files) {
            if (file.startsWith(`lang_${translationKey}_v`) &&
                file.endsWith('.json.gz') &&
                file !== `lang_${translationKey}_v${latestVersion}.json.gz`) {
                fs_1.default.unlinkSync(path_1.default.join(dirPath, file));
            }
        }
    }
    catch (_) { }
    return filePath;
};
const syncEdition = async (edition) => {
    // Run in background
    (0, quran_worker_1.syncLanguage)(edition);
};
const syncAll = async () => {
    // Run in background
    (0, quran_worker_1.syncAllLanguages)();
};
exports.QuranServices = {
    fetchLanguages,
    fetchSurahs,
    getSurahDetail,
    getAyah,
    searchQuran,
    getDailyInspiration,
    upsertTranslations,
    getSurahTranslations,
    getTranslationVersion,
    checkSyncMetadata,
    getSyncData,
    syncEdition,
    syncAll,
    getGzippedLanguagePack
};

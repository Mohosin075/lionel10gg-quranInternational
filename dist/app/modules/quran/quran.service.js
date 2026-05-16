"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuranServices = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
const axios_1 = __importDefault(require("axios"));
const quran_model_1 = require("./quran.model");
const quran_worker_1 = require("./quran.worker");
const quran_constants_1 = require("./quran.constants");
const QURAN_ENC_URL = 'https://quranenc.com/api/v1';
const QURAN_COM_URL = 'https://api.quran.com/api/v4';
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
const getSurahDetail = async (surahNumber, translationKey = 'english_saheeh', lang) => {
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
    // Determine audio key
    let audioKey = quran_constants_1.DEFAULT_AUDIO_KEY;
    // First check if translationKey is in available audio translations
    if (quran_constants_1.AUDIO_TRANSLATIONS.includes(translationKey)) {
        audioKey = translationKey;
    }
    // Then check if lang (or targetLang) has a mapping
    else if (lang && quran_constants_1.LANGUAGE_TO_AUDIO_KEY[lang]) {
        audioKey = quran_constants_1.LANGUAGE_TO_AUDIO_KEY[lang];
    }
    // Also check language from translation if available
    else {
        const langInfo = await quran_model_1.Language.findOne({ key: translationKey });
        if (langInfo && quran_constants_1.LANGUAGE_TO_AUDIO_KEY[langInfo.language]) {
            audioKey = quran_constants_1.LANGUAGE_TO_AUDIO_KEY[langInfo.language];
        }
    }
    // 4. Format response
    const ayahs = ayahsData.map((item) => {
        const s = surahNumber.toString().padStart(3, '0');
        const a = item.ayah.toString().padStart(3, '0');
        return {
            number: item.ayah,
            text: item.arabicText || '',
            translation: isArabicOnly ? undefined : (item.text || ''),
            footnotes: isArabicOnly ? undefined : (item.footnotes || ''),
            audio: `https://d.quranenc.com/data/audio/${audioKey}/${s}${a}.mp3`,
        };
    });
    return {
        ...surahInfo,
        ayahs,
        edition: translationKey,
    };
};
const getAyah = async (surah, ayah, translationKey = 'english_saheeh', lang) => {
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
        const s = surah.toString().padStart(3, '0');
        const a = ayah.toString().padStart(3, '0');
        // Determine audio key
        let audioKey = quran_constants_1.DEFAULT_AUDIO_KEY;
        // First check if translationKey is in available audio translations
        if (quran_constants_1.AUDIO_TRANSLATIONS.includes(translationKey)) {
            audioKey = translationKey;
        }
        // Then check if lang (or targetLang) has a mapping
        else if (lang && quran_constants_1.LANGUAGE_TO_AUDIO_KEY[lang]) {
            audioKey = quran_constants_1.LANGUAGE_TO_AUDIO_KEY[lang];
        }
        // Also check language from translation if available
        else {
            const langInfo = await quran_model_1.Language.findOne({ key: translationKey });
            if (langInfo && quran_constants_1.LANGUAGE_TO_AUDIO_KEY[langInfo.language]) {
                audioKey = quran_constants_1.LANGUAGE_TO_AUDIO_KEY[langInfo.language];
            }
        }
        result.audio = `https://d.quranenc.com/data/audio/${audioKey}/${s}${a}.mp3`;
    }
    return result;
};
const searchQuran = async (keyword, translationKey = 'english_saheeh', page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
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
    const randomAyahNumber = Math.floor(Math.random() * 6236) + 1;
    // For simplicity, we fetch a random one from DB if available, otherwise fallback
    let ayah = await quran_model_1.Translation.findOne({ edition: translationKey }).skip(randomAyahNumber).lean();
    if (!ayah) {
        // If not in DB, we could fetch from API, but better to just pick from what we have
        // or return a default for now.
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
const getSyncData = async (translationKey, fromVersion = 0) => {
    // Fetch translations that have a version greater than client version
    return await quran_model_1.Translation.find({
        edition: translationKey,
        version: { $gt: fromVersion }
    }).sort({ surah: 1, ayah: 1 }).lean();
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
    syncAll
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTranslationResponse = exports.assertFullTranslationInput = exports.translationSourceLanguage = void 0;
// Canonical sources must not mix translated duplicates or different editions.
const sources = {
    hadith: 'en', dua: 'en', knowledge: 'de', book: 'de', fatwa: 'de',
    quran: 'en', tafsir: 'ar',
};
const markers = {
    hadith: ['TRANSLATION', 'CHAPTER', 'CATEGORY'], dua: ['TITLE', 'TRANSLATION'],
    knowledge: ['TITLE', 'CONTENT'], book: ['TITLE', 'CONTENT'],
    fatwa: ['QUESTION', 'ANSWER'], quran: ['AYAH'], tafsir: ['TAFSIR'],
};
const translationSourceLanguage = (module) => {
    if (!sources[module])
        throw new Error('Unsupported translation module');
    return sources[module];
};
exports.translationSourceLanguage = translationSourceLanguage;
const assertFullTranslationInput = (text, id) => {
    // Conservative single-request policy, not a model context-window limit.
    // Never turn a long book into a translated snippet labelled as a full book.
    if (text.length > 6000)
        throw new Error(`Record ${id} exceeds the single-document translation policy. Upload a complete manual translation; no batch has been submitted.`);
};
exports.assertFullTranslationInput = assertFullTranslationInput;
const parseTranslationResponse = (module, result) => {
    var _a, _b, _c, _d, _e, _f;
    const choice = (_c = (_b = (_a = result.response) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.choices) === null || _c === void 0 ? void 0 : _c[0];
    if (result.error || ((_d = result.response) === null || _d === void 0 ? void 0 : _d.status_code) !== 200 || (choice === null || choice === void 0 ? void 0 : choice.finish_reason) !== 'stop' || ((_e = choice === null || choice === void 0 ? void 0 : choice.message) === null || _e === void 0 ? void 0 : _e.refusal))
        throw new Error('Incomplete or refused translation response');
    const text = choice.message.content;
    if (typeof text !== 'string')
        throw new Error('Missing translation body');
    const required = markers[module];
    if (!required)
        throw new Error('Unsupported translation module');
    const matches = [...text.matchAll(/^(TITLE|CONTENT|AYAH|TAFSIR|TRANSLATION|QUESTION|ANSWER|CHAPTER|CATEGORY):[ \t]*/gm)];
    if (matches.length !== required.length || matches.some((match, i) => match[1] !== required[i]) || text.slice(0, (_f = matches[0]) === null || _f === void 0 ? void 0 : _f.index).trim())
        throw new Error('Malformed translation fields');
    const fields = {};
    matches.forEach((match, i) => {
        var _a, _b;
        const body = text.slice(match.index + match[0].length, (_b = (_a = matches[i + 1]) === null || _a === void 0 ? void 0 : _a.index) !== null && _b !== void 0 ? _b : text.length).trim();
        if (!body)
            throw new Error('Empty translated field');
        fields[match[1]] = body;
    });
    return fields;
};
exports.parseTranslationResponse = parseTranslationResponse;

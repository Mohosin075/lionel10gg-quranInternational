"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationHelper = void 0;
const google_translate_api_1 = require("@vitalets/google-translate-api");
/**
 * Reusable helper utility for translation operations.
 */
exports.TranslationHelper = {
    /**
     * Translates a string from source language to target language using google-translate-api.
     * @param text The input text to be translated.
     * @param tl The target language code (e.g. 'de', 'en', 'bn').
     * @param sl The source language code (defaults to 'en').
     */
    translateText: async (text, tl, sl = 'en') => {
        if (!text || !text.trim())
            return '';
        try {
            const res = await (0, google_translate_api_1.translate)(text, { from: sl, to: tl });
            return res.text || text;
        }
        catch (error) {
            console.error(`[TranslationHelper] Error translating from ${sl} to ${tl}:`, error);
            throw error;
        }
    },
    /**
     * Helper utility to insert delay for rate limiting.
     * @param ms Delay time in milliseconds.
     */
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

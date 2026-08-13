"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationHelper = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Reusable helper utility for translation operations.
 */
exports.TranslationHelper = {
    /**
     * Translates a string from source language to target language using Google's single translate endpoint.
     * @param text The input text to be translated.
     * @param tl The target language code (e.g. 'de', 'en', 'bn').
     * @param sl The source language code (defaults to 'en').
     */
    translateText: async (text, tl, sl = 'en') => {
        if (!text || !text.trim())
            return '';
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t`;
            const res = await axios_1.default.post(url, new URLSearchParams({ q: text }).toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            let translated = '';
            if (res.data && res.data[0]) {
                for (const segment of res.data[0]) {
                    translated += segment[0];
                }
            }
            return translated || text;
        }
        catch (error) {
            console.error(`[TranslationHelper] Error translating from ${sl} to ${tl}:`, error);
            return text; // Graceful fallback to original text on failure
        }
    },
    /**
     * Helper utility to insert delay for rate limiting.
     * @param ms Delay time in milliseconds.
     */
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

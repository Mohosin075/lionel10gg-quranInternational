"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationHelper = void 0;
/**
 * Translation Helper (Deprecated: Translations are managed via OpenAI Batch API in Dashboard)
 */
exports.TranslationHelper = {
    translateText: async (text, _tl, _sl = 'en') => {
        return text || '';
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

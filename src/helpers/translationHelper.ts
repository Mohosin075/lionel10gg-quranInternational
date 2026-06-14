import axios from 'axios';

/**
 * Reusable helper utility for translation operations.
 */
export const TranslationHelper = {
  /**
   * Translates a string from source language to target language using Google's single translate endpoint.
   * @param text The input text to be translated.
   * @param tl The target language code (e.g. 'de', 'en', 'bn').
   * @param sl The source language code (defaults to 'en').
   */
  translateText: async (text: string, tl: string, sl: string = 'en'): Promise<string> => {
    if (!text || !text.trim()) return '';
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await axios.get(url);
      
      let translated = '';
      if (res.data && res.data[0]) {
        for (const segment of res.data[0]) {
          translated += segment[0];
        }
      }
      return translated || text;
    } catch (error) {
      console.error(`[TranslationHelper] Error translating from ${sl} to ${tl}:`, error);
      return text; // Graceful fallback to original text on failure
    }
  },

  /**
   * Helper utility to insert delay for rate limiting.
   * @param ms Delay time in milliseconds.
   */
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
};

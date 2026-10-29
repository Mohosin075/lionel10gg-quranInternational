/**
 * Translation Helper (Deprecated: Translations are managed via OpenAI Batch API in Dashboard)
 */
export const TranslationHelper = {
  translateText: async (
    text: string,
    _tl: string,
    _sl: string = 'en',
  ): Promise<string> => {
    void _tl
    void _sl
    return text || ''
  },

  sleep: (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms)),
}

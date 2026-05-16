Audio translations
Base URL / https://d.quranenc.com/data/audio/{translation_key}/{sura_3digits}{aya_3digits}.mp3

Description:  Audio files for each aya are served as static MP3 files. The URL is constructed from the translation key and the sura/aya numbers each zero-padded to 3 digits.

Available translation keys (additional languages in progress):
portuguese_nasr
dutch_center
tagalog_rwwad
chinese_suliman
vietnamese_rwwad
persian_ih
assamese_rafeeq
sinhalese_mahir
somali_yacob
Parameters:
translation_key: One of the keys listed above.

sura_3digits: Sura number zero-padded to 3 digits (001–114)

aya_3digits: Aya number zero-padded to 3 digits (001–…)

Returns: MP3 audio file (audio/mpeg). Returns HTTP 404 if the file does not exist for the given translation/sura/aya.


URL construction example (JavaScript):

function audioUrl(translationKey, sura, aya) {
  const s = String(sura).padStart(3, '0');
  const a = String(aya).padStart(3, '0');
  return `https://d.quranenc.com/data/audio/${translationKey}/${s}${a}.mp3`;
}

// Sura 1, Aya 1 — Chinese Suliman
audioUrl('chinese_suliman', 1, 1);
// → "https://d.quranenc.com/data/audio/chinese_suliman/001001.mp3"

// Sura 18, Aya 110
audioUrl('chinese_suliman', 18, 110);
// → "https://d.quranenc.com/data/audio/chinese_suliman/018110.mp3"
Example URLs:
https://d.quranenc.com/data/audio/chinese_suliman/001001.mp3 (Sura 1, Aya 1)
https://d.quranenc.com/data/audio/chinese_suliman/002255.mp3 (Sura 2, Aya 255 — Ayat Al-Kursi)
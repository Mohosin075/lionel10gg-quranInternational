Quran International Features Implementation Plan (Revised)
This plan focuses on implementing Tafsir, Hasanat Counter, and Duas, following the existing module-based architecture of the project. The subscription feature is excluded as per the latest request.

User Review Required
NOTE

Since the subscription feature is excluded, all features (Tafsir, Hasanat, Audio) will be accessible for all Surahs by default unless you specify a different gating logic.

Proposed Changes
1. Tafsir Module
Following the quran module pattern (Ingestion + Storage).

[NEW] 
tafsir.interface.ts
ITafsir (surah, ayah, lang, edition, text).
[NEW] 
tafsir.model.ts
Mongoose schema with indexes on surah, ayah, and lang.
[NEW] 
tafsir.service.ts
getTafsir: Fetch from DB, or trigger worker to ingest from QuranEnc if missing.
[NEW] 
tafsir.worker.ts
Logic to fetch Tafsir from https://quranenc.com/api/v1/translation/sura/... and save to DB.
[NEW] 
tafsir.controller.ts
Standard controller methods.
[NEW] 
tafsir.route.ts
Endpoint: /tafsir/:surah/:ayah
2. Hasanat Module
Updating the User profile and adding collection logic.

[MODIFY] 
user.interface.ts
Add totalHasanat: number.
[MODIFY] 
user.model.ts
Add totalHasanat with default 0.
[NEW] 
hasanat.controller.ts
collectHasanat: Increment the user's totalHasanat balance.
[NEW] 
hasanat.route.ts
Endpoint: /hasanat/collect (POST)
3. Dua Module
New module for supplications.

[NEW] 
dua.interface.ts
IDua (title, arabic, translation, category, audio).
[NEW] 
dua.model.ts
Mongoose schema for Duas.
[NEW] 
dua.route.ts
Endpoint: /duas (GET)
4. Audio Integration
The existing QuranServices.getSurahDetail already constructs audio URLs. We will ensure these remain functional and optimized.
5. Routes Registration
[MODIFY] 
routes/index.ts
Add tafsir, hasanat, and dua routes.
Verification Plan
Automated Tests
Verify Tafsir ingestion from QuranEnc.
Verify Hasanat balance updates for a user.
Verify Duas can be retrieved.
Manual Verification
Check API response structure against the current project patterns (Success/Error wrappers).
# Local integration and offline behavior

The backend, dashboard and Flutter app use one local API on port 5005. The current Android LAN default is `http://10.10.26.208:5005/api/v1`; override `API_BASE_URL` when the machine address changes. The dashboard uses `NEXT_PUBLIC_BASEURL=http://localhost:5005`.

## Language and content

Online language selection uses the complete translation catalog. A new Quran selection must load and validate Surah 1 before the selected edition is committed. Quran responses repair incomplete source caches and refuse incomplete/malformed Surahs instead of silently using another translation.

Offline selectors offer only editions containing all 114 Surahs with their canonical Ayah counts, Arabic text and translations. Catalog entries, old download flags, partial downloads and corrupt text do not mark a language ready. The language screen lists the modules actually available online or saved on-device. Audio files and full book bodies have their own downloads; text readiness does not imply all audio is downloaded.

Hadith, Dua, Tafsir, articles, books and fatwas sync through `/offline-pack/snapshot/:module`. A collection fingerprint detects edits, inserts and deletions, including low-version records. Clients validate a complete revision before atomically replacing only that module/language. Failed or changed downloads retain the previous cache and checkpoint. Quran sync also uses a content fingerprint and fills missing Surahs.

Library, Quran and Tafsir reads remain scoped to the requested language/edition. Unpublished translations produce an empty/unavailable state; they are not fabricated. Content for missing languages must be published through the dashboard and its existing translation/content workflow. The first download needs connectivity; this project does not bundle every language and audio file into a fresh installation.

SQLite schema version 24 adds language to the Tafsir primary key, retaining existing rows during upgrade.

## Account and payment behavior

Reading mutations and their account-scoped outbox events commit in the same SQLite transaction. Reconnect/restart retries reuse event IDs; Hasanat increments are deduplicated atomically by the server. Bookmarks, highlights and last-read restore through `/user/reading-sync`. Guest reading stays on-device, separately from signed-in account state.

Profile name/image edits use the authenticated profile API. Account email remains read-only in the profile editor.

Stripe checkout uses real catalog IDs/currencies and owned local return URLs. Pending sessions are retained across restarts and verified against their owner, product, payment state and provider subscription period. Trials are persisted and treated as premium until their verified expiry. Transient failures retain valid offline entitlement. Lifetime verification replay preserves the original expiry.

Current mobile checkout uses hosted Stripe. Native receipt verification requires configured Apple/Google SKUs, checks ownership across replay/renewal, and uses the store expiry. Platform purchase/restore UI and store catalog setup are separate from the existing Stripe checkout.

The dashboard supports localized premium-benefit copy with a default language and per-language text. The app caches it by language and uses bundled translations when localized copy has not been published.

## Configuration and notifications

The mobile app consumes cached banners, maintenance/minimum-version notices, feature switches and daily reminders. Downloaded reading remains accessible during online maintenance. The AI switch is marked reserved because the current mobile build has no AI chat screen.

Admin notifications are stored in account inboxes, sent to authenticated sockets and dispatched to registered Firebase devices. The dashboard reports stored, attempted, accepted and failed counts separately. Provider acceptance does not certify device delivery.

Firebase server authentication was checked: the configured account currently returns `invalid_grant` with a rejected signature. Actual background delivery needs a valid service-account key for the correct project and matching Android/iOS client registration. No private key should be embedded in the mobile app or committed.

Create a local client configuration from `firebase.android.example.json` in the app repository and run:

```powershell
flutter.bat run --dart-define-from-file=firebase.android.local.json --dart-define=API_BASE_URL=http://10.10.26.208:5005/api/v1
```

The local JSON is ignored by Git. iOS additionally requires the owner's APNs/capability configuration and a macOS build.

## Verification commands

Backend:

```powershell
npm.cmd test
npm.cmd run build
node scripts/verify-local-integration.cjs
```

The live verifier creates isolated temporary users/content and an uploaded image, exercises reading replay/account isolation/profile upload/content deletion, then removes those exact fixtures. It never sends an admin notification or charges a card.

Dashboard:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

App:

```powershell
flutter.bat test
flutter.bat analyze --no-pub --no-fatal-infos --no-fatal-warnings
flutter.bat build apk --debug
```

Regression coverage includes receipt replay, product/expiry validation, checkout ownership/trial reconciliation, revision/deletion detection, SQLite rollback, outbox retry/account isolation, offline language eligibility, Tafsir migration, translation preview, audio completion, entitlement error handling and quiet logout.

Read-only Stripe checks verified the two current test-mode prices against the backend catalog. Local API checks verified complete English, Bengali and German Surah 1 responses. iOS builds, real store receipts and device push delivery require their respective owner/platform configuration.

## Final local verification

Android debug APK and backend/dashboard production builds passed. Flutter regression tests: 20 passed; backend contract tests: 26 passed; dashboard tests: 7 passed. Final local API verification passed reading replay/account isolation, explicit null entitlement, profile upload and snapshot deletion/revision. The Flutter analyzer reported 551 existing warnings/information messages and no errors; this is not a warning-free release. Startup now preserves existing premium benefit text/translations instead of deleting them.

## Large-content verification (2026-10-29)

Read-only verification traversed every snapshot page for all 35 published module/language scopes (50,727 records) and compared IDs/counts against MongoDB. Book detail samples matched stored bodies. This covers Hadith, Dua, articles, book metadata, Fatwa and Tafsir. A separate canonical Quran inventory found 22 complete cached editions among 197 catalog/cache editions; the remaining editions were partial in the backend cache and may require on-demand upstream loading. This is not a claim that every catalog edition was fetched end-to-end.

A real Flutter/SQLite test imported 36,017 English Hadiths, 264 English Duas, 28 German articles, 305 Bengali book metadata records, 13 German Fatwas and 5,489 Bengali Tafsir entries, then disabled API access and exercised local reads. Book metadata alone intentionally does not make a body downloadable offline: the explicit per-book download saves its full body.

Source-content gaps were found: 415 English Hadith rows have empty translations; 6 Bengali book bodies, 2 Bengali Dua translations and 1,866 Bengali Tafsir bodies contain no Bengali script. These 2,289 source records remain stored for correction and are withheld from mobile publishing. Script checks are a minimum safeguard, not linguistic or religious verification. No translations were fabricated. Dashboard Hadith/book rows flag missing/incomplete translations; source rows remain editable. Articles and Fatwas currently have German content only.

Large snapshot bodies are spooled one page at a time to a temporary file and imported in bounded SQLite batches in one transaction. Revision/count/identity failures retain the previous cache. Requested-language Hadith/Dua category/search reads no longer fall back to other cached languages. Library lists refresh complete snapshots; the All articles entry includes custom categories. Quran sync failure no longer prevents other modules syncing.

Reproduce read-only server checks with node scripts/verify-content-delivery.cjs and node scripts/verify-quran-cache.cjs. Run the opt-in real SQLite check in the app using flutter.bat test test/live_content_test.dart --dart-define=LIVE_CONTENT_API_BASE=http://127.0.0.1:5005/api/v1. Standard regression results: backend 29 passed, app 27 passed (live check skipped unless explicitly enabled), dashboard 7 passed; the separately enabled real-content test passed. Android debug APK and dashboard/backend builds passed. Analyzer has no errors but existing warnings/information messages remain.

## Empty-content experience

Hadith, Dua, article, book, Fatwa, Quran and Tafsir readers distinguish successful empty content from request failures and missing offline downloads. Search results use a separate no-matches state. Shared copy currently includes Bengali, German and English (fallback). Retry buttons re-run the relevant request, and cached reading remains usable. Book detail responses distinguish null/unpublished, network failure and offline/no-body cases; blank responses no longer render an empty HTML paragraph. Content management remains in dashboard CRUD screens and translation/offline-pack workflows. App regression tests include visible retry actions, locale copy selection, and real local API response distinctions.

## First-launch language fallback (1.0.1+2)

Mobile language selectors request GET /api/v1/quran/languages?availableOnly=true. This opt-in response includes meta.availableOnly=true and only editions with all 114 canonical Surahs and readable Arabic/translation rows. Unfiltered catalog requests used by management tools are unchanged. Deploy the updated backend dist before expecting this verified online inventory on the live server; older catalogs without the readiness marker are intentionally not treated as available data.

The app now bundles the existing verified English Saheeh edition (6,236 verses plus 114 Surah metadata records) and installs it transactionally. Fresh offline installs can select/read English without a server. Missing/unreadable selections default to this edition without the language-unavailable error. Existing readable online preferences are retained; offline selection requires a complete downloaded edition. A separate onboarding completion flag keeps the first-run selector visible while preselecting the installed default.

Validation: 35 app tests, 30 backend tests and a real local HTTP inventory check (22 complete editions, including English).
## All-section language eligibility (1.0.2+3)

The mobile availableOnly inventory now requires a complete canonical Quran edition and at least one valid published record in every other section: Hadith, Dua, articles, books, Fatwa and Tafsir. It returns contentScope=all-sections and requiredModules. Current verified database coverage qualifies German only (3 Quran editions; Hadith 50, Dua 264, articles 28, books 311, Fatwa 13, Tafsir 1878). Other languages remain editable in management screens and become selectable when their missing sections are published. This supersedes the earlier Quran-only eligibility rule.

Offline eligibility intersects all seven locally readable sections. Books require a saved body, not just metadata. A fresh install still offers the bundled English Quran as an explicit fallback if no complete language is available. Missing sections show honest empty/download states; body text is never silently substituted from another language. Global search and Tafsir use the shared content language even if a different Quran edition was previously selected. Language changes discard stale requests and stop prior-language Dua/library audio; favorite records preserve their real language.

A real-data integration check found Quran sync validation stripping page/limit, causing every page to return the first 500 verses. The schema now preserves validated pagination, with a regression test. Dashboard translation coverage labels distinguish raw data presence from authoritative App ready status and no longer fabricate English readiness.

Batch translation no longer mixes source languages/editions or silently truncates books/articles/Fatwas. Canonical sources are English for Quran/Hadith/Dua, Arabic for Tafsir, and German for articles/books/Fatwa. Oversized single documents require complete manual translations before any job submission. Import rejects provider truncation/refusals and missing required fields instead of copying source bodies into the target language. Completion contract: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create. No paid translation job was submitted during this work. Existing source records still require editorial/translation review; script checks do not establish translation quality.

Deploy this updated backend build to the client's live server to enable its verified all-section inventory. Local verification does not establish remote deployment or remote connectivity.

Validation completed: app regression suite 42 passed (2 opt-in tests skipped), backend 35 passed, dashboard 7 passed, backend/dashboard production builds passed. The separately enabled real German test imported all six content snapshots, downloaded all 6,236 Quran verses and one complete book body, disabled API access, then verified all seven sections remained readable with no Bengali fallback. Local endpoint page=2 now returns page 2 and the requested 1,000-row page size. Flutter analyzer reported no errors, with 639 warning/information findings remaining; this is not a warning-free codebase.

Live-server recheck (2026-10-31): the configured API responds, but /quran/languages?availableOnly=true still returns the old 197-edition catalog without availableOnly/contentScope metadata. The new client rejects this unverified inventory and uses the bundled fallback. Deployment access is required to publish the backend changes; remote deployment has not been performed.

Release handover (2026-10-31): signed Android 1.0.2+3 built successfully. Client artifact: D:\Mohosin\projects\app\Quran-International\build\client-release\Quran-International-v1.0.2-release.apk (108100096 bytes). APK SHA256: 53c38b4d233265ddece3ba61d65702530e3e1d744be9c70aa4896a62a62d4b7a. Existing release certificate retained; non-debug manifest, embedded English Quran checksum, and absence of signing files verified. A fresh run of the real seven-section local API/SQLite offline test passed on 2026-10-31. User requested local testing only; no remote deploy was performed. APK retains the previously selected live API URL. Firebase push still needs valid credentials as documented above.

## German library data correction (2026-10-31)

User-authorized database repair corrected 192 German book titles and 17 German article titles from the existing German headings/source text. Arabic originals, quotations, names and German bodies were preserved. The 5 books containing only PDF page markers were reversibly unpublished, with all source records retained. Full BSON Extended JSON backup and the reviewed repair plan are stored outside Git at D:\Mohosin\backups\quran-international\german-library-2026-10-31T03-57-07-139Z. Record versions were incremented; before/after body hashes matched and non-German Book/Article collection revision hashes were unchanged.

Local API snapshot verification matched all 209 corrected titles and excluded the 5 unreadable books (306 published books, 28 articles). Compressed local preview packs were created and verified in the backup directory: book version 4, knowledge version 6. S3 and pack metadata have not been changed. Automatic approval review rejected the normal regeneration workflow because it uploads to S3 and deletes the prior S3 object; explicit approval for uploading the prepared replacement packs while retaining old S3 packs is pending. Snapshot-based clients already receive corrected database data; existing published gzip packs still contain the older data until approved publication.

## German replacement packs published (2026-10-31)

After the user's explicit follow-up approval, the reviewed German Book v4 (306 records) and Knowledge/Article v6 (28 records) packs were uploaded to new unique S3 keys, downloaded back with byte-for-byte SHA256 and payload checks, and then published through optimistic-guarded OfflinePack metadata updates. No old S3 object or old local pack was deleted. Publication receipts, prior metadata and local pack backups are in the existing German repair backup directory. scripts/publish-german-repair-packs.cjs documents the guarded procedure; --publish is explicit.

Local public metadata/download endpoints matched both new versions, compressed checksums, all 209 corrected titles, and exclusion of the 5 unpublished page-marker-only books. A fresh real Flutter/SQLite test passed for all seven German sections with API access disabled after importing the data (6,236 Quran verses; 306 book metadata records and one full book downloaded).

Live metadata now advertises the new pack versions, but live downloads remain blocked by server configuration: /offline-pack/download returns HTTP 500, and its signed S3 URL returns HTTP 403 with InvalidAccessKeyId. The local credentials used for the verified S3 upload/download work; the live server's AWS credential needs replacement and the process restarted. SSH/deployment access was requested. No remote server configuration/deployment was changed; full live delivery has not been verified.

Live content-list recheck also passed: all 192 corrected book titles and all 17 corrected article titles were verified across every live list page; live counts are 306 published German books and 28 articles, with the 5 unreadable books absent. This confirms database corrections reached the live content API. The remaining live blocker is specifically S3 download signing/access credentials, not the corrected content records or uploaded pack bytes.

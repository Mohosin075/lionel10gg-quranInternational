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

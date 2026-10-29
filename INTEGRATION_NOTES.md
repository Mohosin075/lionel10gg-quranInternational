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

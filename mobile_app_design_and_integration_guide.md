# Flutter Mobile App Integration Guide
**Version:** 3.3  
**Last Updated:** 15 August 2026  
**Backend:** Quran International API (`/api/v1`)

This is the integration guide for the Flutter app. Most of this was **already built**. Do not treat the guide as a greenfield rewrite. Use it to confirm the existing app still matches the client rules, and to patch only the items listed under **What changed**.

---

## 0. Already in place vs what changed

### Already built (keep using)
- Public Quran / Hadith / Dua / Tafsir / Knowledge Library / Sheikh / prayer GETs
- Offline sync endpoints: `version`, `check-sync` / `sync/check`, `download-sync` / `sync/download`
- Email signup, login, OTP, forget/reset password
- Stripe plans, checkout, IAP catalog, donation presets
- Bookmarks, highlights, last-read, profile, hasanat, notifications
- Reciters, surah audio, deep link `quraninternational://surah/{n}/ayah/{n}`
- SafeArea / spelling / unlocked 114 surahs (UI work on the app side)
- Admin dashboard for plans, benefits, library, sheikh media

Quran, Hadith, Dua, and Tafsir still come from third-party ingest on the server. That was always the design. The app only syncs and caches.

### What changed (app must update these)
- **Social login body:** `{ provider, idToken, deviceToken }` — not `appId`
- **Password min 8** on signup / login / reset / change
- **Interest enum:** `quran`, `hadith`, `tafsir`, `dua`, `prayer`, `tajweed`, `islamic_history`, `kids`
- **Refresh token:** store from login JSON; `POST /auth/refresh-token` `{ "refreshToken" }` (do not rely on cookies)
- **Hasanat:** `POST /hasanat/collect` — not `POST /hasanat`
- **IAP after store success:** `POST /in-app-purchase/verify` now sets premium on the user
- **Socket:** JWT on handshake; `join-room` / `leave-room` with chat `_id`; listen for `notification` on `user:<authId>`
- **Removed payment routes:** do not call `POST /payment/create-checkout-session` or `create-payment-intent`
- **Knowledge Library** is one module (articles + books + fatwas). Not two products.
- Content GETs that used to require auth/premium are **public** now. If the app still sends a token, that is fine; do not *require* one to read.

If the Flutter app already caches sync payloads and opens without login, keep that. Only change the breaking items above.

---

## 1. Client rules (offline-first)

These are product requirements, not optional.

1. The app **opens and reads without an account**. No splash login. No forced signup.
2. Quran, Hadith, Dua, Tafsir, Knowledge Library, Sheikh media, and prayer times are **free to read**. No lock, paywall, or premium gate on this content.
3. Login appears **only** when the user starts Stripe checkout, IAP, or donate — or later if they want cloud sync.
4. On first launch (and when online), download content into Hive / SQLite. After that, **read from local storage**. The network is for updates, not for every screen.
5. If a request fails or returns `401`, **keep local data**. Do not clear the library. Do not block reading.
6. A “Supporter” badge is for logged-in payment status only. It must not hide Hadith, library, or Quran.
7. All 114 surahs stay unlocked. No lock badges on surah or reciter lists.

Quran, Hadith, Dua, and Tafsir are ingested from third-party APIs on the server. The app does not edit them. It only syncs and caches. Knowledge Library (articles, books, fatwas) is one module. Admin writes it; the app only reads/syncs.

---

## 2. Auth model

### Public (no `Authorization` header)

| Area | Endpoints |
| --- | --- |
| Quran | `GET /quran/languages`, `/quran/reciters`, `/quran/surahs`, `/quran/surah/:number`, `/quran/ayah/:surah/:ayah`, `/quran/translation/:surah/:ayah` (alias), `/quran/search`, `/quran/daily-inspiration`, `/quran/version`, `/quran/sync/check`, `/quran/sync/download` |
| Hadith | `GET /hadith`, `/hadith/:id`, `/hadith/version`, `/hadith/check-sync`, `/hadith/download-sync` |
| Dua | `GET /dua`, `/dua/:id`, `/dua/version`, `/dua/check-sync`, `/dua/download-sync` |
| Tafsir | `GET /tafsir/:surah`, `/tafsir/:surah/:ayah`, `/tafsir/version`, `/tafsir/check-sync`, `/tafsir/download-sync` |
| Knowledge Library | `GET /knowledge-library`, `/knowledge-library/books`, `/knowledge-library/books/:id`, `/knowledge-library/fatwas`, `/knowledge-library/fatwas/:id`, `/knowledge-library/:id`, `/knowledge-library/version`, `/knowledge-library/check-sync`, `/knowledge-library/download-sync` |
| Sheikh | `GET /sheikh-content?speakerName=Abu Alia` |
| Prayer | `GET /prayer-time`, `/prayer-time/recitations` |
| Catalog | `GET /subscription/plans`, `/subscription/plans/:planId`, `/subscription/premium-benefits` |
| IAP catalog | `GET /in-app-purchase/plans`, `/in-app-purchase/plans/:planId` |
| Donations | `GET /payment/donation-presets` |
| FAQ | `GET /public/faq/all`, `/public/faq/single/:id` |

`GET /prayer-time` without a token returns Vienna, Austria. Store the user’s city/country on device when logged out. After login, `PATCH /prayer-time/settings` can sync that location.

### Requires `Authorization: Bearer <accessToken>`

| Area | When to call |
| --- | --- |
| `POST /subscription/checkout-session` | User taps Stripe subscribe / donate |
| `POST /subscription/create` | Only if payment is collected on-device and you already have a Stripe payment method |
| `GET /subscription/my-subscription`, `GET /subscription/status` | After login, supporter badge only |
| `GET /payment/verify-checkout/:sessionId` | After Stripe Checkout WebView returns |
| `POST /in-app-purchase/verify` | After StoreKit / Play Billing success |
| `GET /in-app-purchase/my-purchases` | Purchase history |
| `GET /payment/my-payments` | Payment history |
| Profile, bookmark, highlight, last-read, hasanat, notifications | Cloud sync only. Keep a local copy when logged out. |

---

## 3. Offline sync (how the app should work)

This flow already exists on the backend. If the app already does it, keep it. Use this as the contract, not a new feature request.

Use this on first open, on pull-to-refresh, and when the user changes language.

1. Call `GET …/version?lang={locale}`.
2. Compare with the version stored on device.
3. If the server version is newer, call `GET …/check-sync` then `GET …/download-sync` (or the Quran `/quran/sync/check` + `/quran/sync/download` pair).
4. Write the payload into Hive / SQLite and save the new version.
5. All reading screens use the local DB. Do not call the API on every ayah/hadith open.

| Module | Version | Check | Download |
| --- | --- | --- | --- |
| Quran | `GET /quran/version` | `GET /quran/sync/check` | `GET /quran/sync/download` |
| Hadith | `GET /hadith/version` | `GET /hadith/check-sync` | `GET /hadith/download-sync` |
| Dua | `GET /dua/version` | `GET /dua/check-sync` | `GET /dua/download-sync` |
| Tafsir | `GET /tafsir/version` | `GET /tafsir/check-sync` | `GET /tafsir/download-sync` |
| Knowledge Library | `GET /knowledge-library/version` | `GET /knowledge-library/check-sync` | `GET /knowledge-library/download-sync` |

Sheikh and prayer times have no version endpoint. Cache the last successful `GET /sheikh-content` and `GET /prayer-time` response. Sheikh also merges live YouTube RSS on the server; cache that JSON so the list still opens offline.

If the device is offline, skip sync and open cached content. Show a quiet “last updated” time if you want; do not show an error wall.

---

## 4. Layout and copy

### A. Samsung navigation bar overlap
Wrap bottom action bars (bookmark / share) with `SafeArea` / `MediaQuery.of(context).padding.bottom` (minimum `16.0`).

### B. Spelling
1. **Koran** → **Quran** (all locales).
2. German: **Milchschwestern** → **Milchschwester**.
3. Hungarian: **konyv** → **könyv**.

### C. Free Quran
All 114 surahs stay unlocked. No lock badges or billing overlays on the surah or reciter lists.

---

## 5. Auth APIs

Base path: `/api/v1/auth`  
Password minimum: **8 characters** (signup, login, reset, change).

Login, social login, and account-verify all return tokens in the JSON body. Store both:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "role": "USER"
}
```

Do not rely on the `refreshToken` cookie. Flutter should send the stored refresh token in the body.

### Signup
`POST /auth/signup`

```json
{
  "email": "user@example.com",
  "password": "atleast8",
  "name": "Optional name",
  "interest": ["quran", "hadith"]
}
```

Allowed `interest` values: `quran`, `hadith`, `tafsir`, `dua`, `prayer`, `tajweed`, `islamic_history`, `kids`.

### Login
`POST /auth/login`  
`POST /auth/custom-login` is the same handler (legacy alias).

```json
{
  "email": "user@example.com",
  "password": "atleast8",
  "deviceToken": "fcm-token"
}
```

### Social login (breaking change)
Do **not** send `appId`. Verify the provider token on device, then send:

`POST /auth/social-login`

```json
{
  "provider": "google",
  "idToken": "<Google ID token or Apple identity token>",
  "deviceToken": "<FCM token>"
}
```

`provider` must be `google` or `apple`. `deviceToken` is required.

### OTP / password reset
Reset is email-only. Phone reset is rejected.

1. `POST /auth/forget-password` — `{ "email": "user@example.com" }`
2. `POST /auth/verify-account` — `{ "email", "oneTimeCode" }`  
   For an already-verified user this returns `data.token` (reset token), not an access token.
3. `POST /auth/reset-password` — `{ "newPassword", "confirmPassword" }` and  
   `Authorization: Bearer <reset token from step 2>`.

Also:
- `POST /auth/verify-account` after signup returns `accessToken` + `refreshToken` (new account).
- `POST /auth/resend-otp` — `{ "email", "authType": "createAccount" | "resetPassword" }`

### Session
- `POST /auth/refresh-token` — `{ "refreshToken": "<stored refresh jwt>" }`  
  Response: `{ "accessToken": "<new access jwt>" }`.
- `POST /auth/logout` — Bearer required. After logout, old access tokens are rejected. Local Quran/Hadith/library **stay on device**.
- `POST /auth/change-password` — Bearer + `{ "currentPassword", "newPassword", "confirmPassword" }`
- `DELETE /auth/delete-account` — Bearer + `{ "password" }`

Store `accessToken` securely. Send `Authorization: Bearer <accessToken>` on protected routes.

Google **web** callback no longer puts tokens in the URL query. Mobile should use `/auth/social-login` with `idToken`, not the web callback.

---

## 6. Language

The **app** still follows the user’s locale. Append `?lang=de` (or `en`, `tr`, …) on library and sync endpoints. When the user changes language, clear that language’s local cache and re-run section 3.

Admin dashboard creates Knowledge Library items as `en`. Other locales come from server-side translation/sync where it exists. Always request the user’s `lang`; do not hard-code German.

---

## 7. Knowledge Library

One module. Three types. All public.

- Articles: `GET /knowledge-library`, `GET /knowledge-library/:id`
- Books: `GET /knowledge-library/books`, `GET /knowledge-library/books/:id`
- Fatwas: `GET /knowledge-library/fatwas`, `GET /knowledge-library/fatwas/:id`
- Sync: `version` / `check-sync` / `download-sync` on `/knowledge-library`

Do not treat “Articles” as a separate product from Knowledge Library.

---

## 8. Sheikh media

`GET /sheikh-content?speakerName=Abu Alia` (public).

Response `data`: `{ speakerName, videos, audioTravel }`.

- `videos` include `youtubeId` / `playlistId` for the in-app player, plus latest channel videos from YouTube RSS.
- `audioTravel` is Hörreisen audio URLs (not YouTube-parsed).

Speaker names the server matches (exact, case-insensitive):

`Abu Alia`, `Abul Baraa`, `Pierre Vogel`, `One Message Foundation`, `Alim Hamza`

Cache the JSON. Offline, play already-cached items only.

---

## 9. Subscription and IAP

### Show plans without login
- `GET /subscription/plans`
- `GET /subscription/premium-benefits` — sort UI by `serialNumber` ascending.
- `GET /in-app-purchase/plans`
- `GET /payment/donation-presets`

### After the user taps pay
1. If there is no token, open login / social login.
2. Then call one of:
   - Stripe: `POST /subscription/checkout-session` (Bearer)
   - Native IAP: complete StoreKit / Play Billing, then `POST /in-app-purchase/verify` (Bearer)

`POST /subscription/checkout-session`

```json
{
  "planId": "<mongo plan id>",
  "successUrl": "https://your-app/success",
  "cancelUrl": "https://your-app/cancel"
}
```

Response `data`: `{ "sessionId", "url" }`. Open `url` in a WebView / Custom Tab. After return, confirm with `GET /payment/verify-checkout/:sessionId` (Bearer).

`POST /in-app-purchase/verify`

```json
{
  "planId": "<mongo plan id>",
  "platform": "ios",
  "receiptData": "<iOS receipt or Android purchase token>",
  "productId": "<store product id>"
}
```

`platform`: `ios` | `android`.

A successful verify sets the user to premium (`subscriptionStatus: active`, `subscriptionTier: premium`, `subscriptionExpiresAt`).

`POST /subscription/create` (Bearer) is only for on-device Stripe payment methods:

```json
{ "planId": "<mongo plan id>", "paymentMethodId": "pm_...", "couponId": "optional" }
```

### Check supporter status (logged in only)
`GET /subscription/my-subscription` — active subscription document, or `{}` if none.  
`GET /subscription/status` — `{ isActive, isTrialing, isPastDue, isCanceled, daysUntilExpiry, currentPlan }`.

Use these for a “Supporter” badge, not to lock content.

Removed (do not call):
- `POST /payment/create-checkout-session`
- `POST /payment/create-payment-intent`

---

## 10. Quran audio and deep links

- Reciters: `GET /quran/reciters`
- Surah: `GET /quran/surah/:surahNumber?reciter={reciterId}`
- Recitation URL is always the original Arabic audio for the selected reciter, regardless of translation language.

Deep link: `quraninternational://surah/{surahNumber}/ayah/{ayahNumber}`  
On launch/resume, open that surah and scroll to the ayah.

---

## 11. Hasanat

Do **not** call `POST /hasanat`. The route is:

`POST /hasanat/collect`  
Headers: `Authorization: Bearer <Token>`

```json
{ "amount": 10 }
```

`amount` must be a positive number.

If the user is logged out, increment a local counter. Sync with `/hasanat/collect` after login.

---

## 12. Cloud sync (optional, logged in)

Keep these local-first. Sync when a token exists. Logout must not wipe them from the device.

### Bookmarks — `/bookmark`
- `GET /bookmark`
- `POST /bookmark` — `{ "surahNumber", "ayahNumber", "text?", "translation?", "editionIdentifier?" }`
- `DELETE /bookmark/:id`

### Highlights — `/highlight`
- `GET /highlight`
- `POST /highlight` — `{ "surahNumber", "ayahNumber", "color": "#FFAA00", "text?" }`  
  There is no delete route.

### Last read — `/last-read`
- `GET /last-read`
- `PATCH /last-read` — `{ "surahNumber", "ayahNumber", "editionIdentifier?" }`

### Prayer settings
- `PATCH /prayer-time/settings` (Bearer) — city, country, recitation, active prayers

### Profile
- `GET /user/profile`
- `PATCH /user/profile` — multipart (name, image, interests, deviceToken, …)
- `POST /user/interest` — `{ "interest": ["quran", "hadith"] }`

---

## 13. Notifications and sockets

### REST (Bearer required)
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id`

### Socket.IO
Connect only when the user is logged in.

- Host: API origin (same host as REST).
- Transport: `websocket`.
- Handshake: send the access token as `auth.token` or `Authorization: Bearer <token>`. Connection is rejected without a valid token.

On connect the server already joins `user:<authId>`. Listen for `notification` (`{ type: "NEW_NOTIFICATION", data }`). Do not emit a user-id join for that.

Chat rooms (support chat only):
- Join: emit `join-room` with the chat document `_id` (Mongo ObjectId). The user must be a participant.
- Leave: emit `leave-room` with the same id.
- After joining, listen for `getMessage::<chatId>` on that room only. Chat list updates arrive on `updateChatList::<yourUserId>` via the auto-joined `user:<authId>` room.
- These events are not broadcast to every socket.
- Do **not** emit `join` with a raw `userId`. That event is not handled.

Listen for `socket_error` if join fails.

---

## 14. Flutter checklist

Confirm existing behavior first. Only patch what fails.

### Already expected (confirm, do not rebuild)
- [ ] Cold start has no login screen.
- [ ] Quran / Hadith / Dua / Tafsir / library / Sheikh / prayer open with no token.
- [ ] Sync uses the existing version → check → download endpoints and Hive / SQLite.
- [ ] Later reads come from local storage.
- [ ] Airplane mode still opens cached content.
- [ ] Login sheet appears only on subscribe / IAP / donate.
- [ ] All 114 surahs stay unlocked.
- [ ] Stripe checkout still uses `planId`, `successUrl`, `cancelUrl`.

### Must update (breaking / recently changed)
- [ ] Social login sends `provider` + `idToken` + `deviceToken` (not `appId`).
- [ ] Passwords are at least 8 characters.
- [ ] Interest chips use the new enum values.
- [ ] Store `refreshToken` from the login body; refresh with `POST /auth/refresh-token` `{ refreshToken }`.
- [ ] Password reset: forget-password → verify-account → use `data.token` on reset-password.
- [ ] Hasanat uses `POST /hasanat/collect` (not `POST /hasanat`).
- [ ] IAP success calls `/in-app-purchase/verify`.
- [ ] Socket connects with JWT and uses `join-room` (not `join` + userId).
- [ ] Do not call the removed payment checkout / payment-intent routes.
- [ ] `401` / network error does not wipe or lock the library.

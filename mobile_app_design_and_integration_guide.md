# Flutter Mobile App Integration Guide
**Version:** 3.1  
**Last Updated:** 15 August 2026  
**Backend:** Quran International API (`/api/v1`)

This is the integration guide for the Flutter app. The backend is **offline-first**: most content is public. Login is required only for payment and for syncing account-specific data.

---

## 1. Auth model (read this first)

The app must work without an account. Store Quran, Hadith, Dua, Tafsir, Knowledge Library, Sheikh content, and prayer times in local cache (Hive / SQLite). Show a login screen only when the user starts a payment (Stripe checkout or IAP).

### Public (no `Authorization` header)

| Area | Endpoints |
| --- | --- |
| Quran | `GET /quran/languages`, `/quran/reciters`, `/quran/surahs`, `/quran/surah/:number`, `/quran/ayah/:surah/:ayah`, `/quran/translation/:surah/:ayah` (alias), `/quran/search`, `/quran/daily-inspiration`, `/quran/version`, `/quran/sync/check`, `/quran/sync/download` |
| Hadith | `GET /hadith`, `/hadith/:id`, `/hadith/version`, `/hadith/check-sync`, `/hadith/download-sync` |
| Dua | `GET /dua`, `/dua/:id`, `/dua/version`, `/dua/check-sync`, `/dua/download-sync` |
| Tafsir | `GET /tafsir/:surah`, `/tafsir/:surah/:ayah`, `/tafsir/version`, `/tafsir/check-sync`, `/tafsir/download-sync` |
| Knowledge Library | `GET /knowledge-library`, `/knowledge-library/books`, `/knowledge-library/books/:id`, `/knowledge-library/fatwas`, `/knowledge-library/fatwas/:id`, `/knowledge-library/:id`, `/knowledge-library/version`, `/knowledge-library/check-sync`, `/knowledge-library/download-sync` |
| Sheikh | `GET /sheikh-content` |
| Prayer | `GET /prayer-time`, `/prayer-time/recitations` |
| Catalog | `GET /subscription/plans`, `/subscription/plans/:planId`, `/subscription/premium-benefits` |
| IAP catalog | `GET /in-app-purchase/plans`, `/in-app-purchase/plans/:planId` |
| Donations | `GET /payment/donation-presets` |
| FAQ | `GET /public/faq/all`, `/public/faq/single/:id` |

Do **not** lock Hadith, Knowledge Library, or Quran behind a paywall or login gate.

`GET /prayer-time` without a token returns Vienna, Austria defaults. After login, it uses the user’s saved city/country.

### Requires `Authorization: Bearer <accessToken>`

| Area | When to call |
| --- | --- |
| `POST /subscription/checkout-session` | User taps Stripe subscribe / donate |
| `POST /subscription/create` | Only if payment is collected on-device and you already have a Stripe payment method |
| `GET /subscription/my-subscription`, `GET /subscription/status` | After login, to show supporter status |
| `GET /payment/verify-checkout/:sessionId` | After Stripe Checkout WebView returns |
| `POST /in-app-purchase/verify` | After StoreKit / Play Billing success |
| `GET /in-app-purchase/my-purchases` | Purchase history |
| `GET /payment/my-payments` | Payment history |
| Profile, bookmark, highlight, last-read, hasanat, notifications | Cloud sync only. Keep a local copy when logged out. |

If a sync call returns `401`, keep local data and prompt login later. Do not block reading.

---

## 2. Layout and copy

### A. Samsung navigation bar overlap
Wrap bottom action bars (bookmark / share) with `SafeArea` / `MediaQuery.of(context).padding.bottom` (minimum `16.0`).

### B. Spelling
1. **Koran** → **Quran** (all locales).
2. German: **Milchschwestern** → **Milchschwester**.
3. Hungarian: **konyv** → **könyv**.

### C. Free Quran
All 114 surahs stay unlocked. No lock badges or billing overlays on the surah or reciter lists.

---

## 3. Auth APIs

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
- `POST /auth/logout` — Bearer required. After logout, old access tokens are rejected.
- `POST /auth/change-password` — Bearer + `{ "currentPassword", "newPassword", "confirmPassword" }`
- `DELETE /auth/delete-account` — Bearer + `{ "password" }`

Store `accessToken` securely. Send `Authorization: Bearer <accessToken>` on protected routes.

Google **web** callback no longer puts tokens in the URL query. Mobile should use `/auth/social-login` with `idToken`, not the web callback.

---

## 4. Language sync

Append `?lang=de` (or `en`, `tr`, …) on library endpoints. When the user changes language, clear the local cache and re-fetch.

---

## 5. Subscription and IAP

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

Use these for a “Supporter” badge, not to lock Hadith or library content.

Removed (do not call):
- `POST /payment/create-checkout-session`
- `POST /payment/create-payment-intent`

---

## 6. Quran audio and deep links

- Reciters: `GET /quran/reciters`
- Surah: `GET /quran/surah/:surahNumber?reciter={reciterId}`
- Recitation URL is always the original Arabic audio for the selected reciter, regardless of translation language.

Deep link: `quraninternational://surah/{surahNumber}/ayah/{ayahNumber}`  
On launch/resume, open that surah and scroll to the ayah.

---

## 7. Hasanat

Do **not** call `POST /hasanat`. The route is:

`POST /hasanat/collect`  
Headers: `Authorization: Bearer <Token>`

```json
{ "amount": 10 }
```

`amount` must be a positive number.

If the user is logged out, increment a local counter. Sync with `/hasanat/collect` after login.

---

## 8. Cloud sync (optional, logged in)

Keep these local-first. Sync when a token exists.

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

## 9. Notifications and sockets

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

## 10. Flutter checklist

- [ ] App opens and reads Quran / Hadith / Dua / Tafsir / library with no login.
- [ ] Login sheet appears only on subscribe / IAP / donate.
- [ ] Social login sends `provider` + `idToken` + `deviceToken`.
- [ ] Passwords are at least 8 characters.
- [ ] Interest chips use the new enum values.
- [ ] Store `refreshToken` from the login body; refresh with `POST /auth/refresh-token` `{ refreshToken }`.
- [ ] Password reset: forget-password → verify-account → use `data.token` on reset-password.
- [ ] Stripe checkout sends `planId`, `successUrl`, `cancelUrl`, then verifies the session.
- [ ] Hasanat uses `POST /hasanat/collect`.
- [ ] IAP success calls `/in-app-purchase/verify`.
- [ ] Socket connects with JWT and listens for `notification`.
- [ ] Logged-out bookmark / last-read / hasanat stay on device.

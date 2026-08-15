# Quran International API

Backend for the Quran International Flutter app. Node.js, TypeScript, Express, MongoDB, Stripe, and Socket.IO.

The API is **offline-first**. Quran, Hadith, Dua, Tafsir, Knowledge Library, Sheikh content, and prayer times are public. Login is required only for payment and for syncing account data (profile, bookmarks, highlights, last-read, hasanat, notifications).

Flutter integration details: [`mobile_app_design_and_integration_guide.md`](./mobile_app_design_and_integration_guide.md).

## Stack

- Node.js 18+ / TypeScript / Express
- MongoDB (Mongoose)
- JWT + Google / Apple social login
- Stripe Checkout and native IAP verify
- Socket.IO (JWT handshake)
- AWS S3 uploads, SMTP email, Firebase push

## Setup

```bash
git clone <repository-url>
cd lionel10gg-quranInternational
npm install
cp .env.example .env
```

Fill `.env` from `.env.example`. Required for a local run: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SESSION_SECRET` (or reuse `JWT_SECRET`).

```bash
npm run start          # development (ts-node-dev)
npm run build
npm run start:prod     # compiled dist/
npm test               # OTP hash unit tests
```

API base: `http://localhost:5000/api/v1`  
Health: `GET /api/v1/status`

## Auth (mobile)

| Action | Endpoint |
| --- | --- |
| Signup | `POST /auth/signup` — password min 8 |
| Login | `POST /auth/login` (alias: `/auth/custom-login`) |
| Social | `POST /auth/social-login` — `{ provider, idToken, deviceToken }` |
| Refresh | `POST /auth/refresh-token` — `{ refreshToken }` from the login body |
| Reset | `POST /auth/forget-password` → `verify-account` → `reset-password` (email only) |

Protected routes use `Authorization: Bearer <accessToken>`.

## Public content

No token needed:

- `/quran/*` (languages, reciters, surahs, ayah, search, sync)
- `/hadith`, `/dua`, `/tafsir`, `/knowledge-library`, `/sheikh-content`
- `/prayer-time`, `/subscription/plans`, `/in-app-purchase/plans`
- `/payment/donation-presets`, `/public/faq/all`

Do not put a login or paywall in front of reading these.

## Payments (logged in)

- Stripe: `POST /subscription/checkout-session` then `GET /payment/verify-checkout/:sessionId`
- IAP: `POST /in-app-purchase/verify` after StoreKit / Play Billing
- Status: `GET /subscription/my-subscription`, `GET /subscription/status`

Webhooks (raw body, registered before JSON parser):

- `POST /api/v1/subscription/webhook`
- `POST /api/v1/payment/webhook`

## Chat

REST and sockets require a valid JWT. A user can only create a chat with an existing active user, and can only read or send messages in chats they participate in. Socket events go to `room:<chatId>` and `user:<authId>`, not to every connected client.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run start` | Dev server |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Run `dist/server.js` |
| `npm test` | Crypto / OTP tests |
| `npm run lint:check` / `lint:fix` | ESLint |
| `npm run prettier:check` / `prettier:fix` | Format |
| `npm run seed:demo-subscription` | Demo plans |
| `npm run seed:islamhouse` | Knowledge library seed |
| `npm run seed:spelling-corrections` | Locale spelling fixes |

## Layout

```
src/
├── app.ts                 # Express app, webhooks, CORS
├── server.ts              # HTTP + Socket.IO
├── routes/index.ts        # /api/v1 mounts
├── config/                # env
├── app/modules/           # auth, quran, hadith, subscription, …
├── app/middleware/        # JWT, validation, uploads
└── helpers/               # socket, jwt, email
```

## License

ISC

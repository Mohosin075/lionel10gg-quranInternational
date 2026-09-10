# 📋 Quran Dashboard — কী করতে হবে

**Dashboard Path:** `D:\Mohosin\projects\dashboard\quran-dashboard`  
**Backend API:** `D:\Mohosin\projects\lionel10gg-quranInternational`

---

## ✅ সম্পন্ন ফিচারসমূহ (All Built & Integrated)

| Page | Route | Status | Backend / Mobile App Integration |
|---|---|---|---|
| Overview / Home | `/` | ✅ সম্পন্ন | Live Telemetry & Content Counters |
| Offline Packs Manager | `/offline-packs` | ✅ সম্পন্ন | S3 Presigned, GZip & SHA-256 Checksum |
| Translations (109 Lng) | `/translations` | ✅ সম্পন্ন | OpenAI Batch API (50% Cost) & Ingestion |
| Hadith Manager | `/hadith` | ✅ সম্পন্ন | 8 Collections, Ingestion, CRUD |
| Dua Manager | `/duas` | ✅ সম্পন্ন | Hisn al-Muslim sync, Categories, CRUD |
| App Config & Banners | `/app-config` | ✅ সম্পন্ন | Mobile Carousel Banners & Maintenance Mode |
| Articles | `/articles` | ✅ সম্পন্ন | Admin Article Publishing |
| Knowledge Library | `/knowledge-library` | ✅ সম্পন্ন | Books, Articles & Fatwas |
| Users | `/users` | ✅ সম্পন্ন | User Management |
| Subscriptions | `/subscriptions` | ✅ সম্পন্ন | Plans & Benefits |
| Notifications | `/notifications` | ✅ সম্পন্ন | Push Notifications |
| Reports | `/reports` | ✅ সম্পন্ন | Revenue & Engagement |
| Sheikh Media | `/sheikh-media` | ✅ সম্পন্ন | Audio & Video Streams |

---

### 🌍 1. Offline Pack Manager (সবচেয়ে জরুরি)
**Route:** `/offline-packs`  
**কী করবে:**
- সব module (hadith, dua, knowledge) এর generated pack দেখাবে
- প্রতিটা language এর pack size, version, SHA-256 দেখাবে
- **"Generate Pack" button** → এক ক্লিকে S3 তে upload
- **Pack Status:** কোন language ready, কোনটা pending

**API Calls:**
```
GET  /api/v1/offline-pack/list
POST /api/v1/offline-pack/generate  { module, lang }
GET  /api/v1/offline-pack/check-sync?module=hadith&lang=de
```

---

### 🤖 2. Batch Translation Manager (OpenAI)
**Route:** `/translations`  
**কী করবে:**
- Language list দেখাবে (109টা) — কোনটা translated, কোনটা না
- **"Translate" button** → OpenAI Batch job শুরু করবে
- Progress track করবে (in_progress → completed)
- Complete হলে **"Process & Save"** button দেখাবে
- Cost estimate দেখাবে প্রতিটা language এর আগে (~১৮ টাকা)

**API Calls:**
```
POST /api/v1/offline-pack/batch-translate  { module, targetLang }
GET  /api/v1/offline-pack/batch-status/:jobId
POST /api/v1/offline-pack/batch-process/:jobId
```

**UI Layout:**
```
┌──────────────────────────────────────────────────┐
│  Language    │ Hadith  │ Dua  │ Knowledge │ Action │
├──────────────┼─────────┼──────┼───────────┼────────┤
│ 🇧🇩 Bengali  │ ✅ Done │ ✅   │ ✅        │ Generate Pack |
│ 🇩🇪 German   │ ⏳ 45%  │ ❌   │ ❌        │ Processing... |
│ 🇫🇷 French   │ ❌ None │ ❌   │ ❌        │ [Translate ~18৳] |
└──────────────────────────────────────────────────┘
```

---

### 📚 3. Hadith Manager
**Route:** `/hadith`  
**কী করবে:**
- ৮টি collection এর হাদিস দেখা (Bukhari, Muslim, etc.)
- Filter by source / chapter / language
- Add/Edit/Delete হাদিস (Admin only)
- **Seed button:** collection এর range update করে reseed
- Collection stats: কোনটায় কতটা হাদিস আছে

**API Calls:**
```
GET  /api/v1/hadith/collections
GET  /api/v1/hadith?source=Sahih al-Bukhari&lang=en&page=1
POST /api/v1/hadith/sync-external  { edition, from, to }
PUT  /api/v1/hadith/:id
DELETE /api/v1/hadith/:id
```

---

### 🤲 4. Dua Manager
**Route:** `/duas`  
**কী করবে:**
- সব Dua list দেখা
- Category by filter
- Add/Edit/Delete
- Language by filter

**API Calls:**
```
GET  /api/v1/dua
POST /api/v1/dua
PUT  /api/v1/dua/:id
DELETE /api/v1/dua/:id
```

---

### ⚙️ 5. App Config / Banner Control
**Route:** `/app-config`  
**কী করবে:**
- Home screen banner text/image manage
- Daily reminder message set করা
- App maintenance mode on/off
- Feature flags (premium feature enable/disable)

**API:** নতুন endpoint বানাতে হবে:
```
GET  /api/v1/public/app-config
POST /api/v1/public/app-config  (Admin only)
```

---

### 📊 6. Overview Dashboard Improvement
**Route:** `/` (existing, improve করতে হবে)  
**যোগ করতে হবে:**
- Total Hadiths in DB (by language)
- Offline Packs generated count
- Translation jobs status (pending/done)
- Revenue (Stripe) this month
- Active subscribers count

---

## 📌 Priority Order

| Priority | Feature | সময় লাগবে |
|---|---|---|
| 🔴 1 | **Offline Pack Manager** | ~4-6 ঘন্টা |
| 🔴 2 | **Batch Translation Manager** | ~4-6 ঘন্টা |
| 🟡 3 | **Hadith Manager** | ~3-4 ঘন্টা |
| 🟡 4 | **Dua Manager** | ~2-3 ঘন্টা |
| 🟢 5 | **App Config** | ~2-3 ঘন্টা |
| 🟢 6 | **Overview Improvement** | ~1-2 ঘন্টা |

---

## 🎯 Workflow — Dashboard দিয়ে 109 Language চালু করার Steps

```
Step 1: Dashboard → /translations
        → Bengali select → "Translate Hadith" click
        → OpenAI batch job শুরু (background, ~1-2 hr)

Step 2: Job "completed" হলে
        → "Process & Save" click
        → MongoDB তে Bengali হাদিস save

Step 3: Dashboard → /offline-packs
        → Bengali → "Generate Pack" click
        → S3 তে hadith_bn_v1.json.gz upload (~3.2 MB)

Step 4: User app তে Bengali select করলে
        → 3.2 MB download → SHA-256 verify → SQLite save
        → ✅ Offline Bengali হাদিস
```

---

## 🛠️ Tech Stack (Dashboard)
- **Framework:** Next.js (App Router)
- **State:** Redux
- **UI:** Tailwind + shadcn/ui
- **Auth:** JWT (middleware.ts এ আছে)
- **API Base:** `.env.local` তে আছে

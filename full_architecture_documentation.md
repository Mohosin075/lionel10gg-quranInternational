# 📘 Complete Full-App Offline & 109+ Multilingual Architecture Documentation

---

## 1. Executive Summary & Goals
This document specifies the complete system architecture for enabling **100% Offline Access** and **109+ Multilingual Support** across the entire **Quran International Application suite**:
- 📖 **Quran & Tafsir Module** (114 Surahs, 6,236 Verses, Multilingual Translations, Audio Caching)
- 📚 **Hadith Module** (36,432 Hadiths across 8 major books: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Malik, Nawawi)
- 🤲 **Duas & Hisnul Muslim Module** (Daily Remembrances, Essential Duas, Morning/Evening Al-Ma'thurat)
- 📚 **Books & Fatwas Module** (IslamHouse articles, Fatwas, Islamic Books)
- 🧠 **Knowledge Library Module** (Stories & Lessons, History, Biographies of the Righteous)
- 🕌 **Prayer Times & Qibla Module** (Offline mathematical calculation engines + Offline GPS Magnetometer Compass)

### Key Performance Guarantees:
- **Base Binary Size**: **30–40 MB** for Google Play & Apple App Store approval.
- **Query Latency**: **$< 1\text{ ms}$** server-side ($O(\log N)$) and **$\approx 0.05\text{ ms}$** on-device ($O(\log K + L)$).
- **Airplane Mode Ready**: 100% offline playback after downloading 1-click language packs (~3.2 MB each).
- **Zero-Conflict Guarantee**: 100% backward compatible with existing live mobile builds.

---

## 2. Technical System Architecture Flow

```mermaid
flowchart TD
    subgraph Mobile Device (Client Application)
        UI[User Interface / Settings] --> LM[Offline Language Pack Manager]
        LM -->|Check Pack Exist| SQLite[(Local SQLite / Room / Hive DB)]
        LM -->|No Pack Yet| API_GATEWAY[REST API / CDN Gateway]
        SQLite -->|0ms Latency| UI
    end

    subgraph Backend Server & Infrastructure
        API_GATEWAY --> MONGO[(MongoDB Database)]
        API_GATEWAY --> CDN[AWS S3 / Cloudflare CDN]
        EXPORTER[Pack Exporter Worker] -->|Gzip L9 Compression| CDN
        MONGO --> EXPORTER
    end

    subgraph Translation Supply Layer
        PRE[FawazAhmed API / Pre-translated Datasets] -->|Top 10 Languages| MONGO
        BATCH[OpenAI Batch API - gpt-4o-mini] -->|Remaining 99+ Languages| MONGO
    end
```

---

## 3. Data Structures & Algorithmic Complexities

### A. Database Indexing & Time Complexity ($O(\log N)$)

#### MongoDB Server-Side B-Tree Compound Indexes
To ensure sub-millisecond query execution over millions of records:
```json
{ "lang": 1, "source": 1, "hadithNo": 1 }  // Hadith Point Lookup
{ "lang": 1, "category": 1 }              // Category Range Scan
{ "version": 1, "lang": 1 }               // Incremental Sync Lookup
```
- **Lookup Time**: $O(\log_B N)$ where $B \approx 100$ (B-Tree fan-out), $N = 36,432$.
- **B-Tree Height**: $\le 3$ disk operations.

#### On-Device Mobile SQLite B-Tree Indexing
```sql
CREATE INDEX idx_hadith_cat_lang ON hadiths(category_id, lang);
CREATE INDEX idx_hadith_no ON hadiths(hadith_no);
```
- **Point Query**: $O(1)$ Hash / $O(\log K)$ B-Tree lookup.
- **Paginated Range Query**: `SELECT * FROM hadiths WHERE category = ? LIMIT 10 OFFSET 0`
  - **Time Complexity**: $O(\log K + L)$ where $K = 36,432$ and $L = 10$. Binary comparisons $\approx 15 \implies 0.05\text{ ms}$ latency.
  - **Space Complexity**: $O(L)$ RAM allocation for current page buffer.

---

### B. Compression & Space Complexity ($O(1)$ RAM)

#### Gzip Level 9 / Brotli Huffman Coding
- **Raw Text Footprint**: 16,459,581 characters ($\approx 16.46\text{ MB}$ UTF-8 string data per language).
- **Compression Ratio**: 79.5% space reduction.
- **Compressed Pack Size**: **~3.2 MB** payload per language.
- **Transfer Time**: $T = \frac{3.2\text{ MB}}{5\text{ MB/s}} \approx 0.64\text{ seconds}$ on 4G/5G/Wi-Fi.

#### Bulk I/O Operations
- **Batch Processing**: Database writes use chunked batching ($B = 1000$ operations per batch).
- **I/O Complexity**: Reduces network round-trips from $O(N)$ to $O(\lceil N / B \rceil)$. For $N = 36,432$, round-trips drop from $36,432 \longrightarrow 37$ batch writes.

---

### C. Data Integrity Checksum ($O(M)$ Verification)

- **SHA-256 Hash Check**: Client verifies checksum of downloaded pack file before local extraction.
  - **Time Complexity**: $O(M)$ where $M = 3.2\text{ MB}$. Executes in $\approx 8\text{ ms}$ on mobile CPUs.
  - **Space Complexity**: $O(1)$ streaming buffer.

---

## 4. API Endpoints Contract

### 1. Check Offline Pack Version & Metadata
`GET /api/v1/offline-pack/check-sync?lang=de&version=1`

**Response (`200 OK`)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pack status checked successfully",
  "data": {
    "lang": "de",
    "updateAvailable": true,
    "serverVersion": 2,
    "clientVersion": 1,
    "packSizeMb": 3.2,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "downloadUrl": "https://cdn.quraninternational.com/packs/hadith_de_v2.json.gz"
  }
}
```

### 2. Download Offline Module Pack
`GET /api/v1/offline-pack/download/:module?lang=de`

**Response (`200 OK`)**: Streamed compressed payload (`Content-Encoding: gzip`, `Content-Type: application/octet-stream`).

---

## 5. Client Mobile App Implementation Pattern

### Offline-First Repository Implementation (Flutter Example)
```dart
class HadithRepository {
  final LocalSqliteDatabase localDb;
  final ApiClient apiClient;

  Future<List<Hadith>> getHadiths({required String category, required int page, int limit = 10}) async {
    // 1. Check if local SQLite database has the downloaded offline language pack
    if (await localDb.hasLanguagePack(currentLanguage)) {
      // Time Complexity: O(log K + L) -> 0.05ms local read
      return await localDb.getHadiths(category: category, page: page, limit: limit);
    }

    // 2. Fallback to online REST API if pack is not downloaded yet
    // Time Complexity: O(log N + L) -> 150ms network read
    return await apiClient.getHadiths(category: category, page: page, limit: limit);
  }
}
```

---

## 6. Multilingual Translation Supply Strategy (109+ Languages)

| Tier | Target Languages | Method | Cost | Processing Speed |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Top 10 (Arabic, English, Bengali, Urdu, Indonesian, French, Turkish, Spanish, Tamil, Russian) | FawazAhmed Datasets + Pre-translated Islamic Repositories | **$0.00 (Free)** | **Instant (Seconds)** |
| **Tier 2** | Remaining 99+ Languages | OpenAI Batch API (`gpt-4o-mini`) (50% Off) OR On-Demand Caching | **~$0.30 per language** (~50 BDT) | **1–2 Hours (Async Batch)** |

---

## 7. Zero-Conflict & Backward Compatibility Guarantee

1. **Existing Routes Preserved**: `GET /api/v1/hadith`, `GET /api/v1/quran`, `GET /api/v1/dua` remain 100% unchanged.
2. **Schema Integrity**: Existing MongoDB document schemas remain identical.
3. **Graceful Fallback**: Unupdated mobile apps continue making normal REST API calls without disruption.

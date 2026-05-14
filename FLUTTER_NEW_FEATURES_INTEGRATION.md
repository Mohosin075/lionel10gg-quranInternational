# Flutter Developer Integration Guide: New Features

This document outlines how to integrate the newly added features (Hasanat Counter, Tafsir, and Duas) into the Flutter application.

## 1. Hasanat Counter
Manage the user's global Hasanat balance.

### Collect Hasanat
Update the user's total balance after they complete a Surah.
- **URL**: `/api/v1/hasanat/collect`
- **Method**: `POST`
- **Auth**: Required (Bearer Token)
- **Body**:
  ```json
  {
    "amount": 10
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Hasanat collected successfully",
    "data": {
      "totalHasanat": 150
    }
  }
  ```

---

## 2. Tafsir Module
Fetch explanations for Ayahs. Supports multiple languages and offline syncing.

### Get Ayah Tafsir
- **URL**: `/api/v1/tafsir/:surah/:ayah`
- **Method**: `GET`
- **Query Parameters**:
    - `edition` (optional): e.g., `arabic_moyassar` (default), `bengali_zakaria`, etc.
    - `lang` (optional): `ar`, `bn`, `en`, etc.

### Get Surah Tafsir (Full Surah)
- **URL**: `/api/v1/tafsir/:surah`
- **Method**: `GET`

### Offline Sync Endpoints
1. **Get Version**: `/api/v1/tafsir/version?edition=...`
2. **Check Sync**: `/api/v1/tafsir/check-sync?edition=...&version=...`
3. **Download Sync**: `/api/v1/tafsir/download-sync?edition=...&fromVersion=...&page=1&limit=20`

---

## 3. Dua Module
Comprehensive collection of daily supplications. Supports multi-language and offline syncing.

### List Duas
- **URL**: `/api/v1/dua`
- **Method**: `GET`
- **Query Parameters**:
    - `lang` (optional): `en` (default), `bn`, `ar`, etc.
    - `category` (optional): Filter by category.

### Get Single Dua
- **URL**: `/api/v1/dua/:id`
- **Method**: `GET`

### Offline Sync Endpoints
1. **Get Version**: `/api/v1/dua/version?lang=...`
2. **Check Sync**: `/api/v1/dua/check-sync?lang=...&version=...`
3. **Download Sync**: `/api/v1/dua/download-sync?lang=...&fromVersion=...&page=1&limit=20`

---

## 4. Multi-Language Best Practices
- The app should always provide the `lang` parameter to ensure consistency.
- For **Tafsir**, you must also provide the `edition` key (e.g., `bengali_zakaria`).
- All sync endpoints follow a standard pagination pattern (`page`, `limit`) and versioning logic.

## 5. Offline Sync Logic (Standard Flow)
To implement offline support for any of these modules:
1. Call `/check-sync` with your local version.
2. If `updateAvailable` is true, call `/download-sync` with `fromVersion` equal to your local version.
3. Save the results to your local SQLite/Hive database.
4. Update your local version to the `serverVersion` returned in step 1.

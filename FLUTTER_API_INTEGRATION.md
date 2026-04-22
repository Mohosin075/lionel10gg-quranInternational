# Flutter API Integration Guide 🚀

This document provides a comprehensive guide for Flutter developers to integrate the Quran App backend APIs.

---

## 📌 Global Configuration

- **Base URL**: `http://<your-server-ip>:5000/api/v1`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_TOKEN>
  ```

### 🧱 Standard Response Structure
All API responses follow this consistent format:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Success message",
  "meta": { // Optional: for lists
    "page": 1,
    "limit": 10,
    "total": 114
  },
  "data": {} // Payload (Object, Array, or null)
}
```

---

## 📖 1. Quran Module (`/quran`)

The core module providing Surahs, Ayahs, Translations, and Search.

### 🔹 Get Languages / Editions
- **Endpoint**: `GET /quran/languages`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "language_name": "English",
        "translation_name": "Saheeh International",
        "edition_identifier": "english_saheeh"
      }
    ]
  }
  ```

### 🔹 Get Surah List
- **Endpoint**: `GET /quran/surah`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "number": 1,
        "name": "سُورَةُ ٱلْفَاتِحَةِ",
        "englishName": "Al-Faatiha",
        "englishNameTranslation": "The Opening",
        "numberOfAyahs": 7,
        "revelationType": "Meccan"
      }
    ]
  }
  ```

### 🔹 Get Surah Details (With Translation)
- **Endpoint**: `GET /quran/surah/:number`
- **Query Params**: `edition` (optional, e.g., `bengali_zakaria`)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "number": 1,
      "edition": "english_saheeh",
      "ayahs": [
        {
          "number": 1,
          "text": "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
          "translation": "In the name of Allah, the Entirely Merciful, the Especially Merciful."
        }
      ]
    }
  }
  ```

### 🔹 Search Quran
- **Endpoint**: `GET /quran/search`
- **Query Params**: `q` (keyword), `page`, `limit`
- **Response**:
  ```json
  {
    "success": true,
    "meta": { "page": 1, "limit": 10, "total": 5 },
    "data": [
      {
        "surah": 1,
        "ayah": 1,
        "text": "...",
        "edition": "english_saheeh"
      }
    ]
  }
  ```

### 🔹 Sync: Check Updates
- **Endpoint**: `GET /quran/sync/check`
- **Query Params**: `edition`, `version`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "updateAvailable": true,
      "serverVersion": 5,
      "clientVersion": 1
    }
  }
  ```

---

## 🔖 2. Bookmark Module (`/bookmark`)

Manage user favorites. **Auth Required.**

### 🔹 Add Bookmark
- **Endpoint**: `POST /bookmark`
- **Body**:
  ```json
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "text": "Arabic text (optional)",
    "translation": "Translation text (optional)",
    "editionIdentifier": "english_saheeh"
  }
  ```

### 🔹 Get My Bookmarks
- **Endpoint**: `GET /bookmark`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "id",
        "surahNumber": 1,
        "ayahNumber": 1,
        "text": "...",
        "createdAt": "..."
      }
    ]
  }
  ```

---

## 🖍️ 3. Highlight Module (`/highlight`)

Color-coded Ayahs. **Auth Required.**

### 🔹 Add Highlight
- **Endpoint**: `POST /highlight`
- **Body**:
  ```json
  {
    "surahNumber": 2,
    "ayahNumber": 255,
    "color": "#FF5733",
    "text": "Ayat-ul-Kursi context"
  }
  ```

---

## 🕋 4. Prayer Time Module (`/prayer-time`)

### 🔹 Get Prayer Times & Settings
- **Endpoint**: `GET /prayer-time`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "timings": {
        "Fajr": "04:30",
        "Dhuhr": "12:15",
        "Asr": "15:45",
        "Maghrib": "18:20",
        "Isha": "19:45",
        "date": "16 Apr 2026",
        "timezone": "Asia/Dhaka"
      },
      "settings": {
        "location": { "city": "Dhaka", "country": "Bangladesh" },
        "activePrayers": ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"],
        "selectedRecitationId": "makkah"
      }
    }
  }
  ```

### 🔹 Update Settings
- **Endpoint**: `PATCH /prayer-time/settings`
- **Auth Required**
- **Body**:
  ```json
  {
    "location": { "city": "Chittagong", "country": "Bangladesh" },
    "selectedRecitationId": "madinah"
  }
  ```

---

## 🛠️ Flutter Integration (Pro-Tips)

### 1. Dio Response Wrapper
Create a generic class to handle the standard response structure:

```dart
class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;
  final Map<String, dynamic>? meta;

  ApiResponse({required this.success, this.message, this.data, this.meta});

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic) fromJsonT) {
    return ApiResponse(
      success: json['success'],
      message: json['message'],
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      meta: json['meta'],
    );
  }
}
```

### 2. Base Repository Pattern
```dart
abstract class BaseRepository {
  final Dio _dio = ApiClient.dio;

  Future<ApiResponse<T>> safeApiCall<T>(
    Future<Response> Function() call,
    T Function(dynamic) mapper,
  ) async {
    try {
      final response = await call();
      return ApiResponse.fromJson(response.data, mapper);
    } on DioException catch (e) {
      return ApiResponse(success: false, message: e.message);
    }
  }
}
```

---

> [!IMPORTANT]
> **Performance Tip**: For the Quran content, do not call the API every time the user opens a Surah. Use the **Sync** system to download the entire Surah/Edition once and store it in a local database like **Isar** or **Hive**.

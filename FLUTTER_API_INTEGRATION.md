# Flutter API Integration Guide 🚀

This document provides a comprehensive guide for Flutter developers to integrate the Quran App backend APIs.

## 📌 Global Configuration

- **Base URL**: `http://<your-server-ip>:5000/api/v1`
- **Auth Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Content Type**: `application/json`

---

## 📖 1. Quran Module (`/quran`)

The Quran module is the core of the app. It provides data for Surahs, Ayahs, and translations.

### 🔹 Get Languages
- **Endpoint**: `GET /quran/languages`
- **Description**: Fetches all available translation languages and editions.

### 🔹 Get Surah List
- **Endpoint**: `GET /quran/surah`
- **Description**: Fetches a list of all 114 Surahs with metadata.

### 🔹 Get Surah Details
- **Endpoint**: `GET /quran/surah/:number`
- **Query Params**: `edition` (optional, default: `english_saheeh`)
- **Example**: `/quran/surah/1?edition=bangla_muhiuddin`

### 🔹 Get Specific Ayah
- **Endpoint**: `GET /quran/ayah/:surah/:ayah`
- **Query Params**: `edition`, `lang`
- **Example**: `/quran/ayah/2/255?edition=english_saheeh&lang=en`

### 🔹 Search Quran
- **Endpoint**: `GET /quran/search`
- **Query Params**: `q` (keyword), `page`, `limit`
- **Example**: `/quran/search?q=mercy&page=1&limit=10`

### 🔹 Sync System (Offline First)
To support offline reading, use the sync endpoints:
- **Check Sync**: `GET /quran/sync/check?edition=xyz&version=1`
- **Download Data**: `GET /quran/sync/download?edition=xyz&fromVersion=0`

---

## 🔖 2. Bookmark Module (`/bookmark`)

Allows users to save their favorite Ayahs. **Auth Required.**

### 🔹 Add Bookmark
- **Endpoint**: `POST /bookmark`
- **Body**:
  ```json
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "text": "Arabic text",
    "translation": "English text",
    "editionIdentifier": "english_saheeh"
  }
  ```

### 🔹 Get My Bookmarks
- **Endpoint**: `GET /bookmark`

### 🔹 Remove Bookmark
- **Endpoint**: `DELETE /bookmark/:id`

---

## 🖍️ 3. Highight Module (`/highlight`)

Allows users to highlight Ayahs with different colors. **Auth Required.**

### 🔹 Add Highlight
- **Endpoint**: `POST /highlight`
- **Body**:
  ```json
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "color": "#FFD700",
    "text": "Context text"
  }
  ```

### 🔹 Get My Highlights
- **Endpoint**: `GET /highlight`

---

## 🕋 4. Prayer Time Module (`/prayer-time`)

Provides prayer timings based on location.

### 🔹 Get My Prayer Times
- **Endpoint**: `GET /prayer-time`
- **Description**: Returns prayer times based on user's saved settings (city/country).

### 🔹 Get Adhan Recitations
- **Endpoint**: `GET /prayer-time/recitations`
- **Description**: List of available Adhan audio files.

### 🔹 Update Prayer Settings
- **Endpoint**: `PATCH /prayer-time/settings`
- **Auth Required**
- **Body**:
  ```json
  {
    "location": {
      "city": "Dhaka",
      "country": "Bangladesh"
    },
    "activePrayers": ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"],
    "selectedRecitationId": "recitation-id"
  }
  ```

---

## 🛠️ Flutter Integration Example (Using Dio)

### 1. Setup Base Client
```dart
import 'package:dio/dio.dart';

class ApiClient {
  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: 'http://YOUR_SERVER_IP:5000/api/v1',
      connectTimeout: Duration(seconds: 5),
      receiveTimeout: Duration(seconds: 3),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  static void setToken(String token) {
    dio.options.headers['Authorization'] = 'Bearer $token';
  }
}
```

### 2. Fetch Quran Data
```dart
Future<List<dynamic>> fetchSurahs() async {
  try {
    final response = await ApiClient.dio.get('/quran/surah');
    if (response.data['success']) {
      return response.data['data'];
    }
  } catch (e) {
    print('Error: $e');
  }
  return [];
}
```

### 3. Handle Bookmarks
```dart
Future<void> addBookmark(int surah, int ayah) async {
  try {
    await ApiClient.dio.post('/bookmark', data: {
      'surahNumber': surah,
      'ayahNumber': ayah,
      // ... other fields
    });
  } catch (e) {
    // Handle error
  }
}
```

---

## 💡 Best Practices for Flutter Devs

1. **Caching**: Store Quran data in **Hive** or **Isar** for offline access. Use the `/quran/sync/download` endpoint to get bulk data.
2. **State Management**: Use **Riverpod** or **Bloc** to manage API states (Loading, Success, Error).
3. **Model Generation**: use `json_serializable` to generate Dart models from JSON responses.
4. **Token Management**: Use `flutter_secure_storage` to save the JWT token safely.

---

> [!TIP]
> Always check the `success` field in the response. If `success: false`, it will usually contain a `message` explaining the error.

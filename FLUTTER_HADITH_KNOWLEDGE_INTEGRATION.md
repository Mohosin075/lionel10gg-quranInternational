# Hadith & Knowledge Library Integration & UI/UX Design Guide (Flutter) 🚀

This document is a comprehensive integration blueprint for Flutter developers. It covers the newly added **Hadith Library** and **Knowledge Library** (Blinkist-style) modules, detailing backend API endpoints, offline sync protocols, and detailed UI/UX design instructions (especially useful if formal design mockups are missing).

---

## 📌 1. Global Headers & Authentication
All client endpoints require user authentication. Ensure the authorization header is passed:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 🛡️ 2. Subscription Shield (Premium Lock)
Both modules are premium features locked under the subscription model.
- If a user **does not** have an active subscription, the backend returns:
  - **HTTP Status**: `402 Payment Required`
  - **Body**:
    ```json
    {
      "success": false,
      "message": "Premium subscription required to access this feature"
    }
    ```
- **Flutter Implementation**:
  - Add an interceptor or check the response status code. If it returns `402`, route the user directly to the Subscription/Checkout page.
  - Check the local user model properties before launching queries to optimize UX:
    - `user.subscriptionStatus == 'active'`
    - `user.subscriptionExpiresAt > DateTime.now()`

---

## 🎨 3. UI/UX Design Guidelines (Minimalist Islamic Aesthetic)

If you do not have design mockups, follow these strict visual guidelines to create a premium, physical Islamic book feel.

### A) Black & White Theme Rules (Reading Sections)
These reading screens (Quran, Hadith, Tafsir, Duas, Knowledge Library) must replicate reading a premium physical book:
* **No Vibrant Accents:** Completely exclude colored buttons, icons, or green/blue/red tints.
* **Colors:** Stick strictly to monochrome grays, deep blacks, and clean whites.
* **Typography:** 
  - Use high-quality Google Fonts. 
  - Headings: Serif font like **Playfair Display**, **Outfit**, or **Lora** for a bookish look.
  - Body Text: High-readability sans-serif font like **Inter** or serif like **Lora**.

### B) Theme Toggle & Background Control ("Aa" Controller)
Create an **"Aa"** icon button in the app bar of the reading screens that opens a bottom sheet with the following controls:

#### 1. Background Contrast Selection (3 Modes)
Map the selected state using state management (Provider / Riverpod / Bloc) to apply these exact theme colors:
* ☀️ **Light Mode:**
  - Background: Pure White (`#FFFFFF`)
  - Text: Deep Charcoal/Black (`#111111`)
* 🌙 **Dark Mode:**
  - Background: Pure Black (`#000000`)
  - Text: Soft Off-White/Light Gray (`#F5F5F5`)
* 🍂 **Sepia / Soft Mode (Eye-Comfort):**
  - Background: Soft Sepia (`#F4ECD8`) or low-contrast warm gray (`#F0EAE1`)
  - Text: Dark Coffee/Charcoal (`#2D2424`)

#### 2. Text Resizing Slider
- Include a slider in the "Aa" bottom sheet to adjust font size dynamically.
- Implement this by scaling the `fontSize` property in your `TextStyle` using a local double variable (e.g., range from `14.0` to `26.0`).

### C) Halal Imagery & Icons (Islamic Guidelines)
* **No Human Faces:** For cover images, illustrations, or graphics representing categories, **do not display faces**. Use scenery, landscape vectors, calligraphy, abstract geometry, or silhouettes illuminated by a light source (masking any facial features).
* **Minimalist Icons:** Represent categories using clean, thin-line monochrome icons (e.g. outline icons for prayer beads, book, mosque, crescent moon).

### D) Subscription Notice Notice placement
Include this exact honest notice text directly above or below the subscription checkout buttons:
> **"Notice: The Knowledge Library is live but currently under construction! We currently have a maximum of 50 initial articles available. New articles will be added weekly (1 article per week) until the library reaches its full collection of 300+ articles. Thank you for supporting our project!"**

---

## 🛠️ 4. Screen-by-Screen Layout Blueprint (If Design is Missing)

### 📱 Screen 1: Knowledge Library Category Selector
1. **App Bar**: Serif title `"Knowledge Library"`, showing an `"Aa"` theme settings button on the right.
2. **Body**: A vertical scroll or grid of 10 category cards.
3. **Category Card design**:
   - Thin border outline (e.g. border color `#CCCCCC` in Light Mode, `#333333` in Dark Mode).
   - An outline icon on the left (e.g. open book for *Stories & Lessons*, heart for *Purification of the Soul*).
   - Category title on the right in a bold, readable serif font.
   - A lock icon if the user is non-premium, or a chevron right if they are premium.

### 📱 Screen 2: Articles List View (Blinkist Style)
1. **Header**: Shows category title (e.g., `"Purification of the Soul"`).
2. **List Item design**:
   - Article Cover image on the left (square, rounded corners `8dp`, abstract/halal scenery).
   - Title in bold.
   - Subtitle/Metadata: `⏱️ 5 min read` | `🎧 Audio Available`.
   - Small premium lock indicator if subscription is required.

### 📱 Screen 3: Article Detail & Audio Player
1. **Scaffold Background**: Driven by "Aa" contrast mode selection.
2. **Top Header**: Cover image (rectangular, full width, height `200dp`).
3. **Audiobook Player Widget** (Sticky at the top, right below the cover image):
   - A clean horizontal bar containing Play/Pause, playback speed selector (`1.0x`, `1.2x`, `1.5x`), a seek progress bar, and time remaining indicator.
   - Connect this to a player package like `just_audio` using `audioUrl` returned from the API.
4. **Rich Text Content**:
   - Render the HTML string using the `flutter_widget_from_html` or `flutter_html` package to preserve paragraphs, lists, bolding, and italics.
   - Example:
     ```dart
     HtmlWidget(
       article.content,
       textStyle: TextStyle(
         fontSize: currentFontSize, // Driven by font slider state
         fontFamily: 'Lora',
         height: 1.5,
       ),
     )
     ```

---

## 🔌 5. API Endpoints

### 📖 Hadith Module (`/api/v1/hadith`)

#### 🔹 Fetch Hadiths (Paginated List)
- **Endpoint**: `GET /api/v1/hadith`
- **Query Parameters**:
  - `lang` (optional, default: `en`): `en`, `de` etc.
  - `category` (optional)
  - `source` (optional): `Sahih al-Bukhari`, `Sahih Muslim`
  - `page` (optional, default: `1`)
  - `limit` (optional, default: `10`)
- **Response**:
  ```json
  {
    "success": true,
    "meta": { "page": 1, "limit": 10, "total": 15, "totalPages": 2 },
    "data": [
      {
        "_id": "673...",
        "hadithNo": "bukhari_1",
        "source": "Sahih al-Bukhari",
        "chapter": "Revelation",
        "arabicText": "حَدَّثَنَا الْحُمَيْدِيُّ...",
        "translation": "Narrated 'Umar bin Al-Khattab...",
        "authenticity": "Sahih",
        "category": "Revelation",
        "lang": "en",
        "version": 1,
        "isActive": true
      }
    ]
  }
  ```

#### 🔹 Get Hadith Detail
- **Endpoint**: `GET /api/v1/hadith/:id`

---

### 💡 Knowledge Library Module (`/api/v1/knowledge-library`)

#### 🔹 Fetch Articles (Paginated List)
- **Endpoint**: `GET /api/v1/knowledge-library`
- **Query Parameters**:
  - `lang` (optional, default: `de`): `de`, `en` etc.
  - `category` (optional)
  - `page` (optional)
  - `limit` (optional)
- **Response**:
  ```json
  {
    "success": true,
    "meta": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 },
    "data": [
      {
        "_id": "673...",
        "articleId": "pornography-destruction",
        "slug": "die-zerstoerung-durch-pornografie-en",
        "title": "The Destruction of Pornography",
        "content": "<p>Formatted HTML content...</p>",
        "category": "Problems of Today",
        "readTime": 5,
        "imageUrl": "https://s3...",
        "audioUrl": "https://s3...",
        "lang": "en",
        "version": 1,
        "isActive": true
      }
    ]
  }
  ```

#### 🔹 Get Article Detail
- **Endpoint**: `GET /api/v1/knowledge-library/:id`

---

## 🔄 6. Offline Caching Sync Protocol

To support offline reading, you must perform versioned syncing. Cache items inside SQLite, Hive, or Isar database.

### 🔹 Caching Sync Flow
1. Fetch latest server data version:
   - **Endpoint**: `GET /api/v1/<module>/check-sync`
   - **Query Parameters**: `lang` (e.g. `de`), `version` (your local database version)
   - **Response**:
     ```json
     {
       "success": true,
       "data": {
         "updateAvailable": true,
         "serverVersion": 5,
         "clientVersion": 1,
         "lang": "de"
       }
     }
     ```
2. If `updateAvailable` is `true`, download updates:
   - **Endpoint**: `GET /api/v1/<module>/download-sync`
   - **Query Parameters**: `lang`, `fromVersion` (pass your local cached version)
3. Iterate and upsert the returned list into your local SQLite/Hive database (match unique keys `hadithNo` or `articleId` + `lang`).
4. Save the new `serverVersion` to local settings (e.g. Shared Preferences) as your new local version.
5. Offline Mode: If the app is offline (or on standard reading load), fetch the data directly from the local database instead of calling the list API.

---

## 🔌 7. Flutter Integration Code Example (Dart & Dio)

```dart
import 'package:dio/dio.dart';

class KnowledgeArticle {
  final String id;
  final String articleId;
  final String slug;
  final String title;
  final String content;
  final String category;
  final int readTime;
  final String? imageUrl;
  final String? audioUrl;
  final String lang;
  final int version;
  final bool isActive;

  KnowledgeArticle({
    required this.id,
    required this.articleId,
    required this.slug,
    required this.title,
    required this.content,
    required this.category,
    required this.readTime,
    this.imageUrl,
    this.audioUrl,
    required this.lang,
    required this.version,
    required this.isActive,
  });

  factory KnowledgeArticle.fromJson(Map<String, dynamic> json) {
    return KnowledgeArticle(
      id: json['_id'],
      articleId: json['articleId'],
      slug: json['slug'],
      title: json['title'],
      content: json['content'],
      category: json['category'],
      readTime: json['readTime'] ?? 3,
      imageUrl: json['imageUrl'],
      audioUrl: json['audioUrl'],
      lang: json['lang'],
      version: json['version'] ?? 1,
      isActive: json['isActive'] ?? true,
    );
  }
}

class KnowledgeRepository {
  final Dio _dio;
  final LocalDatabaseService _localDb;

  KnowledgeRepository(this._dio, this._localDb);

  Future<void> syncArticles(String lang) async {
    try {
      // 1. Get cached version from local DB
      final int localVersion = await _localDb.getConfigVersion('articles_version_$lang') ?? 0;

      // 2. Compare server version
      final syncCheck = await _dio.get(
        '/knowledge-library/check-sync',
        queryParameters: {'lang': lang, 'version': localVersion},
      );

      final checkData = syncCheck.data['data'];
      final bool updateAvailable = checkData['updateAvailable'];
      final int serverVersion = checkData['serverVersion'];

      if (updateAvailable) {
        // 3. Fetch update stream
        final response = await _dio.get(
          '/knowledge-library/download-sync',
          queryParameters: {'lang': lang, 'fromVersion': localVersion},
        );

        final List<dynamic> items = response.data['data'];
        final articles = items.map((x) => KnowledgeArticle.fromJson(x)).toList();

        // 4. Save/update local storage and update config version
        await _localDb.saveArticles(articles);
        await _localDb.saveConfigVersion('articles_version_$lang', serverVersion);
        print("Sync complete. Saved ${articles.length} updated articles.");
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 402) {
        // Subscription required: Route user to Subscription/Checkout Screen
        _navigator.redirectToSubscriptionScreen();
      } else {
        print("Knowledge Sync Error: ${e.message}");
      }
    }
  }
}
```

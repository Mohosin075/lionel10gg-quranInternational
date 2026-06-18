# Hadith & Knowledge Library Integration & UI/UX Design Guide (Flutter) 🚀

This document is a comprehensive integration blueprint for Flutter developers. It covers all newly added features (Hadith Library, Knowledge Library, SEPA Donations, and Quran PDF Library) along with API references, offline sync protocols, Dart code examples, and detailed screen-by-screen layout specifications.

---

## 📌 1. Global Headers & Authentication
All client endpoints require user authentication. Ensure the authorization header is passed:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 🛡️ 2. Subscription Shield (Premium Lock)
Both modules (Hadith Library and Knowledge Library) are premium features locked under the subscription model.
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
  - Add an interceptor or check the response status code. If it returns `402`, route the user directly to the **Subscription & Donation Screen (Screen 7)**.
  - Check the local user model properties before launching queries to optimize UX:
    - `user.subscriptionStatus == 'active'`
    - `user.subscriptionExpiresAt > DateTime.now()`
    - Admins and Super Admins bypass subscription checks.

---

## 🎨 3. Global UI/UX Theme Rules (Premium Physical Book Aesthetic)
The reading sections (**Quran, Hadith, Tafsir, Duas, and Knowledge Library**) must replicate reading a premium physical Islamic book:
* **Monochrome Style:** Completely exclude vibrant colored buttons, green/blue/red tints, or bright accents. Use clean whites, soft grays, and deep blacks.
* **Typography:** Use a Serif font (e.g. Google Font **Playfair Display** or **Lora**) for headings, and highly readable Serif (**Lora**) or Sans-Serif (**Inter**) for body text.

---

## 📱 4. Screen-by-Screen Layout Blueprint

### 🖥️ Screen 1: Home Dashboard Screen
* **What changes:**
  - The previous layout had **3 columns/buttons** (Quran, Tafsir, Duas).
  - You must update this to **4 columns/buttons** on the dashboard home screen:
    1. **Quran** (Interactive reader)
    2. **Hadiths** (Hadith Library - Premium Feature)
    3. **Tafsir** (Quranic Commentaries)
    4. **Duas** (Supplications)
* **Integration Logic:**
  - Clicking the **Hadiths** button must first verify if the user is premium. If not, redirect them directly to the **Subscription Screen (Screen 7)**.

### 🖥️ Screen 2: Hadith Library Main Selector Screen (Premium)
* **What it contains:**
  - Displays list of Hadith source books (e.g. `Sahih al-Bukhari`, `Sahih Muslim`) and chapters/categories (e.g. *Revelation*, *Intentions*, *Belief*).
* **API Endpoints to call:**
  - Fetch Hadiths by source/category: `GET /api/v1/hadith?lang=en&source=Sahih al-Bukhari`
* **Offline Sync & Caching:**
  - On startup or when entering this screen, check if updates exist via:
    `GET /api/v1/hadith/check-sync?lang=en&version=<local_hadith_db_version>`
  - If updates exist, download incremental changes via:
    `GET /api/v1/hadith/download-sync?lang=en&fromVersion=<local_hadith_db_version>`
  - Save/upsert the returned Hadiths into the local database (SQLite/Hive).
  - Update the local saved Hadith version in Shared Preferences.
  - **Offline Mode:** If there is no internet, load the list directly from the phone's local database.

### 🖥️ Screen 3: Hadith Reading Screen (Premium)
* **What it contains:**
  - Displays Chapter Title, Hadith Source, Arabic Original Text, Translation, and Authenticity level (e.g. `Sahih`, `Hasan`).
* **Design Guidelines:**
  - Minimalist black-and-white, typography-focused layout.
  - Include an **"Aa"** settings button in the App Bar.
  - Clicking **"Aa"** displays a bottom sheet with:
    - **Font Size Slider**: Adjusts text size of the Arabic and translation text on screen.
    - **Background Contrast Toggle** (3 Modes):
      - *Light Mode:* White Background (`#FFFFFF`), Black Text (`#111111`).
      - *Dark Mode:* Black Background (`#000000`), Off-White Text (`#F5F5F5`).
      - *Sepia Mode:* Warm Gray/Sepia Background (`#F4ECD8`), Charcoal Text (`#2D2424`).

### 🖥️ Screen 4: Knowledge Library Categories Screen (Wissens-Bibliothek)
* **How to access:**
  - Add a dedicated **Library icon** (Wissens-Bibliothek) in the main navigation bar/menu.
* **What it contains:**
  - A vertical grid or list displaying the **10 main categories** of the Masterplan:
    1. Probleme der heutigen Zeit (Problems of Today)
    2. Charakter & Reinigung der Seele (Character & Soul)
    3. Gute Taten & spirituelles Wachstum (Good Deeds & Spiritual Growth)
    4. Geschichten & Lehren (Stories & Lessons)
    5. Biographien der Rechtschaffenen (Biographies of the Righteous)
    6. Beziehungen, Ehe & Familie (Relationships, Marriage & Family)
    7. Jugend, Motivation & Disziplin (Youth, Motivation & Discipline)
    8. Herz, Emotionen & mentale Kämpfe (Mental & Emotional Struggles)
    9. Dunya, Geld & moderne Gesellschaft (Dunya, Wealth & Modern Society)
    10. Quran, Dua & Verbindung zu Allah (Quran, Dua & Connection to Allah)
* **Design Guidelines:**
  - If the user is non-premium, display a small locked padlock symbol on the categories, redirecting them to **Screen 7** when clicked.
  - Minimalist outlines with thin-line category icons. No human/creature faces.

### 🖥️ Screen 5: Article Reading Screen (Blinkist Style - Premium)
* **What it contains:**
  - Displays the Article Title, Cover Image, estimated read time (`⏱️ 5 min read`), an audiobook player, and the main text.
* **Design Guidelines:**
  - **Cover Image:** Must **not** contain human faces (use nature scenery, patterns, calligraphy, or abstract drawings).
  - **Audio Player Widget (Sticky at top or bottom):**
    - A sleek player bar containing Play/Pause, playback speed selector (`1.0x`, `1.2x`, `1.5x`), progress bar, and time remaining.
    - Uses `audioUrl` returned from the database API.
  - **HTML Content Rendering:**
    - The `content` field is stored in database as HTML (rich text containing bold, paragraphs, lists from Quill editor). Use a library like `flutter_widget_from_html` to render it perfectly.
  - **Aa (Contrast & Font Size) Settings**: Include the same "Aa" contrast modes (Light, Dark, Sepia) and font resizing slider as the Hadith reading screen.
* **Offline Sync & Caching:**
  - Sync updates using:
    `GET /api/v1/knowledge-library/check-sync?lang=de&version=<local_art_version>`
    `GET /api/v1/knowledge-library/download-sync?lang=de&fromVersion=<local_art_version>`
  - Cache them locally for 100% offline reading.

### 🖥️ Screen 6: Quran Languages & Translations Screen
* **What changes:**
  - Underneath the normal list of 124 interactive (API-supported) Quran languages, create a separate section labeled: **"PDF Library (Additional Translations)"**.
  - List the rare languages that do not have interactive text support.
  - Next to each rare language, write `"PDF available"` and display a **PDF icon**.
  - Clicking this opens an built-in PDF Reader/Viewer in the app (e.g., using `flutter_pdfview` or native PDF renderer) to read the translation offline.

### 🖥️ Screen 7: Subscription & Donation Screen (Checkout)
* **What it contains:**
  - Subscription package cards (Monthly, Yearly).
  - Honest Warning Notice: Place this exact text directly above or below the subscription checkout buttons:
    > *"Notice: The Knowledge Library is live but currently under construction! We currently have a maximum of 50 initial articles available. New articles will be added weekly (1 article per week) until the library reaches its full collection of 300+ articles. Thank you for supporting our project!"*
  - **"Support Us" / "Donate" Button**:
    - Operates independently of subscription packages.
    - Clicking it allows the user to select preset donation amounts (**€5, €10, €20, €50, €100**) or enter a **custom one-time donation amount** in Euros.
    - Provisions transactions using credit cards or SEPA Direct Debit via the Flutter Stripe SDK.

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

#### 🔹 Get Version
- **Endpoint**: `GET /api/v1/hadith/version`

#### 🔹 Check Sync State
- **Endpoint**: `GET /api/v1/hadith/check-sync`

#### 🔹 Download Sync Stream
- **Endpoint**: `GET /api/v1/hadith/download-sync`

#### 🔹 Admin: Sync Hadith from Global API
- **Endpoint**: `POST /api/v1/hadith/sync-external`
- **Body**:
  ```json
  {
    "edition": "eng-bukhari",
    "from": 1,
    "to": 50
  }
  ```

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

#### 🔹 Get Version
- **Endpoint**: `GET /api/v1/knowledge-library/version`

#### 🔹 Check Sync State
- **Endpoint**: `GET /api/v1/knowledge-library/check-sync`

#### 🔹 Download Sync Stream
- **Endpoint**: `GET /api/v1/knowledge-library/download-sync`

---

### 💳 Stripe Checkout & Donation Endpoints (`/api/v1/payment`)

#### 🔹 Create Payment Intent (SEPA/Card Donations)
- **Endpoint**: `POST /api/v1/payment/create-payment-intent`
- **Body**:
  ```json
  {
    "amount": 25.00,
    "currency": "EUR",
    "paymentType": "one_time" 
  }
  ```

#### 🔹 Verify Payment Intent
- **Endpoint**: `POST /api/v1/payment/verify-payment-intent`
- **Body**:
  ```json
  {
    "paymentIntentId": "pi_..."
  }
  ```

#### 🔹 Get Donation Presets
- **Endpoint**: `GET /api/v1/payment/donation-presets`

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

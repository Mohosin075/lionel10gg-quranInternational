# Premium Mobile App (Frontend) Integration & Design Specification
**Version:** 1.2  
**Author:** Antigravity AI  

This document provides exact, production-ready specifications, layout maps, and code concepts for the mobile application development team (Flutter / React Native / Native Swift & Kotlin).

---

## 🎨 1. Layout & UI/UX Design Specifications

### A. Samsung Navigation Bar Overlap Resolution
* **Description:** Devices with physical or soft navigation keys (especially Samsung Galaxy devices running One UI) display a persistent system navigation panel at the bottom. This panels overlaps standard bottom insets, blocking action buttons.
* **Layout Design Requirement:**
  ```
  +-----------------------------------+
  |          App Content              |
  |                                   |
  +-----------------------------------+
  | [🟢 Add to Bookmark] [🟢 Share]   | <-- Raised Action Button Bar (Bottom Padding: 16dp + SafeArea)
  +-----------------------------------+
  |    |<   O   >|  (System Bar)      | <-- Samsung Navigation bar area (Protected)
  +-----------------------------------+
  ```
* **Implementation Concept (React Native / Flutter):**
  * **React Native:** Use `react-native-safe-area-context` and extract `insets.bottom`. Add `paddingBottom: Math.max(insets.bottom, 16)`.
  * **Flutter:** Use `MediaQuery.of(context).padding.bottom` and wrap the bottom button row inside a container with `EdgeInsets.only(bottom: bottomPadding > 0 ? bottomPadding : 16.0)`.

### B. Global Spelling Replacement: "Koran" ➔ "Quran"
* Replace all static and dynamically formatted strings matching `/Koran/i` to `Quran` or `quran`.
* Target components:
  1. Main Dashboard Header ("Quran International").
  2. Tab selections ("Read Quran").
  3. Settings menu items ("Quran Translation Settings").
  4. Splash screen logo and subtitle.

### C. Paywall & Premium Suporter Benefits List
* The 114 Surahs (Al-Fatiha to Al-Nas) must remain **free and unlocked** under all circumstances. Remove lock badges (`🔒`) from the Surah selector lists.
* On the Premium Supporter paywall screen, fetch the list of benefit points dynamically from the backend:
  * **Endpoint:** `GET /api/v1/subscription/premium-benefits`
  * **Expected Response Object:**
    ```json
    [
      { "serialNumber": 1, "text": "Full Tafsir Access", "isActive": true },
      { "serialNumber": 2, "text": "Hadith Collection", "isActive": true }
    ]
    ```
  * **UI Requirement:** Render this list dynamically using a list builder. Never hardcode these 14 points inside the app binary to allow the administrator to modify benefits from the dashboard.

---

## ⚙️ 2. API Integration & Logic Specifications

### A. Dynamic Language Translation Sync
* **Problem:** Changing the app language to Hungarian (`hu`) doesn't automatically translate library content or bookmarks because the app was fetching cached versions.
* **Instruction:**
  1. **API Language Query:** The language code must be appended dynamically to all resource endpoints:
     * `GET /api/v1/knowledge-library?lang={langCode}`
     * `GET /api/v1/knowledge-library/books?lang={langCode}`
     * `GET /api/v1/knowledge-library/fatwas?lang={langCode}`
  2. **Bookmarks & Al-Fatiha Translation Reset:** When the user switches languages, clear the local translation cache for bookmarked verse text and fetch fresh translations. Do not display cached German text for Surah Al-Fatiha while the rest of the surahs are rendered in Hungarian.

### B. Dynamic Reciter Selection for Audio Playback
1. Fetch available reciters from:
   * `GET /api/v1/quran/reciters`
2. Save the user's selected reciter ID (e.g. `alafasy`, `minshawi`) to secure local storage.
3. When playing Surah audio, append the reciter ID to the Surah Detail endpoint:
   * `GET /api/v1/quran/surah/:surahNumber?reciter={reciterId}`
4. The backend will return the corresponding `.mp3` audio track URLs from `everyayah.com` pointing to the Arabic recitation.

### C. Deep Linking & Share Functionality (Specific Verse Jump)
1. **Share Button Action:** On pressing the share button next to an Ayah, use the `shareUrl` and `shareText` values returned in the Ayah details from the backend.
2. **Deep Link Scheme Registration:**
   * Scheme: `quraninternational`
   * Format: `quraninternational://surah/{surahNumber}/ayah/{ayahNumber}`
3. **App Link Routing Logic:**
   * Parse the deep link URI on application startup or wake from background.
   * If valid, push the Quran Reader screen onto the stack and invoke:
     * `GET /api/v1/quran/surah/{surahNumber}`
   * Once loaded, trigger the list view controller to scroll/jump directly to the corresponding `ayahNumber` list index using a scroll controller (e.g., `scrollController.animateTo(...)` or `jumpTo()`).

### D. User Notification Settings Sync
* Toggle controls in the Settings menu must call the backend `PATCH /api/v1/user/profile` endpoint upon modification:
  ```json
  {
    "settings": {
      "pushNotification": true,
      "emailNotification": true,
      "locationService": true
    }
  }
  ```

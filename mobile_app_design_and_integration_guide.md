# Premium Flutter Mobile App Integration & Design Specification
**Version:** 2.0 (Flutter Edition)  
**Last Updated:** August 2026  
**Author:** Antigravity AI  

This document serves as the official integration guide for the **Flutter Mobile App Developers**. It specifies design layouts, API routes, request/response structures, and flow-control instructions to be merged into the existing Flutter codebase.

---

## 🎨 1. Layout & UI/UX Design Specifications

### A. Samsung Navigation Bar Overlap Resolution
* **Problem:** Software system navigation bars on devices (especially Samsung Galaxy Series running One UI) overlap floating action widgets at the bottom.
* **Instruction:** Wrap the bottom floating action panel (e.g. bookmarks or share bar) with a Padding/SafeArea inset that detects and offsets system padding.
* **Layout Design Map:**
  ```
  +-----------------------------------+
  |          App Content              |
  |                                   |
  +-----------------------------------+
  | [🟢 Add to Bookmark] [🟢 Share]   | <-- Raised Action Buttons (Bottom Padding: 16.0 + SafeAreaInset)
  +-----------------------------------+
  |    |<   O   >|  (System Bar)      | <-- Samsung Navigation bar area (Protected)
  +-----------------------------------+
  ```
* **Flutter Integration:** Instead of hardcoded heights, query the system insets dynamically using `MediaQuery.of(context).padding.bottom` and apply it as bottom padding (ensure a minimum fallback height of `16.0` if no insets exist).

### B. Global Text & Translation Corrections
Ensure all static asset text, localization bundles (`assets/translations/*.json`), and dynamic UI components apply the following correct spelling rules:
1. **Spelling Correction 1:** Replace all references of **"Koran"** (case-insensitive) ➔ **"Quran"**.
2. **Spelling Correction 2 (German):** Correct references of **"Milchschwestern"** ➔ **"Milchschwester"** (singular form).
3. **Spelling Correction 3 (Hungarian):** Correct references of **"konyv"** ➔ **"könyv"** (with exact accents).
*(Note: These spelling corrections have also been seeded in the backend database fields for Articles, Books, and Fatwas).*

### C. Unified Free Quran Access
* **Instruction:** Surah Al-Baqarah and all other 114 Surahs must remain **100% free and unlocked** for all users.
* **Action:** Remove any lock badges (`🔒`), billing overlays, or premium checks from the Surah selector and Reciter listing components.

---

## ⚙️ 2. API Integration & Routing Specifications

### A. Global Language translation Sync
To sync resource translations dynamically on change (e.g. articles or books):
* **Request Format:** Append query parameter `lang` dynamically to library endpoints (e.g., `de`, `en`, `tr`).
* **Cache Management:** When the user changes their language setting, invalidate/clear the local offline cache boxes (e.g. Hive or SQLite). Fetch the translated data immediately from the backend.

---

### B. Subscription & Paywall Verification
To verify if the user is a premium member to unlock exclusive premium assets (like Hadiths):
* **Endpoint:** `GET /api/v1/subscription/my-subscription`
* **Headers:** `Authorization: Bearer <Token>`
* **Response Payload Schema:**
  ```json
  {
    "success": true,
    "message": "Subscription details retrieved",
    "data": {
      "subscriptionTier": "premium", // Value check: If 'premium', unlock all features
      "status": "active",
      "subscriptionExpiresAt": "2126-08-15T00:00:00.000Z"
    }
  }
  ```

---

### C. Dynamic Paywall Benefits List
To display the premium features list dynamically on the Supporter screen:
* **Endpoint:** `GET /api/v1/subscription/premium-benefits`
* **Method:** `GET`
* **Response Payload Schema:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "64b0f...",
        "serialNumber": 1,
        "text": "Full Audio Offline Downloads",
        "isActive": true
      },
      {
        "_id": "64b1f...",
        "serialNumber": 2,
        "text": "Access to Verification Engine",
        "isActive": true
      }
    ]
  }
  ```
* **Instruction:** Order the list on the UI based on `serialNumber` ascending.

---

### D. Quran Reciters and Audio Player
* **Reciter List Endpoint:** `GET /api/v1/quran/reciters`
* **Surah Detail Endpoint:** `GET /api/v1/quran/surah/:surahNumber?reciter={reciterId}`
* **Instruction:** Regardless of the app's selected translation language, the recitation audio file url must always play the **original Arabic recitation** mapped to the selected reciter.

---

### E. Deep Linking & Specific Verse Jump
* **Deep Link Scheme:** `quraninternational://surah/{surahNumber}/ayah/{ayahNumber}`
* **Instruction:**
  1. Capture deep link arguments on app launch/resume.
  2. Load the Surah Reader page for the requested `surahNumber`.
  3. Once data is fetched, trigger the scroll view to scroll directly to the index of `ayahNumber` using a `ScrollController` or index anchor offset.

---

### F. Hasanat Points Counter
To update the user's progress coins:
* **Endpoint:** `POST /api/v1/hasanat`
* **Headers:** 
  * `Authorization: Bearer <Token>`
  * `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "amount": 10
  }
  ```
* **Response Payload Schema:**
  ```json
  {
    "success": true,
    "message": "Hasanat collected successfully",
    "data": {
      "totalHasanat": 130
    }
  }
  ```
* **Instruction:** Fire this endpoint whenever a reading/audio travel session finishes. The backend does not cap or limit requests.

---

### G. Push Notifications & Real-Time Sync

#### 1. REST Endpoints for Notification Management
* **Get User Notifications:** `GET /api/v1/notifications` (Headers: `Authorization: Bearer <Token>`)
* **Mark Single Notification as Read:** `PATCH /api/v1/notifications/:id/read`
* **Mark All Notifications as Read:** `PATCH /api/v1/notifications/read-all`
* **Delete Notification:** `DELETE /api/v1/notifications/:id`

#### 2. Socket.io Connection & Event Sync
To capture instant notifications when the app is active in the foreground:
* **Socket Host:** Root server domain (e.g. `https://your-backend-domain.com`)
* **Connection Handshake Options:** Set transport protocol to `websocket`.
* **Action Steps:**
  1. Emit connection lifecycle events.
  2. Upon connection success, emit a `'join'` event passing the authenticated user's `userId` (MongoDB ObjectId string).
     * **Event Payload:** `userId` (string)
  3. Listen to the `'notification'` event broadcasted by the server.
     * **Event Schema:**
       ```json
       {
         "type": "NEW_NOTIFICATION",
         "data": {
           "title": "Daily Reminders",
           "message": "It is time to read Surah Al-Kahf"
         }
       }
       ```
  4. Trigger a local UI snackbar/banner notification upon receiving the event.

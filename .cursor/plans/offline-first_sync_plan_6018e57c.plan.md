---
name: Offline-first sync plan
overview: "Ilone's actual asks: free unlocked Quran, real offline read+listen, IslamHouse library (articles/books/fatwas) on device, more Hadith/Tafsir offline, reciters, Vienna prayer, Hasanat unlimited, highlight jump, share. Future ideas (bank, 109 AI live) are not this release."
todos:
  - id: unlock-quran
    content: 114 surahs free. No Baqarah lock. Login never required to read.
    status: completed
  - id: offline-text
    content: After one online fill, Quran/Hadith/Dua/Tafsir/library text opens with no net. Language change refills that language.
    status: completed
  - id: offline-audio
    content: 12-16 reciters from quran.com, always Arabic audio. User can listen offline (download/cache reciter audio). Sheikh YouTube stream needs net.
    status: completed
  - id: library-three
    content: Knowledge Library = Articles + Books + Fatwas, full IslamHouse text, offline, all app languages.
    status: completed
  - id: client-bugs
    content: Hasanat counts every read (no once-only). Highlight opens exact ayah. Share ayah+deeplink. Prayer location selectable (Vienna). Search has results. SafeArea. Quran spelling.
    status: completed
  - id: dump-fill
    content: Fix dump + app fill so one online session puts all readable text (and chosen reciter audio) on the phone.
    status: completed
  - id: supporter
    content: Stripe tiers from €4.99, 30-day trial, premium benefit list from API. Supporter does not lock Quran text.
    status: completed
isProject: false
---

# What the client actually asked

Not "how the code is." From Ilone's chats + the **Final Technical Master Blueprint**.

Ilone's test failures (must not happen again):
- No internet → Quran did not load. His **Google Ads / promo video** says Offline Quran. The app must match that video, or the marketing is false. This is not an in-app ad.
- Surah Baqarah locked behind premium. Quran must be free.
- Library empty / too short. Must be IslamHouse, offline, in every app language.
- Almost no Hadith. Tafsir/Hadith must work offline.
- Recitation only with internet. Same rule: promo video says Offline Quran Audio — listen must work with no net after audio is on the phone.
- Prayer stuck on Bangladesh; he lives in Vienna.
- Search "Guidance" = no results.
- Highlight tap opens surah start, not the marked ayah.
- Share ayah does nothing.
- Hasanat counts only once per surah; he wants every read/recite, no limit.
- Samsung bar covers buttons.
- Koran / Milchschwestern / konyv spelling.

```mermaid
flowchart TD
  now[This release] --> freeQuran[114 surahs free to read]
  now --> phoneLib[Text of Quran Hadith Dua Tafsir Library on phone]
  now --> listen[Arabic reciters listen offline after audio is on device]
  now --> bugs[Hasanat highlight share location search SafeArea]
  later[Later update not this plan] --> live[Livestream AI dub 109 langs]
  later --> bank[Digital bank]
  later --> masjid[Masjid finder]
```

---

## This release (client NOW)

**Quran**
- All 114 surahs free. No paywall. No lock on Al-Baqarah.
- Full text + translation in local DB so airplane mode still reads.
- 12–16 reciters from quran.com. App language does not change the voice: **always original Arabic**.
- Offline listen must match the promo video line Offline Quran Audio. Audio on the phone after download/cache of the chosen reciter. Not stream-only.

**Knowledge Library — 3 sections, on the phone**
- Articles (400+), Books (169, own section), Fatwas (30–39).
- Rich text in the app. Offline. Every app language, not only DE/EN/TR.
- Bookmarks, highlight colors, reading progress like Quran.

**Hadith + Tafsir + Dua**
- Enough Hadith (not a handful). Tafsir and Hadith readable offline like Quran.

**Sheikh (5): Abu Alia, Abul Baraa, Pierre Vogel, One Message Foundation, Alim Hamza**
- Two tabs: Video lectures, Audio Hörreisen.
- In-app YouTube player. **Live stream needs internet** (blueprint). Full channels, not a few videos.

**Prayer**
- GPS + manual city search. Default not Bangladesh. Vienna must be selectable. Qibla compass.

**Supporter (Stripe)**
- Monthly from €4.99 (drop €0.79 / €1.99). Annual €34.99 / €44.99 / €55.99. Optional €100 lifetime.
- 30-day trial on sub plans, not on €100.
- 14 benefit lines from **API**, not hardcoded. Quran **text** stays free even if the promo list names Tafsir/Hadith/Library as supporter extras.

**Bugs Ilone filed**
- Hasanat: add points every time the surah is read or recited. Remove the once-only lock.
- Highlights: jump to that ayah, not surah 1 / start.
- Share: ayah text + `quraninternational://surah/{n}/ayah/{n}`.
- Search: real hits (Guidance etc.).
- SafeArea above Samsung nav.
- Spelling: Quran, Milchschwester, könyv.

---

## How we make offline true (logic)

Phone is the library after **one** successful online fill (and again when language changes).

- Backend dump must actually fill: ingest if empty, page in Mongo, JSON the app can save, ayahs keyed by edition.
- App then writes SQLite and **only reads SQLite** on those screens.
- No net / 401 / logout: keep DB, keep reading.

That is why dump gets **fixed**, not ignored. Client asked for offline; current dump cannot deliver it.

---

## Not this release (Ilone parked or "later update")

- Digital bank / APK-only untraceable payments
- 109-language AI livestream dub
- Masjid finder as YouTube+Twitch
- Gold Club 100 seats (he also considered dropping it)
- Affiliate 40–50%
- Bundling 16 full reciter libraries into the APK as one huge binary (he asked; we still put audio **on device via download/cache**, not a 2GB store listing)
- YouTube-policy "download 10,000 channel videos as one button" — he wants it; stream+optional user download is the honest now; bulk YouTube rip is not this sprint

---

## Done when (promo video is not a lie)

Ilone paid for a **Google Ads promotional video**. That video / copy says Offline Quran (and Offline Quran Audio). He asked: can I send this text to the video producer? Only if the **app behaves the same**.

Not an in-app advertisement. No UI work named "Offline Quran ad."

After one successful online open, his test:

1. Airplane mode.
2. Kill and reopen the app.
3. Open Al-Baqarah and other surahs — **text is there**.
4. Play a reciter already saved on the phone — **sound plays**.

If step 3 fails, he cannot use that promo video. Product must match marketing.

Promo can stay: read Quran offline; listen after reciter audio is on the phone; library/Hadith/Tafsir read offline after first sync.

Promo must not imply: first install never online still has Quran; Sheikh YouTube with no net unless that file was saved.

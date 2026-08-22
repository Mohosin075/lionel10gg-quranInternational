import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:quran_international/Utils/AppColors/app_colors.dart';
import 'package:quran_international/service/database_helper.dart';
import 'package:quran_international/Language/app_language_controller.dart';
import 'package:quran_international/View/Screen/KnowledgeScreen/knowledge_section_list_screen.dart';

class WelcomeGiftDialog extends StatelessWidget {
  const WelcomeGiftDialog({Key? key}) : super(key: key);

  static const String _bookId = 'quran-international-akhira-lexicon';

  static const Map<String, Map<String, String>> _localizedContent = {
    'en': {
      'title': 'Quran International Akhira Lexicon',
      'author': 'Quran International Editorial',
      'popup_title': 'Welcome Gift!',
      'popup_desc': 'To enrich your journey, we have gifted you a free copy of the premium book "Quran International Akhira Lexicon". Claim it now to read about the Hereafter (Akhira) terms in the Quran.',
      'btn_read': 'Read Now',
      'btn_dismiss': 'Maybe Later',
      'html': '''
<h2 style="color: #10B981; font-size: 20px; font-weight: bold; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px;">Quran International Akhira Lexicon</h2>
<p style="color: #64748B; font-size: 14px; font-style: italic; margin-bottom: 20px;">An exclusive guide to the terms of the Hereafter (Akhira) as mentioned in the Noble Quran.</p>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">1. Yawm al-Qiyamah (Day of Resurrection)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">The ultimate day when all humanity will be raised to stand before Allah for judgment. Mentioned numerous times in the Quran, it signifies the end of Dunya and the beginning of the eternal life.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">2. Al-Mizan (The Scale)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">The divine scales of justice that will weigh the good and bad deeds of every individual on the Day of Judgment. The Quran states: <i>"Then as for him whose balance (of good deeds) will be heavy, he will live a pleasant life."</i> (Al-Qari'ah: 6-7)</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">3. Al-Sirat (The Bridge)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">The bridge established over Jahannam (Hellfire) which every soul must cross. Believers will pass over it with varying speeds based on their faith and deeds, while others will fall into the abyss.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">4. Al-Hawd (The Cistern)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">The blessed pool of water granted to the Prophet Muhammad (peace be upon him). Believers will drink from it on the Day of Resurrection, and after drinking a single sip, they will never feel thirst again.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">5. Jannah (Paradise)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">The eternal home of peace, joy, and rewards prepared for the righteous. It contains gardens beneath which rivers flow, palaces, and pleasures that no eye has seen, no ear has heard, and no mind has ever conceived.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">6. Jahannam (Hellfire)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">The abode of punishment, heat, and sorrow created for disbelievers and wrongdoers. It serves as a reminder to walk the straight path of righteousness in this life.</p>
</div>
'''
    },
    'de': {
      'title': 'Quran International Jenseits-Lexikon',
      'author': 'Quran International Redaktion',
      'popup_title': 'Willkommensgeschenk!',
      'popup_desc': 'Um Ihre Reise zu bereichern, schenken wir Ihnen eine kostenlose Kopie des Premium-Buchs "Quran International Jenseits-Lexikon". Beanspruchen Sie es jetzt, um mehr über die Begriffe des Jenseits (Akhira) im Quran zu erfahren.',
      'btn_read': 'Jetzt lesen',
      'btn_dismiss': 'Später',
      'html': '''
<h2 style="color: #10B981; font-size: 20px; font-weight: bold; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px;">Quran International Jenseits-Lexikon</h2>
<p style="color: #64748B; font-size: 14px; font-style: italic; margin-bottom: 20px;">Ein exklusiver Leitfaden zu den Begriffen des Jenseits (Akhira), wie sie im edlen Quran erwähnt werden.</p>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">1. Yawm al-Qiyamah (Tag der Auferstehung)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Der Tag, an dem die gesamte Menschheit auferweckt wird, um sich vor Allah dem Gericht zu stellen. Im Quran mehrfach erwähnt, markiert er das Ende der Dunya und den Beginn des ewigen Lebens.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">2. Al-Mizan (Die Waagschale)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Die göttlichen Waagschalen der Gerechtigkeit, die am Tag des Jüngsten Gerichts die guten und schlechten Taten jedes Einzelnen wägen. Im Quran heißt es: <i>"Was nun jemanden angeht, dessen Waagschalen schwer sind, so wird er in einem zufriedenen Leben sein."</i> (Al-Qari'ah: 6-7)</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">3. Al-Sirat (Die Brücke)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Die Brücke über dem Höllenfeuer (Dschahannam), die jede Seele überqueren muss. Gläubige überqueren sie je nach Glauben und Taten in unterschiedlicher Geschwindigkeit, während andere in den Abgrund stürzen.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">4. Al-Hawd (Das Becken)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Das gesegnete Wasserbecken des Propheten Muhammad (Friede sei mit ihm). Gläubige trinken am Tag der Auferstehung daraus, und nach nur einem Schluck werden sie nie wieder Durst verspüren.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">5. Jannah (Das Paradies)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Die ewige Wohnstätte des Friedens, der Freude und der Belohnung für die Rechtschaffenen. Es enthält Gärten, durch die Bäche fließen, Paläste und Freuden, die kein Auge gesehen, kein Ohr gehört und kein Verstand je erdacht hat.</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">6. Jahannam (Das Höllenfeuer)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Der Ort der Bestrafung, Hitze und Sorge, geschaffen für Ungläubige und Übeltäter. Es dient als eindringliche Mahnung, den geraden Weg im Leben zu gehen.</p>
</div>
'''
    },
    'bn': {
      'title': 'কুরআন ইন্টারন্যাশনাল আখিরাত লেক্সিকন',
      'author': 'কুরআন ইন্টারন্যাশনাল সম্পাদকীয়',
      'popup_title': 'স্বাগতম উপহার!',
      'popup_desc': 'আপনার যাত্রা সমৃদ্ধ করতে, আমরা আপনাকে "কুরআন ইন্টারন্যাশনাল আখিরাত লেক্সিকন" প্রিমিয়াম বইটি উপহার দিয়েছি। কুরআনে বর্ণিত পরকাল (আখিরাত) সংক্রান্ত পরিভাষাগুলো পড়তে এখনই সংগ্রহ করুন।',
      'btn_read': 'এখনই পড়ুন',
      'btn_dismiss': 'পরে পড়ব',
      'html': '''
<h2 style="color: #10B981; font-size: 20px; font-weight: bold; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px;">কুরআন ইন্টারন্যাশনাল আখিরাত লেক্সিকন</h2>
<p style="color: #64748B; font-size: 14px; font-style: italic; margin-bottom: 20px;">পবিত্র কুরআনে বর্ণিত পরকালের (আখিরাত) পরিভাষাগুলোর একটি বিশেষ গাইড।</p>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">১. ইয়াওমুল কিয়ামাহ (পুনরুত্থান দিবস)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">সেই চূড়ান্ত দিন যখন সমগ্র মানবজাতিকে বিচারের জন্য আল্লাহর সামনে দাঁড়ানোর জন্য জীবিত করা হবে। কুরআনে বহুবার এর উল্লেখ করা হয়েছে, এটি দুনিয়ার শেষ এবং অনন্ত জীবনের শুরুকে নির্দেশ করে।</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">২. আল-মিজান (পাল্লা)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">ইনসাফের ঐশ্বরিক পাল্লা যা হাশরের দিন প্রতিটি মানুষের ভালো ও মন্দ কাজের পরিমাপ করবে। কুরআনে বলা হয়েছে: <i>"অতঃপর যার নেকির পাল্লা ভারী হবে, সে এক সন্তোষজনক জীবন লাভ করবে।"</i> (আল-কারিয়াহ: ৬-৭)</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">৩. আস-সিরাত (পুলসিরাত)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">জাহান্নামের উপর স্থাপিত সেতু যা প্রতিটি আত্মাকে পার হতে হবে। মুমিনগণ তাদের ঈমান ও আমল অনুযায়ী বিভিন্ন গতিতে এটি পার হবেন এবং অন্যরা অতল গহ্বরে পতিত হবে।</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">৪. আল-হাউজ (কাউসার বা পানির আধার)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়া সাল্লামকে কিয়ামতের মাঠে আল্লাহ তাআলার পক্ষ থেকে উপহার দেওয়া বিশেষ পানির আধার। কিয়ামতের দিন মুমিনরা এ থেকে পানি পান করবে এবং এক চুমুক পানের পর আর কখনো তৃষ্ণার্ত হবে না।</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">৫. জান্নাত (স্বর্গ)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">মুত্তাকিদের জন্য প্রস্তুত করা চিরস্থায়ী শান্তির আবাস। এতে রয়েছে প্রবহমান ঝর্ণাধারা, প্রাসাদ এবং এমন সব নিয়ামত যা কোনো চোখ দেখেনি, কোনো কান শোনেনি এবং কোনো মানুষের অন্তর কখনো কল্পনাও করেনি।</p>
</div>

<div style="margin-bottom: 24px;">
  <h3 style="color: #D4AF37; font-size: 17px; font-weight: bold; margin-bottom: 6px;">৬. জাহান্নাম (নরক)</h3>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">অবাধ্য ও অবিশ্বাসীদের জন্য প্রস্তুতকৃত শাস্তি, উত্তাপ ও দুঃখের চিরস্থায়ী বাসস্থান। এটি আমাদের দুনিয়ার জীবনে সর্বদা সৎপথে চলার বিষয়টি স্মরণ করিয়ে দেয়।</p>
</div>
'''
    }
  };

  @override
  Widget build(BuildContext context) {
    String langCode = 'en';
    try {
      if (Get.isRegistered<AppLanguageController>()) {
        final code = Get.find<AppLanguageController>().selectedLanguageCode.value;
        if (_localizedContent.containsKey(code)) {
          langCode = code;
        }
      }
    } catch (_) {}

    final content = _localizedContent[langCode]!;

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF041009), // Premium dark green theme
          borderRadius: BorderRadius.circular(24.r),
          border: Border.all(
            color: const Color(0xFFD4AF37), // Golden metallic border
            width: 1.5.w,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        padding: EdgeInsets.all(24.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Gold Arch Header Design
            Container(
              width: 80.w,
              height: 80.w,
              decoration: BoxDecoration(
                color: const Color(0xFF0C2417),
                shape: BoxShape.circle,
                border: Border.all(
                  color: const Color(0xFFD4AF37),
                  width: 1.5.w,
                ),
              ),
              child: Center(
                child: Icon(
                  Icons.card_giftcard_rounded,
                  color: const Color(0xFFD4AF37),
                  size: 40.sp,
                ),
              ),
            ),
            SizedBox(height: 20.h),

            // Dialog Title
            Text(
              content['popup_title']!,
              style: GoogleFonts.cinzel(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: const Color(0xFFD4AF37),
                letterSpacing: 1.5,
              ),
            ),
            SizedBox(height: 12.h),

            // Book Cover Graphic (Flat UI Design)
            Container(
              height: 120.h,
              width: 90.w,
              decoration: BoxDecoration(
                color: const Color(0xFF0D3E21),
                borderRadius: BorderRadius.circular(10.r),
                border: Border.all(
                  color: const Color(0xFFD4AF37).withOpacity(0.5),
                  width: 1.w,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(2, 4),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Positioned(
                    left: 5.w,
                    top: 0,
                    bottom: 0,
                    child: Container(
                      width: 3.w,
                      color: const Color(0xFFD4AF37).withOpacity(0.5),
                    ),
                  ),
                  Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10.w),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.menu_book_rounded,
                            color: const Color(0xFFD4AF37),
                            size: 24.sp,
                          ),
                          SizedBox(height: 8.h),
                          Text(
                            "AKHIRA\nLEXICON",
                            textAlign: TextAlign.center,
                            style: GoogleFonts.montserrat(
                              fontSize: 9.sp,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFFD4AF37),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 20.h),

            // Dialog Description
            Text(
              content['popup_desc']!,
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 13.sp,
                color: Colors.white.withOpacity(0.85),
                height: 1.5,
              ),
            ),
            SizedBox(height: 28.h),

            // Button actions
            Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 50.h,
                  child: ElevatedButton(
                    onPressed: () => _claimAndRead(context, langCode, content),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100.r),
                      ),
                      elevation: 3,
                    ),
                    child: Text(
                      content['btn_read']!,
                      style: GoogleFonts.montserrat(
                        color: const Color(0xFF041009),
                        fontSize: 14.sp,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 12.h),
                TextButton(
                  onPressed: () => _dismiss(context, langCode, content),
                  child: Text(
                    content['btn_dismiss']!,
                    style: GoogleFonts.montserrat(
                      color: Colors.white54,
                      fontSize: 13.sp,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _claimAndRead(BuildContext context, String langCode, Map<String, String> content) async {
    final db = DatabaseHelper.instance;
    
    // Seed book in SQLite database
    final bookMap = {
      'id': _bookId,
      'bookId': _bookId,
      'title': content['title']!,
      'author': content['author']!,
      'content': content['html']!,
      'lang': langCode,
      'version': 1,
      'isActive': 1
    };

    try {
      await db.insertKnowledgeBooks([bookMap]);
    } catch (_) {}

    // Save state so welcome gift is never shown again
    await db.setSetting('welcome_gift_shown', 'true');

    // Dismiss dialog
    Navigator.pop(context);

    // Open Book immediately using the public HtmlReaderScreen
    Get.to(
      () => HtmlReaderScreen(
        title: content['title']!,
        html: content['html']!,
      ),
    );
  }

  Future<void> _dismiss(BuildContext context, String langCode, Map<String, String> content) async {
    final db = DatabaseHelper.instance;
    
    // Seed book quietly so it is in the books list anyway
    final bookMap = {
      'id': _bookId,
      'bookId': _bookId,
      'title': content['title']!,
      'author': content['author']!,
      'content': content['html']!,
      'lang': langCode,
      'version': 1,
      'isActive': 1
    };

    try {
      await db.insertKnowledgeBooks([bookMap]);
    } catch (_) {}

    // Save state so welcome gift is never shown again
    await db.setSetting('welcome_gift_shown', 'true');

    // Dismiss dialog
    Navigator.pop(context);
  }
}

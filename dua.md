নিচে আপনার বিদ্যমান কোডের সাথে Google Translate ইন্টিগ্রেশন এবং On-demand Sync লজিক যোগ করা হলো:

১. নতুন প্রয়োজনীয় প্যাকেজ
অনুবাদ করার জন্য এটি ইনস্টল করে নিন:
npm install @vitalets/google-translate-api

২. রিফ্যাক্টর করা সিঙ্ক এবং ট্রান্সলেশন সার্ভিস
এই কোডটি আপনার syncFromExternalSource ফাংশনটিকে আরও শক্তিশালী করবে এবং নতুন একটি ফাংশন যোগ করবে যা যেকোনো ভাষায় অনুবাদ করে ডাটাবেজে রাখবে।

TypeScript
import axios from 'axios';
import translate from '@vitalets/google-translate-api';
import { Dua } from './dua.model'; // আপনার পাথ অনুযায়ী
import { IDua } from './dua.interface';

// ১. মূল ইংরেজি ডাটা সিঙ্ক (আপনার বিদ্যমান ফাংশনটি একটু অপ্টিমাইজ করা)
export const syncEnglishDuas = async () => {
  const url = 'https://raw.githubusercontent.com/wafaaelmaandy/Hisn-Muslim-Json/master/husn_en.json';
  const { data } = await axios.get(url);
  const englishDuas = data.English;

  for (const categoryItem of englishDuas) {
    const categoryTitle = categoryItem.TITLE;
    
    // Bulk operation ব্যবহার করলে পারফরম্যান্স ভালো হয়, তবে সহজে বোঝার জন্য লুপ রাখছি
    for (const textItem of categoryItem.TEXT) {
      const externalId = `hisn_${categoryItem.ID}_${textItem.ID}`;
      
      const duaData = {
        externalId,
        title: categoryTitle,
        arabic: textItem.ARABIC_TEXT,
        translation: textItem.TRANSLATED_TEXT,
        transliteration: textItem.LANGUAGE_ARABIC_TRANSLATED_TEXT,
        category: categoryTitle,
        audio: textItem.AUDIO,
        repeat: textItem.REPEAT || 1,
        lang: 'en',
      };

      // Upsert logic: থাকলে আপডেট, না থাকলে ক্রিয়েট
      await Dua.findOneAndUpdate(
        { externalId, lang: 'en' },
        { $set: duaData, $inc: { version: 0 } }, // version কন্ট্রোল আপনার প্রয়োজন মত করতে পারেন
        { upsert: true, new: true }
      );
    }
  }
  return { message: "English base data synced successfully" };
};

// ২. ডাইনামিক ল্যাঙ্গুয়েজ সিঙ্ক (অফলাইন সাপোর্ট নিশ্চিত করতে)
export const getOrSyncDuasByLanguage = async (targetLang: string) => {
  // ক) ডাটাবেজে চেক করুন এই ভাষার ডাটা আছে কি না
  const count = await Dua.countDocuments({ lang: targetLang });

  if (count > 0) {
    // ডাটা আছে, মানে ইউজার এখন অফলাইনেও এটি পাবে (একবার লোড হওয়ার পর)
    return await Dua.find({ lang: targetLang });
  }

  // খ) ডাটা না থাকলে ইংরেজি ডাটা থেকে অনুবাদ শুরু করুন
  const englishDuas = await Dua.find({ lang: 'en' });
  
  if (englishDuas.length === 0) {
    await syncEnglishDuas(); // ইংরেজি ডাটা না থাকলে আগে সিঙ্ক করে নিন
  }

  console.log(`Translating all duas to: ${targetLang}...`);

  // গ) অনুবাদ লজিক
  const translatedDuas = await Promise.all(
    englishDuas.map(async (dua) => {
      try {
        // টাইটেল এবং ট্রান্সলেশন অনুবাদ করা হচ্ছে
        const translatedTitle = await translate(dua.title, { to: targetLang });
        const translatedText = await translate(dua.translation, { to: targetLang });

        return {
          externalId: dua.externalId,
          title: translatedTitle.text,
          arabic: dua.arabic, // আরবি পরিবর্তন হবে না
          translation: translatedText.text,
          transliteration: dua.transliteration, // উচ্চারণ ইংরেজিতেই রাখা ভালো
          category: translatedTitle.text,
          audio: dua.audio,
          repeat: dua.repeat,
          lang: targetLang,
          version: 1
        };
      } catch (err) {
        return null;
      }
    })
  );

  // ঘ) ফিল্টার করে ডাটাবেজে সেভ করা
  const validDuas = translatedDuas.filter(d => d !== null);
  if (validDuas.length > 0) {
    await Dua.insertMany(validDuas);
  }

  return validDuas;
};
৩. কন্ট্রোলার লেভেলে ব্যবহার
আপনার এপিআই এন্ডপয়েন্টে এটি এভাবে ব্যবহার করুন:

TypeScript
app.get('/api/v1/duas', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'en';
    
    // এই ফাংশনটি আগে ডাটাবেজ চেক করবে, না থাকলে ট্রান্সলেট করে সেভ করবে।
    // ফলে পরের বার থেকে এটি অফলাইন/লোকাল ডাটাবেজ থেকে দ্রুত ডাটা দিবে।
    const data = await getOrSyncDuasByLanguage(lang);
    
    res.status(200).json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
কেন এই সেটআপটি বেস্ট?
স্মার্ট সিঙ্কিং: ইউজার যদি 'Bengali' সিলেক্ট করে, আপনার সার্ভার একবার কষ্ট করে সব অনুবাদ করে ডাটাবেজে ঢুকিয়ে নেবে। এর পরের যত ইউজার আসবে, তাদের জন্য আর গুগল ট্রান্সলেট লাগবে না, সরাসরি আপনার MongoDB থেকে আসবে।

অফলাইন রেডি: মোবাইল অ্যাপে যখন প্রথমবার ইউজার ডাটা লোড করবে, সে পুরো লিস্টটি পেয়ে যাবে। আপনি অ্যাপ সাইডে এটি ক্যাশ (Cache) করে নিলে ইউজার পরে ইন্টারনেট ছাড়াও সব দুয়া দেখতে পাবে।

ডাইনামিক: ক্লায়েন্ট যদি কালকে বলে "আমাকে জাপানিজ ভাষা দাও", আপনাকে কোডে হাত দিতে হবে না। শুধু এপিআই কলে ?lang=ja দিলেই আপনার সিস্টেম অটোমেটিক জাপানিজ ডাটা জেনারেট করে ডাটাবেজে রেখে দেবে।

একটি সতর্কতা: অনেকগুলো দুয়া একসাথে ট্রান্সলেট করলে Google মাঝেমধ্যে রেট লিমিট দিতে পারে। প্রোডাকশনে ব্যবহারের সময় ২০-৩০টি করে দুয়া batch আকারে ট্রান্সলেট করা নিরাপদ।




import mongoose from 'mongoose'
import config from '../src/config'
import { KnowledgeArticle } from '../src/app/modules/knowledge-library/knowledge-library.model'

// Curated list of premium, gender-neutral, Islamic-themed or nature images with NO human faces/bodies
const IMAGES = {
  family: 'https://images.unsplash.com/photo-1511895426328-dc8714191300', // Hands of elderly and child (Relations, Family)
  quran: 'https://images.unsplash.com/photo-1609599006353-e629ababfeae', // Open Quran
  worship: 'https://images.unsplash.com/photo-1597935258735-e254c1839512', // Serene mosque interior
  wealth: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44', // Balance scales and coins (Finance, Halal, Riba)
  time: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe', // Calendar & clock (Time Management, Discipline)
  history: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66', // Ancient library books (Biography, Stories)
  soul: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5', // Sunbeams through window (Purification, Heart)
  hereafter: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88', // Golden clouds & sky (Paradise, Hereafter, Death)
  fallbacks: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', // Serene beach sunset
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d', // Forest bridge
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05', // Mountain mist
    'https://images.unsplash.com/photo-1590076215667-873d6f00918c', // Mosque minaret against sunset
  ]
}

// Keyword definitions for mapping
const KEYWORDS = {
  family: [
    'ehe', 'familie', 'eltern', 'frau', 'mann', 'mutter', 'vater', 'kind', 'beziehung',
    'marriage', 'family', 'parents', 'woman', 'women', 'husband', 'wife', 'mother', 'father', 'child', 'relationship',
    'বিয়ে', 'পরিবার', 'পিতা', 'মাতা', 'মা', 'বাবা', 'সন্তান', 'স্ত্রী', 'স্বামী', 'সম্পর্ক', 'নারী'
  ],
  quran: [
    'quran', 'koran', 'sure', 'vers', 'lesen', 'schrift', 'vorzug',
    'quran', 'koran', 'surah', 'verse', 'read', 'scripture', 'benefit',
    'কুরআন', 'সূরা', 'আয়াত', 'পড়া', 'তিলাওয়াত'
  ],
  worship: [
    'gebet', 'salah', 'namaz', 'moschee', 'tahajjud', 'ramadan', 'fasten', 'pilger', 'hajj', 'dhikr', 'allah', 'bittgebet',
    'prayer', 'salah', 'namaz', 'mosque', 'tahajjud', 'ramadan', 'fasting', 'pilgrim', 'hajj', 'dhikr', 'allah', 'supplication',
    'নামাজ', 'সালাত', 'মসজিদ', 'তাহাজ্জুদ', 'রমজান', 'রোজা', 'হজ', 'জিকির', 'আল্লাহ', 'দোয়া'
  ],
  wealth: [
    'geld', 'besitz', 'zins', 'riba', 'einkommen', 'finanz', 'zakat', 'spende',
    'money', 'wealth', 'usury', 'riba', 'income', 'finance', 'zakat', 'charity', 'donation',
    'টাকা', 'অর্থ', 'সম্পদ', 'সুদ', 'ঋণ', 'যাকাত', 'দান'
  ],
  time: [
    'zeit', 'disziplin', 'erfolg', 'organisation', 'kalender', 'uhr',
    'time', 'discipline', 'success', 'organization', 'calendar', 'clock',
    'সময়', 'শৃঙ্খলা', 'সাফল্য', 'ঘড়ি', 'ক্যালেন্ডার'
  ],
  history: [
    'prophet', 'gesandter', 'sahabah', 'gefährte', 'kalif', 'biographie', 'geschichte', 'gelehrte', 'abu bakr', 'umar', 'uthman', 'ali',
    'prophet', 'messenger', 'sahabah', 'companion', 'caliph', 'biography', 'history', 'scholar', 'abu bakr', 'umar', 'uthman', 'ali',
    'নবী', 'রাসূল', 'সাহাবী', 'খলিফা', 'জীবনী', 'ইতিহাস', 'জ্ঞানী', 'আবু বকর', 'উমর', 'উসমান', 'আলী'
  ],
  soul: [
    'herz', 'seele', 'reinigung', 'tazkiyah', 'wut', 'neid', 'stolz', 'angst', 'trauer', 'psyche',
    'heart', 'soul', 'purification', 'tazkiyah', 'anger', 'envy', 'pride', 'anxiety', 'grief', 'mental',
    'অন্তর', 'মন', 'আত্মা', 'পরিশুদ্ধি', 'ক্রোধ', 'রাগ', 'হিংসা', 'অহংকার', 'ভয়', 'দুশ্চিন্তা'
  ],
  hereafter: [
    'tod', 'paradies', 'hölle', 'jenseits', 'grab', 'auferstehung',
    'death', 'paradise', 'hell', 'hereafter', 'grave', 'resurrection',
    'মৃত্যু', 'জান্নাত', 'জাহান্নাম', 'পরকাল', 'কবর', 'পুনরুত্থান'
  ]
}

function getMatchingImage(title: string, category: string): string {
  const combinedText = `${title.toLowerCase()} ${category.toLowerCase()}`

  // Check categories sequentially
  for (const [key, words] of Object.entries(KEYWORDS)) {
    if (words.some(word => combinedText.includes(word))) {
      return IMAGES[key as keyof typeof KEYWORDS]
    }
  }

  // Fallback to a random/sequential selection from landscapes
  const index = Math.abs(combinedText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % IMAGES.fallbacks.length
  return IMAGES.fallbacks[index]
}

async function updateAllArticleImages() {
  try {
    console.log('🔌 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    console.log('📊 Fetching all KnowledgeArticles...')
    const articles = await KnowledgeArticle.find({ isActive: true })
    console.log(`📝 Found ${articles.length} active articles to inspect and update.`)

    let updateCount = 0
    for (const article of articles) {
      const selectedImage = getMatchingImage(article.title || '', article.category || '')
      
      // Update image
      await KnowledgeArticle.findByIdAndUpdate(article._id, {
        $set: { imageUrl: selectedImage }
      })
      updateCount++
    }

    console.log(`🎉 Successfully updated imageUrl for ${updateCount} articles!`)
  } catch (error) {
    console.error('❌ Error updating article images:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

updateAllArticleImages()

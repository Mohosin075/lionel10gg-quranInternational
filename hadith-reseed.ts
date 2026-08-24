import mongoose from 'mongoose'
import config from './src/config'
import { Hadith } from './src/app/modules/hadith/hadith.model'
import { HadithServices } from './src/app/modules/hadith/hadith.service'

async function reseedHadiths() {
  try {
    console.log('🚀 Starting Hadith delete and re-seed process (500 Bukhari + 250 Muslim)...')
    console.log('📊 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    console.log('🧹 Deleting all existing Hadith documents...')
    const deleteResult = await Hadith.deleteMany({})
    console.log(`✅ Deleted ${deleteResult.deletedCount} Hadith documents.`)

    console.log('🔄 Fetching and seeding fresh Hadiths (Bukhari 1-500)...')
    await HadithServices.syncFromGlobalApi('eng-bukhari', 1, 500)
    console.log('✅ Bukhari 1-500 seeded successfully!')

    console.log('🔄 Fetching and seeding fresh Hadiths (Muslim 1-250)...')
    await HadithServices.syncFromGlobalApi('eng-muslim', 1, 250)
    console.log('✅ Muslim 1-250 seeded successfully!')

    console.log('\n🎉 Hadith re-seed completed successfully!')
  } catch (error) {
    console.error('❌ Error during Hadith re-seed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

reseedHadiths()

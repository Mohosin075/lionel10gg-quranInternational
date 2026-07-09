import mongoose from 'mongoose'
import config from '../src/config'
import { KnowledgeLibraryServices } from '../src/app/modules/knowledge-library/knowledge-library.service'

async function testGetArticles() {
  try {
    console.log('🔌 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    // Test English articles
    console.log('📊 Fetching articles in English ("en")...')
    const enResult = await KnowledgeLibraryServices.getAllArticles('en', undefined, 1, 10)
    console.log(`📝 English Articles count: ${enResult.data.length}`)
    if (enResult.data.length > 0) {
      console.log('Sample English Title:', enResult.data[0].title)
    }

    // Test Bengali articles
    console.log('📊 Fetching articles in Bengali ("bn")...')
    const bnResult = await KnowledgeLibraryServices.getAllArticles('bn', undefined, 1, 10)
    console.log(`📝 Bengali Articles count: ${bnResult.data.length}`)
    if (bnResult.data.length > 0) {
      console.log('Sample Bengali Title:', bnResult.data[0].title)
    }
  } catch (error) {
    console.error('❌ Error during testing:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

testGetArticles()

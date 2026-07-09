import mongoose from 'mongoose'
import config from '../src/config'
import { KnowledgeArticle } from '../src/app/modules/knowledge-library/knowledge-library.model'

async function checkCategories() {
  try {
    console.log('🔌 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    console.log('📊 Fetching all distinct categories from KnowledgeArticle...')
    const categories = await KnowledgeArticle.distinct('category')
    console.log(`Found ${categories.length} distinct categories:`)
    console.log(categories)

    for (const category of categories) {
      const count = await KnowledgeArticle.countDocuments({ category })
      const sample = await KnowledgeArticle.findOne({ category }).select('title lang source')
      console.log(`- Category: "${category}" | Count: ${count} | Sample: "${sample?.title}" (${sample?.lang})`)
    }
  } catch (error) {
    console.error('❌ Error checking categories:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

checkCategories()

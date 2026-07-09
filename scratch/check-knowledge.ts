import mongoose from 'mongoose'
import config from '../src/config'
import { KnowledgeArticle } from '../src/app/modules/knowledge-library/knowledge-library.model'

async function checkKnowledgeArticles() {
  try {
    console.log('🔌 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    console.log('📊 Counting documents in KnowledgeArticle...')
    const count = await KnowledgeArticle.countDocuments()
    console.log(`📝 Total articles found: ${count}`)

    if (count > 0) {
      console.log('\n🔍 Fetching 3 sample articles:')
      const samples = await KnowledgeArticle.find().limit(3)
      samples.forEach((article, index) => {
        console.log(`--- Article #${index + 1} ---`)
        console.log(`ID: ${article._id}`)
        console.log(`ArticleId: ${article.articleId}`)
        console.log(`Title: ${article.title}`)
        console.log(`Category: ${article.category}`)
        console.log(`Language: ${article.lang}`)
        console.log(`Source: ${article.source}`)
        console.log(`IsActive: ${article.isActive}`)
        console.log(`Content length: ${article.content ? article.content.length : 0} chars`)
      })
    } else {
      console.log('❌ No articles found in this collection.')
    }
  } catch (error) {
    console.error('❌ Error checking KnowledgeArticle:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

checkKnowledgeArticles()

import mongoose from 'mongoose'
import config from './src/config'
import { InAppPurchasePlan } from './src/app/modules/in-app-purchase/in-app-purchase-package.model'

const demoPackages = [
  {
    name: '100 Hasanat Coins',
    description: 'Purchase 100 Hasanat coins for in-app features.',
    price: 1.99,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    features: ['100 Hasanat Coins'],
    maxPhotos: 0,
    priority: 1,
    isActive: true,
    stripeProductId: 'prod_demo_coin_100',
    stripePriceId: 'price_demo_coin_100',
  },
  {
    name: '500 Hasanat Coins',
    description: 'Purchase 500 Hasanat coins for in-app features.',
    price: 7.99,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    features: ['500 Hasanat Coins', 'Bonus 50 Coins'],
    maxPhotos: 0,
    priority: 2,
    isActive: true,
    stripeProductId: 'prod_demo_coin_500',
    stripePriceId: 'price_demo_coin_500',
  },
  {
    name: 'Ad-Free Lifetime',
    description: 'Remove all ads from the app forever.',
    price: 9.99,
    currency: 'usd',
    interval: 'year',
    intervalCount: 99,
    features: ['Ad-Free Experience', 'Premium Support'],
    maxPhotos: 0,
    priority: 3,
    isActive: true,
    stripeProductId: 'prod_demo_ad_free',
    stripePriceId: 'price_demo_ad_free',
  }
]

async function seedDemoIAP() {
  try {
    console.log('🚀 Starting demo in-app-purchase seed...')
    console.log('🔗 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    for (const pkg of demoPackages) {
      const existing = await InAppPurchasePlan.findOne({ name: pkg.name })
      if (!existing) {
        await InAppPurchasePlan.create(pkg)
        console.log(`✅ Created package: ${pkg.name}`)
      } else {
        console.log(`ℹ️ Package already exists: ${pkg.name}`)
      }
    }

    console.log('🎉 Demo in-app-purchase seed completed successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
    process.exit(0)
  }
}

seedDemoIAP()

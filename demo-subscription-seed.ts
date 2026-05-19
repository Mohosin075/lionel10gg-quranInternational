import mongoose from 'mongoose'
import config from './src/config'
import { User } from './src/app/modules/user/user.model'
import { SubscriptionPlan } from './src/app/modules/subscription/subscription-plan.model'
import { Subscription } from './src/app/modules/subscription/subscription.model'

// Demo data
const demoUserEmail = 'demo@quranapp.com'
const demoPlanName = 'Premium Monthly'
const demoSubscription = {
  stripeCustomerId: 'cus_demo_12345',
  stripeSubscriptionId: 'sub_demo_12345',
  stripePriceId: 'price_demo_12345',
}

async function seedDemoSubscription() {
  try {
    console.log('🚀 Starting demo subscription seed...')
    console.log('📊 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    // 1. Create a demo user (if not exists)
    let demoUser = await User.findOne({ email: demoUserEmail })
    if (!demoUser) {
      demoUser = await User.create({
        name: 'Demo User',
        email: demoUserEmail,
        password: 'demo123456',
        role: 'user',
        verified: true,
        stripeCustomerId: demoSubscription.stripeCustomerId,
        subscriptionStatus: 'active',
        subscriptionTier: 'premium',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      })
      console.log('✅ Demo user created:', demoUser.email)
    } else {
      console.log('ℹ️ Demo user already exists:', demoUser.email)
    }

    // 2. Create a demo subscription plan (if not exists)
    let demoPlan = await SubscriptionPlan.findOne({ name: demoPlanName })
    if (!demoPlan) {
      demoPlan = await SubscriptionPlan.create({
        name: demoPlanName,
        description: 'Premium features for Quran App',
        price: 9.99,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        features: [
          'Unlimited bookmarks',
          'Offline Quran translations',
          'Premium dua collection',
        ],
        maxPhotos: 100,
        isActive: true,
        stripePriceId: demoSubscription.stripePriceId,
        stripeProductId: 'prod_demo_12345',
        priority: 1,
      })
      console.log('✅ Demo subscription plan created:', demoPlan.name)
    } else {
      console.log('ℹ️ Demo plan already exists:', demoPlan.name)
    }

    // 3. Create a demo subscription for the user (if not exists)
    let userSubscription = await Subscription.findOne({ userId: demoUser._id })
    if (!userSubscription) {
      const now = new Date()
      const endDate = new Date(now)
      endDate.setMonth(endDate.getMonth() + 1) // 1 month from now

      userSubscription = await Subscription.create({
        userId: demoUser._id,
        planId: demoPlan._id,
        stripeCustomerId: demoSubscription.stripeCustomerId,
        stripeSubscriptionId: demoSubscription.stripeSubscriptionId,
        stripePriceId: demoSubscription.stripePriceId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        lastPaymentDate: now,
        nextPaymentDate: endDate,
      })
      console.log('✅ Demo subscription created for user')
    } else {
      console.log('ℹ️ Demo subscription already exists for user')
    }

    // 4. Update user subscription fields (in case they weren't set)
    await User.findByIdAndUpdate(demoUser._id, {
      subscriptionStatus: 'active',
      subscriptionTier: 'premium',
      subscriptionExpiresAt: userSubscription.currentPeriodEnd,
    })

    console.log('\n🎉 Demo subscription seed completed!')
    console.log('📧 Demo user email:', demoUserEmail)
    console.log('🔑 Demo user password: demo123456')
    console.log('\n📋 How to check if user is premium:')
    console.log('   Option 1: Check User model fields:')
    console.log('     - user.subscriptionStatus === "active"')
    console.log('     - user.subscriptionTier === "premium"')
    console.log('     - user.subscriptionExpiresAt > new Date()')
    console.log('\n   Option 2: Check Subscription collection:')
    console.log('     - Use Subscription.findActiveByUserId(userId)')
    console.log('     - Check if subscription.status === "active" && subscription.currentPeriodEnd > new Date()')
  } catch (error) {
    console.error('❌ Error seeding demo subscription:', error)
    throw error
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

seedDemoSubscription()

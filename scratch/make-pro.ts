import mongoose from 'mongoose'
import config from '../src/config'
import { User } from '../src/app/modules/user/user.model'
import { Subscription } from '../src/app/modules/subscription/subscription.model'
import { SubscriptionPlan } from '../src/app/modules/subscription/subscription-plan.model'

async function makeUserPro() {
  const email = 'web.mohosin@gmail.com'
  try {
    console.log('🔌 Connecting to database...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    console.log(`🔍 Finding user with email: ${email}...`)
    const user = await User.findOne({ email })

    if (!user) {
      console.error(`❌ User not found with email: ${email}`)
      return
    }

    console.log('👤 User Found:', {
      id: user._id,
      name: user.name,
      email: user.email,
    })

    // Find a subscription plan to associate with the user
    console.log('🔍 Fetching subscription plans...')
    let plan = await SubscriptionPlan.findOne({ isActive: true }).sort({ price: 1 })
    
    if (!plan) {
      console.log('⚠️ No active subscription plans found. Searching for any plan...')
      plan = await SubscriptionPlan.findOne()
    }

    if (!plan) {
      console.log('⚠️ No subscription plans found in the database. Creating a default one...')
      plan = await SubscriptionPlan.create({
        name: 'Premium Support Pro',
        description: 'Unlock all premium features',
        price: 9.99,
        currency: 'eur',
        interval: 'month',
        intervalCount: 1,
        features: ['Unlock all 14 premium features'],
        isActive: true,
        stripePriceId: 'price_manual_pro',
        stripeProductId: 'prod_manual_pro',
        priority: 1,
      })
      console.log('✅ Default subscription plan created:', plan.name)
    } else {
      console.log('✅ Found plan:', plan.name, `(${plan._id})`)
    }

    const tenYearsFromNow = new Date()
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10)
    const now = new Date()

    // Find or create Subscription document
    console.log('🔍 Finding subscription details in Subscription collection...')
    let userSubscription = await Subscription.findOne({ userId: user._id })

    if (!userSubscription) {
      console.log('⚡ Creating a new Subscription record for the user...')
      userSubscription = await Subscription.create({
        userId: user._id,
        planId: plan._id,
        stripeCustomerId: user.stripeCustomerId || `cus_manual_${user._id}`,
        stripeSubscriptionId: `sub_manual_${user._id}`,
        stripePriceId: plan.stripePriceId || 'price_manual_pro',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: tenYearsFromNow,
        lastPaymentDate: now,
        nextPaymentDate: tenYearsFromNow,
      })
      console.log('✅ Subscription record created successfully.')
    } else {
      console.log('⚡ Updating existing Subscription record to active status...')
      userSubscription = await Subscription.findByIdAndUpdate(
        userSubscription._id,
        {
          $set: {
            planId: plan._id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: tenYearsFromNow,
            lastPaymentDate: now,
            nextPaymentDate: tenYearsFromNow,
          },
        },
        { new: true }
      )
      console.log('✅ Subscription record updated successfully.')
    }

    // Update User model fields
    console.log('⚡ Updating User model subscription fields...')
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          subscriptionStatus: 'active',
          subscriptionTier: 'premium',
          subscriptionExpiresAt: tenYearsFromNow,
          subscribe: true,
          stripeCustomerId: userSubscription?.stripeCustomerId || `cus_manual_${user._id}`,
        },
      },
      { new: true }
    )

    if (updatedUser) {
      console.log('🎉 User successfully updated to PRO status!')
      console.log('👤 Final User Status:', {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        subscribe: updatedUser.subscribe,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
      })
    }
  } catch (error) {
    console.error('❌ Error occurred:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

makeUserPro()

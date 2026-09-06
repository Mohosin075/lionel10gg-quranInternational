/* eslint-disable @typescript-eslint/no-explicit-any */
import { SubscriptionPlan, PremiumBenefit } from './subscription-plan.model'
import { stripeService } from './stripe.service'

// Default subscription plans (PAY-01: exactly 2 plans, all other options removed)
const defaultPlans = [
  {
    name: 'Premium Monthly €3.70',
    description: 'Unlock all premium features. 1 Golden Month free on all subscriptions.',
    price: 3.70,
    currency: 'eur',
    interval: 'month' as const,
    intervalCount: 1,
    trialPeriodDays: 30,
    features: [
      'Knowledge Library — 400+ articles to read',
      'Hasanat Counter — track Hasanat and progress',
      'Offline Quran — choose from 12 Qaris (reciters), listen offline without internet',
      'Hadith Section — access to Hadiths',
      'Tafsir — verse explanations displayed in user\'s selected language (tap Arabic text to view)',
      'Unlimited Bookmarks — save and track reading progress',
      '160+ Books available to read',
      'Sheikh Content from YouTube — streaming and downloading',
      '1 Golden Month free on all subscriptions (applies to subscriptions only, not one-time payment)',
      'No Ads — no advertisements',
    ],
    maxPhotos: 100,
    priority: 1,
  },
  {
    name: 'Premium Annual €22.90',
    description: 'Save with annual plan. Unlock all premium features. 1 Golden Month free on all subscriptions.',
    price: 22.90,
    currency: 'eur',
    interval: 'year' as const,
    intervalCount: 1,
    trialPeriodDays: 30,
    features: [
      'Knowledge Library — 400+ articles to read',
      'Hasanat Counter — track Hasanat and progress',
      'Offline Quran — choose from 12 Qaris (reciters), listen offline without internet',
      'Hadith Section — access to Hadiths',
      'Tafsir — verse explanations displayed in user\'s selected language (tap Arabic text to view)',
      'Unlimited Bookmarks — save and track reading progress',
      '160+ Books available to read',
      'Sheikh Content from YouTube — streaming and downloading',
      '1 Golden Month free on all subscriptions (applies to subscriptions only, not one-time payment)',
      'No Ads — no advertisements',
    ],
    maxPhotos: 100,
    priority: 2,
  },
]

export async function seedSubscriptionPlans(): Promise<void> {
  try {
    console.log('Starting subscription plans seeding (PAY-01 & PAY-02)...')

    // 1. Deactivate ALL other plans that are not the 2 official plans (remove lifetime, other monthly/yearly tiers)
    const officialNames = defaultPlans.map((p) => p.name)
    const retired = await SubscriptionPlan.updateMany(
      {
        $or: [
          { name: { $nin: officialNames } },
          { price: { $nin: [3.70, 22.90] } },
          { interval: 'lifetime' },
        ],
        isActive: true,
      },
      { $set: { isActive: false } },
    )
    if (retired.modifiedCount > 0) {
      console.log(`Deactivated ${retired.modifiedCount} legacy/unapproved plans`)
    }

    // 2. Create or update the 2 official plans
    for (const planData of defaultPlans) {
      try {
        let plan = await SubscriptionPlan.findOne({
          name: planData.name,
          price: planData.price,
          interval: planData.interval,
        })

        if (plan) {
          plan.isActive = true
          plan.features = planData.features
          plan.description = planData.description
          plan.trialPeriodDays = planData.trialPeriodDays
          plan.priority = planData.priority
          await plan.save()
          console.log(`Subscription plan ${planData.name} updated & active.`)
          continue
        }

        // Create Stripe product and price if Stripe service available
        let stripeProductId = ''
        let stripePriceId = ''
        try {
          const stripeProduct = await stripeService.createProduct({
            name: planData.name,
            description: planData.description,
            metadata: {
              maxPhotos: planData.maxPhotos.toString(),
            },
          })
          stripeProductId = stripeProduct.id

          const stripePrice = await stripeService.createPrice({
            productId: stripeProduct.id,
            unitAmount: Math.round(planData.price * 100),
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount,
            metadata: {
              planName: planData.name,
            },
          })
          stripePriceId = stripePrice.id
        } catch (stripeErr) {
          console.warn(`Stripe integration note for ${planData.name}:`, stripeErr)
        }

        plan = new SubscriptionPlan({
          ...planData,
          stripeProductId,
          stripePriceId,
          isActive: true,
        })

        await plan.save()
        console.log(`Created subscription plan: ${planData.name}`)
      } catch (error) {
        console.error(`Error creating plan ${planData.name}:`, error)
      }
    }

    console.log('Subscription plans seeding completed successfully')

    await seedPremiumBenefits()
  } catch (error) {
    console.error('Error seeding subscription plans:', error)
    throw error
  }
}

const DEFAULT_PREMIUM_BENEFITS = [
  'Knowledge Library — 400+ articles to read',
  'Hasanat Counter — track Hasanat and progress',
  'Offline Quran — choose from 12 Qaris (reciters), listen offline without internet',
  'Hadith Section — access to Hadiths',
  'Tafsir — verse explanations displayed in user\'s selected language (tap Arabic text to view)',
  'Unlimited Bookmarks — save and track reading progress',
  '160+ Books available to read',
  'Sheikh Content from YouTube — streaming and downloading',
  '1 Golden Month free on all subscriptions (applies to subscriptions only, not one-time payment)',
  'No Ads — no advertisements',
]

export async function seedPremiumBenefits(): Promise<void> {
  try {
    await PremiumBenefit.deleteMany({})
    await PremiumBenefit.insertMany(
      DEFAULT_PREMIUM_BENEFITS.map((text, i) => ({
        serialNumber: i + 1,
        text,
        isActive: true,
      })),
    )
    console.log(`Seeded ${DEFAULT_PREMIUM_BENEFITS.length} premium benefits per PAY-02`)
  } catch (error) {
    console.error('Error seeding premium benefits:', error)
  }
}

// Function to update existing plans (for migrations)
export async function updateSubscriptionPlans(): Promise<void> {
  try {
    console.log('Updating subscription plans...')

    // Add any plan updates here
    // Example: Update features for existing plans

    console.log('Subscription plans update completed')
  } catch (error) {
    console.error('Error updating subscription plans:', error)
    throw error
  }
}

// Function to create a specific plan (for testing or manual creation)
export async function createSpecificPlan(planData: any): Promise<void> {
  try {
    // Create Stripe product
    const stripeProduct = await stripeService.createProduct({
      name: planData.name,
      description: planData.description,
      metadata: planData.metadata || {},
    })

    // Create Stripe price
    const stripePrice = await stripeService.createPrice({
      productId: stripeProduct.id,
      unitAmount: Math.round(planData.price * 100),
      currency: planData.currency,
      interval: planData.interval,
      intervalCount: planData.intervalCount || 1,
    })

    // Create local plan
    const plan = new SubscriptionPlan({
      ...planData,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    })

    await plan.save()
    console.log(`Created specific plan: ${planData.name}`)
  } catch (error) {
    console.error(`Error creating specific plan:`, error)
    throw error
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSubscriptionPlans = seedSubscriptionPlans;
exports.updateSubscriptionPlans = updateSubscriptionPlans;
exports.createSpecificPlan = createSpecificPlan;
/* eslint-disable @typescript-eslint/no-explicit-any */
const subscription_plan_model_1 = require("./subscription-plan.model");
const stripe_service_1 = require("./stripe.service");
// Default subscription plans
const defaultPlans = [
    {
        name: 'Premium Monthly €4.99',
        description: 'Unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 4.99,
        currency: 'eur',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 1,
    },
    {
        name: 'Premium Monthly €9.99',
        description: 'Unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 9.99,
        currency: 'eur',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 2,
    },
    {
        name: 'Premium Monthly €19.99',
        description: 'Unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 19.99,
        currency: 'eur',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 3,
    },
    {
        name: 'Premium Monthly €24.99',
        description: 'Unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 24.99,
        currency: 'eur',
        interval: 'month',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 4,
    },
    {
        name: 'Premium Annual €34.99',
        description: 'Save on our annual plan and unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 34.99,
        currency: 'eur',
        interval: 'year',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 5,
    },
    {
        name: 'Premium Annual €44.99',
        description: 'Save on our annual plan and unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 44.99,
        currency: 'eur',
        interval: 'year',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 6,
    },
    {
        name: 'Premium Annual €55.99',
        description: 'Save on our annual plan and unlock all premium features including unlimited bookmarks, offline translations, and premium dua collection.',
        price: 55.99,
        currency: 'eur',
        interval: 'year',
        intervalCount: 1,
        trialPeriodDays: 30,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 7,
    },
    {
        name: 'One-Time Donation €100.00 Lifetime',
        description: 'Donate and unlock all premium features forever.',
        price: 100.00,
        currency: 'eur',
        interval: 'lifetime',
        intervalCount: 1,
        trialPeriodDays: 0,
        features: [
            'Unlimited bookmarks',
            'Offline Quran translations',
            'Premium dua collection',
        ],
        maxPhotos: 100,
        priority: 8,
    },
];
async function seedSubscriptionPlans() {
    try {
        console.log('Starting subscription plans seeding...');
        // Create plans in Stripe and database
        for (const planData of defaultPlans) {
            try {
                // Check if plan already exists by name
                const existingPlan = await subscription_plan_model_1.SubscriptionPlan.findOne({
                    name: planData.name,
                });
                if (existingPlan) {
                    console.log(`Subscription plan ${planData.name} already exists. Skipping.`);
                    continue;
                }
                // Create Stripe product
                const stripeProduct = await stripe_service_1.stripeService.createProduct({
                    name: planData.name,
                    description: planData.description,
                    metadata: {
                        maxPhotos: planData.maxPhotos.toString(),
                    },
                });
                // Create Stripe price
                const stripePrice = await stripe_service_1.stripeService.createPrice({
                    productId: stripeProduct.id,
                    unitAmount: Math.round(planData.price * 100), // Convert to cents
                    currency: planData.currency,
                    interval: planData.interval,
                    intervalCount: planData.intervalCount,
                    metadata: {
                        planName: planData.name,
                    },
                });
                // Create local plan
                const plan = new subscription_plan_model_1.SubscriptionPlan({
                    ...planData,
                    stripeProductId: stripeProduct.id,
                    stripePriceId: stripePrice.id,
                    isActive: true,
                });
                await plan.save();
                console.log(`Created subscription plan: ${planData.name}`);
            }
            catch (error) {
                console.error(`Error creating plan ${planData.name}:`, error);
                // Continue with other plans even if one fails
            }
        }
        console.log('Subscription plans seeding completed successfully');
    }
    catch (error) {
        console.error('Error seeding subscription plans:', error);
        throw error;
    }
}
// Function to update existing plans (for migrations)
async function updateSubscriptionPlans() {
    try {
        console.log('Updating subscription plans...');
        // Add any plan updates here
        // Example: Update features for existing plans
        console.log('Subscription plans update completed');
    }
    catch (error) {
        console.error('Error updating subscription plans:', error);
        throw error;
    }
}
// Function to create a specific plan (for testing or manual creation)
async function createSpecificPlan(planData) {
    try {
        // Create Stripe product
        const stripeProduct = await stripe_service_1.stripeService.createProduct({
            name: planData.name,
            description: planData.description,
            metadata: planData.metadata || {},
        });
        // Create Stripe price
        const stripePrice = await stripe_service_1.stripeService.createPrice({
            productId: stripeProduct.id,
            unitAmount: Math.round(planData.price * 100),
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount || 1,
        });
        // Create local plan
        const plan = new subscription_plan_model_1.SubscriptionPlan({
            ...planData,
            stripeProductId: stripeProduct.id,
            stripePriceId: stripePrice.id,
        });
        await plan.save();
        console.log(`Created specific plan: ${planData.name}`);
    }
    catch (error) {
        console.error(`Error creating specific plan:`, error);
        throw error;
    }
}

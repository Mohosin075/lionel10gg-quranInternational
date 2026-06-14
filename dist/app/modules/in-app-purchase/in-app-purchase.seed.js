"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedInAppPurchasePlans = seedInAppPurchasePlans;
const in_app_purchase_package_model_1 = require("./in-app-purchase-package.model");
const defaultPlans = [
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
        stripeProductId: 'prod_native_coin_100', // Kept for schema compat
        stripePriceId: 'price_native_coin_100',
    }
];
async function seedInAppPurchasePlans() {
    try {
        console.log('Starting inAppPurchase plans seeding...');
        for (const planData of defaultPlans) {
            try {
                const existingPlan = await in_app_purchase_package_model_1.InAppPurchasePlan.findOne({
                    name: planData.name,
                });
                if (existingPlan) {
                    console.log(`InAppPurchase plan ${planData.name} already exists. Skipping.`);
                    continue;
                }
                const plan = new in_app_purchase_package_model_1.InAppPurchasePlan(planData);
                await plan.save();
                console.log(`Created inAppPurchase plan: ${planData.name}`);
            }
            catch (error) {
                console.error(`Error creating plan ${planData.name}:`, error);
            }
        }
        console.log('InAppPurchase plans seeding completed successfully');
    }
    catch (error) {
        console.error('Error seeding inAppPurchase plans:', error);
        throw error;
    }
}

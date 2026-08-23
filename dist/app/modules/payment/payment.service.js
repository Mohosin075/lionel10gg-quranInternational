"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentServices = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const user_1 = require("../../../enum/user");
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const payment_model_1 = require("./payment.model");
const paginationHelper_1 = require("../../../helpers/paginationHelper");
const payment_constants_1 = require("./payment.constants");
const mongoose_1 = require("mongoose");
const user_model_1 = require("../user/user.model");
const subscription_model_1 = require("../subscription/subscription.model");
const subscription_plan_model_1 = require("../subscription/subscription-plan.model");
const config_1 = __importDefault(require("../../../config"));
const webhook_service_1 = require("./webhook.service");
const emailHelper_1 = require("../../../helpers/emailHelper");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(config_1.default.stripe.stripeSecretKey, {
    apiVersion: '2026-04-22.dahlia',
});
const isAdmin = (user) => user.role === user_1.USER_ROLES.ADMIN || user.role === user_1.USER_ROLES.SUPER_ADMIN;
const assertPaymentAccess = (user, paymentUserId) => {
    if (isAdmin(user)) {
        return;
    }
    if (String(paymentUserId) !== String(user.authId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You do not have access to this payment');
    }
};
const verifyCheckoutSession = async (sessionId, user) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        });
        const payment = await payment_model_1.Payment.findOne({
            $or: [
                { paymentIntentId: sessionId },
                { 'metadata.checkoutSessionId': sessionId },
                { paymentIntentId: session.payment_intent }
            ]
        })
            .populate('userId', 'name email');
        if (!payment) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Payment not found');
        }
        assertPaymentAccess(user, payment.userId);
        if (session.payment_status === 'paid' && payment.status !== 'succeeded') {
            const session = await payment_model_1.Payment.startSession();
            session.startTransaction();
            try {
                payment.status = 'succeeded';
                payment.metadata = { ...payment.metadata, session };
                await payment.save({ session });
                const user = await payment.populate('userId');
                const userData = user.userId;
                if (userData) {
                    await emailHelper_1.emailHelper.sendEmail({
                        to: userData.email,
                        subject: 'Payment Successful',
                        html: `<p>Hi ${userData.name}, your payment of ${payment.amount} ${payment.currency} was successful.</p>`
                    });
                }
                await session.commitTransaction();
            }
            catch (error) {
                await session.abortTransaction();
                throw error;
            }
            finally {
                session.endSession();
            }
        }
        else if (session.payment_status === 'unpaid' &&
            payment.status !== 'failed') {
            payment.status = 'failed';
            await payment.save();
        }
        return payment;
    }
    catch (error) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, `Payment verification failed: ${error.message}`);
    }
};
const createEphemeralKey = async (user, apiVersion = '2025-05-28.basil') => {
    try {
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user.authId.toString(),
                },
            });
            customerId = customer.id;
            await user_model_1.User.findByIdAndUpdate(user.authId, { stripeCustomerId: customer.id });
        }
        const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: apiVersion });
        return {
            ephemeralKey: ephemeralKey.secret,
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, `Ephemeral key creation failed: ${error.message}`);
    }
};
const processSubscriptionForPayment = async (payment, stripeDetails, session) => {
    if (payment.paymentType === 'subscription') {
        // Find matching subscription plan
        let plan = await subscription_plan_model_1.SubscriptionPlan.findOne({
            price: payment.amount,
            isActive: true,
        }).session(session);
        if (!plan) {
            // Fallback: match any active plan or the first active plan
            plan = await subscription_plan_model_1.SubscriptionPlan.findOne({ isActive: true }).session(session);
        }
        if (plan) {
            const user = await user_model_1.User.findById(payment.userId).session(session);
            if (user) {
                const stripeCustomerId = user.stripeCustomerId || stripeDetails.customer || 'cus_unknown';
                const stripeSubscriptionId = 'sub_' + stripeDetails.id.substring(3);
                const currentPeriodStart = new Date();
                const currentPeriodEnd = new Date();
                if (plan.interval === 'year') {
                    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
                }
                else {
                    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
                }
                // Create or update subscription document
                await subscription_model_1.Subscription.findOneAndUpdate({ userId: user._id }, {
                    userId: user._id,
                    planId: plan._id,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    stripePriceId: plan.stripePriceId || 'price_unknown',
                    status: 'active',
                    currentPeriodStart,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: false,
                    lastPaymentDate: new Date(),
                    lastSyncedAt: new Date(),
                }, { upsert: true, new: true, session });
                // Update user fields
                user.subscriptionStatus = 'active';
                user.subscriptionTier = 'premium';
                user.subscriptionExpiresAt = currentPeriodEnd;
                if (!user.stripeCustomerId && stripeDetails.customer) {
                    user.stripeCustomerId = stripeDetails.customer;
                }
                await user.save({ session });
            }
        }
    }
};
const handlePaymentIntentWebhook = async (paymentIntent) => {
    try {
        const payment = await payment_model_1.Payment.findOne({
            paymentIntentId: paymentIntent.id,
        });
        if (!payment) {
            console.error(`Payment not found for Payment Intent: ${paymentIntent.id}`);
            return;
        }
        if (payment.status === 'succeeded') {
            console.log(`Payment already processed: ${paymentIntent.id}`);
            return;
        }
        const session = await payment_model_1.Payment.startSession();
        session.startTransaction();
        try {
            payment.status = 'succeeded';
            payment.metadata = {
                ...payment.metadata,
                processedAt: new Date().toISOString(),
            };
            await payment.save({ session });
            // Handle subscription logic if needed
            await processSubscriptionForPayment(payment, paymentIntent, session);
            await session.commitTransaction();
            console.log(`Payment processed successfully: ${paymentIntent.id}`);
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    catch (error) {
        console.error(`Webhook processing failed: ${error.message}`);
        throw error;
    }
};
const verifyPaymentIntent = async (paymentIntentId, user) => {
    var _a;
    try {
        let payment = await payment_model_1.Payment.findOne({
            paymentIntentId,
        });
        if (payment) {
            assertPaymentAccess(user, payment.userId);
        }
        // Retrieve from stripe
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const metadataUserId = (_a = pi.metadata) === null || _a === void 0 ? void 0 : _a.userId;
        if (!payment && metadataUserId) {
            assertPaymentAccess(user, metadataUserId);
        }
        else if (!payment && !isAdmin(user)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You do not have access to this payment');
        }
        if (pi.status !== 'succeeded') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Payment Intent is not completed on Stripe. Current status: ${pi.status}`);
        }
        if (payment && payment.status === 'succeeded') {
            return payment;
        }
        const session = await payment_model_1.Payment.startSession();
        session.startTransaction();
        try {
            if (payment) {
                payment.status = 'succeeded';
                payment.metadata = {
                    ...payment.metadata,
                    stripeDetails: pi,
                    processedAt: new Date().toISOString(),
                };
                await payment.save({ session });
                // Process subscription provisioning
                await processSubscriptionForPayment(payment, pi, session);
            }
            else {
                // If Payment record doesn't exist (created directly via subscription endpoint)
                let stripeSubscriptionId = 'sub_' + pi.id.substring(3);
                let stripeCustomerId = pi.customer || 'cus_unknown';
                if (pi.invoice) {
                    try {
                        const invoice = await stripe.invoices.retrieve(pi.invoice);
                        if (invoice.subscription) {
                            stripeSubscriptionId = invoice.subscription;
                        }
                        if (invoice.customer) {
                            stripeCustomerId = invoice.customer;
                        }
                    }
                    catch (e) {
                        console.error('Failed to retrieve invoice from Stripe:', e);
                    }
                }
                let subscription = await subscription_model_1.Subscription.findOne({ stripeSubscriptionId }).session(session);
                if (!subscription && pi.customer) {
                    subscription = await subscription_model_1.Subscription.findOne({ stripeCustomerId }).sort({ createdAt: -1 }).session(session);
                }
                let userId = null;
                let userEmail = 'unknown@quranapp.com';
                if (subscription) {
                    userId = subscription.userId;
                    subscription.status = 'active';
                    subscription.lastPaymentDate = new Date();
                    subscription.stripeSubscriptionId = stripeSubscriptionId;
                    await subscription.save({ session });
                    const user = await user_model_1.User.findById(userId).session(session);
                    if (user) {
                        userEmail = user.email || userEmail;
                        user.subscriptionStatus = 'active';
                        user.subscriptionTier = 'premium';
                        // Expiry based on subscription plan
                        const plan = await subscription_plan_model_1.SubscriptionPlan.findById(subscription.planId).session(session);
                        const currentPeriodEnd = new Date();
                        if (plan && plan.interval === 'year') {
                            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
                        }
                        else {
                            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
                        }
                        user.subscriptionExpiresAt = currentPeriodEnd;
                        subscription.currentPeriodEnd = currentPeriodEnd;
                        await subscription.save({ session });
                        await user.save({ session });
                    }
                }
                else {
                    // If no subscription is found, maybe they are just paying, we lookup user by stripe customer id
                    const user = await user_model_1.User.findOne({ stripeCustomerId }).session(session);
                    if (user) {
                        userId = user._id;
                        userEmail = user.email || userEmail;
                    }
                }
                // Create Payment record for tracking
                payment = await payment_model_1.Payment.create([
                    {
                        userId: userId || new mongoose_1.Types.ObjectId(),
                        userEmail,
                        amount: pi.amount / 100,
                        currency: pi.currency.toUpperCase(),
                        paymentMethod: 'stripe',
                        paymentType: 'subscription',
                        paymentIntentId: pi.id,
                        status: 'succeeded',
                        metadata: {
                            stripeCustomerId,
                            stripeSubscriptionId,
                            stripeDetails: pi,
                            processedAt: new Date().toISOString(),
                        },
                    },
                ], { session }).then(res => res[0]);
            }
            await session.commitTransaction();
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
        if (payment && payment.userEmail) {
            try {
                await emailHelper_1.emailHelper.sendEmail({
                    to: payment.userEmail,
                    subject: 'Payment Successful',
                    html: `<p>Your payment of ${payment.amount} ${payment.currency} was successful and your premium subscription is now active.</p>`
                });
            }
            catch (emailError) {
                console.error('Failed to send success email:', emailError);
            }
        }
        const updatedPayment = await payment_model_1.Payment.findOne({ paymentIntentId }).populate('userId', 'name email');
        if (!updatedPayment && !payment) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Payment could not be created or verified');
        }
        return (updatedPayment || payment);
    }
    catch (error) {
        console.error(`verifyPaymentIntent failed: ${error.message}`);
        throw error;
    }
};
const getAllPayments = async (user, filterables, pagination) => {
    const { searchTerm, ...filterData } = filterables;
    const { page, skip, limit, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(pagination);
    const andConditions = [];
    if (searchTerm) {
        andConditions.push({
            $or: payment_constants_1.paymentSearchableFields.map(field => ({
                [field]: {
                    $regex: searchTerm,
                    $options: 'i',
                },
            })),
        });
    }
    if (Object.keys(filterData).length) {
        andConditions.push({
            $and: Object.entries(filterData).map(([key, value]) => ({
                [key]: value,
            })),
        });
    }
    if (!isAdmin(user)) {
        andConditions.push({
            userId: new mongoose_1.Types.ObjectId(user.authId),
        });
    }
    const whereConditions = andConditions.length ? { $and: andConditions } : {};
    const [result, total] = await Promise.all([
        payment_model_1.Payment.find(whereConditions)
            .skip(skip)
            .limit(limit)
            .sort({ [sortBy]: sortOrder })
            .populate('userId', 'name email')
            .populate({
            path: 'mapId'
        }),
        payment_model_1.Payment.countDocuments(whereConditions),
    ]);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: result,
    };
};
const getSinglePayment = async (id, user) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Payment ID');
    }
    const result = await payment_model_1.Payment.findById(id)
        .populate('userId', 'name email');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Requested payment not found, please try again with valid id');
    }
    assertPaymentAccess(user, result.userId);
    return result;
};
const updatePayment = async (id, payload) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Payment ID');
    }
    const result = await payment_model_1.Payment.findByIdAndUpdate(new mongoose_1.Types.ObjectId(id), { $set: payload }, {
        new: true,
        runValidators: true,
    })
        .populate('userId', 'name email');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Requested payment not found, please try again with valid id');
    }
    return result;
};
const refundPayment = async (id, reason) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Payment ID');
    }
    const payment = await payment_model_1.Payment.findById(id);
    if (!payment) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Payment not found');
    }
    if (payment.status !== 'succeeded') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only successful payments can be refunded');
    }
    try {
        const refund = await stripe.refunds.create({
            payment_intent: payment.paymentIntentId,
            amount: Math.round(payment.amount * 100),
            reason: reason ? 'requested_by_customer' : 'duplicate',
        });
        const result = await payment_model_1.Payment.findByIdAndUpdate(id, {
            status: 'refunded',
            refundAmount: payment.amount,
            refundReason: reason,
            metadata: { ...payment.metadata, refundId: refund.id },
        }, { new: true, runValidators: true })
            .populate('userId', 'name email');
        return result;
    }
    catch (error) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, `Refund failed: ${error.message}`);
    }
};
const getMyPayments = async (user, pagination) => {
    const { page, skip, limit, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(pagination);
    const [result, total] = await Promise.all([
        payment_model_1.Payment.find({ userId: new mongoose_1.Types.ObjectId(user.authId) })
            .skip(skip)
            .limit(limit)
            .sort({ [sortBy]: sortOrder })
            .populate('userId', 'name email'),
        payment_model_1.Payment.countDocuments({ userId: new mongoose_1.Types.ObjectId(user.authId) }),
    ]);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: result,
    };
};
const getDonationPresets = async () => {
    return [
        { amount: 5, currency: 'usd' },
        { amount: 10, currency: 'usd' },
        { amount: 20, currency: 'usd' },
        { amount: 50, currency: 'usd' },
        { amount: 100, currency: 'usd' },
    ];
};
const generateInvoice = async (id, user) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Payment ID');
    }
    const payment = await payment_model_1.Payment.findById(id).populate('userId').populate('mapId');
    if (!payment) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Payment not found');
    }
    assertPaymentAccess(user, payment.userId);
    if (payment.paymentIntentId && payment.status === 'succeeded' && payment.paymentMethod === 'stripe') {
        try {
            const pi = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
            if (pi.latest_charge) {
                const charge = await stripe.charges.retrieve(pi.latest_charge);
                if (charge.receipt_url) {
                    return charge.receipt_url;
                }
            }
        }
        catch (error) {
            console.error('Failed to fetch stripe receipt:', error);
        }
    }
    throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Stripe receipt is not available for this payment');
};
exports.PaymentServices = {
    getAllPayments,
    getSinglePayment,
    updatePayment,
    refundPayment,
    getMyPayments,
    verifyCheckoutSession,
    verifyPaymentIntent,
    handleWebhook: webhook_service_1.WebhookService.handleWebhook,
    createEphemeralKey,
    handlePaymentIntentWebhook,
    generateInvoice,
    getDonationPresets,
};

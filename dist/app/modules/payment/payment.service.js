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
const config_1 = __importDefault(require("../../../config"));
const webhook_service_1 = require("./webhook.service");
const emailHelper_1 = require("../../../helpers/emailHelper");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(config_1.default.stripe.stripeSecretKey, {
    apiVersion: '2026-04-22.dahlia',
});
const createCheckoutSession = async (user, payload) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: (payload.currency || 'EUR').toLowerCase(),
                        product_data: {
                            name: payload.productName || 'Payment',
                            description: payload.description,
                        },
                        unit_amount: Math.round(payload.amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${config_1.default.clientUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${config_1.default.clientUrl}/payment/cancel?success=false`,
            customer_email: user.email,
            metadata: {
                userId: user.authId.toString(),
                ...payload.metadata
            },
        });
        await payment_model_1.Payment.create({
            userId: user.authId,
            userEmail: user.email,
            amount: payload.amount,
            currency: payload.currency || 'EUR',
            paymentMethod: 'stripe',
            paymentType: payload.paymentType || 'one_time',
            paymentIntentId: session.payment_intent || session.id,
            status: 'pending',
            metadata: {
                checkoutSessionId: session.id,
                ...payload.metadata
            },
        });
        return {
            sessionId: session.id,
            url: session.url,
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, `Checkout session creation failed: ${error.message}`);
    }
};
const verifyCheckoutSession = async (sessionId) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        });
        console.log('🔍 Verifying Checkout Session:', session.id);
        console.log('🔍 Payment Intent:', session.payment_intent);
        console.log('🔍 Metadata:', session.metadata);
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
const createPaymentIntent = async (user, payload) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payload.amount * 100),
            currency: payload.currency || 'eur',
            metadata: {
                userId: user.authId.toString(),
                userEmail: user.email,
                ...payload.metadata
            },
        });
        await payment_model_1.Payment.create({
            userId: user.authId,
            userEmail: user.email,
            amount: payload.amount,
            currency: (payload.currency || 'EUR').toUpperCase(),
            paymentMethod: 'stripe',
            paymentType: payload.paymentType || 'one_time',
            paymentIntentId: paymentIntent.id,
            status: 'pending',
            metadata: {
                userId: user.authId.toString(),
                ...payload.metadata
            },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: payload.amount,
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, `Payment Intent creation failed: ${error.message}`);
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
    if (user.activeRole === user_1.USER_ROLES.USER) {
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
const getSinglePayment = async (id) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Payment ID');
    }
    const result = await payment_model_1.Payment.findById(id)
        .populate('userId', 'name email');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Requested payment not found, please try again with valid id');
    }
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
const generateInvoice = async (id) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Payment ID');
    }
    const payment = await payment_model_1.Payment.findById(id).populate('userId').populate('mapId');
    if (!payment) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Payment not found');
    }
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
    throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_IMPLEMENTED, 'Custom PDF generation not available');
};
exports.PaymentServices = {
    getAllPayments,
    getSinglePayment,
    updatePayment,
    refundPayment,
    getMyPayments,
    createCheckoutSession,
    verifyCheckoutSession,
    handleWebhook: webhook_service_1.WebhookService.handleWebhook,
    createPaymentIntent,
    createEphemeralKey,
    handlePaymentIntentWebhook,
    generateInvoice,
};

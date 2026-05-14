"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailNotificationService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
const emailHelper_1 = require("../../../helpers/emailHelper");
const user_model_1 = require("../user/user.model");
class EmailNotificationService {
    async sendSubscriptionWelcomeEmail(subscription, plan, isTrialing = false) {
        try {
            const user = await user_model_1.User.findById(subscription.userId).select('+email');
            if (!user || !user.email) {
                console.warn(`No email found for user: ${subscription.userId}`);
                return;
            }
            await emailHelper_1.emailHelper.sendEmail({
                to: user.email,
                subject: 'Welcome to Your Subscription',
                html: `<p>Hi ${user.name || 'Valued Customer'}, welcome to your ${plan.name} subscription!</p>`,
            });
            console.log(`Subscription welcome email sent to: ${user.email}`);
        }
        catch (error) {
            console.error('Error sending subscription welcome email:', error);
        }
    }
    async sendTrialEndingEmail(subscription, plan, daysLeft) {
        try {
            const user = await user_model_1.User.findById(subscription.userId).select('+email');
            if (!user || !user.email)
                return;
            await emailHelper_1.emailHelper.sendEmail({
                to: user.email,
                subject: 'Your Trial is Ending Soon',
                html: `<p>Hi ${user.name || 'Valued Customer'}, your trial for ${plan.name} is ending in ${daysLeft} days!</p>`,
            });
            console.log(`Trial ending email sent to: ${user.email}`);
        }
        catch (error) {
            console.error('Error sending trial ending email:', error);
        }
    }
    async sendPaymentSuccessEmail(subscription, invoice) {
        try {
            const user = await user_model_1.User.findById(subscription.userId).select('+email');
            if (!user || !user.email)
                return;
            await emailHelper_1.emailHelper.sendEmail({
                to: user.email,
                subject: 'Payment Successful',
                html: `<p>Hi ${user.name || 'Valued Customer'}, your payment was successful!</p>`,
            });
            console.log(`Payment success email sent to: ${user.email}`);
        }
        catch (error) {
            console.error('Error sending payment success email:', error);
        }
    }
    async sendPaymentFailedEmail(subscription, invoice, attemptCount) {
        try {
            const user = await user_model_1.User.findById(subscription.userId).select('+email');
            if (!user || !user.email)
                return;
            await emailHelper_1.emailHelper.sendEmail({
                to: user.email,
                subject: 'Payment Failed',
                html: `<p>Hi ${user.name || 'Valued Customer'}, your payment failed (attempt ${attemptCount}). Please update your payment method!</p>`,
            });
            console.log(`Payment failed email sent to: ${user.email}`);
        }
        catch (error) {
            console.error('Error sending payment failed email:', error);
        }
    }
    async sendSubscriptionCanceledEmail(subscription, plan, canceledAt) {
        try {
            const user = await user_model_1.User.findById(subscription.userId).select('+email');
            if (!user || !user.email)
                return;
            await emailHelper_1.emailHelper.sendEmail({
                to: user.email,
                subject: 'Subscription Canceled',
                html: `<p>Hi ${user.name || 'Valued Customer'}, your ${plan.name} subscription has been canceled.</p>`,
            });
            console.log(`Subscription canceled email sent to: ${user.email}`);
        }
        catch (error) {
            console.error('Error sending subscription canceled email:', error);
        }
    }
    async sendPlanChangeEmail(subscription, newPlan, oldPrice) {
        try {
            const user = await user_model_1.User.findById(subscription.userId).select('+email');
            if (!user || !user.email)
                return;
            await emailHelper_1.emailHelper.sendEmail({
                to: user.email,
                subject: 'Plan Changed',
                html: `<p>Hi ${user.name || 'Valued Customer'}, you've changed to ${newPlan.name}!</p>`,
            });
            console.log(`Plan change email sent to: ${user.email}`);
        }
        catch (error) {
            console.error('Error sending plan change email:', error);
        }
    }
    async sendInvoiceEmail(invoice) {
        try {
            if (!invoice.customer_email) {
                console.warn(`No customer email for invoice: ${invoice.id}`);
                return;
            }
            await emailHelper_1.emailHelper.sendEmail({
                to: invoice.customer_email,
                subject: 'Your Invoice',
                html: `<p>Here's your latest invoice!</p>`,
            });
            console.log(`Invoice email sent to: ${invoice.customer_email}`);
        }
        catch (error) {
            console.error('Error sending invoice email:', error);
        }
    }
}
exports.emailNotificationService = new EmailNotificationService();

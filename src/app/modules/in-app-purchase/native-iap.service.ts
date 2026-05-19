import { google } from 'googleapis';
// @ts-ignore
import appleReceiptVerify from 'node-apple-receipt-verify';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// Initialize Apple Receipt Verifier
appleReceiptVerify.config({
  secret: config.iap.apple_shared_secret as string,
  environment: ['production', 'sandbox'], // Check both environments
});

// Initialize Google Play API
const auth = new google.auth.JWT({
  email: config.iap.google_play_service_account_email,
  key: config.iap.google_play_service_account_private_key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const playDeveloperApi = google.androidpublisher('v3');

export const nativeIapService = {
  /**
   * Verify Apple App Store Receipt
   */
  async verifyAppleReceipt(receiptData: string, expectedProductId: string) {
    try {
      const products = await appleReceiptVerify.validate({
        receipt: receiptData,
      });

      // Find the specific product in the validated receipt
      const purchasedProduct = products.find(
        (p: any) => p.productId === expectedProductId
      );

      if (!purchasedProduct) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Product not found in Apple receipt');
      }

      return {
        isValid: true,
        transactionId: purchasedProduct.transactionId,
        productId: purchasedProduct.productId,
        purchaseDate: new Date(purchasedProduct.purchaseDate),
      };
    } catch (error: any) {
      console.error('Apple receipt verification failed:', error);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Apple Receipt Verification Failed: ${error.message}`);
    }
  },

  /**
   * Verify Google Play Store Purchase
   * @param purchaseToken The token provided by the client after purchase
   * @param productId The ID of the in-app product
   */
  async verifyGoogleReceipt(purchaseToken: string, productId: string) {
    try {
      if (!config.iap.google_play_package_name) {
         throw new Error('Google Play Package Name not configured');
      }

      await auth.authorize();

      const response = await playDeveloperApi.purchases.products.get({
        auth,
        packageName: config.iap.google_play_package_name,
        productId: productId,
        token: purchaseToken,
      });

      const purchase = response.data;

      // Purchase state: 0 = Purchased, 1 = Canceled, 2 = Pending
      if (purchase.purchaseState !== 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Purchase is not in a valid state');
      }

      return {
        isValid: true,
        transactionId: purchase.orderId,
        productId: productId,
        purchaseDate: purchase.purchaseTimeMillis ? new Date(parseInt(purchase.purchaseTimeMillis)) : new Date(),
      };
    } catch (error: any) {
      console.error('Google Play verification failed:', error);
      throw new ApiError(StatusCodes.BAD_REQUEST, `Google Play Verification Failed: ${error.message}`);
    }
  }
};

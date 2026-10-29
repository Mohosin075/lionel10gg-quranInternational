import { google } from 'googleapis'
// @ts-expect-error This receipt library does not ship TypeScript declarations.
import appleReceiptVerify from 'node-apple-receipt-verify'
import config from '../../../config'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

// Initialize Apple Receipt Verifier
appleReceiptVerify.config({
  secret: config.iap.apple_shared_secret as string,
  environment: ['production', 'sandbox'], // Check both environments
  excludeOldTransactions: true,
  extended: true,
})

// Initialize Google Play API
const auth = new google.auth.JWT({
  email: config.iap.google_play_service_account_email,
  key: config.iap.google_play_service_account_private_key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
})
const playDeveloperApi = google.androidpublisher('v3')

export const nativeIapService = {
  /**
   * Verify Apple App Store Receipt
   */
  async verifyAppleReceipt(receiptData: string, expectedProductId: string) {
    try {
      const products = await appleReceiptVerify.validate({
        receipt: receiptData,
      })

      // Find the specific product in the validated receipt
      const purchasedProduct = products.find(
        (p: {
          productId: string
          transactionId: string
          purchaseDate: number
          cancellationDate?: number
        }) => p.productId === expectedProductId && !p.cancellationDate,
      )

      if (!purchasedProduct) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Product not found in Apple receipt',
        )
      }

      return {
        isValid: true,
        transactionId: purchasedProduct.transactionId,
        originalTransactionId:
          purchasedProduct.originalTransactionId ||
          purchasedProduct.transactionId,
        productId: purchasedProduct.productId,
        purchaseDate: new Date(purchasedProduct.purchaseDate),
        expiryDate: purchasedProduct.expirationDate
          ? new Date(purchasedProduct.expirationDate)
          : undefined,
      }
    } catch (error: unknown) {
      console.error('Apple receipt verification failed:', error)
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Apple Receipt Verification Failed: ${error instanceof Error ? error.message : String(error)}`,
      )
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
        throw new Error('Google Play Package Name not configured')
      }

      await auth.authorize()

      const response = await playDeveloperApi.purchases.subscriptionsv2.get({
        auth,
        packageName: config.iap.google_play_package_name,
        token: purchaseToken,
      })

      const purchase = response.data

      const item = purchase.lineItems?.find(
        item => item.productId === productId,
      )
      if (
        !item ||
        ![
          'SUBSCRIPTION_STATE_ACTIVE',
          'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
          'SUBSCRIPTION_STATE_CANCELED',
        ].includes(purchase.subscriptionState || '') ||
        !item.expiryTime ||
        new Date(item.expiryTime).getTime() <= Date.now()
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Purchase is not in a valid state',
        )
      }

      return {
        isValid: true,
        transactionId: purchase.latestOrderId,
        originalTransactionId: purchaseToken,
        productId: productId,
        purchaseDate: purchase.startTime
          ? new Date(purchase.startTime)
          : new Date(),
        expiryDate: new Date(item.expiryTime),
      }
    } catch (error: unknown) {
      console.error('Google Play verification failed:', error)
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Google Play Verification Failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  },
}

# Payment & Subscription Integration Guide (Flutter Stripe SDK)

This document provides a comprehensive guide for integrating payment and subscription features into the Quran App using Flutter Stripe SDK.

---

## 🎯 How to Check if User is Premium

There are two ways to check if a user has an active premium subscription:

### Option 1: Check User Model Fields

```typescript
// User model fields to check:
- user.subscriptionStatus === 'active'
- user.subscriptionTier === 'premium'
- user.subscriptionExpiresAt > new Date()  // Check if subscription is not expired
```

### Option 2: Check Subscription Collection

```typescript
import { Subscription } from './src/app/modules/subscription/subscription.model'

// Use static method on Subscription model
const activeSubscription = await Subscription.findActiveByUserId(userId)

if (activeSubscription && activeSubscription.status === 'active' && activeSubscription.currentPeriodEnd > new Date()) {
  // User is premium
}
```

---

## 🚀 Demo Subscription Seed

Create a demo subscription for testing:

```bash
# Run the demo seed script
npx ts-node demo-subscription-seed.ts
```

This will create:
- Demo user: `demo@quranapp.com` with password `demo123456`
- Demo subscription plan: "Premium Monthly"
- Active subscription for the demo user

---

---

## 📌 Prerequisites
- User must be authenticated (JWT token required)
- Add `flutter_stripe` package to your `pubspec.yaml`

---

## 🔑 Step 1: Get Subscription Plans

First, retrieve the available subscription plans:

**Endpoint**: `GET /api/v1/subscription/plans`

**Response**:
```json
{
  "success": true,
  "message": "Subscription plans retrieved successfully",
  "data": [
    {
      "_id": "plan_id",
      "name": "Premium Monthly",
      "price": 9.99,
      "currency": "USD",
      "interval": "month",
      "description": "Premium features subscription"
    }
  ]
}
```

---

## 🎯 Step 2: Create Payment Intent (Flutter SDK)

Use this endpoint for Flutter Stripe SDK integration:

**Endpoint**: `POST /api/v1/payment/create-payment-intent`

**Auth**: Required (Bearer Token)

**Request Body**:
```json
{
  "amount": 9.99,
  "currency": "USD",
  "paymentType": "subscription"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment Intent created successfully",
  "data": {
    "clientSecret": "pi_..._secret_...",
    "paymentIntentId": "pi_...",
    "amount": 9.99
  }
}
```

---

## � Step 3: Create Ephemeral Key

**Endpoint**: `POST /api/v1/payment/ephemeral-key`

**Auth**: Required (Bearer Token)

**Request Body**:
```json
{
  "apiVersion": "2025-05-28.basil"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ephemeral key created successfully",
  "data": {
    "ephemeralKey": "ek_test_..."
  }
}
```

---

## 💳 Step 4: Flutter SDK Implementation

```dart
import 'package:flutter_stripe/flutter_stripe.dart';

// Initialize payment
Future<void> initPayment() async {
  // 1. Get payment intent from backend
  final paymentIntent = await _api.createPaymentIntent(
    amount: 9.99,
    currency: 'USD',
    paymentType: 'subscription',
  );

  // 2. Get ephemeral key
  final ephemeralKey = await _api.createEphemeralKey();

  // 3. Present payment sheet
  await Stripe.instance.initPaymentSheet(
    paymentSheetParameters: SetupPaymentSheetParameters(
      paymentIntentClientSecret: paymentIntent.clientSecret,
      customerEphemeralKeySecret: ephemeralKey.ephemeralKey,
      merchantDisplayName: 'Quran App',
    ),
  );

  // 4. Present payment sheet
  try {
    await Stripe.instance.presentPaymentSheet();
    // Payment successful!
  } catch (e) {
    // Handle error
  }
}
```

---

## 👤 Step 5: Get User's Subscription

**Endpoint**: `GET /api/v1/subscription/my-subscription`

**Auth**: Required (Bearer Token)

**Response**:
```json
{
  "success": true,
  "message": "Subscription retrieved successfully",
  "data": {
    "_id": "subscription_id",
    "plan": {
      "name": "Premium Monthly",
      "price": 9.99
    },
    "status": "active",
    "currentPeriodStart": "2026-05-19T...",
    "currentPeriodEnd": "2026-06-19T..."
  }
}
```

---

## 📝 Additional Useful Endpoints

### Get Payment History
**Endpoint**: `GET /api/v1/payment/my-payments`  
**Auth**: Required

### Cancel Subscription
**Endpoint**: `DELETE /api/v1/subscription/:subscriptionId/cancel`  
**Auth**: Required

### Billing Portal
**Endpoint**: `POST /api/v1/subscription/billing-portal`  
**Auth**: Required  
**Body**: `{ "returnUrl": "https://your-app.com/settings" }`


Instruction : 

donation button a click korle payment option asbe, one time or subscription base

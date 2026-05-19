import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env') })

export default {
  appName: process.env.APP_NAME || 'My App',
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  clientUrl: process.env.clientUrl,
  port: process.env.PORT,
  server_map_api_key: process.env.SERVER_MAP_API_KEY,
  cors_origins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['*', "http://localhost:3000", "http://localhost:3001"],
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  firebase_service_account_base64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    callback_url: process.env.GOOGLE_CALLBACK_URL,
  },
  aws: {
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket_name: process.env.AWS_BUCKET_NAME,
  },
  stripe: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    paymentWebhookSecret: process.env.STRIPE_PAYMENT_WEBHOOK_SECRET,
    subscriptionWebhookSecret: process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET,
    inAppPurchaseWebhookSecret: process.env.STRIPE_IN_APP_PURCHASE_WEBHOOK_SECRET,
  },
  iap: {
    apple_shared_secret: process.env.APPLE_SHARED_SECRET,
    google_play_package_name: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    google_play_service_account_email: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
    google_play_service_account_private_key: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRES_IN,
    jwt_refresh_expire_long: process.env.JWT_REFRESH_EXPIRE_LONG,
    temp_jwt_secret: process.env.TEMP_JWT_SECRET,
    temp_jwt_expire_in: process.env.TEMP_JWT_EXPIRE_IN,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },

  super_admin: {
    name: process.env.SUPER_ADMIN_NAME,
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
}

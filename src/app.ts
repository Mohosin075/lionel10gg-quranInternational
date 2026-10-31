import cors from 'cors'
import helmet from 'helmet'
import express, { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import passport from './app/modules/auth/passport.auth/config/passport'
import router from './routes'
import globalErrorHandler from './app/middleware/globalErrorHandler'
import config from './config'
import { SubscriptionController } from './app/modules/subscription/subscription.controller'
import { PaymentController } from './app/modules/payment/payment.controller'

const app = express()

// -------------------- CORS --------------------
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, Postman, curl, server-to-server)
    if (!origin) return callback(null, true)

    const isExplicitlyAllowed = config.cors_origins.some(
      allowed =>
        allowed === '*' ||
        allowed.replace(/\/$/, '').toLowerCase() ===
          origin.replace(/\/$/, '').toLowerCase(),
    )

    if (
      isExplicitlyAllowed ||
      config.node_env === 'development' ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('92.205.234.176')
    ) {
      return callback(null, true)
    }

    return callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// -------------------- Security Middleware --------------------
// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

// Rate limiting stays off for the offline-first content APIs.
// To enable later: import rateLimit from 'express-rate-limit' and app.use('/api', limiter)

// Stripe webhooks need the raw body for signature verification
app.post(
  '/api/v1/subscription/webhook',
  express.raw({ type: 'application/json' }),
  SubscriptionController.handleWebhook,
)
app.post(
  '/api/v1/payment/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook,
)

// -------------------- Middleware --------------------
// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const sessionSecret = config.session_secret || config.jwt.jwt_secret
if (!sessionSecret) {
  throw new Error('SESSION_SECRET or JWT_SECRET is required')
}

// Session must come before passport
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.node_env === 'production',
      sameSite: 'lax',
    },
  }),
)

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Cookie parser
app.use(cookieParser())

// Logging enabled for troubleshooting
app.use(morgan('dev'))

// Public profile images only. Documents and media stay off the public web root.
app.use('/images', express.static(path.join(process.cwd(), 'uploads/images')))
app.use('/lang-packs', express.static(path.join(process.cwd(), 'uploads/lang-packs')))

// -------------------- API Routes --------------------

app.get('/', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Welcome to the API! The server is running smoothly.',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/v1', router)

// -------------------- Privacy Policy --------------------
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy-policy.html'))
})

// -------------------- Error Handling --------------------
app.use(globalErrorHandler)

// Handle not found routes
app.use((req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'API route not found!',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API route not found!',
      },
    ],
  })
})

export default app

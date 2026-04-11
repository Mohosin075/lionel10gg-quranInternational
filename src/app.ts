import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import express, { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import passport from './app/modules/auth/passport.auth/config/passport'
import router from './routes'
import globalErrorHandler from './app/middleware/globalErrorHandler'
import config from './config'

const app = express()

// -------------------- Security Middleware --------------------
// Set security HTTP headers
app.use(helmet())

// Rate limiting: prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
})
app.use('/api', limiter)

// -------------------- Middleware --------------------
// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session must come before passport
app.use(
  session({
    secret: config.jwt.jwt_secret || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // true if using HTTPS
  }),
)

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// CORS
app.use(
  cors({
    origin: config.cors_origins,
    credentials: true,
  }),
)

// Cookie parser
app.use(cookieParser())

// Logging enabled for troubleshooting
import morgan from 'morgan'
app.use(morgan('dev'))

// -------------------- Static Files --------------------
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/images', express.static(path.join(process.cwd(), 'uploads/images')))
app.use('/media', express.static(path.join(process.cwd(), 'uploads/media')))
app.use(
  '/documents',
  express.static(path.join(process.cwd(), 'uploads/documents')),
)

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

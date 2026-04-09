'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const cors_1 = __importDefault(require('cors'))
const express_1 = __importDefault(require('express'))
const http_status_codes_1 = require('http-status-codes')
const path_1 = __importDefault(require('path'))
const express_session_1 = __importDefault(require('express-session'))
const cookie_parser_1 = __importDefault(require('cookie-parser'))
const passport_1 = __importDefault(
  require('./app/modules/auth/passport.auth/config/passport'),
)
const routes_1 = __importDefault(require('./routes'))
const globalErrorHandler_1 = __importDefault(
  require('./app/middleware/globalErrorHandler'),
)
const config_1 = __importDefault(require('./config'))
const app = (0, express_1.default)()
// -------------------- Middleware --------------------
// Body parsers
app.use(express_1.default.json())
app.use(express_1.default.urlencoded({ extended: true }))
// Session must come before passport
app.use(
  (0, express_session_1.default)({
    secret: config_1.default.jwt.jwt_secret || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // true if using HTTPS
  }),
)
// Initialize Passport
app.use(passport_1.default.initialize())
app.use(passport_1.default.session())
// CORS
app.use(
  (0, cors_1.default)({
    origin: config_1.default.cors_origins,
    credentials: true,
  }),
)
// Cookie parser
app.use((0, cookie_parser_1.default)())
// Logging enabled for troubleshooting
const morgan_1 = __importDefault(require('morgan'))
app.use((0, morgan_1.default)('dev'))
// -------------------- Static Files --------------------
app.use(
  '/uploads',
  express_1.default.static(path_1.default.join(process.cwd(), 'uploads')),
)
app.use(
  '/images',
  express_1.default.static(
    path_1.default.join(process.cwd(), 'uploads/images'),
  ),
)
app.use(
  '/media',
  express_1.default.static(path_1.default.join(process.cwd(), 'uploads/media')),
)
app.use(
  '/documents',
  express_1.default.static(
    path_1.default.join(process.cwd(), 'uploads/documents'),
  ),
)
// -------------------- API Routes --------------------
app.get('/', (req, res) => {
  res.status(http_status_codes_1.StatusCodes.OK).json({
    success: true,
    message: 'Welcome to the API! The server is running smoothly.',
    timestamp: new Date().toISOString(),
  })
})
app.use('/api/v1', routes_1.default)
// -------------------- Privacy Policy --------------------
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path_1.default.join(__dirname, 'privacy-policy.html'))
})
// -------------------- Error Handling --------------------
app.use(globalErrorHandler_1.default)
// Handle not found routes
app.use((req, res) => {
  res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
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
exports.default = app

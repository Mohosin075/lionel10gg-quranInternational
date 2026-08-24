"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_1 = __importDefault(require("express"));
const http_status_codes_1 = require("http-status-codes");
const path_1 = __importDefault(require("path"));
const express_session_1 = __importDefault(require("express-session"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const passport_1 = __importDefault(require("./app/modules/auth/passport.auth/config/passport"));
const routes_1 = __importDefault(require("./routes"));
const globalErrorHandler_1 = __importDefault(require("./app/middleware/globalErrorHandler"));
const config_1 = __importDefault(require("./config"));
const subscription_controller_1 = require("./app/modules/subscription/subscription.controller");
const payment_controller_1 = require("./app/modules/payment/payment.controller");
const app = (0, express_1.default)();
// -------------------- Security Middleware --------------------
// Set security HTTP headers
app.use((0, helmet_1.default)());
// Rate limiting stays off for the offline-first content APIs.
// To enable later: import rateLimit from 'express-rate-limit' and app.use('/api', limiter)
// Stripe webhooks need the raw body for signature verification
app.post('/api/v1/subscription/webhook', express_1.default.raw({ type: 'application/json' }), subscription_controller_1.SubscriptionController.handleWebhook);
app.post('/api/v1/payment/webhook', express_1.default.raw({ type: 'application/json' }), payment_controller_1.PaymentController.handleWebhook);
// -------------------- Middleware --------------------
// Body parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const sessionSecret = config_1.default.session_secret || config_1.default.jwt.jwt_secret;
if (!sessionSecret) {
    throw new Error('SESSION_SECRET or JWT_SECRET is required');
}
// Session must come before passport
app.use((0, express_session_1.default)({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: config_1.default.node_env === 'production',
        sameSite: 'lax',
    },
}));
// Initialize Passport
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// CORS
app.use((0, cors_1.default)({
    origin: config_1.default.cors_origins,
    credentials: true,
}));
// Cookie parser
app.use((0, cookie_parser_1.default)());
// Logging enabled for troubleshooting
const morgan_1 = __importDefault(require("morgan"));
app.use((0, morgan_1.default)('dev'));
// Public profile images only. Documents and media stay off the public web root.
app.use('/images', express_1.default.static(path_1.default.join(process.cwd(), 'uploads/images')));
app.use('/lang-packs', express_1.default.static(path_1.default.join(process.cwd(), 'uploads/lang-packs')));
// -------------------- API Routes --------------------
app.get('/', (req, res) => {
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: 'Welcome to the API! The server is running smoothly.',
        timestamp: new Date().toISOString(),
    });
});
app.use('/api/v1', routes_1.default);
// -------------------- Privacy Policy --------------------
app.get('/privacy-policy', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'privacy-policy.html'));
});
// -------------------- Error Handling --------------------
app.use(globalErrorHandler_1.default);
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
    });
});
exports.default = app;

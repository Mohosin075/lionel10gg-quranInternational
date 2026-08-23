"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailHelper = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
const transporter = nodemailer_1.default.createTransport({
    host: config_1.default.email.host,
    port: Number(config_1.default.email.port),
    secure: Number(config_1.default.email.port) === 465,
    auth: {
        user: config_1.default.email.user,
        pass: config_1.default.email.pass,
    },
});
const sendEmail = async (values) => {
    try {
        const fromName = config_1.default.appName || 'Quran International';
        const info = await transporter.sendMail({
            from: `"${fromName}" <${config_1.default.email.from}>`,
            to: values.to,
            subject: values.subject,
            html: values.html,
        });
        console.log('Mail send successfully', info.accepted);
    }
    catch (error) {
        console.error('Email', error);
    }
};
exports.emailHelper = {
    sendEmail,
};

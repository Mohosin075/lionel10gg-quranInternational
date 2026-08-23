"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const crypto_1 = require("./crypto");
const otp = (0, crypto_1.generateOtp)();
assert_1.default.match(otp, /^\d{6}$/, 'OTP should be 6 digits');
const hashed = (0, crypto_1.hashOtp)(otp);
assert_1.default.notStrictEqual(hashed, otp, 'OTP should be hashed');
assert_1.default.strictEqual(hashed.length, 64, 'SHA-256 hex should be 64 chars');
assert_1.default.strictEqual((0, crypto_1.compareOtp)(otp, hashed), true, 'Matching OTP should verify');
assert_1.default.strictEqual((0, crypto_1.compareOtp)('000000', hashed), false, 'Wrong OTP should fail');
console.log('crypto tests passed');

import assert from 'assert'
import { compareOtp, generateOtp, hashOtp } from './crypto'

const otp = generateOtp()
assert.match(otp, /^\d{6}$/, 'OTP should be 6 digits')

const hashed = hashOtp(otp)
assert.notStrictEqual(hashed, otp, 'OTP should be hashed')
assert.strictEqual(hashed.length, 64, 'SHA-256 hex should be 64 chars')
assert.strictEqual(compareOtp(otp, hashed), true, 'Matching OTP should verify')
assert.strictEqual(compareOtp('000000', hashed), false, 'Wrong OTP should fail')

console.log('crypto tests passed')

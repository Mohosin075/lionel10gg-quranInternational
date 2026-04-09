'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.UserServices = exports.getProfile = void 0
const http_status_codes_1 = require('http-status-codes')
const ApiError_1 = __importDefault(require('../../../errors/ApiError'))
const user_model_1 = require('./user.model')
const user_1 = require('../../../enum/user')
const paginationHelper_1 = require('../../../helpers/paginationHelper')
const config_1 = __importDefault(require('../../../config'))
const user_constants_1 = require('./user.constants')
const updateProfile = async (user, payload) => {
  console.log({ payload })
  const isUserExist = await user_model_1.User.findOne({
    _id: user.authId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  const updatedProfile = await user_model_1.User.findOneAndUpdate(
    { _id: user.authId, status: { $nin: [user_1.USER_STATUS.DELETED] } },
    {
      $set: payload,
    },
    { new: true },
  )
  if (!updatedProfile) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Failed to update profile.',
    )
  }
  return 'Profile updated successfully.'
}
const createAdmin = async () => {
  const admin = {
    email: config_1.default.super_admin.email,
    name: config_1.default.super_admin.name,
    password: config_1.default.super_admin.password,
    role: user_1.USER_ROLES.SUPER_ADMIN,
    status: user_1.USER_STATUS.ACTIVE,
    verified: true,
    authentication: {
      oneTimeCode: null,
      restrictionLeftAt: null,
      expiresAt: null,
      latestRequestAt: new Date(),
      authType: 'createAccount',
    },
  }
  const isAdminExist = await user_model_1.User.findOne({
    email: admin.email,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  })
  if (isAdminExist) {
    console.log('Admin account already exist, skipping creation.🦥')
    return isAdminExist
  }
  const result = await user_model_1.User.create([admin])
  if (!result) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Failed to create admin',
    )
  }
  return result[0]
}
const getAllUsers = async (paginationOptions, filterables = {}) => {
  const { searchTerm, ...filterData } = filterables
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper_1.paginationHelper.calculatePagination(paginationOptions)
  let whereConditions = {}
  // 🔥 FIXED: Properly typed arrays
  const searchConditions = []
  const filterConditions = []
  // Search functionality
  if (searchTerm && searchTerm.trim() !== '') {
    searchConditions.push({
      $or: user_constants_1.userSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm.trim(),
          $options: 'i',
        },
      })),
    })
  }
  // Filter functionality
  if (Object.keys(filterData).length > 0) {
    Object.entries(filterData).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (key === 'subscribe') {
          filterConditions.push({ [key]: value === 'true' || value === true })
        } else {
          filterConditions.push({ [key]: value })
        }
      }
    })
  }
  // Always exclude deleted users
  filterConditions.push({
    status: { $nin: [user_1.USER_STATUS.DELETED, null] },
  })
  // Combine conditions
  if (searchConditions.length > 0 && filterConditions.length > 0) {
    whereConditions = {
      $and: [...searchConditions, ...filterConditions],
    }
  } else if (searchConditions.length > 0) {
    whereConditions = { $and: searchConditions }
  } else if (filterConditions.length > 0) {
    whereConditions = { $and: filterConditions }
  }
  const [users, total] = await Promise.all([
    user_model_1.User.find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort(sortBy ? { [sortBy]: sortOrder } : { createdAt: -1 })
      .select('-password -authentication -__v')
      .lean(),
    user_model_1.User.countDocuments(whereConditions),
  ])
  const result = users.map(user => {
    return {
      ...user,
    }
  })
  console.log(result, 'resule')
  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}
const deleteUser = async userId => {
  const isUserExist = await user_model_1.User.findOne({
    _id: userId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  const deletedUser = await user_model_1.User.findOneAndUpdate(
    { _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } },
    { $set: { status: user_1.USER_STATUS.DELETED } },
    { new: true },
  )
  if (!deletedUser) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Failed to delete user.',
    )
  }
  return 'User deleted successfully.'
}
const deleteProfile = async (userId, password) => {
  const isUserExist = await user_model_1.User.findOne({
    _id: userId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  }).select('+password')
  if (!isUserExist) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  const isPasswordMatched = await user_model_1.User.isPasswordMatched(
    password,
    isUserExist.password,
  )
  if (!isPasswordMatched) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.UNAUTHORIZED,
      'Password is incorrect.',
    )
  }
  const deletedUser = await user_model_1.User.findOneAndUpdate(
    { _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } },
    { $set: { status: user_1.USER_STATUS.DELETED } },
    { new: true },
  )
  if (!deletedUser) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Failed to delete user.',
    )
  }
  return 'User deleted successfully.'
}
const getUserById = async userId => {
  const user = await user_model_1.User.findOne({
    _id: userId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  }).select('-password -authentication -__v')
  if (!user) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  return user
}
const updateUserStatus = async (userId, status) => {
  const isUserExist = await user_model_1.User.findOne({
    _id: userId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  const updatedUser = await user_model_1.User.findOneAndUpdate(
    { _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } },
    { $set: { status } },
    { new: true },
  )
  if (!updatedUser) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Failed to update user status.',
    )
  }
  return 'User status updated successfully.'
}
const getProfile = async user => {
  // --- Fetch user ---
  const isUserExist = await user_model_1.User.findOne({
    _id: user.authId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  }).select('-authentication -password -__v')
  if (!isUserExist) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  return isUserExist
}
exports.getProfile = getProfile
const addUserInterest = async (userId, interest) => {
  const isUserExist = await user_model_1.User.findOne({
    _id: userId,
    status: { $nin: [user_1.USER_STATUS.DELETED] },
  })
  if (!isUserExist) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'User not found.',
    )
  }
  const updatedUser = await user_model_1.User.findOneAndUpdate(
    { _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } },
    { $set: { interest } },
    { new: true },
  )
  if (!updatedUser) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Failed to update user interest.',
    )
  }
  return updatedUser
}
exports.UserServices = {
  updateProfile,
  createAdmin,
  getAllUsers,
  deleteUser,
  getUserById,
  updateUserStatus,
  getProfile: exports.getProfile,
  deleteProfile,
  addUserInterest,
}

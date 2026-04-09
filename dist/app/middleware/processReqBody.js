'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.fileAndBodyProcessorUsingDiskStorage = exports.fileAndBodyProcessor =
  void 0
const multer_1 = __importDefault(require('multer'))
const ApiError_1 = __importDefault(require('../../errors/ApiError'))
const http_status_codes_1 = require('http-status-codes')
const path_1 = __importDefault(require('path'))
const fs_1 = __importDefault(require('fs'))
const sharp_1 = __importDefault(require('sharp'))
// Define upload configuration with maxCount information
const uploadFields = [
  { name: 'images', maxCount: 5 },
  { name: 'media', maxCount: 3 },
  { name: 'documents', maxCount: 3 },
]
const fileAndBodyProcessor = () => {
  const storage = multer_1.default.memoryStorage()
  // File filter configuration
  const fileFilter = (req, file, cb) => {
    var _a
    try {
      const allowedTypes = {
        images: ['image/jpeg', 'image/png', 'image/jpg'],
        media: ['video/mp4', 'audio/mpeg'],
        documents: ['application/pdf'],
      }
      const fieldType = file.fieldname
      if (
        !((_a = allowedTypes[fieldType]) === null || _a === void 0
          ? void 0
          : _a.includes(file.mimetype))
      ) {
        return cb(
          new ApiError_1.default(
            http_status_codes_1.StatusCodes.BAD_REQUEST,
            `Invalid file type for ${file.fieldname}`,
          ),
        )
      }
      cb(null, true)
    } catch (_b) {
      cb(
        new ApiError_1.default(
          http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
          'File validation failed',
        ),
      )
    }
  }
  const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 10,
    },
  }).fields(uploadFields)
  return (req, _res, next) => {
    upload(req, _res, async error => {
      var _a, _b
      if (error) return next(error)
      try {
        // Parse JSON data if exists
        if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.data) {
          req.body = JSON.parse(req.body.data)
        }
        // Process uploaded files
        if (req.files) {
          const processedFiles = {}
          const fieldsConfig = new Map(
            uploadFields.map(f => [f.name, f.maxCount]),
          )
          // Process each uploaded field
          for (const [fieldName, files] of Object.entries(req.files)) {
            const maxCount =
              (_b = fieldsConfig.get(fieldName)) !== null && _b !== void 0
                ? _b
                : 1
            const paths = []
            // Process each file - with image optimization for image types
            for (const file of files) {
              const extension = file.mimetype.split('/')[1]
              const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
              const filePath = `/uploads/${fieldName}/${filename}`
              // Apply Sharp optimization for images
              if (
                fieldName === 'images' &&
                file.mimetype.startsWith('image/')
              ) {
                try {
                  // Create Sharp instance
                  let sharpInstance = (0, sharp_1.default)(file.buffer).resize(
                    800,
                  )
                  // Preserve original format
                  if (file.mimetype === 'image/png') {
                    sharpInstance = sharpInstance.png({ quality: 80 })
                  } else {
                    sharpInstance = sharpInstance.jpeg({ quality: 80 })
                  }
                  const optimizedBuffer = await sharpInstance.toBuffer()
                  // Replace the original buffer with optimized one
                  file.buffer = optimizedBuffer
                } catch (err) {
                  console.error('Image optimization failed:', err)
                }
              }
              // Save file to disk
              const uploadsDir = path_1.default.join(
                process.cwd(),
                'uploads',
                fieldName,
              )
              if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true })
              }
              fs_1.default.writeFileSync(
                path_1.default.join(
                  process.cwd(),
                  'uploads',
                  fieldName,
                  filename,
                ),
                file.buffer,
              )
              paths.push(filePath)
            }
            // Store as array or single value based on maxCount
            processedFiles[fieldName] = maxCount > 1 ? paths : paths[0]
          }
          req.body = { ...req.body, ...processedFiles }
        }
        next()
      } catch (err) {
        next(err)
      }
    })
  }
}
exports.fileAndBodyProcessor = fileAndBodyProcessor
const fileAndBodyProcessorUsingDiskStorage = () => {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path_1.default.join(process.cwd(), 'uploads')
  if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true })
  }
  // Configure storage
  const storage = multer_1.default.diskStorage({
    destination: (_req, file, cb) => {
      const folderPath = path_1.default.join(uploadsDir, file.fieldname)
      if (!fs_1.default.existsSync(folderPath)) {
        fs_1.default.mkdirSync(folderPath, { recursive: true })
      }
      cb(null, folderPath)
    },
    filename: (_req, file, cb) => {
      const extension =
        path_1.default.extname(file.originalname) ||
        `.${file.mimetype.split('/')[1]}`
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`
      cb(null, filename)
    },
  })
  // File filter configuration
  const fileFilter = (_req, file, cb) => {
    var _a
    try {
      const allowedTypes = {
        images: ['image/jpeg', 'image/png', 'image/jpg'],
        media: ['video/mp4', 'audio/mpeg'],
        documents: ['application/pdf'],
      }
      const fieldType = file.fieldname
      if (
        !((_a = allowedTypes[fieldType]) === null || _a === void 0
          ? void 0
          : _a.includes(file.mimetype))
      ) {
        return cb(
          new ApiError_1.default(
            http_status_codes_1.StatusCodes.BAD_REQUEST,
            `Invalid file type for ${file.fieldname}`,
          ),
        )
      }
      cb(null, true)
    } catch (_b) {
      cb(
        new ApiError_1.default(
          http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
          'File validation failed',
        ),
      )
    }
  }
  const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 10,
    },
  }).fields(uploadFields)
  return (req, res, next) => {
    upload(req, res, async error => {
      var _a, _b
      if (error) return next(error)
      try {
        // Parse JSON data if exists
        if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.data) {
          req.body = JSON.parse(req.body.data)
        }
        // Process uploaded files
        if (req.files) {
          const processedFiles = {}
          const fieldsConfig = new Map(
            uploadFields.map(f => [f.name, f.maxCount]),
          )
          // Process each uploaded field
          for (const [fieldName, files] of Object.entries(req.files)) {
            const maxCount =
              (_b = fieldsConfig.get(fieldName)) !== null && _b !== void 0
                ? _b
                : 1
            const paths = []
            // Process each file
            for (const file of files) {
              const filePath = `/uploads/${fieldName}/${file.filename}`
              paths.push(filePath)
            }
            // Store as array or single value based on maxCount
            processedFiles[fieldName] = maxCount > 1 ? paths : paths[0]
          }
          req.body = { ...req.body, ...processedFiles }
        }
        next()
      } catch (err) {
        next(err)
      }
    })
  }
}
exports.fileAndBodyProcessorUsingDiskStorage =
  fileAndBodyProcessorUsingDiskStorage

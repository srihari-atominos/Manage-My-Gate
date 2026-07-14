import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import HttpError from '../../../utils/httpError.utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve target upload directory relative to project root
const projectRoot = path.resolve(__dirname, '../../../..')
const uploadDir = path.resolve(projectRoot, 'public/uploads/notices')

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new HttpError(400, 'Security violation: Invalid file type or extension.'), false)
  }
}

export const noticeUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit each
    files: 5, // Limit to max 5 images
  },
})

/**
 * Middleware to verify magic bytes of multiple uploaded image files
 */
export const noticeImageSignatureValidator = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next()
  }

  // Support array of files
  const files = Array.isArray(req.files) ? req.files : req.files.images || []
  if (files.length === 0) {
    return next()
  }

  for (const file of files) {
    const filePath = file.path
    try {
      const buffer = Buffer.alloc(12)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, buffer, 0, 12, 0)
      fs.closeSync(fd)

      let isValid = false

      // Check PNG magic number: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        isValid = true
      }
      // Check JPEG magic number: FF D8 FF
      else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        isValid = true
      }
      // Check WebP magic number: RIFF (52 49 46 46) at 0-3 and WEBP (57 45 42 50) at 8-11
      else {
        const isRiff =
          buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
        const isWebp =
          buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
        if (isRiff && isWebp) {
          isValid = true
        }
      }

      if (!isValid) {
        // Delete all uploaded files immediately on security failure
        files.forEach((f) => {
          fs.unlink(f.path, (err) => {
            if (err) console.error('Error deleting invalid file signature image:', err)
          })
        })
        return next(
          new HttpError(
            400,
            'Security violation: Invalid image signature detected (magic bytes mismatch).',
          ),
        )
      }
    } catch (err) {
      // Clean up all files in case of read error
      files.forEach((f) => {
        fs.unlink(f.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file on signature exception:', unlinkErr)
        })
      })
      return next(new HttpError(400, 'Security violation: Failed to verify image headers.'))
    }
  }

  next()
}

export default noticeUpload

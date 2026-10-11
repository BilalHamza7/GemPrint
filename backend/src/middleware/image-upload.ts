import multer from 'multer'

const supportedImageTypes = new Set(['image/jpeg', 'image/png'])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/** Memory storage lets the API send validated bytes directly to private Supabase Storage. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    callback(null, supportedImageTypes.has(file.mimetype))
  },
})

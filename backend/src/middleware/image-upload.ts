import multer from 'multer'

const supportedImageTypes = new Set(['image/jpeg', 'image/png'])

/** Memory storage lets the API send validated bytes directly to private Supabase Storage. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    callback(null, supportedImageTypes.has(file.mimetype))
  },
})

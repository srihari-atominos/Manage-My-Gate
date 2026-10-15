import multer from 'multer';
import HttpError from '../../utils/httpError.utils.js';
import { MAX_PHOTO_BYTES } from '../../utils/staffPhoto.utils.js';

// Memory storage: the file is content-checked (magic bytes) before anything is written to disk.
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
}).single('photo');

export const staffPhotoUpload = (req, res, next) => {
  uploader(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(413, 'Photo is too large. Please use an image under 2 MB.'));
    }
    return next(new HttpError(400, 'Could not read the uploaded photo.'));
  });
};

export default staffPhotoUpload;

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.resolve(__dirname, '../../uploads');
// Async, non-blocking — the directory will exist well before any upload request
// arrives. Module loads at startup; HTTP requests come later.
fs.promises.mkdir(uploadDir, { recursive: true }).catch(() => {});

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.jpg', '.png']);
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uuid = crypto.randomUUID();
        const ext = path.extname(path.basename(file.originalname)).toLowerCase();
        cb(null, `${uuid}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname)).toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
        const err = new Error('Unsupported file type. Allowed files: .pdf, .docx, .jpg, .png');
        err.statusCode = 415;
        return cb(err, false);
    }

    return cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

module.exports = { upload };

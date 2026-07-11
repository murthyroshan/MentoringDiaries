const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

// The app-level mongoSanitize / xss-clean / queryGuard layers run before the
// routers, but multer does not parse a multipart body until inside the route,
// so multipart fields (reflection, challenges, title, description, ...) would
// otherwise bypass all sanitisation. Mount this immediately after
// `upload.single(...)` on every multipart route to close that gap.
const xssMiddleware = xssClean();

const sanitizeMultipart = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body, { allowDots: false, replaceWith: '_' });
    }
    return xssMiddleware(req, res, next);
};

module.exports = sanitizeMultipart;

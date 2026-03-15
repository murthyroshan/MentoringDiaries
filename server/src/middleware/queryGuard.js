const BLOCKED_KEYS = new Set(['$where', '$function', '$accumulator', '$expr', '$regex']);

function hasBlockedContent(value) {
    if (!value || typeof value !== 'object') return false;

    for (const [key, nested] of Object.entries(value)) {
        if (
            BLOCKED_KEYS.has(key) ||
            key.startsWith('$') ||
            key.includes('.') ||
            key.includes('[$') ||
            key.includes('%24')
        ) {
            return true;
        }
        if (typeof nested === 'object' && hasBlockedContent(nested)) {
            return true;
        }
    }
    return false;
}

function queryGuard(req, res, next) {
    if (hasBlockedContent(req.query) || hasBlockedContent(req.body)) {
        return res.status(400).json({
            success: false,
            message: 'Blocked potentially malicious query payload.',
        });
    }

    if (typeof req.query.search === 'string' && req.query.search.length > 120) {
        return res.status(400).json({
            success: false,
            message: 'Search query is too long. Maximum 120 characters.',
        });
    }

    if (typeof req.query.search === 'string') {
        const search = req.query.search;
        if (/[()]/.test(search)) {
            return res.status(400).json({
                success: false,
                message: 'Blocked potentially expensive regex-style search pattern.',
            });
        }
        // Detect catastrophic backtracking patterns like (a+)+
        const suspiciousRegexPattern = /\([^)]*[+*][^)]*\)[+*{]/;
        if (suspiciousRegexPattern.test(search)) {
            return res.status(400).json({
                success: false,
                message: 'Blocked potentially expensive regex-style search pattern.',
            });
        }
    }

    next();
}

module.exports = queryGuard;

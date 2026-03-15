function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSafeSearchRegex(value, maxLength = 80) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().slice(0, maxLength);
    if (!trimmed) return null;
    return new RegExp(escapeRegex(trimmed), 'i');
}

module.exports = { buildSafeSearchRegex };

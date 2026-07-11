function getPagination(query = {}, defaults = { defaultLimit: 20, maxLimit: 50 }) {
    const pageRaw = Number(query.page);
    const limitRaw = Number(query.limit);

    // Cap page so (page - 1) * limit can never exceed a safe SQLite integer
    // OFFSET; an unbounded page (e.g. 1e308) otherwise yields Infinity/2e21 and
    // crashes every paginated query with a datatype-mismatch SqliteError.
    const MAX_PAGE = 1_000_000;
    const pageClamped = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const page = Math.min(pageClamped, MAX_PAGE);
    const requestedLimit = Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.floor(limitRaw)
        : defaults.defaultLimit;
    const limit = Math.min(requestedLimit, defaults.maxLimit);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

module.exports = { getPagination };

function getPagination(query = {}, defaults = { defaultLimit: 20, maxLimit: 50 }) {
    const pageRaw = Number(query.page);
    const limitRaw = Number(query.limit);

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const requestedLimit = Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.floor(limitRaw)
        : defaults.defaultLimit;
    const limit = Math.min(requestedLimit, defaults.maxLimit);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

module.exports = { getPagination };

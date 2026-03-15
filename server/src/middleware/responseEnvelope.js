function responseEnvelope(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
        if (payload && typeof payload === 'object' && payload.success === false && !payload.requestId) {
            payload.requestId = req.requestId;
        }
        return originalJson(payload);
    };

    next();
}

module.exports = responseEnvelope;

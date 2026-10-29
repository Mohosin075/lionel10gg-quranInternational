"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validateRequest = (schema) => async (req, res, next) => {
    try {
        const parsed = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
            cookies: req.cookies,
        });
        req.body = parsed.body;
        if (parsed.query)
            req.query = parsed.query;
        if (parsed.params)
            req.params = parsed.params;
        if (parsed.cookies)
            req.cookies = parsed.cookies;
        return next();
    }
    catch (error) {
        next(error);
    }
};
exports.default = validateRequest;

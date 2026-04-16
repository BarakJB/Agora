"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schemas) {
    return (req, res, next) => {
        const errors = [];
        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) {
                errors.push(...formatErrors(result.error, 'params'));
            }
            else {
                req.params = result.data;
            }
        }
        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) {
                errors.push(...formatErrors(result.error, 'query'));
            }
            else {
                // Express 5 makes req.query read-only; store parsed data on res.locals
                res.locals.parsedQuery = result.data;
            }
        }
        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) {
                errors.push(...formatErrors(result.error, 'body'));
            }
            else {
                req.body = result.data;
            }
        }
        if (errors.length > 0) {
            res.status(400).json({
                data: null,
                error: 'Validation failed',
                meta: { errors },
            });
            return;
        }
        next();
    };
}
function formatErrors(zodError, source) {
    return zodError.issues.map((issue) => ({
        field: `${source}.${issue.path.join('.')}`,
        message: issue.message,
    }));
}
//# sourceMappingURL=validate.js.map
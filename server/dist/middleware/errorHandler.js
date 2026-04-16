"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const logger_js_1 = require("../config/logger.js");
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : 'Internal server error';
    logger_js_1.logger.error({
        err,
        statusCode,
        requestId: res.locals?.requestId,
        userId: res.locals?.agentId,
    }, message);
    res.status(statusCode).json({
        data: null,
        error: message,
        meta: null,
    });
}
//# sourceMappingURL=errorHandler.js.map
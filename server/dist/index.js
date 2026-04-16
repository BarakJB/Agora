"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = __importDefault(require("./app.js"));
const logger_js_1 = require("./config/logger.js");
const PORT = process.env.PORT || 3001;
app_js_1.default.listen(PORT, () => {
    logger_js_1.logger.info({ port: PORT }, 'Server started');
});
//# sourceMappingURL=index.js.map
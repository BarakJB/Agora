"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'agora',
    password: process.env.DB_PASSWORD || 'agora123',
    database: process.env.DB_NAME || 'agora',
    waitForConnections: true,
    // Serverless default: 2. Set DB_CONNECTION_LIMIT=10 in local .env (Docker)
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '2', 10),
    queueLimit: 0,
    charset: 'utf8mb4',
});
exports.default = pool;
//# sourceMappingURL=database.js.map
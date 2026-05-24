"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOTP = createOTP;
exports.findValidOTPByEmail = findValidOTPByEmail;
exports.markUsed = markUsed;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_js_1 = __importDefault(require("../config/database.js"));
const SALT_ROUNDS = 10;
const EXPIRY_MS = 10 * 60 * 1000;
async function createOTP(agentId) {
    await database_js_1.default.execute('DELETE FROM password_resets WHERE agent_id = ? AND used_at IS NULL', [agentId]);
    const otp = crypto_1.default.randomInt(100000, 999999).toString();
    const tokenHash = await bcrypt_1.default.hash(otp, SALT_ROUNDS);
    const id = (0, uuid_1.v4)();
    const expiresAt = new Date(Date.now() + EXPIRY_MS);
    await database_js_1.default.execute('INSERT INTO password_resets (id, agent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)', [id, agentId, tokenHash, expiresAt]);
    return { otp, expiresAt };
}
async function findValidOTPByEmail(email, otp) {
    const [rows] = await database_js_1.default.execute(`SELECT pr.id, pr.agent_id, pr.token_hash
     FROM password_resets pr
     INNER JOIN agents a ON a.id = pr.agent_id
     WHERE a.email = ?
       AND pr.used_at IS NULL
       AND pr.expires_at > NOW()
     ORDER BY pr.expires_at DESC
     LIMIT 5`, [email]);
    for (const row of rows) {
        const match = await bcrypt_1.default.compare(otp, row.token_hash);
        if (match) {
            return { id: row.id, agentId: row.agent_id };
        }
    }
    return null;
}
async function markUsed(id) {
    await database_js_1.default.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [id]);
}
//# sourceMappingURL=passwordReset.repository.js.map
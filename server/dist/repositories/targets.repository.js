"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTargets = getTargets;
exports.upsertTarget = upsertTarget;
exports.deleteTarget = deleteTarget;
const uuid_1 = require("uuid");
const database_js_1 = __importDefault(require("../config/database.js"));
async function getTargets(agentId) {
    const [rows] = await database_js_1.default.query('SELECT id, metric, period, target_amount FROM agent_targets WHERE agent_id = ?', [agentId]);
    return rows.map((r) => ({
        id: r.id,
        metric: r.metric,
        period: r.period,
        targetAmount: Number(r.target_amount),
    }));
}
async function upsertTarget(agentId, data) {
    const id = (0, uuid_1.v4)();
    await database_js_1.default.query(`INSERT INTO agent_targets (id, agent_id, metric, period, target_amount)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       target_amount = VALUES(target_amount),
       updated_at    = CURRENT_TIMESTAMP`, [id, agentId, data.metric, data.period, data.targetAmount]);
}
async function deleteTarget(agentId, metric, period) {
    await database_js_1.default.query('DELETE FROM agent_targets WHERE agent_id = ? AND metric = ? AND period = ?', [agentId, metric, period]);
}
//# sourceMappingURL=targets.repository.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversation = createConversation;
exports.getConversationById = getConversationById;
exports.listConversationsByAgent = listConversationsByAgent;
exports.appendMessage = appendMessage;
exports.getMessagesByConversation = getMessagesByConversation;
exports.deleteConversation = deleteConversation;
exports.updateConversationTitle = updateConversationTitle;
const uuid_1 = require("uuid");
const database_js_1 = __importDefault(require("../config/database.js"));
function toConversation(row) {
    return {
        id: row.id,
        agentId: row.agent_id,
        title: row.title ?? null,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    };
}
function toMessage(row) {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
        tokensInput: row.tokens_input ?? null,
        tokensOutput: row.tokens_output ?? null,
        latencyMs: row.latency_ms ?? null,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    };
}
async function createConversation(agentId) {
    const id = (0, uuid_1.v4)();
    await database_js_1.default.query('INSERT INTO ai_conversations (id, agent_id) VALUES (?, ?)', [id, agentId]);
    return { id };
}
async function getConversationById(id, agentId) {
    const [rows] = await database_js_1.default.query('SELECT id, agent_id, title, created_at, updated_at FROM ai_conversations WHERE id = ? AND agent_id = ?', [id, agentId]);
    return rows.length > 0 ? toConversation(rows[0]) : null;
}
async function listConversationsByAgent(agentId, limit = 20) {
    const [rows] = await database_js_1.default.query(`SELECT id, title, created_at, updated_at
     FROM ai_conversations
     WHERE agent_id = ?
     ORDER BY updated_at DESC
     LIMIT ?`, [agentId, limit]);
    return rows.map((r) => ({
        id: r.id,
        title: r.title ?? null,
        createdAt: r.created_at?.toISOString?.() ?? r.created_at,
        updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at,
    }));
}
async function appendMessage(input) {
    const id = (0, uuid_1.v4)();
    await database_js_1.default.query(`INSERT INTO ai_messages
       (id, conversation_id, role, content, tool_calls, tokens_input, tokens_output, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        input.conversationId,
        input.role,
        input.content,
        input.toolCalls !== undefined ? JSON.stringify(input.toolCalls) : null,
        input.tokensInput ?? null,
        input.tokensOutput ?? null,
        input.latencyMs ?? null,
    ]);
    return { id };
}
async function getMessagesByConversation(conversationId) {
    const [rows] = await database_js_1.default.query(`SELECT id, conversation_id, role, content, tool_calls, tokens_input, tokens_output, latency_ms, created_at
     FROM ai_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC`, [conversationId]);
    return rows.map(toMessage);
}
async function deleteConversation(id, agentId) {
    const [result] = await database_js_1.default.query('DELETE FROM ai_conversations WHERE id = ? AND agent_id = ?', [id, agentId]);
    return result.affectedRows > 0;
}
async function updateConversationTitle(id, agentId, title) {
    await database_js_1.default.query('UPDATE ai_conversations SET title = ? WHERE id = ? AND agent_id = ?', [title, id, agentId]);
}
//# sourceMappingURL=advisor.repository.js.map
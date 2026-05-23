import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuid } from 'uuid';
import pool from '../config/database.js';

export interface Conversation {
  id: string;
  agentId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls: unknown | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AppendMessageInput {
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: unknown;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
}

function toConversation(row: RowDataPacket): Conversation {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function toMessage(row: RowDataPacket): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as 'user' | 'assistant' | 'tool',
    content: row.content,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls as string) : null,
    tokensInput: row.tokens_input ?? null,
    tokensOutput: row.tokens_output ?? null,
    latencyMs: row.latency_ms ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export async function createConversation(agentId: string): Promise<{ id: string }> {
  const id = uuid();
  await pool.query<ResultSetHeader>(
    'INSERT INTO ai_conversations (id, agent_id) VALUES (?, ?)',
    [id, agentId],
  );
  return { id };
}

export async function getConversationById(id: string, agentId: string): Promise<Conversation | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, agent_id, title, created_at, updated_at FROM ai_conversations WHERE id = ? AND agent_id = ?',
    [id, agentId],
  );
  return rows.length > 0 ? toConversation(rows[0]) : null;
}

export async function listConversationsByAgent(agentId: string, limit = 20): Promise<ConversationSummary[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, created_at, updated_at
     FROM ai_conversations
     WHERE agent_id = ?
     ORDER BY updated_at DESC
     LIMIT ?`,
    [agentId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? null,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
    updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at,
  }));
}

export async function appendMessage(input: AppendMessageInput): Promise<{ id: string }> {
  const id = uuid();
  await pool.query<ResultSetHeader>(
    `INSERT INTO ai_messages
       (id, conversation_id, role, content, tool_calls, tokens_input, tokens_output, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.conversationId,
      input.role,
      input.content,
      input.toolCalls !== undefined ? JSON.stringify(input.toolCalls) : null,
      input.tokensInput ?? null,
      input.tokensOutput ?? null,
      input.latencyMs ?? null,
    ],
  );
  return { id };
}

export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, conversation_id, role, content, tool_calls, tokens_input, tokens_output, latency_ms, created_at
     FROM ai_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC`,
    [conversationId],
  );
  return rows.map(toMessage);
}

export async function deleteConversation(id: string, agentId: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM ai_conversations WHERE id = ? AND agent_id = ?',
    [id, agentId],
  );
  return result.affectedRows > 0;
}

export async function updateConversationTitle(id: string, agentId: string, title: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    'UPDATE ai_conversations SET title = ? WHERE id = ? AND agent_id = ?',
    [title, id, agentId],
  );
}

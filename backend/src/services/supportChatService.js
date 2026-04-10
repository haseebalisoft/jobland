import { query } from '../config/db.js';

function parseMessages(row) {
  const raw = row?.messages;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export async function getUserProfileForChat(userId) {
  const r = await query(
    `SELECT full_name, subscription_plan, created_at FROM users WHERE id = $1`,
    [userId],
  );
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  const firstName = String(row.full_name || 'there').trim().split(/\s+/)[0] || 'there';
  return {
    firstName,
    fullName: row.full_name,
    plan: row.subscription_plan || 'free',
    createdAt: row.created_at,
  };
}

export async function createConversation(userId, welcomeMessage) {
  const messages = [
    {
      role: 'assistant',
      content: welcomeMessage,
      createdAt: new Date().toISOString(),
    },
  ];
  const preview = welcomeMessage.slice(0, 120).replace(/\s+/g, ' ');
  const r = await query(
    `INSERT INTO support_conversations (user_id, messages, unread_count, status, last_message_preview, last_message_at)
     VALUES ($1, $2::jsonb, 1, 'open', $3, NOW())
     RETURNING id, messages, unread_count, status, last_message_preview, last_message_at, created_at, updated_at`,
    [userId, JSON.stringify(messages), preview],
  );
  return mapRow(r.rows[0]);
}

export async function listConversations(userId) {
  const r = await query(
    `SELECT id, messages, unread_count, status, last_message_preview, last_message_at, created_at, updated_at
     FROM support_conversations
     WHERE user_id = $1
     ORDER BY COALESCE(last_message_at, created_at) DESC`,
    [userId],
  );
  return r.rows.map(mapRow);
}

export async function getConversation(userId, conversationId) {
  const r = await query(
    `SELECT id, user_id, messages, unread_count, status, last_message_preview, last_message_at, created_at, updated_at
     FROM support_conversations
     WHERE id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0]);
}

export async function appendUserMessageAndSave(userId, conversationId, content) {
  const conv = await getConversation(userId, conversationId);
  if (!conv) return null;
  const messages = [...parseMessages({ messages: conv.messages })];
  const userMsg = {
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  };
  messages.push(userMsg);
  const preview = content.slice(0, 120).replace(/\s+/g, ' ');
  await query(
    `UPDATE support_conversations
     SET messages = $1::jsonb,
         last_message_preview = $2,
         last_message_at = NOW(),
         updated_at = NOW()
     WHERE id = $3 AND user_id = $4`,
    [JSON.stringify(messages), preview, conversationId, userId],
  );
  return { messages, userMsg };
}

export async function appendAssistantMessage(
  userId,
  conversationId,
  assistantContent,
  { incrementUnread = true } = {},
) {
  const conv = await getConversation(userId, conversationId);
  if (!conv) return null;
  const messages = [...parseMessages({ messages: conv.messages })];
  const asstMsg = {
    role: 'assistant',
    content: assistantContent,
    createdAt: new Date().toISOString(),
  };
  messages.push(asstMsg);
  const preview = assistantContent.slice(0, 120).replace(/\s+/g, ' ');
  await query(
    `UPDATE support_conversations
     SET messages = $1::jsonb,
         last_message_preview = $2,
         last_message_at = NOW(),
         updated_at = NOW(),
         unread_count = unread_count + $3
     WHERE id = $4 AND user_id = $5`,
    [JSON.stringify(messages), preview, incrementUnread ? 1 : 0, conversationId, userId],
  );
  return asstMsg;
}

export async function markConversationRead(userId, conversationId) {
  await query(
    `UPDATE support_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
}

/** Mark every conversation read for this user (notification clear-all). */
export async function markAllConversationsRead(userId) {
  await query(
    `UPDATE support_conversations SET unread_count = 0, updated_at = NOW() WHERE user_id = $1 AND unread_count > 0`,
    [userId],
  );
}

export async function getTotalUnread(userId) {
  const r = await query(
    `SELECT COALESCE(SUM(unread_count), 0)::int AS c FROM support_conversations WHERE user_id = $1`,
    [userId],
  );
  return r.rows[0]?.c ?? 0;
}

function mapRow(row) {
  return {
    id: row.id,
    messages: parseMessages(row),
    unreadCount: row.unread_count ?? 0,
    status: row.status,
    lastMessage: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function messagesToGroqHistory(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content || '' }));
}

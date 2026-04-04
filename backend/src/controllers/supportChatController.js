import { getGroqClient, getGroqModel } from '../lib/groqClient.js';
import {
  appendAssistantMessage,
  appendUserMessageAndSave,
  createConversation,
  getConversation,
  getTotalUnread,
  getUserProfileForChat,
  listConversations,
  markConversationRead,
  messagesToGroqHistory,
} from '../services/supportChatService.js';

function welcomeMessage(firstName) {
  return `Hi ${firstName} 👋 I'm the Hirdlogic AI assistant. How can I help you today? You can ask me about:
- Resume building tips
- Job application strategies
- How to use Hirdlogic features
- Career advice`;
}

function buildSystemPrompt(profile) {
  const fn = profile?.firstName || 'there';
  const plan = profile?.plan || 'free';
  const since = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'unknown';
  return `You are a friendly and helpful customer support AI assistant for Hirdlogic — a career platform that helps users with resume building, job tracking, mock interviews, and career growth.

User context:
- Name: ${fn}
- Plan: ${plan} (free/premium)
- Member since: ${since}

Your role:
- Answer questions about Hirdlogic features
- Help with resume and career advice
- Guide users to the right features
- Escalate complex issues to human support
- Be warm, concise, and helpful
- If you don't know something, say so honestly

Hirdlogic features you can help with:
- Resume Builder (create, edit, tailor resumes)
- Job Tracker (kanban board for applications)
- Mock Interviews (AI-powered practice)
- Cover Letter Generator (AI-generated)
- LinkedIn Optimizer
- Negotiation Agent
- Application Materials

Keep responses concise (2-4 sentences max unless explaining steps).
Use bullet points for multi-step instructions.`;
}

export async function postConversations(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await getUserProfileForChat(userId);
    const text = welcomeMessage(profile?.firstName || 'there');
    const conv = await createConversation(userId, text);
    res.status(201).json({ conversationId: conv.id, conversation: conv });
  } catch (e) {
    next(e);
  }
}

export async function getConversations(req, res, next) {
  try {
    const rows = await listConversations(req.user.id);
    const conversations = rows.map((c) => ({
      id: c.id,
      lastMessage: c.lastMessage,
      timestamp: c.lastMessageAt || c.createdAt,
      unread: c.unreadCount > 0,
      preview: c.lastMessage || '',
    }));
    res.json({ conversations });
  } catch (e) {
    next(e);
  }
}

export async function getConversationById(req, res, next) {
  try {
    const conv = await getConversation(req.user.id, req.params.id);
    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.json({
      messages: conv.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await getTotalUnread(req.user.id);
    res.json({ count });
  } catch (e) {
    next(e);
  }
}

export async function patchConversationRead(req, res, next) {
  try {
    await markConversationRead(req.user.id, req.params.id);
    const count = await getTotalUnread(req.user.id);
    res.json({ ok: true, unreadTotal: count });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /message — body: { conversationId, message }
 * Streams SSE tokens; final DB state includes user + assistant messages.
 */
export async function postMessageStream(req, res, next) {
  const userId = req.user.id;
  const { conversationId, message } = req.body || {};
  const text = String(message || '').trim();
  if (!conversationId || !text) {
    return res.status(400).json({ message: 'conversationId and message are required' });
  }

  const groq = getGroqClient();
  if (!groq) {
    return res.status(503).json({ message: 'AI support is not configured (missing GROQ_API_KEY)' });
  }

  let saved;
  try {
    saved = await appendUserMessageAndSave(userId, conversationId, text);
  } catch (e) {
    return next(e);
  }
  if (!saved) {
    return res.status(404).json({ message: 'Conversation not found' });
  }

  const profile = await getUserProfileForChat(userId);
  const systemPrompt = buildSystemPrompt(profile);
  const history = messagesToGroqHistory(saved.messages);
  const model = getGroqModel();

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let full = '';
  const fallback =
    "Sorry, I couldn't complete that reply. Please try again in a moment, or email support@hirdlogic.com.";

  try {
    const stream = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        full += delta;
        res.write(`data: ${JSON.stringify({ t: delta })}\n\n`);
      }
    }

    const finalText = full.trim() || "Thanks for your message — I'm here if you need anything else.";
    await appendAssistantMessage(userId, conversationId, finalText, { incrementUnread: true });
    res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
    res.end();
  } catch (err) {
    try {
      await appendAssistantMessage(userId, conversationId, fallback, { incrementUnread: true });
      res.write(`data: ${JSON.stringify({ t: fallback, error: true })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
    } catch (_) {
      /* ignore */
    }
    try {
      res.end();
    } catch (_) {
      /* ignore */
    }
    if (full.length === 0) {
      console.error('[support-chat] Groq stream error:', err);
    }
  }
}

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  unread_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_user
  ON support_conversations(user_id, last_message_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS set_timestamp_support_conversations ON support_conversations;
CREATE TRIGGER set_timestamp_support_conversations
BEFORE UPDATE ON support_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

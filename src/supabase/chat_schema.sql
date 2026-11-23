-- Chat messages table for active rescues
CREATE TABLE IF NOT EXISTS rescue_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rescue_request_id TEXT NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'mechanic')),
    message TEXT,
    image_url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_chat_rescue_id ON rescue_chat_messages(rescue_request_id);
CREATE INDEX IF NOT EXISTS idx_rescue_chat_created_at ON rescue_chat_messages(created_at);

ALTER TABLE rescue_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all rescue chat operations" ON rescue_chat_messages;
CREATE POLICY "Allow all rescue chat operations"
ON rescue_chat_messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rescue_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rescue_chat_messages;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

CREATE TABLE IF NOT EXISTS public.ai_diagnoses (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_diagnoses_messages_array CHECK (jsonb_typeof(messages) = 'array')
);

CREATE INDEX IF NOT EXISTS ai_diagnoses_user_updated_idx
  ON public.ai_diagnoses (user_id, updated_at DESC);

ALTER TABLE public.ai_diagnoses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_diagnoses FROM anon, authenticated;
GRANT ALL ON public.ai_diagnoses TO service_role;
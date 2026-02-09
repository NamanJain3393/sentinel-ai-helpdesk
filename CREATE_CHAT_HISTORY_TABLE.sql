-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for chatbot)
CREATE POLICY "Allow public insert" ON chat_history
  FOR INSERT WITH CHECK (true);

-- Allow public read (optional, for debugging or displaying history)
CREATE POLICY "Allow public read" ON chat_history
  FOR SELECT USING (true);

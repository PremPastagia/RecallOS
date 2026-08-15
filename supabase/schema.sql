-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Knowledge Items Table
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_content TEXT NOT NULL,
  embedding JSONB, -- fallback for pgvector
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on knowledge_items
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own knowledge items" 
  ON knowledge_items 
  FOR ALL 
  USING (auth.uid() = user_id);

-- 3. Review States Table
CREATE TABLE review_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE NOT NULL,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  strength NUMERIC DEFAULT 0,
  interval INTEGER DEFAULT 1,
  ease_factor NUMERIC DEFAULT 2.5
);

-- Enable RLS on review_states
ALTER TABLE review_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage review states of their items" 
  ON review_states 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM knowledge_items 
    WHERE knowledge_items.id = review_states.item_id 
    AND knowledge_items.user_id = auth.uid()
  ));

-- 4. Related Concepts Table
CREATE TABLE related_concepts (
  source_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE,
  target_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE,
  PRIMARY KEY (source_item_id, target_item_id)
);

-- Enable RLS on related_concepts
ALTER TABLE related_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage related concepts of their items" 
  ON related_concepts 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM knowledge_items 
    WHERE knowledge_items.id = related_concepts.source_item_id 
    AND knowledge_items.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_knowledge_items_user_id ON knowledge_items(user_id);
CREATE INDEX idx_review_states_next_review_date ON review_states(next_review_date);
CREATE INDEX idx_review_states_item_id ON review_states(item_id);

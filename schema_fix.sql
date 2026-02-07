-- Fix missing columns in projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS input_content TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_evaluation TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS requirement_mode TEXT DEFAULT 'initial';

-- Fix missing columns in requirements table
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS challenge_status TEXT DEFAULT 'recommended';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS direction_analysis TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS user_feedback TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Fix missing columns in prd_documents table
ALTER TABLE prd_documents ADD COLUMN IF NOT EXISTS metadata TEXT;

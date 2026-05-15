-- Add missing columns to students table for import functionality
ALTER TABLE students ADD COLUMN IF NOT EXISTS nis TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;

-- Add columns to questions table for full question support
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS score INT DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS matching_pairs JSONB;

-- Create index on nis for upsert
CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);

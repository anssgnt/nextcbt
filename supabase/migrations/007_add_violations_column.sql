-- Add violations column to exam_sessions
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS violations INT DEFAULT 0;

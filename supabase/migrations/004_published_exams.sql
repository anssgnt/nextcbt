-- Migration: Create published_exams table for JSON publish system
-- Admin publishes pre-compiled exam data as JSONB, siswa syncs from this instead of querying questions directly

CREATE TABLE IF NOT EXISTS published_exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  version BIGINT NOT NULL, -- timestamp ms as version
  data JSONB NOT NULL, -- pre-compiled exam + questions JSON
  published_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id) -- 1 published version per exam (upsert)
);

-- Index for fast lookup by exam_id
CREATE INDEX IF NOT EXISTS idx_published_exams_exam_id ON published_exams(exam_id);

-- RLS policies
ALTER TABLE published_exams ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access on published_exams"
  ON published_exams FOR ALL
  USING (true)
  WITH CHECK (true);

-- Students can read published exams
CREATE POLICY "Students can read published_exams"
  ON published_exams FOR SELECT
  USING (true);

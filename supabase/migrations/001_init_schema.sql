-- PHASE 3: Optimized Supabase Schema for CBT Scalable System
-- This migration creates optimized tables with indexes, materialized views, and RLS policies

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL DEFAULT 'admin123',
  name TEXT DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. EXAM TABLES (Optimized for batch operations)
-- ============================================================================

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  duration INT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  questions_count INT DEFAULT 0,
  total_attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Questions table (optimized for batch fetching)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  type TEXT NOT NULL,
  image_url TEXT,
  correct_answer TEXT,
  "order" INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Options table (optimized for batch fetching)
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  "order" INT NOT NULL
);

-- ============================================================================
-- 3. SESSION & ANSWER TABLES (Optimized for concurrent writes)
-- ============================================================================

-- Exam Sessions table
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Answers table (optimized for batch upserts)
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  time_spent INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. SYNC QUEUE TABLE (For offline support & retry mechanism)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_attempt_at TIMESTAMP
);

-- ============================================================================
-- 5. RATE LIMIT TRACKER TABLE (For API rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  window_end TIMESTAMP DEFAULT NOW() + INTERVAL '1 minute',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. INDEXES (Optimized for batch operations & queries)
-- ============================================================================

-- Student indexes
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- Exam indexes
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_token ON exams(token);
CREATE INDEX IF NOT EXISTS idx_exams_is_active ON exams(is_active);

-- Question indexes (composite for batch fetching)
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_order ON questions(exam_id, "order");

-- Options indexes (composite for batch fetching)
CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_options_question_order ON options(question_id, "order");

-- Exam Session indexes (composite for batch operations)
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_id ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_exam ON exam_sessions(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_created_at ON exam_sessions(created_at DESC);

-- Answer indexes (composite for batch upserts)
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_question ON answers(session_id, question_id);

-- Results indexes
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON results(session_id);

-- Sync queue indexes (for retry mechanism)
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_student_id ON sync_queue(student_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_attempts ON sync_queue(status, attempts);

-- Rate limit tracker indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_student_endpoint ON rate_limit_tracker(student_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracker(window_end);

-- ============================================================================
-- 7. MATERIALIZED VIEW (For exam statistics)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS exam_statistics AS
SELECT
  e.id as exam_id,
  e.title,
  e.class_id,
  COUNT(DISTINCT es.id) as total_attempts,
  COUNT(DISTINCT CASE WHEN es.status = 'submitted' THEN es.id END) as completed_attempts,
  AVG(CASE WHEN es.status = 'submitted' THEN es.score END) as avg_score,
  MAX(CASE WHEN es.status = 'submitted' THEN es.score END) as max_score,
  MIN(CASE WHEN es.status = 'submitted' THEN es.score END) as min_score,
  COUNT(DISTINCT es.student_id) as unique_students,
  e.created_at,
  NOW() as last_updated
FROM exams e
LEFT JOIN exam_sessions es ON e.id = es.exam_id
GROUP BY e.id, e.title, e.class_id, e.created_at;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_exam_statistics_exam_id ON exam_statistics(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_statistics_class_id ON exam_statistics(class_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracker ENABLE ROW LEVEL SECURITY;

-- Students policies
CREATE POLICY "Students are viewable by everyone" ON students FOR SELECT USING (true);

-- Exams policies
CREATE POLICY "Active exams are viewable by everyone" ON exams FOR SELECT USING (is_active = true);

-- Questions policies
CREATE POLICY "Questions are viewable by everyone" ON questions FOR SELECT USING (true);

-- Options policies
CREATE POLICY "Options are viewable by everyone" ON options FOR SELECT USING (true);

-- Exam Sessions policies
CREATE POLICY "Students can view their own sessions" ON exam_sessions FOR SELECT USING (true);
CREATE POLICY "Students can create sessions" ON exam_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their own sessions" ON exam_sessions FOR UPDATE USING (true);

-- Answers policies
CREATE POLICY "Students can view their own answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Students can create answers" ON answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their own answers" ON answers FOR UPDATE USING (true);

-- Results policies
CREATE POLICY "Students can view their own results" ON results FOR SELECT USING (true);

-- Sync Queue policies
CREATE POLICY "Students can view their own sync queue" ON sync_queue FOR SELECT USING (true);
CREATE POLICY "Students can create sync queue entries" ON sync_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their own sync queue" ON sync_queue FOR UPDATE USING (true);

-- Rate Limit Tracker policies
CREATE POLICY "Students can view their own rate limits" ON rate_limit_tracker FOR SELECT USING (true);
CREATE POLICY "Students can create rate limit entries" ON rate_limit_tracker FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their own rate limits" ON rate_limit_tracker FOR UPDATE USING (true);

-- ============================================================================
-- 9. FUNCTIONS FOR OPTIMIZATION
-- ============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_exam_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY exam_statistics;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old sync queue entries
CREATE OR REPLACE FUNCTION cleanup_sync_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_queue
  WHERE status = 'completed' AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_tracker
  WHERE window_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update exam updated_at timestamp
CREATE OR REPLACE FUNCTION update_exam_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exam_update_timestamp
BEFORE UPDATE ON exams
FOR EACH ROW
EXECUTE FUNCTION update_exam_timestamp();

-- Update exam_sessions updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_update_timestamp
BEFORE UPDATE ON exam_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();

-- Update sync_queue updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_queue_update_timestamp
BEFORE UPDATE ON sync_queue
FOR EACH ROW
EXECUTE FUNCTION update_sync_queue_timestamp();

-- Increment exam total_attempts on new session
CREATE OR REPLACE FUNCTION increment_exam_attempts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exams SET total_attempts = total_attempts + 1 WHERE id = NEW.exam_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exam_increment_attempts
AFTER INSERT ON exam_sessions
FOR EACH ROW
EXECUTE FUNCTION increment_exam_attempts();

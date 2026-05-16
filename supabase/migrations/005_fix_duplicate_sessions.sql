-- Remove duplicate exam_sessions (keep only the first submission per student+exam)
DELETE FROM exam_sessions
WHERE id NOT IN (
  SELECT DISTINCT ON (student_id, exam_id) id
  FROM exam_sessions
  WHERE status = 'submitted'
  ORDER BY student_id, exam_id, submitted_at ASC
)
AND status = 'submitted';

-- Add unique index to prevent future duplicates (1 submitted session per student per exam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_submitted_session
ON exam_sessions (student_id, exam_id)
WHERE status = 'submitted';

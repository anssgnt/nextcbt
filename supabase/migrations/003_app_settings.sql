-- App settings table (1 row, stores all school config)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS (public read, admin write)
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- Insert default row
INSERT INTO app_settings (id, data) VALUES ('main', '{"schoolName": "CBT Online", "schoolMotto": "Ujian Berbasis Komputer"}')
ON CONFLICT (id) DO NOTHING;

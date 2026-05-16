-- Fix admins table: add password and name columns if not exist
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'admin123';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Admin';

-- Insert default admin if not exists
INSERT INTO admins (email, password, name)
VALUES ('admin@cbt.com', 'admin123', 'Administrator')
ON CONFLICT (email) DO UPDATE SET password = 'admin123', name = 'Administrator';

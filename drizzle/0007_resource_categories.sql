CREATE TABLE IF NOT EXISTS resource_categories (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Seed with existing hardcoded categories
INSERT INTO resource_categories (label, color, icon) VALUES ('Script chiamate', '#EC4899', 'phone') ON CONFLICT DO NOTHING;
INSERT INTO resource_categories (label, color, icon) VALUES ('Template email', '#3B82F6', 'mail') ON CONFLICT DO NOTHING;
INSERT INTO resource_categories (label, color, icon) VALUES ('Gestione obiezioni', '#F97316', 'shield') ON CONFLICT DO NOTHING;
INSERT INTO resource_categories (label, color, icon) VALUES ('Listino', '#10B981', 'file-text') ON CONFLICT DO NOTHING;
INSERT INTO resource_categories (label, color, icon) VALUES ('Playbook', '#8B5CF6', 'book-open') ON CONFLICT DO NOTHING;

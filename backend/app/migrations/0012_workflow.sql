ALTER TABLE events ADD COLUMN series_id TEXT;
ALTER TABLE events ADD COLUMN also_ids TEXT NOT NULL DEFAULT '[]';
CREATE INDEX idx_events_series ON events(series_id);
ALTER TABLE dishes ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dishes ADD COLUMN ingredients TEXT NOT NULL DEFAULT '';
ALTER TABLE todos ADD COLUMN due TEXT;
ALTER TABLE todos ADD COLUMN repeat TEXT NOT NULL DEFAULT '';
ALTER TABLE dashboards ADD COLUMN night_start INTEGER;
ALTER TABLE dashboards ADD COLUMN night_end INTEGER;
CREATE TABLE shopping_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  title_key  TEXT NOT NULL,
  grp        TEXT NOT NULL DEFAULT 'other',
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

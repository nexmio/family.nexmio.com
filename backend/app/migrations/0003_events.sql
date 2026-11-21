CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  date       TEXT NOT NULL,
  start      TEXT,
  "end"      TEXT,
  member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
  category   TEXT NOT NULL CHECK (category IN ('homework','plan','appointment','other')),
  notes      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_events_date ON events(date);

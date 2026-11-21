CREATE TABLE members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL,
  created_at TEXT NOT NULL
);

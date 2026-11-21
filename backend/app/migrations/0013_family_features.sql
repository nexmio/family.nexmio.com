CREATE TABLE chores (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  stars     INTEGER NOT NULL DEFAULT 1,
  part      TEXT NOT NULL DEFAULT 'any' CHECK (part IN ('morning','evening','any')),
  days      TEXT NOT NULL DEFAULT 'daily' CHECK (days IN ('daily','weekdays','weekends'))
);
CREATE TABLE chore_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  chore_id  INTEGER REFERENCES chores(id) ON DELETE SET NULL,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  stars     INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_chore_log_once ON chore_log(chore_id, date) WHERE chore_id IS NOT NULL;
CREATE TABLE goals (
  member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  stars     INTEGER NOT NULL
);
CREATE TABLE star_spent (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE occasions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  month     INTEGER NOT NULL,
  day       INTEGER NOT NULL,
  year      INTEGER,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL
);
CREATE TABLE countdowns (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date  TEXT NOT NULL
);
CREATE TABLE board (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE TABLE share_links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  days       INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

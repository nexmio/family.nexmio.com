CREATE TABLE albums (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE
);
CREATE TABLE photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  filename     TEXT NOT NULL,
  content_type TEXT NOT NULL,
  album_id     INTEGER REFERENCES albums(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL
);

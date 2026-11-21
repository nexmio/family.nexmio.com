CREATE TABLE dishes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  name_key  TEXT NOT NULL UNIQUE,
  last_used TEXT
);
CREATE TABLE meal_days (
  date    TEXT PRIMARY KEY,
  dish_id INTEGER NOT NULL REFERENCES dishes(id),
  note    TEXT
);

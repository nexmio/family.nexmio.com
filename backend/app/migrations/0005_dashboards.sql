CREATE TABLE dashboards (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  device      TEXT NOT NULL CHECK (device IN ('phone','tablet','screen')),
  orientation TEXT NOT NULL CHECK (orientation IN ('landscape','portrait')),
  is_default  INTEGER NOT NULL DEFAULT 0,
  widgets     TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
INSERT INTO dashboards (slug, name, device, orientation, is_default, widgets, updated_at)
VALUES (
  'main', 'Family dashboard', 'screen', 'landscape', 1,
  '[{"id":"w1","type":"person-agenda","order":1,"size":"large","settings":{"days":1,"members":[]}},{"id":"w2","type":"meal-boxes","order":2,"size":"large","settings":{"days":5}}]',
  '2026-11-18T00:00:00+00:00'
);

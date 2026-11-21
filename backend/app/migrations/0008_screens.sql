ALTER TABLE dashboards ADD COLUMN start_view TEXT NOT NULL DEFAULT 'day';
ALTER TABLE dashboards ADD COLUMN touch INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboards ADD COLUMN return_after INTEGER NOT NULL DEFAULT 60;
ALTER TABLE dashboards ADD COLUMN idle_photo_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboards ADD COLUMN slideshow TEXT NOT NULL DEFAULT '{"transition":"fade","interval":30,"albums":[],"overlay_clock":true,"overlay_plan":true,"overlay_meal":true}';
UPDATE dashboards SET widgets = '[{"id":"w1","type":"person-agenda","order":1,"size":"medium","settings":{"days":1,"members":[]}},{"id":"w2","type":"photo-slideshow","order":2,"size":"medium","settings":{"layout":"tile"}},{"id":"w3","type":"meal-today","order":3,"size":"small","settings":{}},{"id":"w4","type":"todo","order":4,"size":"small","settings":{}},{"id":"w5","type":"clock","order":5,"size":"small","settings":{}}]' WHERE slug = 'main';
INSERT OR IGNORE INTO settings (key, value) VALUES ('wallpaper', 'ocean');

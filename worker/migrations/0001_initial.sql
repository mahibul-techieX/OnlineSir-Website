CREATE TABLE IF NOT EXISTS resources (
 id TEXT PRIMARY KEY,
 version INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','approved','archived')),
 payload TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS revisions (
 resource_id TEXT NOT NULL REFERENCES resources(id),
 version INTEGER NOT NULL,
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL,
 created_by TEXT NOT NULL,
 PRIMARY KEY(resource_id, version)
);
CREATE TABLE IF NOT EXISTS releases (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL,
 created_by TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'ready',
 error TEXT
);
CREATE TABLE IF NOT EXISTS release_items (
 release_id TEXT NOT NULL REFERENCES releases(id),
 resource_id TEXT NOT NULL,
 payload TEXT NOT NULL,
 PRIMARY KEY(release_id, resource_id)
);
CREATE TABLE IF NOT EXISTS audit_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 entity_id TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS releases_date ON releases(created_at);

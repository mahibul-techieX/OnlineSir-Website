CREATE TABLE curriculum (id TEXT PRIMARY KEY,parent_id TEXT REFERENCES curriculum(id),kind TEXT NOT NULL CHECK(kind IN ('class','subject','book','chapter')),title TEXT NOT NULL,slug TEXT NOT NULL,grade INTEGER,edition TEXT,position INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,UNIQUE(parent_id,slug));
INSERT INTO curriculum(id,kind,title,slug,grade,position) VALUES
 ('class-5','class','পঞ্চম শ্ৰেণী','class-5',5,5),('class-6','class','ষষ্ঠ শ্ৰেণী','class-6',6,6),('class-7','class','সপ্তম শ্ৰেণী','class-7',7,7),('class-8','class','অষ্টম শ্ৰেণী','class-8',8,8),('class-9','class','নৱম শ্ৰেণী','class-9',9,9),('class-10','class','দশম শ্ৰেণী','class-10',10,10);
CREATE TABLE approved_resources(resource_id TEXT PRIMARY KEY REFERENCES resources(id),payload TEXT NOT NULL,version INTEGER NOT NULL);
INSERT INTO approved_resources SELECT id,payload,version FROM resources WHERE status='approved';
CREATE TRIGGER resources_create_revision AFTER INSERT ON resources BEGIN
 INSERT OR IGNORE INTO revisions VALUES(NEW.id,NEW.version,NEW.payload,NEW.updated_at,NEW.updated_by);
 INSERT INTO audit_events(actor,action,entity_id,created_at) VALUES(NEW.updated_by,'create',NEW.id,NEW.updated_at);
END;
CREATE TRIGGER resources_update_revision AFTER UPDATE ON resources BEGIN
 INSERT OR IGNORE INTO revisions VALUES(NEW.id,NEW.version,NEW.payload,NEW.updated_at,NEW.updated_by);
 INSERT INTO audit_events(actor,action,entity_id,created_at) VALUES(NEW.updated_by,CASE WHEN NEW.payload!=OLD.payload THEN 'edit' ELSE NEW.status END,NEW.id,NEW.updated_at);
END;
CREATE TRIGGER resources_approve AFTER UPDATE ON resources WHEN NEW.status='approved' BEGIN
 INSERT INTO approved_resources VALUES(NEW.id,NEW.payload,NEW.version) ON CONFLICT(resource_id) DO UPDATE SET payload=excluded.payload,version=excluded.version;
END;
CREATE TABLE media(id TEXT PRIMARY KEY,name TEXT NOT NULL,extension TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,alt TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,created_by TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0);
CREATE TABLE admin_users(email TEXT PRIMARY KEY,role TEXT NOT NULL CHECK(role IN ('editor','reviewer')),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE settings(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
INSERT INTO settings VALUES('site','{"siteName":"OnlineSir","tagline":"অসমীয়া মাধ্যমৰ শিক্ষাৰ সহযাত্ৰী","contactEmail":"","academicSession":"2026-27","announcement":""}',1);
CREATE TABLE corrections(id TEXT PRIMARY KEY,resource_id TEXT REFERENCES resources(id),message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),created_at TEXT NOT NULL,created_by TEXT NOT NULL);
ALTER TABLE releases ADD COLUMN settings_payload TEXT NOT NULL DEFAULT '{}';
CREATE TABLE publish_jobs(id TEXT PRIMARY KEY,release_id TEXT NOT NULL REFERENCES releases(id),status TEXT NOT NULL DEFAULT 'queued',message TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,worker_token TEXT);
CREATE INDEX publish_job_status ON publish_jobs(status,created_at);
CREATE TABLE runtime_state(id TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE INDEX curriculum_parent ON curriculum(parent_id,position);

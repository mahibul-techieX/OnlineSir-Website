CREATE TABLE admin_sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,credential_version TEXT NOT NULL);
CREATE INDEX admin_session_expiry ON admin_sessions(expires_at);
CREATE TABLE admin_login_limits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at INTEGER NOT NULL);

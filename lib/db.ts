import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/manabu.db');

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    emoji TEXT DEFAULT '👤',
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    hearts INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- Can be NULL for public/anonymous courses
    topic TEXT NOT NULL,
    depth TEXT NOT NULL,
    icon TEXT,
    data TEXT NOT NULL, -- JSON string of the full course object
    is_public BOOLEAN DEFAULT 0,
    generated_by_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    progress_data TEXT NOT NULL, -- JSON string of progress (stars, status per chapter)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, course_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );

  CREATE INDEX IF NOT EXISTS idx_courses_topic ON courses(topic);
  CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
`);

// Migration: Add user_id and other missing columns to courses table if they don't exist
try {
  db.exec(`ALTER TABLE courses ADD COLUMN user_id TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE courses ADD COLUMN is_public BOOLEAN DEFAULT 0`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE courses ADD COLUMN generated_by_name TEXT`);
} catch (e) {}

// Migration: Add google_id for OAuth support
try {
  db.exec(`ALTER TABLE users ADD COLUMN google_id TEXT`);
} catch (e) {}
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`);
} catch (e) {}

// Migration: Add x_id for X (Twitter) OAuth support
try {
  db.exec(`ALTER TABLE users ADD COLUMN x_id TEXT`);
} catch (e) {}
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_id ON users(x_id) WHERE x_id IS NOT NULL`);
} catch (e) {}

// Migration: Add last_login_at for inactivity tracking
try {
  db.exec(`ALTER TABLE users ADD COLUMN last_login_at DATETIME`);
} catch (e) {}

// Auto-delete accounts inactive for 180+ days (cascades to progress)
try {
  db.exec(`
    DELETE FROM user_progress WHERE user_id IN (
      SELECT id FROM users
      WHERE (last_login_at IS NULL AND created_at < datetime('now', '-180 days'))
         OR last_login_at < datetime('now', '-180 days')
    );
    DELETE FROM users
    WHERE (last_login_at IS NULL AND created_at < datetime('now', '-180 days'))
       OR last_login_at < datetime('now', '-180 days');
  `);
} catch (e) {
  console.warn('Inactive account cleanup error:', e);
}

export default db;

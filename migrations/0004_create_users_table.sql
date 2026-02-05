-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user', -- 'super_admin', 'admin', 'user'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_by INTEGER,
  approved_at DATETIME,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- Add user_id to projects table
ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id);

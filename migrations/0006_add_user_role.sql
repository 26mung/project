-- Add role column to users table for admin management
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'super_admin'));

-- Set default user who created the data as super_admin
UPDATE users SET role = 'super_admin' WHERE email = 'ghtjrrnsdls@naver.com';

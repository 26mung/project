-- Insert super admin account
-- Email: hslee@hecto.co.kr
-- Password: lhs950519+
INSERT INTO users (email, password_hash, name, role, status, approved_at) 
VALUES (
  'hslee@hecto.co.kr',
  '$2b$10$xJm9dM/Pxzv0fL3DESkHweCuduXTmqXG0Q/67X9TXtUEWBxBe6Nzu',
  '최고관리자',
  'super_admin',
  'approved',
  CURRENT_TIMESTAMP
);

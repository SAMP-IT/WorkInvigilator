-- Set admin role for the first user
-- Replace 'abillkishoreraj@gmail.com' with your actual email if different

UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users
    WHERE email = 'abillkishoreraj@gmail.com'
);

-- Verify the change
SELECT
    u.email,
    p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'abillkishoreraj@gmail.com';

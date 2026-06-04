UPDATE auth.users
SET encrypted_password = crypt('Khan@$8546', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '5d1c38a2-0cf4-4dff-8837-27db65622070';

-- Ensure email matches expected admin email
UPDATE auth.users SET email = 'hadasset2021@gmail.com'
WHERE id = '5d1c38a2-0cf4-4dff-8837-27db65622070' AND email IS DISTINCT FROM 'hadasset2021@gmail.com';
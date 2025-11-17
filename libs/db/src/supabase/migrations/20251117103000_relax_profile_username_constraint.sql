-- Allow profiles inserts without a username (handle_new_user trigger)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS username_length;

ALTER TABLE public.profiles
ADD CONSTRAINT username_length CHECK (username IS NULL OR char_length(username) >= 3);

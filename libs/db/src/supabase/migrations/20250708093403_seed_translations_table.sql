INSERT INTO public.translations (key, translations) VALUES
('sign_in', '{"en": "Sign in", "fr": "Connexion"}'),
('sign_up', '{"en": "Sign up", "fr": "Inscription"}'),
('sign_out', '{"en": "Sign out", "fr": "Déconnexion"}'),
('dont_have_account', '{"en": "Don''t have an account?", "fr": "Pas encore de compte ?"}'),
('email', '{"en": "Email", "fr": "Email"}'),
('you_at_example_com', '{"en": "you@example.com", "fr": "vous@example.com"}'),
('password', '{"en": "Password", "fr": "Mot de passe"}'),
('forgot_password', '{"en": "Forgot Password?", "fr": "Mot de passe oublié ?"}'),
('your_password', '{"en": "Your password", "fr": "Votre mot de passe"}'),
('signing_in_pending', '{"en": "Signing In...", "fr": "Connexion en cours..."}'),
('already_have_account', '{"en": "Already have an account?", "fr": "Déjà un compte ?"}'),
('signing_up_pending', '{"en": "Signing up...", "fr": "Inscription en cours..."}'),
('reset_password', '{"en": "Reset Password", "fr": "Réinitialiser le mot de passe"}');

-- Route prefix for the blog section
INSERT INTO public.translations (key, translations) VALUES
('blog_prefix', '{"en": "article", "fr": "article"}')
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

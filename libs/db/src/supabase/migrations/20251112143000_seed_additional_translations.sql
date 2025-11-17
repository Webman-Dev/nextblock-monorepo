-- supabase/migrations/20251112143000_seed_additional_translations.sql
-- Adds Spanish, Italian, German, Chinese, and Japanese values to every existing translation key.

INSERT INTO public.translations (key, translations) VALUES
('sign_in', '{
  "es": "Iniciar sesión",
  "it": "Accedi",
  "de": "Anmelden",
  "zh": "登录",
  "ja": "ログイン"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('sign_up', '{
  "es": "Registrarse",
  "it": "Registrati",
  "de": "Registrieren",
  "zh": "注册",
  "ja": "登録する"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('sign_out', '{
  "es": "Cerrar sesión",
  "it": "Esci",
  "de": "Abmelden",
  "zh": "退出登录",
  "ja": "ログアウト"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('dont_have_account', '{
  "es": "¿No tienes una cuenta?",
  "it": "Non hai un account?",
  "de": "Du hast noch kein Konto?",
  "zh": "还没有账号？",
  "ja": "アカウントをお持ちではありませんか？"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('email', '{
  "es": "Correo electrónico",
  "it": "Email",
  "de": "E-Mail",
  "zh": "邮箱",
  "ja": "メールアドレス"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('you_at_example_com', '{
  "es": "tu@ejemplo.com",
  "it": "tu@esempio.com",
  "de": "du@beispiel.de",
  "zh": "ni@example.com",
  "ja": "あなた@example.com"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('password', '{
  "es": "Contraseña",
  "it": "Password",
  "de": "Passwort",
  "zh": "密码",
  "ja": "パスワード"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('forgot_password', '{
  "es": "¿Olvidaste tu contraseña?",
  "it": "Hai dimenticato la password?",
  "de": "Passwort vergessen?",
  "zh": "忘记密码？",
  "ja": "パスワードをお忘れですか？"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('your_password', '{
  "es": "Tu contraseña",
  "it": "La tua password",
  "de": "Dein Passwort",
  "zh": "你的密码",
  "ja": "あなたのパスワード"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('signing_in_pending', '{
  "es": "Iniciando sesión...",
  "it": "Accesso in corso...",
  "de": "Anmeldung läuft...",
  "zh": "正在登录...",
  "ja": "ログイン中..."
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('already_have_account', '{
  "es": "¿Ya tienes una cuenta?",
  "it": "Hai già un account?",
  "de": "Hast du bereits ein Konto?",
  "zh": "已经有账号？",
  "ja": "すでにアカウントがありますか？"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('signing_up_pending', '{
  "es": "Registrándote...",
  "it": "Registrazione in corso...",
  "de": "Registrierung läuft...",
  "zh": "正在注册...",
  "ja": "登録処理中..."
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('reset_password', '{
  "es": "Restablecer contraseña",
  "it": "Reimposta password",
  "de": "Passwort zurücksetzen",
  "zh": "重置密码",
  "ja": "パスワードをリセット"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('edit_page', '{
  "es": "Editar página",
  "it": "Modifica pagina",
  "de": "Seite bearbeiten",
  "zh": "编辑页面",
  "ja": "ページを編集"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('edit_post', '{
  "es": "Editar publicación",
  "it": "Modifica articolo",
  "de": "Beitrag bearbeiten",
  "zh": "编辑文章",
  "ja": "投稿を編集"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('open_main_menu', '{
  "es": "Abrir menú principal",
  "it": "Apri il menu principale",
  "de": "Hauptmenü öffnen",
  "zh": "打开主菜单",
  "ja": "メインメニューを開く"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('mobile_navigation_menu', '{
  "es": "Menú de navegación móvil",
  "it": "Menu di navigazione mobile",
  "de": "Mobiles Navigationsmenü",
  "zh": "移动导航菜单",
  "ja": "モバイルナビゲーションメニュー"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('cms_dashboard', '{
  "es": "Panel del CMS",
  "it": "Dashboard CMS",
  "de": "CMS-Dashboard",
  "zh": "CMS 控制台",
  "ja": "CMS ダッシュボード"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('update_env_file_warning', '{
  "es": "Actualiza el archivo .env.local con la anon key y la URL",
  "it": "Aggiorna il file .env.local con anon key e URL",
  "de": "Aktualisiere die .env.local mit Anon-Key und URL",
  "zh": ".env.local 文件中请更新 anon key 和 URL",
  "ja": ".env.local を anon key と URL で更新してください"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

INSERT INTO public.translations (key, translations) VALUES
('greeting', '{
  "es": "Hola, {username}!",
  "it": "Ciao, {username}!",
  "de": "Hallo, {username}!",
  "zh": "嗨，{username}！",
  "ja": "やあ、{username}!"
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = public.translations.translations || EXCLUDED.translations;

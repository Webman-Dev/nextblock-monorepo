-- 00000000000034_enable_staff_2fa_reminder_default.sql
-- Turn the "Encourage staff to enable 2FA" policy ON by default. The reminder banner is
-- now implemented (shown to ADMIN/WRITER accounts without a second factor); migration 027
-- seeded this flag to false, so flip the existing security_settings row to true. Admins can
-- still turn it off afterward. The sandbox never enforces it (handled at runtime), so the
-- stored value here is harmless after a sandbox reset.

UPDATE public.site_settings
SET value = jsonb_set(coalesce(value, '{}'::jsonb), '{enforce_staff_2fa}', 'true'::jsonb)
WHERE key = 'security_settings';

-- Cover the unlikely case where the row is missing (it is seeded in migration 027).
INSERT INTO public.site_settings (key, value)
VALUES ('security_settings', '{"trusted_device_days": 30, "enforce_staff_2fa": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

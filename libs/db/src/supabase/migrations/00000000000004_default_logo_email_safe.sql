-- Swap the seeded DEFAULT site logo from the WebP asset to a bundled PNG.
--
-- WebP (and AVIF) don't render in Outlook and several other email clients, so the default
-- logo shown in transactional emails was a broken image out of the box. The PNG is a
-- /public bundled asset (registered in resolveMediaUrl's BUNDLED_PUBLIC_MEDIA_KEYS), so it
-- resolves to `<site>/images/nextblock-logo-button-tiny.png` and renders everywhere.
--
-- Forward-only, data-only (no schema change), idempotent, and GUARDED so it never
-- overrides a logo an operator has since chosen: it only repoints the seeded default logo
-- row while that row still points at the seeded WebP media.

INSERT INTO public.media (
  id, uploader_id, file_name, object_key, file_type, size_bytes, description,
  width, height, blur_data_url, variants, file_path, folder, created_at, updated_at
) VALUES (
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', NULL, 'nextblock-logo-button-tiny.png',
  'images/nextblock-logo-button-tiny.png', 'image/png', 10000, 'Default site logo',
  NULL, NULL, NULL, NULL, NULL, NULL, now(), now()
) ON CONFLICT DO NOTHING;

UPDATE public.logos
SET media_id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
WHERE id = 'd45ef03d-27fc-4099-8b46-1cdf82d658d2'
  AND media_id = 'ea6fdaf5-f8de-416c-9f2b-b689b7a4ed38';

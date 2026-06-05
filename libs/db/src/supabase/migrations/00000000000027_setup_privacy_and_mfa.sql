-- 00000000000027_setup_privacy_and_mfa.sql
-- Canadian privacy compliance (Quebec Law 25 / CASL) + two-factor authentication.
--
-- Adds:
--   * privacy_consent_logs    - immutable audit trail of consent decisions (service-role writes only)
--   * user_security_settings  - per-user MFA configuration (totp | email)
--   * user_trusted_devices    - revocable "remember this device" records that gate the 2FA bypass
--   * email_2fa_challenges    - short-lived hashed 6-digit email codes (service-role only)
-- Seeds:
--   * privacy_settings / security_settings defaults into site_settings
--   * /privacy-policy + /terms-of-service pages (EN + FR) as text blocks, with the
--     Terms aligned to NextBlock's actual license (AGPL-3.0, see LICENSE.md)
--   * the remember_this_device sign-in translation
--
-- Conventions mirror existing migrations: gen_random_uuid(), timestamptz DEFAULT now(),
-- explicit per-table GRANTs, RLS with service_role FOR ALL and role-scoped authenticated policies.

-- ---------------------------------------------------------------------------
-- 1. privacy_consent_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.privacy_consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_token text NOT NULL UNIQUE,
  categories jsonb NOT NULL DEFAULT '{"necessary": true, "analytics": false, "marketing": false}'::jsonb
    CHECK (jsonb_typeof(categories) = 'object'),
  ip_masked text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.privacy_consent_logs IS
  'Immutable audit log of visitor consent decisions for Quebec Law 25 / PIPEDA accountability.';
COMMENT ON COLUMN public.privacy_consent_logs.consent_token IS
  'Opaque token also stored in the nb_consent_preference cookie to correlate a decision with its record.';
COMMENT ON COLUMN public.privacy_consent_logs.ip_masked IS
  'Partially masked IP (e.g. 203.0.113.x) - never store a full address for an analytics/marketing consent log.';

CREATE INDEX IF NOT EXISTS idx_privacy_consent_logs_created_at
  ON public.privacy_consent_logs (created_at DESC);

ALTER TABLE public.privacy_consent_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.privacy_consent_logs TO authenticated;
GRANT ALL ON public.privacy_consent_logs TO service_role;

DROP POLICY IF EXISTS privacy_consent_logs_admin_read_policy ON public.privacy_consent_logs;
CREATE POLICY privacy_consent_logs_admin_read_policy
  ON public.privacy_consent_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_current_user_role()) = 'ADMIN');

DROP POLICY IF EXISTS privacy_consent_logs_service_role_policy ON public.privacy_consent_logs;
CREATE POLICY privacy_consent_logs_service_role_policy
  ON public.privacy_consent_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. user_security_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_type text CHECK (mfa_type IN ('totp', 'email')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_security_settings IS
  'Per-user multi-factor configuration. mfa_type is NULL until a factor is enrolled.';

ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.user_security_settings TO authenticated;
GRANT ALL ON public.user_security_settings TO service_role;

DROP POLICY IF EXISTS user_security_settings_select_own_policy ON public.user_security_settings;
CREATE POLICY user_security_settings_select_own_policy
  ON public.user_security_settings
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_security_settings_insert_own_policy ON public.user_security_settings;
CREATE POLICY user_security_settings_insert_own_policy
  ON public.user_security_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_security_settings_update_own_policy ON public.user_security_settings;
CREATE POLICY user_security_settings_update_own_policy
  ON public.user_security_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_security_settings_service_role_policy ON public.user_security_settings;
CREATE POLICY user_security_settings_service_role_policy
  ON public.user_security_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. user_trusted_devices  ("Remember this device")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash text NOT NULL UNIQUE,
  browser_metadata text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_trusted_devices IS
  'SHA-256 hashes of trusted-device tokens. A 2FA bypass is only honoured when a non-expired row matches the cookie token, so deleting a row instantly revokes trust.';
COMMENT ON COLUMN public.user_trusted_devices.device_hash IS
  'SHA-256 of the raw token held in the nb_trusted_device cookie. The raw token is never stored.';

CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_user_id
  ON public.user_trusted_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_expires_at
  ON public.user_trusted_devices (expires_at);

ALTER TABLE public.user_trusted_devices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, DELETE ON public.user_trusted_devices TO authenticated;
GRANT ALL ON public.user_trusted_devices TO service_role;

-- Users can list their own devices (Security panel) and revoke them, but creation
-- happens server-side via the service role so the raw token is hashed before storage.
DROP POLICY IF EXISTS user_trusted_devices_select_own_policy ON public.user_trusted_devices;
CREATE POLICY user_trusted_devices_select_own_policy
  ON public.user_trusted_devices
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_trusted_devices_delete_own_policy ON public.user_trusted_devices;
CREATE POLICY user_trusted_devices_delete_own_policy
  ON public.user_trusted_devices
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_trusted_devices_service_role_policy ON public.user_trusted_devices;
CREATE POLICY user_trusted_devices_service_role_policy
  ON public.user_trusted_devices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. email_2fa_challenges  (service-role only - codes are sensitive)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_2fa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_2fa_challenges IS
  'Short-lived SHA-256 hashes of 6-digit email verification codes. Readable/writable only by the service role.';

CREATE INDEX IF NOT EXISTS idx_email_2fa_challenges_user_id
  ON public.email_2fa_challenges (user_id);
CREATE INDEX IF NOT EXISTS idx_email_2fa_challenges_expires_at
  ON public.email_2fa_challenges (expires_at);

ALTER TABLE public.email_2fa_challenges ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.email_2fa_challenges TO service_role;

-- No authenticated/anon grants and no permissive authenticated policy: all access
-- flows through service-role server actions.
DROP POLICY IF EXISTS email_2fa_challenges_service_role_policy ON public.email_2fa_challenges;
CREATE POLICY email_2fa_challenges_service_role_policy
  ON public.email_2fa_challenges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. Default site_settings (do not clobber existing admin edits)
-- ---------------------------------------------------------------------------
INSERT INTO public.site_settings (key, value) VALUES
  ('privacy_settings', '{
    "banner_enabled": true,
    "gtm_id": "",
    "ga_measurement_id": "",
    "custom_scripts": "",
    "corporate": { "legal_name": "", "address": "", "support_email": "" }
  }'::jsonb),
  ('security_settings', '{
    "trusted_device_days": 30,
    "enforce_staff_2fa": false
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Seed /privacy-policy and /terms-of-service pages (EN + FR) as text blocks.
--    Pages are metadata-only; the actual copy lives in blocks.content.html_content.
--    The Terms reflect NextBlock's real license (AGPL-3.0, per LICENSE.md).
-- ---------------------------------------------------------------------------
DO $seed$
DECLARE
  v_en bigint;
  v_fr bigint;
  v_privacy_group uuid;
  v_terms_group uuid;
  v_page_id bigint;
BEGIN
  SELECT id INTO v_en FROM public.languages WHERE code = 'en' LIMIT 1;
  SELECT id INTO v_fr FROM public.languages WHERE code = 'fr' LIMIT 1;

  IF v_en IS NULL THEN
    RAISE NOTICE 'Default language "en" not found; skipping privacy/terms page seed.';
    RETURN;
  END IF;

  -- Reuse an existing translation_group_id if these pages were seeded before.
  SELECT translation_group_id INTO v_privacy_group
    FROM public.pages WHERE slug = 'privacy-policy' AND language_id = v_en LIMIT 1;
  IF v_privacy_group IS NULL THEN v_privacy_group := gen_random_uuid(); END IF;

  SELECT translation_group_id INTO v_terms_group
    FROM public.pages WHERE slug = 'terms-of-service' AND language_id = v_en LIMIT 1;
  IF v_terms_group IS NULL THEN v_terms_group := gen_random_uuid(); END IF;

  -- ----- Privacy Policy (EN) -----
  INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description, translation_group_id)
  VALUES (
    v_en, 'Privacy Policy', 'privacy-policy', 'published',
    'Privacy Policy',
    'How we collect, use, disclose, and protect your personal information under Quebec Law 25, PIPEDA, and CASL.',
    v_privacy_group
  )
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status,
        meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description
  RETURNING id INTO v_page_id;

  DELETE FROM public.blocks WHERE page_id = v_page_id;
  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
  VALUES (v_page_id, v_en, 'text', jsonb_build_object('html_content', $html$
<h1>Privacy Policy</h1>
<p><em>Last updated: June 4, 2026</em></p>
<p>NextBlock™ CMS ("we", "us", or "our") respects your privacy and is committed to protecting your personal information in accordance with Quebec's <em>Act respecting the protection of personal information in the private sector</em> (Law 25), the federal <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA), and Canada's Anti-Spam Legislation (CASL).</p>

<h2>1. Person responsible for personal information</h2>
<p>Our Privacy Officer is responsible for our compliance with applicable privacy laws. You may reach them at <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>.</p>

<h2>2. What we collect</h2>
<ul>
  <li><strong>Account information</strong> &mdash; name, email address, and credentials when you register.</li>
  <li><strong>Usage and device data</strong> &mdash; collected only with your consent through analytics technologies.</li>
  <li><strong>Communications</strong> &mdash; messages you send us and your marketing preferences.</li>
</ul>

<h2>3. Why we collect it and your consent</h2>
<p>We collect personal information for clearly identified purposes: to provide and secure our services, to communicate with you, and &mdash; only with your express, opt-in consent &mdash; for analytics and marketing. Consistent with Law 25, non-essential cookies and trackers remain disabled until you actively accept them, and you may withdraw your consent at any time.</p>

<h2>4. Cookies and tracking technologies</h2>
<p>Strictly necessary cookies keep the site working and require no consent. Analytics and marketing technologies are loaded <strong>only after</strong> you opt in through our consent banner. Your choice is recorded so we can honour it and demonstrate accountability.</p>

<h2>5. Disclosure and sharing</h2>
<p>We do not sell your personal information. We share it only with service providers who help us operate the platform under contractual confidentiality obligations, or where required by law.</p>

<h2>6. Retention</h2>
<p>We keep personal information only for as long as necessary to fulfil the purposes described above or as required by law, after which it is securely destroyed or anonymized.</p>

<h2>7. Your rights</h2>
<p>Subject to applicable law, you have the right to access, rectify, and delete your personal information, to withdraw consent, to data portability, and to be informed about automated processing. To exercise these rights, contact our Privacy Officer at <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>.</p>

<h2>8. Commercial electronic messages (CASL)</h2>
<p>We send commercial electronic messages only with your consent. Every message identifies us and includes a working unsubscribe mechanism that we honour promptly.</p>

<h2>9. Safeguards</h2>
<p>We use appropriate physical, organizational, and technological measures &mdash; including encryption in transit and access controls &mdash; to protect personal information against loss, theft, and unauthorized access.</p>

<h2>10. Open-source software</h2>
<p>NextBlock™ CMS is free, open-source software distributed under the GNU Affero General Public License v3. When you self-host NextBlock, you are the operator responsible for the personal information processed by your own deployment, and this policy serves as a starting point you may adapt to your organization.</p>

<h2>11. Changes to this policy</h2>
<p>We may update this policy from time to time. Material changes will be communicated through the site, and the "last updated" date will be revised.</p>

<h2>12. Contact us</h2>
<p>Questions or complaints? Contact NextBlock™ CMS at <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>. You may also contact the Commission d'accès à l'information du Québec or the Office of the Privacy Commissioner of Canada.</p>
$html$), 0);

  -- ----- Privacy Policy (FR) -----
  IF v_fr IS NOT NULL THEN
    INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description, translation_group_id)
    VALUES (
      v_fr, 'Politique de confidentialité', 'politique-de-confidentialite', 'published',
      'Politique de confidentialité',
      'Comment nous recueillons, utilisons, communiquons et protégeons vos renseignements personnels en vertu de la Loi 25, de la LPRPDE et de la LCAP.',
      v_privacy_group
    )
    ON CONFLICT (language_id, slug) DO UPDATE
      SET title = EXCLUDED.title, status = EXCLUDED.status,
          meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description
    RETURNING id INTO v_page_id;

    DELETE FROM public.blocks WHERE page_id = v_page_id;
    INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
    VALUES (v_page_id, v_fr, 'text', jsonb_build_object('html_content', $html$
<h1>Politique de confidentialité</h1>
<p><em>Dernière mise à jour : 4 juin 2026</em></p>
<p>NextBlock™ CMS (« nous ») respecte votre vie privée et s'engage à protéger vos renseignements personnels conformément à la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> du Québec (Loi 25), à la <em>Loi sur la protection des renseignements personnels et les documents électroniques</em> (LPRPDE) et à la Loi canadienne anti-pourriel (LCAP).</p>

<h2>1. Responsable de la protection des renseignements personnels</h2>
<p>Notre responsable de la protection des renseignements personnels veille au respect des lois applicables. Vous pouvez le joindre à <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>.</p>

<h2>2. Renseignements que nous recueillons</h2>
<ul>
  <li><strong>Renseignements de compte</strong> &mdash; nom, adresse courriel et identifiants lors de l'inscription.</li>
  <li><strong>Données d'utilisation et d'appareil</strong> &mdash; recueillies uniquement avec votre consentement au moyen de technologies d'analyse.</li>
  <li><strong>Communications</strong> &mdash; les messages que vous nous envoyez et vos préférences marketing.</li>
</ul>

<h2>3. Finalités et consentement</h2>
<p>Nous recueillons des renseignements personnels à des fins clairement déterminées : fournir et sécuriser nos services, communiquer avec vous et &mdash; uniquement avec votre consentement exprès &mdash; à des fins d'analyse et de marketing. Conformément à la Loi 25, les témoins et traceurs non essentiels demeurent désactivés tant que vous ne les avez pas acceptés, et vous pouvez retirer votre consentement en tout temps.</p>

<h2>4. Témoins et technologies de suivi</h2>
<p>Les témoins strictement nécessaires assurent le fonctionnement du site et ne requièrent aucun consentement. Les technologies d'analyse et de marketing ne sont chargées qu'<strong>après</strong> votre consentement explicite. Votre choix est enregistré afin de le respecter.</p>

<h2>5. Communication à des tiers</h2>
<p>Nous ne vendons pas vos renseignements personnels. Nous ne les communiquons qu'à des fournisseurs qui nous aident à exploiter la plateforme, sous obligation de confidentialité, ou lorsque la loi l'exige.</p>

<h2>6. Conservation</h2>
<p>Nous ne conservons les renseignements personnels que le temps nécessaire aux fins décrites ou exigé par la loi, après quoi ils sont détruits ou anonymisés de façon sécuritaire.</p>

<h2>7. Vos droits</h2>
<p>Sous réserve de la loi applicable, vous avez le droit d'accéder à vos renseignements, de les rectifier et de les supprimer, de retirer votre consentement, à la portabilité de vos données et d'être informé du traitement automatisé. Pour exercer ces droits, écrivez à <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>.</p>

<h2>8. Messages électroniques commerciaux (LCAP)</h2>
<p>Nous n'envoyons des messages électroniques commerciaux qu'avec votre consentement. Chaque message nous identifie et comporte un mécanisme de désabonnement fonctionnel que nous respectons rapidement.</p>

<h2>9. Mesures de sécurité</h2>
<p>Nous employons des mesures physiques, organisationnelles et technologiques appropriées &mdash; dont le chiffrement en transit et le contrôle des accès &mdash; pour protéger vos renseignements.</p>

<h2>10. Logiciel libre</h2>
<p>NextBlock™ CMS est un logiciel libre et à code source ouvert distribué sous la licence publique générale GNU Affero v3. Lorsque vous hébergez NextBlock vous-même, vous êtes l'exploitant responsable des renseignements personnels traités par votre propre instance, et la présente politique vous sert de point de départ adaptable à votre organisation.</p>

<h2>11. Modifications</h2>
<p>Nous pouvons mettre à jour cette politique. Les changements importants seront communiqués sur le site et la date de mise à jour sera révisée.</p>

<h2>12. Nous joindre</h2>
<p>Des questions ou des plaintes ? Contactez NextBlock™ CMS à <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>. Vous pouvez aussi vous adresser à la Commission d'accès à l'information du Québec.</p>
$html$), 0);
  END IF;

  -- ----- Terms of Service (EN) -- aligned with the AGPL-3.0 (LICENSE.md) -----
  INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description, translation_group_id)
  VALUES (
    v_en, 'Terms of Service', 'terms-of-service', 'published',
    'Terms of Service',
    'The terms governing your use of NextBlock™ CMS, free and open-source software licensed under the AGPL-3.0.',
    v_terms_group
  )
  ON CONFLICT (language_id, slug) DO UPDATE
    SET title = EXCLUDED.title, status = EXCLUDED.status,
        meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description
  RETURNING id INTO v_page_id;

  DELETE FROM public.blocks WHERE page_id = v_page_id;
  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
  VALUES (v_page_id, v_en, 'text', jsonb_build_object('html_content', $html$
<h1>Terms of Service</h1>
<p><em>Last updated: June 4, 2026</em></p>

<h2>1. Acceptance of terms</h2>
<p>By accessing or using NextBlock™ CMS and the services we provide (the "Services"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.</p>

<h2>2. Free and open-source software</h2>
<p>NextBlock™ CMS is free, open-source software licensed under the <strong>GNU Affero General Public License, version 3 (AGPL-3.0)</strong> or, at your option, any later version. You are free to run, study, share, and modify the software under the terms of that license. A copy of the license is distributed with the software and is also available at <a href="https://www.gnu.org/licenses/agpl-3.0.html">gnu.org/licenses/agpl-3.0.html</a>.</p>
<p>Copyright © 2025 NextBlock™ CMS.</p>

<h2>3. Source code availability</h2>
<p>In accordance with section 13 of the AGPL-3.0, if you run a modified version of NextBlock™ CMS and make it available to users over a network, you must prominently offer those users access to the Corresponding Source of your modified version, free of charge, through a standard or customary means of facilitating copying of software.</p>

<h2>4. Trademarks</h2>
<p>The AGPL-3.0 grants broad rights to the software's source code but does <strong>not</strong> grant any rights to our trade names, trademarks, or service marks. "NextBlock™", the NextBlock™ CMS name, and associated logos remain our property and may not be used in a way that suggests endorsement or affiliation without our prior written permission.</p>

<h2>5. Accounts and acceptable use</h2>
<p>If you create an account, you are responsible for safeguarding your credentials and for all activity under your account, and you agree to notify us promptly of any unauthorized use. You agree not to misuse the Services, including by attempting to disrupt them, access them without authorization, or use them for unlawful purposes.</p>

<h2>6. No warranty</h2>
<p>As stated in section 15 of the AGPL-3.0, the software is provided "as is", without warranty of any kind, either expressed or implied, including, without limitation, the implied warranties of merchantability and fitness for a particular purpose. The entire risk as to the quality and performance of the software is with you.</p>

<h2>7. Limitation of liability</h2>
<p>As stated in section 16 of the AGPL-3.0, and to the fullest extent permitted by applicable law, in no event will any copyright holder, or any other party who modifies or conveys the software, be liable to you for damages, including any general, special, incidental, or consequential damages arising out of the use or inability to use the software.</p>

<h2>8. Governing law</h2>
<p>These Terms are governed by the laws of the Province of Quebec and the federal laws of Canada applicable therein, without regard to conflict-of-law principles. Nothing in these Terms limits any mandatory consumer-protection rights you may have under those laws.</p>

<h2>9. Changes</h2>
<p>We may revise these Terms from time to time. Material changes will be communicated through the Services, and continued use of the Services after changes take effect constitutes acceptance of the revised Terms.</p>

<h2>10. Contact</h2>
<p>Questions about these Terms? Contact NextBlock™ CMS at <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>.</p>
$html$), 0);

  -- ----- Terms of Service (FR) -- aligned with the AGPL-3.0 (LICENSE.md) -----
  IF v_fr IS NOT NULL THEN
    INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description, translation_group_id)
    VALUES (
      v_fr, 'Conditions d''utilisation', 'conditions-utilisation', 'published',
      'Conditions d''utilisation',
      'Les conditions régissant votre utilisation de NextBlock™ CMS, un logiciel libre sous licence AGPL-3.0.',
      v_terms_group
    )
    ON CONFLICT (language_id, slug) DO UPDATE
      SET title = EXCLUDED.title, status = EXCLUDED.status,
          meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description
    RETURNING id INTO v_page_id;

    DELETE FROM public.blocks WHERE page_id = v_page_id;
    INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
    VALUES (v_page_id, v_fr, 'text', jsonb_build_object('html_content', $html$
<h1>Conditions d'utilisation</h1>
<p><em>Dernière mise à jour : 4 juin 2026</em></p>

<h2>1. Acceptation des conditions</h2>
<p>En accédant à NextBlock™ CMS et aux services que nous fournissons (les « Services ») ou en les utilisant, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'êtes pas d'accord, n'utilisez pas les Services.</p>

<h2>2. Logiciel libre et à code source ouvert</h2>
<p>NextBlock™ CMS est un logiciel libre et à code source ouvert distribué sous la <strong>licence publique générale GNU Affero, version 3 (AGPL-3.0)</strong> ou, à votre choix, toute version ultérieure. Vous êtes libre d'exécuter, d'étudier, de partager et de modifier le logiciel selon les termes de cette licence. Une copie de la licence est fournie avec le logiciel et est aussi disponible à <a href="https://www.gnu.org/licenses/agpl-3.0.html">gnu.org/licenses/agpl-3.0.html</a>.</p>
<p>Droit d'auteur © 2025 NextBlock™ CMS.</p>

<h2>3. Disponibilité du code source</h2>
<p>Conformément à l'article 13 de l'AGPL-3.0, si vous exploitez une version modifiée de NextBlock™ CMS et la rendez accessible à des utilisateurs sur un réseau, vous devez offrir clairement à ces utilisateurs l'accès au code source correspondant de votre version modifiée, gratuitement, par un moyen usuel de copie de logiciels.</p>

<h2>4. Marques de commerce</h2>
<p>L'AGPL-3.0 accorde de larges droits sur le code source du logiciel, mais <strong>n'accorde aucun droit</strong> sur nos noms commerciaux, marques de commerce ou marques de service. « NextBlock™ », le nom NextBlock™ CMS et les logos associés demeurent notre propriété et ne peuvent être utilisés d'une manière laissant entendre une approbation ou une affiliation sans notre autorisation écrite préalable.</p>

<h2>5. Comptes et utilisation acceptable</h2>
<p>Si vous créez un compte, vous êtes responsable de la protection de vos identifiants et de toute activité effectuée à partir de votre compte, et vous vous engagez à nous aviser rapidement de toute utilisation non autorisée. Vous vous engagez à ne pas détourner les Services, notamment en tentant de les perturber, d'y accéder sans autorisation ou de les utiliser à des fins illégales.</p>

<h2>6. Absence de garantie</h2>
<p>Comme l'énonce l'article 15 de l'AGPL-3.0, le logiciel est fourni « tel quel », sans garantie d'aucune sorte, expresse ou implicite, y compris, sans s'y limiter, les garanties implicites de qualité marchande et d'adéquation à un usage particulier. Vous assumez l'entièreté du risque quant à la qualité et au rendement du logiciel.</p>

<h2>7. Limitation de responsabilité</h2>
<p>Comme l'énonce l'article 16 de l'AGPL-3.0, et dans toute la mesure permise par la loi applicable, en aucun cas un titulaire de droits d'auteur ou toute autre partie qui modifie ou transmet le logiciel ne saurait être tenu responsable envers vous de dommages, y compris tout dommage général, spécial, accessoire ou consécutif découlant de l'utilisation ou de l'impossibilité d'utiliser le logiciel.</p>

<h2>8. Droit applicable</h2>
<p>Les présentes conditions sont régies par les lois de la province de Québec et les lois fédérales du Canada qui y sont applicables, sans égard aux règles de conflit de lois. Rien dans les présentes conditions ne limite les droits impératifs de protection du consommateur dont vous pourriez bénéficier en vertu de ces lois.</p>

<h2>9. Modifications</h2>
<p>Nous pouvons réviser ces conditions de temps à autre. Les changements importants seront communiqués au moyen des Services, et l'utilisation continue des Services après leur entrée en vigueur vaut acceptation.</p>

<h2>10. Nous joindre</h2>
<p>Des questions sur ces conditions ? Contactez NextBlock™ CMS à <a href="mailto:privacy@nextblock.dev">privacy@nextblock.dev</a>.</p>
$html$), 0);
  END IF;

  RAISE NOTICE 'Seeded privacy-policy and terms-of-service pages.';
END;
$seed$;

-- ---------------------------------------------------------------------------
-- 7. UI translations introduced with this feature
-- ---------------------------------------------------------------------------
INSERT INTO public.translations (key, translations) VALUES
  ('remember_this_device', '{"en": "Remember this device", "fr": "Se souvenir de cet appareil"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

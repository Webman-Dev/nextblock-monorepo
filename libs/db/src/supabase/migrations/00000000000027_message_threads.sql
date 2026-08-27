-- Private conversations with anonymous visitors, and the end of the exposed form address.
--
-- Two problems, one shape.
--
-- FIRST: a contact-form block stores its destination address in the block's own
-- content, and `FormBlockRenderer` is a "use client" component that receives that
-- content wholesale. Everything crossing that boundary is serialized into the RSC
-- payload, so the shop owner's inbox is published in the markup of every page
-- carrying a form. `form_endpoints` moves the address server-side and leaves behind a
-- `form_key` — an opaque handle that grants nothing and is safe to serialize.
--
-- SECOND: a visitor who sends a message has nowhere to receive an answer. They are
-- anonymous — `cms_interactions` cannot hold them, because its `user_id` is NOT NULL
-- with a foreign key to `profiles`. So this is a separate lane: `message_threads` plus
-- `thread_messages`, reached by a tokenised link rather than an account.
--
-- WHY REVIEWS AND COMMENTS ARE NOT HERE. They are already public, already tied to a
-- registered account, and a staff answer to them is published content, not a private
-- reply. That lane stays in `cms_interactions` and is handled by migration 28. One
-- inbox reads both; the storage stays honest about the difference.
--
-- SECURITY POSTURE. Rows hold visitor PII (name, email, free text) and a masked IP.
-- There is NO anon grant and NO anon policy: the tokenised visitor page verifies the
-- token in application code and then reads with the service role, the same posture the
-- MCP token route takes against `mcp_access_tokens`. ADMINs read; nobody else does.
--
-- `token_hash` stores only a SHA-256 of the visitor's token. The plaintext exists long
-- enough to be placed in one outbound email and is never written down. A token is
-- minted on the FIRST ADMIN REPLY, never at submission — a store that receives a
-- hundred enquiries and answers three has three live credentials, not a hundred.
--
-- `source` is a text column with a CHECK rather than an enum, deliberately.
-- `interaction_type` in this same schema is the cautionary tale: a two-value enum
-- guarded by an exhaustive CHECK, where adding a third value needs ALTER TYPE ... ADD
-- VALUE — and PostgreSQL forbids using a value added in the transaction that added it,
-- which is exactly one migration file. A CHECK is replaceable in one statement.
--
-- Forward-only and idempotent.

-- ---------------------------------------------------------------------------
-- 1. form_endpoints — where a contact-form block's mail goes, and what its fields
--    are called. `fields` is a SERVER-SIDE snapshot of the field manifest so the
--    notification email renders labels the browser did not supply; the same rule
--    the product-enquiry action follows when it looks the product title up itself.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_endpoints (
    form_key uuid NOT NULL,
    label text DEFAULT 'Contact form' NOT NULL,
    -- NULL/empty means "fall back to the resolver ladder", like store_contact.
    recipient_email text,
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT form_endpoints_pkey PRIMARY KEY (form_key),
    CONSTRAINT form_endpoints_label_not_blank CHECK ((char_length(btrim(label)) > 0)),
    CONSTRAINT form_endpoints_fields_array CHECK ((jsonb_typeof(fields) = 'array'))
);

COMMENT ON TABLE public.form_endpoints IS 'Server-side destination and field manifest for a contact-form block, keyed by the non-secret form_key carried in block content. The address never reaches the browser.';

COMMENT ON COLUMN public.form_endpoints.form_key IS 'Non-secret opaque handle. Safe in the RSC payload: it grants nothing, it is only a lookup key.';

COMMENT ON COLUMN public.form_endpoints.fields IS 'Snapshot of [{temp_id,label,field_type}] written by the CMS editor, so labels in emails and the inbox are server-trusted.';

DROP TRIGGER IF EXISTS set_form_endpoints_updated_at ON public.form_endpoints;
CREATE TRIGGER set_form_endpoints_updated_at BEFORE UPDATE ON public.form_endpoints
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.form_endpoints ENABLE ROW LEVEL SECURITY;

-- anon deliberately absent: the public submit path goes through the service role.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.form_endpoints TO authenticated;
GRANT ALL ON TABLE public.form_endpoints TO service_role;

DROP POLICY IF EXISTS form_endpoints_editor_read_policy ON public.form_endpoints;
CREATE POLICY form_endpoints_editor_read_policy ON public.form_endpoints FOR SELECT TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = ANY (ARRAY['ADMIN'::public.user_role, 'WRITER'::public.user_role])));

DROP POLICY IF EXISTS form_endpoints_admin_write_policy ON public.form_endpoints;
CREATE POLICY form_endpoints_admin_write_policy ON public.form_endpoints FOR ALL TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role)) WITH CHECK ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS form_endpoints_service_role_policy ON public.form_endpoints;
CREATE POLICY form_endpoints_service_role_policy ON public.form_endpoints TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. message_threads — the private-lane spine and the only home of a thread token.
--    `subject_id` and `form_key` are PLAIN uuids with NO foreign key: a conversation
--    outlives the product or the form block it started from.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    -- product_inquiries.id when source = 'product_inquiry'.
    subject_id uuid,
    -- form_endpoints.form_key when source = 'contact_form'.
    form_key uuid,
    -- Denormalised so a deleted product or removed form block stays identifiable.
    subject_label text DEFAULT 'Message' NOT NULL,
    sender_name text,
    -- NULL when a contact form collected no email field. Such a thread can never be
    -- answered, and the CMS says so rather than failing silently at reply time.
    sender_email text,
    locale text,
    -- Submitted field map for a contact form: {temp_id: value}.
    fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'open' NOT NULL,
    unread_for_admin boolean DEFAULT true NOT NULL,
    unread_for_visitor boolean DEFAULT false NOT NULL,
    -- SHA-256 hex of the visitor's token; NULL until the first admin reply.
    token_hash text,
    token_expires_at timestamp with time zone,
    token_revoked_at timestamp with time zone,
    token_last_used_at timestamp with time zone,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_masked text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_threads_pkey PRIMARY KEY (id),
    CONSTRAINT message_threads_token_hash_key UNIQUE (token_hash),
    CONSTRAINT message_threads_source_check
        CHECK ((source = ANY (ARRAY['product_inquiry'::text, 'contact_form'::text]))),
    CONSTRAINT message_threads_status_check
        CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text]))),
    CONSTRAINT message_threads_subject_check CHECK (
        (((source = 'product_inquiry'::text) AND (subject_id IS NOT NULL)) OR
         ((source = 'contact_form'::text) AND (form_key IS NOT NULL)))),
    CONSTRAINT message_threads_fields_object CHECK ((jsonb_typeof(fields) = 'object'))
);

COMMENT ON TABLE public.message_threads IS 'Private conversations with anonymous visitors (product enquiries and contact-form submissions). Written by the service role from public server actions; read by ADMINs only. Public reviews and comments are NOT here - they live in cms_interactions.';

COMMENT ON COLUMN public.message_threads.token_hash IS 'SHA-256 hex of the visitor thread token. The raw token is never stored; it is minted on the first admin reply and mailed once.';

COMMENT ON COLUMN public.message_threads.subject_id IS 'product_inquiries.id. Plain uuid, no FK: a conversation outlives the enquiry record it grew from.';

CREATE INDEX IF NOT EXISTS message_threads_last_message_idx
    ON public.message_threads USING btree (last_message_at DESC);

CREATE INDEX IF NOT EXISTS message_threads_source_last_idx
    ON public.message_threads USING btree (source, last_message_at DESC);

-- Backs the CMS nav unread badge without scanning read history.
CREATE INDEX IF NOT EXISTS message_threads_unread_idx
    ON public.message_threads USING btree (last_message_at DESC)
    WHERE (unread_for_admin = true);

-- Idempotent backfill / dedupe of enquiry threads.
CREATE INDEX IF NOT EXISTS message_threads_subject_idx
    ON public.message_threads USING btree (subject_id) WHERE (subject_id IS NOT NULL);

-- No separate token index: message_threads_token_hash_key is already the unique
-- btree the /thread lookup probes.

DROP TRIGGER IF EXISTS set_message_threads_updated_at ON public.message_threads;
CREATE TRIGGER set_message_threads_updated_at BEFORE UPDATE ON public.message_threads
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON TABLE public.message_threads TO authenticated;
GRANT ALL ON TABLE public.message_threads TO service_role;

DROP POLICY IF EXISTS message_threads_admin_read_policy ON public.message_threads;
CREATE POLICY message_threads_admin_read_policy ON public.message_threads FOR SELECT TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS message_threads_admin_update_policy ON public.message_threads;
CREATE POLICY message_threads_admin_update_policy ON public.message_threads FOR UPDATE TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role)) WITH CHECK ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS message_threads_service_role_policy ON public.message_threads;
CREATE POLICY message_threads_service_role_policy ON public.message_threads TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. thread_messages — one turn of a private conversation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.thread_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    direction text NOT NULL,
    body text NOT NULL,
    -- profiles.id for an outbound reply. No FK: a departing admin must not take the
    -- conversation with them.
    author_id uuid,
    author_name text,
    -- False when SMTP was unconfigured or the send failed. sendEmail() throws when
    -- unconfigured, so this row - not the mail - is the record.
    email_delivered boolean DEFAULT false NOT NULL,
    email_error text,
    ip_masked text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT thread_messages_pkey PRIMARY KEY (id),
    CONSTRAINT thread_messages_direction_check
        CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT thread_messages_body_not_blank CHECK ((char_length(btrim(body)) > 0))
);

COMMENT ON TABLE public.thread_messages IS 'Turns of a private conversation. Content is append-only; only the delivery flags may change after insert.';

-- A real foreign key here, unlike the outward pointers above: a message has no
-- meaning without its thread.
DO $rb$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'thread_messages_thread_id_fkey'
                   AND conrelid = 'public.thread_messages'::regclass) THEN
    ALTER TABLE ONLY public.thread_messages
      ADD CONSTRAINT thread_messages_thread_id_fkey FOREIGN KEY (thread_id)
      REFERENCES public.message_threads(id) ON DELETE CASCADE;
  END IF;
END $rb$;

CREATE INDEX IF NOT EXISTS thread_messages_thread_created_idx
    ON public.thread_messages USING btree (thread_id, created_at);

-- Backs the per-IP reply throttle on the public thread page.
CREATE INDEX IF NOT EXISTS thread_messages_ip_created_idx
    ON public.thread_messages USING btree (ip_masked, created_at DESC);

-- Message TEXT is append-only — not the whole row, because email_delivered has to be
-- settable after the send completes. The trigger blocks rewrites of the load-bearing
-- columns only, and it binds the service role too, which otherwise bypasses RLS.
CREATE OR REPLACE FUNCTION public.prevent_thread_message_rewrite() RETURNS trigger
    LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'thread_messages is append-only; DELETE is not permitted'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body
     OR NEW.direction IS DISTINCT FROM OLD.direction
     OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'thread_messages content is append-only; only delivery flags may change'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_thread_messages_append_only ON public.thread_messages;
CREATE TRIGGER trg_thread_messages_append_only BEFORE UPDATE OR DELETE ON public.thread_messages
    FOR EACH ROW EXECUTE FUNCTION public.prevent_thread_message_rewrite();

-- NB: the ON DELETE CASCADE above fires this trigger, so deleting a thread is
-- impossible by design. "Delete" in the CMS means status='closed' plus a revoked
-- token, and the UI says so.

ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.thread_messages TO authenticated;
GRANT ALL ON TABLE public.thread_messages TO service_role;

DROP POLICY IF EXISTS thread_messages_admin_read_policy ON public.thread_messages;
CREATE POLICY thread_messages_admin_read_policy ON public.thread_messages FOR SELECT TO authenticated USING ((( SELECT public.get_current_user_role() AS get_current_user_role) = 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS thread_messages_service_role_policy ON public.thread_messages;
CREATE POLICY thread_messages_service_role_policy ON public.thread_messages TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. Backfill: every existing enquiry becomes a thread whose first inbound turn is
--    the original message. product_inquiries is KEPT and kept written — it is the
--    enquiry's own record and owns the ip_masked the submission throttle counts.
--    The thread is a conversation ABOUT the enquiry, not a replacement for it.
-- ---------------------------------------------------------------------------
INSERT INTO public.message_threads
  (source, subject_id, subject_label, sender_name, sender_email, locale,
   ip_masked, user_agent, unread_for_admin, status, last_message_at, created_at)
SELECT 'product_inquiry', i.id, COALESCE(i.product_title, 'Product enquiry'),
       i.sender_name, i.sender_email, i.locale, i.ip_masked, i.user_agent,
       NOT i.is_resolved, CASE WHEN i.is_resolved THEN 'closed' ELSE 'open' END,
       i.created_at, i.created_at
FROM public.product_inquiries i
WHERE NOT EXISTS (SELECT 1 FROM public.message_threads t WHERE t.subject_id = i.id);

INSERT INTO public.thread_messages (thread_id, direction, body, email_delivered, ip_masked, created_at)
SELECT t.id, 'inbound', i.message, i.email_delivered, i.ip_masked, i.created_at
FROM public.product_inquiries i
JOIN public.message_threads t ON t.subject_id = i.id
WHERE NOT EXISTS (SELECT 1 FROM public.thread_messages m WHERE m.thread_id = t.id);

-- ---------------------------------------------------------------------------
-- 5. The form-block data migration.
--    Rewrites every stored form block: mints a form_key, moves recipient_email into
--    form_endpoints, snapshots the field manifest, and DELETES recipient_email from
--    the jsonb. Three shapes have to be handled, because a form nested inside a
--    section has no blocks row of its own — it lives in the section's content:
--      a) blocks.content where block_type = 'form'
--      b) blocks.content where block_type = 'section' (column_blocks, slides)
--      c) content_drafts.blocks / product_drafts.blocks (jsonb arrays of snapshots)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nb_migrate_form_columns(p_cols jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SET search_path = '' AS $fn$
DECLARE v_col jsonb; v_blk jsonb; v_new_cols jsonb := '[]'::jsonb; v_new_col jsonb;
BEGIN
  FOR v_col IN SELECT * FROM jsonb_array_elements(p_cols) LOOP
    v_new_col := '[]'::jsonb;
    FOR v_blk IN SELECT * FROM jsonb_array_elements(coalesce(v_col, '[]'::jsonb)) LOOP
      v_new_col := v_new_col || jsonb_build_array(
        v_blk || jsonb_build_object('content', public.nb_migrate_form_content(v_blk->'content')));
    END LOOP;
    v_new_cols := v_new_cols || jsonb_build_array(v_new_col);
  END LOOP;
  RETURN v_new_cols;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.nb_migrate_form_content(p_content jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SET search_path = '' AS $fn$
DECLARE
  v_key uuid; v_email text; v_fields jsonb; v_slide jsonb; v_new_slides jsonb;
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content) <> 'object' THEN
    RETURN p_content;
  END IF;

  -- Leaf: this object IS a form block's content.
  IF (p_content ? 'recipient_email') AND (p_content ? 'fields') THEN
    v_key   := gen_random_uuid();
    v_email := nullif(btrim(coalesce(p_content->>'recipient_email','')), '');
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'temp_id', f->>'temp_id', 'label', f->>'label', 'field_type', f->>'field_type')), '[]'::jsonb)
      INTO v_fields
      FROM jsonb_array_elements(coalesce(p_content->'fields', '[]'::jsonb)) f;
    INSERT INTO public.form_endpoints (form_key, label, recipient_email, fields)
    VALUES (v_key, 'Contact form', v_email, v_fields)
    ON CONFLICT (form_key) DO NOTHING;
    RETURN (p_content - 'recipient_email') || jsonb_build_object('form_key', v_key::text);
  END IF;

  -- Container: a section's slides, each with column_blocks.
  IF (p_content ? 'slides') AND jsonb_typeof(p_content->'slides') = 'array' THEN
    v_new_slides := '[]'::jsonb;
    FOR v_slide IN SELECT * FROM jsonb_array_elements(p_content->'slides') LOOP
      v_new_slides := v_new_slides || jsonb_build_array(
        v_slide || jsonb_build_object('column_blocks',
          public.nb_migrate_form_columns(coalesce(v_slide->'column_blocks','[]'::jsonb))));
    END LOOP;
    p_content := p_content || jsonb_build_object('slides', v_new_slides);
  END IF;

  -- Container: a standard section's column_blocks.
  IF (p_content ? 'column_blocks') AND jsonb_typeof(p_content->'column_blocks') = 'array' THEN
    p_content := p_content || jsonb_build_object('column_blocks',
      public.nb_migrate_form_columns(p_content->'column_blocks'));
  END IF;

  RETURN p_content;
END;
$fn$;

-- The LIKE guard keeps this from rewriting (and bumping updated_at on) every block.
UPDATE public.blocks
   SET content = public.nb_migrate_form_content(content)
 WHERE content::text LIKE '%recipient_email%';

UPDATE public.content_drafts d
   SET blocks = (SELECT coalesce(jsonb_agg(b || jsonb_build_object(
                          'content', public.nb_migrate_form_content(b->'content'))), '[]'::jsonb)
                 FROM jsonb_array_elements(d.blocks) b)
 WHERE d.blocks::text LIKE '%recipient_email%';

UPDATE public.product_drafts d
   SET blocks = (SELECT coalesce(jsonb_agg(b || jsonb_build_object(
                          'content', public.nb_migrate_form_content(b->'content'))), '[]'::jsonb)
                 FROM jsonb_array_elements(d.blocks) b)
 WHERE d.blocks::text LIKE '%recipient_email%';

-- One-shot helpers. Dropping them keeps the public schema (and db:types) clean.
DROP FUNCTION IF EXISTS public.nb_migrate_form_content(jsonb);
DROP FUNCTION IF EXISTS public.nb_migrate_form_columns(jsonb);

-- ---------------------------------------------------------------------------
-- 6. Seeds. Thread-page copy is public-facing so it must be translatable; the
--    components pass an English literal as the fallback, so an install that never
--    runs this seed still renders correctly.
-- ---------------------------------------------------------------------------
INSERT INTO public.site_settings (key, value)
VALUES ('forms_contact', '{"contactEmail": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.translations (key, translations, created_at, updated_at) VALUES
  ('thread.heading', '{"en": "Your conversation", "fr": "Votre conversation"}', now(), now()),
  ('thread.reply_label', '{"en": "Write a reply", "fr": "Écrire une réponse"}', now(), now()),
  ('thread.send', '{"en": "Send reply", "fr": "Envoyer la réponse"}', now(), now()),
  ('thread.sending', '{"en": "Sending...", "fr": "Envoi..."}', now(), now()),
  ('thread.sent', '{"en": "Thanks - your reply has been sent.", "fr": "Merci - votre réponse a été envoyée."}', now(), now()),
  ('thread.error', '{"en": "Sorry, your reply couldn''t be sent. Please try again in a moment.", "fr": "Désolé, votre réponse n''a pas pu être envoyée. Veuillez réessayer dans un instant."}', now(), now()),
  ('thread.throttled', '{"en": "You''ve sent several replies already. Please wait a few minutes.", "fr": "Vous avez déjà envoyé plusieurs réponses. Veuillez patienter quelques minutes."}', now(), now()),
  ('thread.closed', '{"en": "This conversation has been closed.", "fr": "Cette conversation est fermée."}', now(), now()),
  ('thread.invalid', '{"en": "This link has expired or is no longer valid. If you still need help, please contact us again from our website.", "fr": "Ce lien a expiré ou n''est plus valide. Si vous avez encore besoin d''aide, contactez-nous de nouveau depuis notre site."}', now(), now()),
  ('thread.you', '{"en": "You", "fr": "Vous"}', now(), now()),
  ('forms.submission_stored', '{"en": "Thanks - your message has been received.", "fr": "Merci - votre message a bien été reçu."}', now(), now())
ON CONFLICT (key) DO NOTHING;

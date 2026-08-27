-- Staff replies on reviews and post comments, and the indexes cms_interactions never had.
--
-- WHY THIS IS A DIFFERENT SHAPE FROM MIGRATION 27, AND WHY IT NEEDS NO TOKEN.
-- `cms_interactions.user_id` is NOT NULL with a foreign key to `profiles`: every review
-- and comment already comes from a signed-in account with a reachable address, and the
-- content already renders publicly on /product/{slug} and /article/{slug}. A staff
-- answer there is PUBLISHED CONTENT plus moderation, not a private conversation.
-- Routing it through the tokenised thread page would hide a public reply behind a
-- secret link. So: one inbox in the CMS, two storage models underneath.
--
-- THE ONE CONSTRAINT THAT DICTATES THE MODELLING.
-- `check_rating_only_for_review` is an exhaustive OR over ('review','comment'):
--     (type='review' AND rating IS NOT NULL AND rating BETWEEN 1 AND 5)
--  OR (type='comment' AND rating IS NULL)
-- A type='review' row with a NULL rating is rejected, so a reply to a review cannot be
-- a 'review' row. Adding a 'reply' value to interaction_type would ALSO violate it —
-- the OR covers no third value — and PostgreSQL forbids using an enum value in the
-- transaction that added it, which is exactly one migration file.
--
-- THEREFORE a reply is a `type='comment'` row carrying the PARENT's target and a NULL
-- rating: a combination the existing constraints already accept, unchanged. The bonus
-- is decisive — `update_product_ratings()` aggregates only
--   WHERE product_id = ? AND type='review' AND status='approved'
-- so a reply can never move products.average_rating or products.total_reviews. The new
-- CHECK below pins that invariant in the schema instead of trusting the action to
-- remember it.
--
-- No new policies are needed. `cms_interactions_insert_policy` already admits an
-- ADMIN/WRITER self-insert with status='approved'
--   (auth.uid() = user_id AND (status='pending' OR role IN ('ADMIN','WRITER')))
-- which is precisely a published staff reply.
--
-- Forward-only and idempotent.

ALTER TABLE public.cms_interactions ADD COLUMN IF NOT EXISTS parent_id uuid;

COMMENT ON COLUMN public.cms_interactions.parent_id IS 'Set on a staff reply: points at the review or comment being answered. Replies are always type=comment with a NULL rating, and carry the parent''s product_id/post_id so check_product_or_post still holds.';

DO $rb$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'cms_interactions_parent_id_fkey'
                   AND conrelid = 'public.cms_interactions'::regclass) THEN
    ALTER TABLE ONLY public.cms_interactions
      ADD CONSTRAINT cms_interactions_parent_id_fkey FOREIGN KEY (parent_id)
      REFERENCES public.cms_interactions(id) ON DELETE CASCADE;
  END IF;
END $rb$;

-- One level only, never itself, no rating, always a comment. Keeps the reply
-- invisible to the ratings trigger and to the existing storefront review query.
DO $rb$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'cms_interactions_reply_check'
                   AND conrelid = 'public.cms_interactions'::regclass) THEN
    ALTER TABLE public.cms_interactions
      ADD CONSTRAINT cms_interactions_reply_check CHECK (
        ((parent_id IS NULL) OR
         ((parent_id <> id) AND (rating IS NULL) AND (type = 'comment'::public.interaction_type))));
  END IF;
END $rb$;

-- Fetch every reply for a page of parents in one probe.
CREATE INDEX IF NOT EXISTS cms_interactions_parent_idx
    ON public.cms_interactions USING btree (parent_id, created_at)
    WHERE (parent_id IS NOT NULL);

-- cms_interactions has had ZERO secondary indexes since the baseline, while both
-- public renderers filter on exactly these predicates on every product and article
-- page. The inbox multiplies read volume on this table, so they go in now.
CREATE INDEX IF NOT EXISTS cms_interactions_product_type_status_idx
    ON public.cms_interactions USING btree (product_id, type, status, created_at DESC)
    WHERE (product_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS cms_interactions_post_type_status_idx
    ON public.cms_interactions USING btree (post_id, type, status, created_at DESC)
    WHERE (post_id IS NOT NULL);

-- Inbox listing: newest top-level items, replies excluded.
CREATE INDEX IF NOT EXISTS cms_interactions_inbox_idx
    ON public.cms_interactions USING btree (created_at DESC)
    WHERE (parent_id IS NULL);

INSERT INTO public.translations (key, translations, created_at, updated_at) VALUES
  ('interactions.staff_reply', '{"en": "Reply from the team", "fr": "Réponse de l''équipe"}', now(), now()),
  ('interactions.staff_badge', '{"en": "Staff", "fr": "Équipe"}', now(), now())
ON CONFLICT (key) DO NOTHING;

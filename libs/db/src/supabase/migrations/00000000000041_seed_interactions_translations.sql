-- 00000000000041_seed_interactions_translations.sql
-- Adds translation strings for Product Reviews and Post Comments storefront modules.

BEGIN;

INSERT INTO public.translations (key, translations)
VALUES
  (
    'reviews.customer_reviews',
    '{"en": "Customer Reviews", "fr": "Avis clients"}'::jsonb
  ),
  (
    'reviews.share_thoughts',
    '{"en": "Share your thoughts and experience with this product.", "fr": "Partagez vos impressions et votre expérience avec ce produit."}'::jsonb
  ),
  (
    'reviews.write_review',
    '{"en": "Write a Review", "fr": "Rédiger un avis"}'::jsonb
  ),
  (
    'reviews.cancel_review',
    '{"en": "Cancel Review", "fr": "Annuler l''avis"}'::jsonb
  ),
  (
    'reviews.login_to_write',
    '{"en": "Please log in to write a review.", "fr": "Veuillez vous connecter pour rédiger un avis."}'::jsonb
  ),
  (
    'reviews.write_your_review',
    '{"en": "Write your review", "fr": "Rédigez votre avis"}'::jsonb
  ),
  (
    'reviews.rating',
    '{"en": "Rating", "fr": "Note"}'::jsonb
  ),
  (
    'reviews.description',
    '{"en": "Review Description", "fr": "Description de l''avis"}'::jsonb
  ),
  (
    'reviews.description_placeholder',
    '{"en": "What did you like or dislike? How does it perform?", "fr": "Qu''avez-vous aimé ou déploré ? Comment se comporte-t-il ?"}'::jsonb
  ),
  (
    'reviews.submit_review',
    '{"en": "Submit Review", "fr": "Soumettre l''avis"}'::jsonb
  ),
  (
    'reviews.submitting',
    '{"en": "Submitting...", "fr": "Envoi en cours..."}'::jsonb
  ),
  (
    'reviews.success_pending',
    '{"en": "Your review has been submitted successfully and is pending moderation.", "fr": "Votre avis a été soumis avec succès et est en attente de modération."}'::jsonb
  ),
  (
    'reviews.cancel',
    '{"en": "Cancel", "fr": "Annuler"}'::jsonb
  ),
  (
    'reviews.helpful',
    '{"en": "Helpful", "fr": "Utile"}'::jsonb
  ),
  (
    'reviews.no_reviews',
    '{"en": "No reviews yet", "fr": "Aucun avis pour le moment"}'::jsonb
  ),
  (
    'reviews.be_the_first',
    '{"en": "There are no reviews for this product yet. Be the first to write one!", "fr": "Il n''y a pas encore d''avis sur ce produit. Soyez le premier à en rédiger un !"}'::jsonb
  ),
  (
    'reviews.load_more',
    '{"en": "Load More Reviews", "fr": "Charger plus d''avis"}'::jsonb
  ),
  (
    'reviews.review_count_one',
    '{"en": "{count} review", "fr": "{count} avis"}'::jsonb
  ),
  (
    'reviews.review_count_other',
    '{"en": "{count} reviews", "fr": "{count} avis"}'::jsonb
  ),
  (
    'comments.discussion',
    '{"en": "Discussion & Comments", "fr": "Discussion & Commentaires"}'::jsonb
  ),
  (
    'comments.join_conversation',
    '{"en": "Join the conversation and express your thoughts.", "fr": "Rejoignez la conversation et exprimez vos pensées."}'::jsonb
  ),
  (
    'comments.write_comment',
    '{"en": "Write a Comment", "fr": "Écrire un commentaire"}'::jsonb
  ),
  (
    'comments.cancel_comment',
    '{"en": "Cancel Comment", "fr": "Annuler le commentaire"}'::jsonb
  ),
  (
    'comments.login_to_write',
    '{"en": "Please log in to write a comment.", "fr": "Veuillez vous connecter pour écrire un commentaire."}'::jsonb
  ),
  (
    'comments.join_discussion',
    '{"en": "Join the Discussion", "fr": "Rejoindre la discussion"}'::jsonb
  ),
  (
    'comments.your_message',
    '{"en": "Your Message", "fr": "Votre message"}'::jsonb
  ),
  (
    'comments.message_placeholder',
    '{"en": "What are your thoughts on this article?", "fr": "Quelles sont vos pensées sur cet article ?"}'::jsonb
  ),
  (
    'comments.post_comment',
    '{"en": "Post Comment", "fr": "Publier le commentaire"}'::jsonb
  ),
  (
    'comments.success_pending',
    '{"en": "Your comment has been submitted successfully and is pending moderation.", "fr": "Votre commentaire a été soumis avec succès et est en attente de modération."}'::jsonb
  ),
  (
    'comments.like',
    '{"en": "Like", "fr": "J''aime"}'::jsonb
  ),
  (
    'comments.no_comments',
    '{"en": "No comments yet", "fr": "Aucun commentaire pour le moment"}'::jsonb
  ),
  (
    'comments.be_the_first',
    '{"en": "Be the first to share your thoughts!", "fr": "Soyez le premier à partager vos pensées !"}'::jsonb
  ),
  (
    'comments.load_more',
    '{"en": "Load More Comments", "fr": "Charger plus de commentaires"}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET 
  translations = EXCLUDED.translations,
  updated_at = now();

COMMIT;

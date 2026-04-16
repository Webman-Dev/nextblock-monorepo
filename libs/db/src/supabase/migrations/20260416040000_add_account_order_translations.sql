-- 20260416040000_add_account_order_translations.sql
-- Adds storefront account navigation, customer order, and password translations.

BEGIN;

INSERT INTO public.translations (key, translations)
VALUES
  (
    'account_navigation',
    '{"en": "Account", "fr": "Compte"}'::jsonb
  ),
  (
    'account_orders',
    '{"en": "Orders", "fr": "Commandes"}'::jsonb
  ),
  (
    'change_my_password',
    '{"en": "Change my password", "fr": "Changer mon mot de passe"}'::jsonb
  ),
  (
    'profile_orders_title',
    '{"en": "My orders", "fr": "Mes commandes"}'::jsonb
  ),
  (
    'profile_orders_description',
    '{"en": "Review your recent purchases and open printable invoices.", "fr": "Consultez vos achats récents et ouvrez vos factures imprimables."}'::jsonb
  ),
  (
    'profile_orders_empty',
    '{"en": "You do not have any orders yet.", "fr": "Vous n''avez pas encore de commandes."}'::jsonb
  ),
  (
    'profile_order_detail_title',
    '{"en": "Order invoice", "fr": "Facture de commande"}'::jsonb
  ),
  (
    'profile_order_detail_description',
    '{"en": "Review and print your finalized invoice.", "fr": "Consultez et imprimez votre facture finalisée."}'::jsonb
  ),
  (
    'profile_order_invoice_pending',
    '{"en": "The printable invoice will appear here once this order has been finalized.", "fr": "La facture imprimable apparaîtra ici une fois que cette commande aura été finalisée."}'::jsonb
  ),
  (
    'profile_password_title',
    '{"en": "Change your password", "fr": "Changer votre mot de passe"}'::jsonb
  ),
  (
    'profile_password_description',
    '{"en": "Update your account password without leaving your profile.", "fr": "Mettez à jour le mot de passe de votre compte sans quitter votre profil."}'::jsonb
  ),
  (
    'new_password',
    '{"en": "New password", "fr": "Nouveau mot de passe"}'::jsonb
  ),
  (
    'confirm_new_password',
    '{"en": "Confirm new password", "fr": "Confirmer le nouveau mot de passe"}'::jsonb
  ),
  (
    'password_updated_success',
    '{"en": "Password updated successfully.", "fr": "Mot de passe mis à jour avec succès."}'::jsonb
  ),
  (
    'password_update_failed',
    '{"en": "Password update failed.", "fr": "La mise à jour du mot de passe a échoué."}'::jsonb
  ),
  (
    'passwords_do_not_match',
    '{"en": "Passwords do not match.", "fr": "Les mots de passe ne correspondent pas."}'::jsonb
  ),
  (
    'order_date',
    '{"en": "Date", "fr": "Date"}'::jsonb
  ),
  (
    'order_status_paid',
    '{"en": "Paid", "fr": "Payée"}'::jsonb
  ),
  (
    'order_status_pending',
    '{"en": "Pending", "fr": "En attente"}'::jsonb
  ),
  (
    'order_status_shipped',
    '{"en": "Shipped", "fr": "Expédiée"}'::jsonb
  ),
  (
    'order_status_cancelled',
    '{"en": "Cancelled", "fr": "Annulée"}'::jsonb
  ),
  (
    'order_status_refunded',
    '{"en": "Refunded", "fr": "Remboursée"}'::jsonb
  ),
  (
    'back_to_orders',
    '{"en": "Back to orders", "fr": "Retour aux commandes"}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET translations = EXCLUDED.translations;

COMMIT;

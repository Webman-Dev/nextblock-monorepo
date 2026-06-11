-- Expose the JWT secret to Postgres as a database GUC, matching Supabase's setup. PostgREST
-- already validates JWTs via PGRST_JWT_SECRET; this keeps any SQL that reads
-- current_setting('app.settings.jwt_secret') working too. Runs once on first init.
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXP"`

alter database postgres set "app.settings.jwt_secret" to :'jwt_secret';
alter database postgres set "app.settings.jwt_exp" to :'jwt_exp';

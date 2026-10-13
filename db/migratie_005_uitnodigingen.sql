-- Uitnodigingen: freelancers uit de aanmeldingen-Sheet klaarzetten (onzichtbaar) tot ze zelf activeren
alter table accounts drop constraint if exists accounts_status_check;
alter table accounts add constraint accounts_status_check check (status in ('actief','geblokkeerd','uitgenodigd'));
alter table accounts add column if not exists uitgenodigd_op timestamptz;
alter table accounts add column if not exists bron text;
alter table tokens drop constraint if exists tokens_soort_check;
alter table tokens add constraint tokens_soort_check check (soort in ('email_bevestigen','wachtwoord_reset','uitnodiging'));

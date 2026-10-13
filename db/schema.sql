-- Holland Recruitment freelanceplatform v1 — schema
-- Alle toegang loopt server-side (Next.js) met expliciete autorisatie in src/lib.
-- RLS staat AAN zonder policies: directe toegang met anon/authenticated keys is daardoor geblokkeerd.

-- gen_random_uuid() is ingebouwd vanaf Postgres 13

-- ---------- referentie ----------
create table if not exists vakgebieden (
  slug text primary key,
  naam text not null,
  volgorde int not null
);

-- ---------- accounts ----------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  rol text not null check (rol in ('freelancer','bedrijf','beheer')),
  email text not null,
  email_bevestigd boolean not null default false,
  wachtwoord_hash text not null,
  voornaam text not null default '',
  achternaam text not null default '',
  telefoon text,
  status text not null default 'actief' check (status in ('actief','geblokkeerd')),
  blok_reden text,
  meldingen jsonb not null default '{"nieuw_bericht":true,"reactie":true,"opdracht_status":true,"bewaarde_zoekopdracht":true}',
  aangemaakt timestamptz not null default now(),
  laatst_actief timestamptz
);
create unique index if not exists accounts_email_uniek on accounts (lower(email));

create table if not exists sessies (
  token_hash text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  aangemaakt timestamptz not null default now(),
  verloopt timestamptz not null
);
create index if not exists sessies_account on sessies(account_id);

create table if not exists tokens (
  token_hash text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  soort text not null check (soort in ('email_bevestigen','wachtwoord_reset')),
  verloopt timestamptz not null,
  gebruikt timestamptz
);

-- ---------- freelancers ----------
create table if not exists freelancers (
  id uuid primary key references accounts(id) on delete cascade,
  slug text not null unique,
  functietitel text not null default '',
  vakgebied text references vakgebieden(slug),
  regio text not null default '',
  introductie text not null default '',
  uurtarief int check (uurtarief is null or uurtarief between 10 and 500),
  jaren_ervaring int check (jaren_ervaring is null or jaren_ervaring between 0 and 60),
  beschikbaarheid text not null default 'nu' check (beschikbaarheid in ('nu','vanaf','periode','niet')),
  beschikbaar_vanaf date,
  beschikbaar_tot date,
  uren_per_week int check (uren_per_week is null or uren_per_week between 1 and 60),
  werkvormen text[] not null default '{}',
  vaardigheden text[] not null default '{}',
  certificeringen text[] not null default '{}',
  sectoren text[] not null default '{}',
  talen text[] not null default '{}',
  cv_pad text,
  cv_naam text,
  foto_pad text,
  zichtbaar_tarief text not null default 'publiek' check (zichtbaar_tarief in ('publiek','na_contact','verborgen')),
  zichtbaar_werkervaring text not null default 'publiek' check (zichtbaar_werkervaring in ('publiek','na_contact','verborgen')),
  zichtbaar_cv text not null default 'na_contact' check (zichtbaar_cv in ('publiek','na_contact','verborgen')),
  vindbaar_google boolean not null default true,
  ook_bemiddeld boolean not null default false,
  bijgewerkt timestamptz not null default now(),
  constraint periode_volgorde check (beschikbaar_tot is null or beschikbaar_vanaf is null or beschikbaar_tot >= beschikbaar_vanaf)
);
create index if not exists freelancers_vakgebied on freelancers(vakgebied);

create table if not exists werkervaring (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references freelancers(id) on delete cascade,
  functie text not null,
  opdrachtgever text not null default '',
  van int not null check (van between 1960 and 2100),
  tot int check (tot is null or tot between 1960 and 2100),
  huidig boolean not null default false,
  omschrijving text not null default '',
  aangemaakt timestamptz not null default now(),
  constraint jaren_volgorde check (tot is null or tot >= van)
);

-- ---------- bedrijven ----------
create table if not exists bedrijven (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  naam text not null,
  kvk text not null unique check (kvk ~ '^\d{8}$'),
  kvk_controle_op timestamptz,
  kvk_controle_resultaat text,
  btw text,
  website text,
  branche text,
  grootte text,
  straat text,
  postcode text check (postcode is null or postcode ~ '^\d{4}\s?[A-Z]{2}$'),
  plaats text not null default '',
  omschrijving text not null default '',
  logo_pad text,
  status text not null default 'actief' check (status in ('actief','geblokkeerd')),
  blok_reden text,
  aangemaakt timestamptz not null default now()
);

create table if not exists bedrijf_leden (
  bedrijf_id uuid not null references bedrijven(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  functie text,
  rol text not null default 'lid' check (rol in ('eigenaar','lid')),
  primary key (bedrijf_id, account_id)
);
create unique index if not exists bedrijf_leden_een_bedrijf on bedrijf_leden(account_id);

create table if not exists bedrijf_uitnodigingen (
  id uuid primary key default gen_random_uuid(),
  bedrijf_id uuid not null references bedrijven(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  door uuid references accounts(id) on delete set null,
  aangemaakt timestamptz not null default now(),
  geaccepteerd timestamptz
);

-- ---------- opdrachten ----------
create table if not exists opdrachten (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  bron text not null default 'direct' check (bron in ('direct','adzuna','jooble','careerjet','feed','remotive','remoteok','jobicy')),
  bron_id text,
  aanbieder text,
  externe_url text,
  laatst_gecontroleerd timestamptz,
  bedrijf_id uuid references bedrijven(id) on delete cascade,
  titel text not null,
  vakgebied text references vakgebieden(slug),
  omschrijving text not null default '',
  meebrengen text not null default '',
  werkvorm text check (werkvorm in ('op_locatie','hybride','remote')),
  locatie text not null default '',
  dagen_op_locatie int check (dagen_op_locatie is null or dagen_op_locatie between 1 and 5),
  start_asap boolean not null default false,
  start_datum date,
  looptijd_n int,
  looptijd_eenheid text check (looptijd_eenheid in ('weken','maanden')),
  looptijd_onbekend boolean not null default false,
  uren_min int check (uren_min is null or uren_min between 1 and 60),
  uren_max int check (uren_max is null or uren_max between 1 and 60),
  tarief_min int,
  tarief_max int,
  tarief_in_overleg boolean not null default false,
  ervaring_jaren int,
  aantal int not null default 1,
  vaardigheden text[] not null default '{}',
  certificeringen text[] not null default '{}',
  talen text[] not null default '{}',
  perspectief text[] not null default '{}',
  reactietermijn text check (reactietermijn in ('2_werkdagen','5_werkdagen','2_weken')),
  reageren_tot date,
  contactpersoon_id uuid references accounts(id) on delete set null,
  status text not null default 'concept' check (status in ('concept','in_controle','live','gesloten','afgewezen','verwijderd','verlopen')),
  status_reden text,
  gesloten_met text check (gesloten_met in ('reageerder','extern','niemand')),
  gesloten_freelancer_id uuid references freelancers(id) on delete set null,
  bemiddeling boolean not null default false,
  geplaatst_op timestamptz,
  aangemaakt timestamptz not null default now(),
  bijgewerkt timestamptz not null default now(),
  constraint uren_volgorde check (uren_min is null or uren_max is null or uren_min <= uren_max),
  constraint tarief_volgorde check (tarief_min is null or tarief_max is null or tarief_min <= tarief_max),
  constraint bron_compleet check (bron = 'direct' and bedrijf_id is not null or bron <> 'direct' and externe_url is not null)
);
create unique index if not exists opdrachten_bron_uniek on opdrachten(bron, bron_id) where bron_id is not null;
create index if not exists opdrachten_status on opdrachten(status, geplaatst_op desc);
create index if not exists opdrachten_vakgebied on opdrachten(vakgebied);

create table if not exists reacties (
  id uuid primary key default gen_random_uuid(),
  opdracht_id uuid not null references opdrachten(id) on delete cascade,
  freelancer_id uuid not null references freelancers(id) on delete cascade,
  motivatie text not null default '',
  status text not null default 'verstuurd' check (status in ('verstuurd','gelezen','in_gesprek','samenwerking','geen_match','opdracht_gesloten')),
  label text check (label in ('shortlist','geen_match')),
  aangemaakt timestamptz not null default now(),
  unique (opdracht_id, freelancer_id)
);

create table if not exists reactie_notities (
  id uuid primary key default gen_random_uuid(),
  reactie_id uuid not null references reacties(id) on delete cascade,
  auteur_id uuid references accounts(id) on delete set null,
  tekst text not null,
  aangemaakt timestamptz not null default now()
);

-- ---------- berichten ----------
create table if not exists gesprekken (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references freelancers(id) on delete cascade,
  bedrijf_id uuid not null references bedrijven(id) on delete cascade,
  gestart_door uuid references accounts(id) on delete set null,
  opdracht_id uuid references opdrachten(id) on delete set null,
  statuslabel text not null default 'geen' check (statuslabel in ('geen','in_gesprek','kennismaking','samenwerken','geen_match')),
  aangemaakt timestamptz not null default now(),
  laatste_bericht timestamptz not null default now()
);
create unique index if not exists gesprekken_uniek on gesprekken(freelancer_id, bedrijf_id, coalesce(opdracht_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists berichten (
  id uuid primary key default gen_random_uuid(),
  gesprek_id uuid not null references gesprekken(id) on delete cascade,
  afzender_id uuid references accounts(id) on delete set null,
  systeem boolean not null default false,
  tekst text not null default '',
  bijlage_pad text,
  bijlage_naam text,
  bijlage_grootte int,
  aangemaakt timestamptz not null default now()
);
create index if not exists berichten_gesprek on berichten(gesprek_id, aangemaakt);

create table if not exists gelezen (
  gesprek_id uuid not null references gesprekken(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  tot timestamptz not null,
  primary key (gesprek_id, account_id)
);

create table if not exists blokkades (
  blokkeerder_id uuid not null references accounts(id) on delete cascade,
  gesprek_id uuid not null references gesprekken(id) on delete cascade,
  aangemaakt timestamptz not null default now(),
  primary key (blokkeerder_id, gesprek_id)
);

create table if not exists meldingen (
  id uuid primary key default gen_random_uuid(),
  soort text not null check (soort in ('gesprek','profiel','opdracht')),
  reden text not null,
  toelichting text,
  door_id uuid references accounts(id) on delete set null,
  gesprek_id uuid references gesprekken(id) on delete set null,
  bericht_id uuid references berichten(id) on delete set null,
  freelancer_id uuid references freelancers(id) on delete set null,
  opdracht_id uuid references opdrachten(id) on delete set null,
  status text not null default 'open' check (status in ('open','afgehandeld')),
  besluit text check (besluit in ('geen_actie','waarschuwen','blokkeren')),
  notitie text,
  aangemaakt timestamptz not null default now(),
  afgehandeld timestamptz
);

-- ---------- bemiddeling, zoekopdrachten, beheer ----------
create table if not exists bemiddeling (
  id uuid primary key default gen_random_uuid(),
  bedrijf_id uuid references bedrijven(id) on delete set null,
  opdracht_id uuid references opdrachten(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  naam text not null,
  bedrijfsnaam text not null default '',
  email text not null,
  telefoon text not null,
  toelichting text not null default '',
  status text not null default 'nieuw' check (status in ('nieuw','gebeld','voorgesteld','geplaatst','gestopt')),
  notitie text,
  aangemaakt timestamptz not null default now()
);

create table if not exists bewaarde_zoekopdrachten (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  soort text not null check (soort in ('opdrachten','freelancers')),
  naam text not null,
  filters jsonb not null,
  email boolean not null default true,
  laatst_verzonden timestamptz not null default now(),
  aangemaakt timestamptz not null default now()
);

create table if not exists recent_bekeken (
  account_id uuid not null references accounts(id) on delete cascade,
  freelancer_id uuid not null references freelancers(id) on delete cascade,
  op timestamptz not null default now(),
  primary key (account_id, freelancer_id)
);

create table if not exists logboek (
  id bigserial primary key,
  actor_id uuid references accounts(id) on delete set null,
  actie text not null,
  object_type text,
  object_id text,
  details jsonb not null default '{}',
  aangemaakt timestamptz not null default now()
);

create table if not exists feed_runs (
  id bigserial primary key,
  bron text not null,
  gestart timestamptz not null default now(),
  klaar timestamptz,
  nieuw int not null default 0,
  bijgewerkt int not null default 0,
  verlopen int not null default 0,
  fout text
);

create table if not exists instellingen (
  sleutel text primary key,
  waarde jsonb not null
);

create table if not exists rate_limits (
  sleutel text primary key,
  aantal int not null,
  venster_start timestamptz not null
);

-- RLS aan zonder policies (defense in depth; server gebruikt de service-verbinding)
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

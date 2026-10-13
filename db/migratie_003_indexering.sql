-- Meldingen aan zoekmachines (Google Indexing API, IndexNow) voor eigen opdrachten
create table if not exists indexering (
  pad text primary key,
  type text not null check (type in ('URL_UPDATED','URL_DELETED')),
  gemeld_op timestamptz not null default now(),
  google text,
  indexnow text
);
alter table indexering enable row level security;

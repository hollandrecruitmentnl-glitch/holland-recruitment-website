-- Bewaartermijn: accounts die 24 maanden niet gebruikt zijn krijgen een waarschuwing; 30 dagen later verwijderd
alter table accounts add column if not exists inactief_gewaarschuwd timestamptz;

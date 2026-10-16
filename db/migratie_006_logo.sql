-- V36: bedrijfslogo bij registratie + logostrook "Bedrijven op ons platform" op de home
-- logo_tonen: keuze van het bedrijf zelf (standaard aan, uit te zetten in Bedrijfsprofiel)
-- logo_verborgen: beheer kan een logo uit de strook halen (bijv. bij twijfel over echtheid)
alter table bedrijven add column if not exists logo_tonen boolean not null default true;
alter table bedrijven add column if not exists logo_verborgen boolean not null default false;

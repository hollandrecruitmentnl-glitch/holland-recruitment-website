-- ALLEEN LOKAAL TESTEN — fictieve gegevens
insert into accounts (id, rol, email, email_bevestigd, wachtwoord_hash, voornaam, achternaam, telefoon) values
('00000000-0000-0000-0000-0000000000a1','beheer','beheer@test.local',true,'{{HASH}}','Test','Beheer',null),
('00000000-0000-0000-0000-0000000000b1','bedrijf','eva@rijnmond-test.nl',true,'{{HASH}}','Eva','Smit','010 123 4567'),
('00000000-0000-0000-0000-0000000000b2','bedrijf','tom@havenbv-test.nl',true,'{{HASH}}','Tom','Bakker',null),
('00000000-0000-0000-0000-0000000000f1','freelancer','sanne@test.local',true,'{{HASH}}','Sanne','de Vries','06 11111111'),
('00000000-0000-0000-0000-0000000000f2','freelancer','tarik@test.local',true,'{{HASH}}','Tarik','Kaya',null),
('00000000-0000-0000-0000-0000000000f3','freelancer','yara@test.local',true,'{{HASH}}','Yara','Bos',null),
('00000000-0000-0000-0000-0000000000f4','freelancer','nieuw@test.local',false,'{{HASH}}','Niels','Nieuw',null);
insert into bedrijven (id, slug, naam, kvk, kvk_controle_resultaat, website, branche, grootte, plaats, omschrijving) values
('00000000-0000-0000-0000-00000000bb01','rijnmond-process-services-test','Rijnmond Process Services (test)','12345678','niet gecontroleerd','https://example.com','Petrochemie en industrie','51–200','Rotterdam','Fictief testbedrijf voor onderhoud en stops in de Rotterdamse haven.'),
('00000000-0000-0000-0000-00000000bb02','haven-bv-test','Haven BV (test)','87654321','niet gecontroleerd',null,'Haven en logistiek','11–50','Schiedam','');
insert into bedrijf_leden (bedrijf_id, account_id, rol) values ('00000000-0000-0000-0000-00000000bb01','00000000-0000-0000-0000-0000000000b1','eigenaar'),('00000000-0000-0000-0000-00000000bb02','00000000-0000-0000-0000-0000000000b2','eigenaar');
insert into freelancers (id, slug, functietitel, vakgebied, regio, introductie, uurtarief, jaren_ervaring, beschikbaarheid, uren_per_week, werkvormen, vaardigheden, certificeringen, sectoren, talen) values
('00000000-0000-0000-0000-0000000000f1','sanne-de-vries-t1','Maintenance Engineer','techniek-onderhoud','Rotterdam','Ruim twaalf jaar ervaring met onderhoud aan roterende apparatuur in de petrochemie. Sterk in predictive maintenance en SAP PM.',78,12,'nu',40,'{op_locatie,hybride}','{SAP PM,Rotating equipment,Predictive maintenance}','{VCA-VOL}','{Petrochemie}','{Nederlands,Engels}'),
('00000000-0000-0000-0000-0000000000f2','tarik-kaya-t2','Full-stack Developer','it-software','Utrecht','TypeScript, React en Node. Bouwt web-apps van idee tot productie.',85,8,'vanaf',32,'{remote,hybride}','{TypeScript,React,Node.js,PostgreSQL}','{}','{Financiële dienstverlening}','{Nederlands,Engels}'),
('00000000-0000-0000-0000-0000000000f3','yara-bos-t3','Interim Controller','finance-control','Den Haag','',95,15,'niet',null,'{}','{Planning & control,Excel}','{}','{}','{}'),
('00000000-0000-0000-0000-0000000000f4','niels-nieuw-t4','Werkvoorbereider E&I','techniek-onderhoud','Rotterdam','',null,null,'nu',null,'{}','{}','{}','{}','{}');
update freelancers set beschikbaar_vanaf = current_date + 14, zichtbaar_tarief = 'na_contact' where id = '00000000-0000-0000-0000-0000000000f2';
insert into werkervaring (freelancer_id, functie, opdrachtgever, van, tot, huidig, omschrijving) values
('00000000-0000-0000-0000-0000000000f1','Maintenance Engineer','Raffinaderij (fictief)',2019,null,true,'Onderhoudsstrategie roterende apparatuur.'),
('00000000-0000-0000-0000-0000000000f1','Monteur','Chemiebedrijf (fictief)',2013,2019,false,'');
insert into opdrachten (id, slug, bron, bedrijf_id, titel, vakgebied, omschrijving, meebrengen, werkvorm, locatie, start_asap, looptijd_n, looptijd_eenheid, uren_min, uren_max, tarief_min, tarief_max, vaardigheden, perspectief, reactietermijn, reageren_tot, contactpersoon_id, status, geplaatst_op) values
('00000000-0000-0000-0000-00000000cc01','werkvoorbereider-e-i-test','direct','00000000-0000-0000-0000-00000000bb01','Werkvoorbereider E&I','techniek-onderhoud','Voor de onderhoudsstop van een kraakinstallatie zoeken we een werkvoorbereider E&I. Je maakt werkpakketten en bewaakt de planning.','Minimaal 5 jaar ervaring in de petrochemie.','op_locatie','Rotterdam-Pernis',true,6,'maanden',36,40,65,80,'{SAP PM,Werkvoorbereiding}','{verlenging}','5_werkdagen',current_date + 30,'00000000-0000-0000-0000-0000000000b1','live',now() - interval '2 days'),
('00000000-0000-0000-0000-00000000cc02','interim-projectmanager-test','direct','00000000-0000-0000-0000-00000000bb02','Interim Projectmanager','projectmanagement','Projectmanager voor de verhuizing van een distributiecentrum. Je stuurt leveranciers en planning aan.','','hybride','Schiedam',false,3,'maanden',24,32,null,null,'{Projectmanagement}','{}','2_werkdagen',current_date + 20,'00000000-0000-0000-0000-0000000000b2','in_controle',null);
update opdrachten set tarief_in_overleg = true, dagen_op_locatie = 2, start_datum = current_date + 21 where id = '00000000-0000-0000-0000-00000000cc02';
insert into opdrachten (slug, bron, bron_id, aanbieder, externe_url, laatst_gecontroleerd, titel, vakgebied, omschrijving, locatie, werkvorm, status, geplaatst_op) values
('projectmanager-elektrificatie-test','feed','test:1','Netbeheerder (fictief)','https://example.com/opdracht/1',now(),'Projectmanager Elektrificatie','projectmanagement','Externe opdracht voor de elektrificatie van een industriële locatie.','Rotterdam','hybride','live',now() - interval '1 day'),
('backend-developer-test','feed','test:2','Bureau (fictief)','https://example.com/opdracht/2',now(),'Backend Developer (zzp)','it-software','Freelance backend developer gezocht voor een API-platform.','Amsterdam','remote','live',now());
insert into reacties (opdracht_id, freelancer_id, motivatie) values ('00000000-0000-0000-0000-00000000cc01','00000000-0000-0000-0000-0000000000f1','Ik heb drie stops gedaan in Pernis en ken SAP PM goed.');

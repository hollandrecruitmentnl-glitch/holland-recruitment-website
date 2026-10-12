insert into vakgebieden (slug, naam, volgorde) values
('it-software','IT en software',1),('techniek-onderhoud','Techniek en onderhoud',2),('engineering','Engineering',3),
('marketing-communicatie','Marketing en communicatie',4),('finance-control','Finance en control',5),('projectmanagement','Projectmanagement',6),
('data-analytics','Data en analytics',7),('hr-recruitment','HR en recruitment',8),('logistiek-supply-chain','Logistiek en supply chain',9),
('bouw-infra','Bouw en infra',10),('sales-accountmanagement','Sales en accountmanagement',11),('hse-kwaliteit','HSE en kwaliteit',12),
('juridisch-compliance','Juridisch en compliance',13),('inkoop','Inkoop',14),('design-creatief','Design en creatief',15),
('zorg-welzijn','Zorg en welzijn',16),('onderwijs-training','Onderwijs en training',17),('overheid-beleid','Overheid en beleid',18),
('management-interim','Management en interim',19),('administratie-support','Administratie en support',20)
on conflict (slug) do update set naam = excluded.naam, volgorde = excluded.volgorde;
insert into instellingen (sleutel, waarde) values ('opdrachten_handmatig_controleren','true'), ('gratis_tot','"2027-04-30"')
on conflict do nothing;

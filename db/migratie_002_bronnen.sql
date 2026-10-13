alter table opdrachten drop constraint if exists opdrachten_bron_check;
alter table opdrachten add constraint opdrachten_bron_check check (bron in ('direct','adzuna','jooble','careerjet','feed','remotive','remoteok','jobicy'));

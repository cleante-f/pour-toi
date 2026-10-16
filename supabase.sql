-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
create table if not exists livre_or (
  id bigint generated always as identity primary key,
  auteur text not null check (auteur in ('Maelys','Cléante')),
  texte text not null check (char_length(texte) between 1 and 2000),
  cree_le timestamptz not null default now()
);
create table if not exists bucket (
  id bigint generated always as identity primary key,
  texte text not null check (char_length(texte) between 1 and 200),
  fait boolean not null default false,
  ajoute_par text,
  cree_le timestamptz not null default now()
);
alter table livre_or enable row level security;
alter table bucket enable row level security;
-- Le site (clé publique) peut lire, ajouter ; et cocher/décocher la bucket list. Pas de suppression.
create policy "lecture livre" on livre_or for select to anon using (true);
create policy "ajout livre" on livre_or for insert to anon with check (true);
create policy "lecture bucket" on bucket for select to anon using (true);
create policy "ajout bucket" on bucket for insert to anon with check (true);
create policy "cocher bucket" on bucket for update to anon using (true) with check (true);
-- Bucket list de départ
insert into bucket (texte, ajoute_par)
select t, 'Cléante' from unnest(array[
 'Un câlin de 10 minutes à l''aéroport','Un brunch à Paris le premier dimanche',
 'Acheter un énorme bouquet de pivoines ensemble','Aller voir Nekfeu en concert',
 'Pique-nique aux Buttes-Chaumont','Cuisiner ensemble un plat chinois que tu as appris',
 'Voir les illuminations de Noël sur les Champs-Élysées','Une soirée film sous la couette',
 'Planifier notre prochain voyage','Retourner au Maroc… ou découvrir un nouveau pays',
 'Patinoire de Noël','Regarder toutes tes photos de Shanghai ensemble']) as t
where not exists (select 1 from bucket);

-- Compliments (onglet « Nos messages »)
create table if not exists compliments (
  id bigint generated always as identity primary key,
  auteur text not null check (auteur in ('Maelys','Cléante')),
  texte text not null check (char_length(texte) between 10 and 500),
  cree_le timestamptz not null default now()
);
alter table compliments enable row level security;
create policy "lecture compliments" on compliments for select to anon using (true);
create policy "ajout compliments" on compliments for insert to anon with check (true);

-- Base de datos para las encuestas de soporte (Supabase / PostgreSQL)
-- Ejecuta este archivo en: Supabase -> SQL Editor -> New query -> Run

create table if not exists public.respuestas (
  id bigint generated always as identity primary key,
  tecnico_id text not null,
  puntaje int not null check (puntaje between 1 and 10),
  carita int check (carita between 1 and 5),
  comentario text,
  cliente text,
  ticket text,
  creado_en timestamptz not null default now()
);

create index if not exists respuestas_tecnico_idx on public.respuestas (tecnico_id);
create index if not exists respuestas_fecha_idx on public.respuestas (creado_en desc);

alter table public.respuestas enable row level security;

-- Cualquier visitante (el cliente que responde) puede INSERTAR una encuesta.
drop policy if exists "permitir insertar encuestas" on public.respuestas;
create policy "permitir insertar encuestas"
  on public.respuestas
  for insert
  to anon, authenticated
  with check (true);

-- Solo usuarios con sesion iniciada (jefe y tecnicos) pueden LEER.
drop policy if exists "leer encuestas autenticados" on public.respuestas;
create policy "leer encuestas autenticados"
  on public.respuestas
  for select
  to authenticated
  using (true);

-- Solo el jefe (admin) puede ELIMINAR. Aqui va el correo del jefe.
drop policy if exists "eliminar encuestas admin" on public.respuestas;
create policy "eliminar encuestas admin"
  on public.respuestas
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') in ('fernando.alarcon@intur.hn'));

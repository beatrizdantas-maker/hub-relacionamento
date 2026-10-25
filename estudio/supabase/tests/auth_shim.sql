-- =====================================================================
-- Simulação mínima do Supabase num Postgres comum, para rodar as migrations
-- e o teste de RLS fora da nuvem (CI e máquina local). NÃO rode no Supabase:
-- lá o schema auth e os papéis já existem.
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists extensions;
grant usage on schema auth, extensions to anon, authenticated, service_role;

-- auth.jwt()/auth.uid() leem as claims de request.jwt.claims, como no PostgREST.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;

create table if not exists auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
);

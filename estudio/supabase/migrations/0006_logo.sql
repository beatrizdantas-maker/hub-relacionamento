-- =====================================================================
-- Estúdio · Migration 0006 · Logo da empresa
-- Coluna empresas.logo_url + bucket público "estudio-logos" no Storage.
-- Cada empresa grava em "<empresa_id>/arquivo"; só Dono e Editor gravam.
-- A parte de Storage só roda onde o schema storage existe (Supabase), para
-- o teste de RLS continuar rodando num Postgres comum.
-- =====================================================================
alter table estudio.empresas add column if not exists logo_url text;

-- Pode editar a empresa dona da pasta? (primeiro segmento do caminho = id da empresa)
create or replace function estudio.pode_editar_pasta(p_nome text)
returns boolean language plpgsql stable security definer set search_path = estudio, extensions as $$
declare v_pasta text := split_part(p_nome, '/', 1);
begin
  if v_pasta !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  return estudio.pode_editar(v_pasta::uuid);
end $$;
revoke all on function estudio.pode_editar_pasta(text) from public, anon;
grant execute on function estudio.pode_editar_pasta(text) to authenticated, service_role;

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'Schema storage ausente: pulando bucket e políticas de logo';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('estudio-logos', 'estudio-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

  execute 'drop policy if exists estudio_logos_select on storage.objects';
  execute 'drop policy if exists estudio_logos_insert on storage.objects';
  execute 'drop policy if exists estudio_logos_update on storage.objects';
  execute 'drop policy if exists estudio_logos_delete on storage.objects';
  execute $p$create policy estudio_logos_select on storage.objects for select to authenticated
    using (bucket_id = 'estudio-logos')$p$;
  execute $p$create policy estudio_logos_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'estudio-logos' and estudio.pode_editar_pasta(name))$p$;
  execute $p$create policy estudio_logos_update on storage.objects for update to authenticated
    using (bucket_id = 'estudio-logos' and estudio.pode_editar_pasta(name))
    with check (bucket_id = 'estudio-logos' and estudio.pode_editar_pasta(name))$p$;
  execute $p$create policy estudio_logos_delete on storage.objects for delete to authenticated
    using (bucket_id = 'estudio-logos' and estudio.pode_editar_pasta(name))$p$;
end $$;

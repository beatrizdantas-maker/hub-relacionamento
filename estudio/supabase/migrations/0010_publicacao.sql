-- =====================================================================
-- Estúdio · Migration 0010 · Publicação automática (Instagram e LinkedIn)
-- - conteudos.arquivos: imagens/vídeo prontos de cada post (Storage)
-- - conteudos.publicar + publicacao_*: agendamento e estado da publicação
-- - redes_conexoes: tokens das contas (só o service_role lê)
-- - bucket público "estudio-midias" (o Instagram baixa o arquivo pela URL)
-- - funções que o robô (função "estudio-publicar") usa
-- - pg_cron chama o robô a cada 5 minutos (só onde pg_cron/pg_net/vault existem)
-- Depende da 0006 (estudio.pode_editar_pasta).
-- =====================================================================

alter table estudio.conteudos add column if not exists arquivos jsonb not null default '[]';
alter table estudio.conteudos add column if not exists publicar boolean not null default false;
alter table estudio.conteudos add column if not exists publicacao_status text;
alter table estudio.conteudos add column if not exists publicacao_erro text;
alter table estudio.conteudos add column if not exists publicacao_ref text;
alter table estudio.conteudos add column if not exists publicacao_link text;
alter table estudio.conteudos add column if not exists publicado_em timestamptz;
alter table estudio.conteudos add column if not exists publicacao_tentativas int not null default 0;
alter table estudio.conteudos add column if not exists publicacao_travado_ate timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'conteudos_publicacao_status_valido') then
    alter table estudio.conteudos add constraint conteudos_publicacao_status_valido
      check (publicacao_status is null or publicacao_status in ('agendado', 'processando', 'publicado', 'erro'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conteudos_arquivos_lista') then
    alter table estudio.conteudos add constraint conteudos_arquivos_lista check (jsonb_typeof(arquivos) = 'array');
  end if;
end $$;
create index if not exists conteudos_publicar_idx on estudio.conteudos (data) where publicar;

-- ---------- Contas conectadas ----------
create table if not exists estudio.redes_conexoes (
  empresa_id    uuid not null references estudio.empresas (id) on delete cascade,
  rede          text not null check (rede in ('instagram', 'linkedin')),
  conta_id      text not null,
  conta_nome    text,
  token         text not null,
  expira_em     timestamptz,
  conectado_por uuid,
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, rede)
);
alter table estudio.redes_conexoes enable row level security;
-- Sem políticas: ninguém lê pela API, só o service_role (robô). A tela usa a função abaixo.
revoke all on estudio.redes_conexoes from anon, authenticated;

-- O que a tela pode saber de cada conexão (nunca o token). Qualquer membro vê.
create or replace function estudio.conexoes_redes(p_empresa uuid)
returns table (rede text, conta_nome text, expira_em timestamptz, atualizado_em timestamptz)
language sql stable security definer set search_path = estudio as $$
  select r.rede, r.conta_nome, r.expira_em, r.atualizado_em
  from estudio.redes_conexoes r
  where r.empresa_id = p_empresa and estudio.e_membro(p_empresa)
$$;
revoke all on function estudio.conexoes_redes(uuid) from public, anon;
grant execute on function estudio.conexoes_redes(uuid) to authenticated, service_role;

-- Posts agendados cujo horário (no fuso da empresa) já chegou, mais os que já começaram a
-- publicar (ex.: "Publicar agora" de um vídeo que a rede ainda está processando).
create or replace function estudio.publicacoes_devidas()
returns setof estudio.conteudos
language sql stable security definer set search_path = estudio as $$
  select c.*
  from estudio.conteudos c
  join estudio.empresas e on e.id = c.empresa_id
  where c.publicar
    and c.publicacao_status in ('agendado', 'processando')
    and (c.publicacao_travado_ate is null or c.publicacao_travado_ate < now())
    and (c.publicacao_status = 'processando'
         or ((c.data + coalesce(c.hora, time '09:00')) at time zone e.fuso_horario) <= now())
  order by c.data, c.hora nulls last
  limit 10
$$;
revoke all on function estudio.publicacoes_devidas() from public, anon, authenticated;
grant execute on function estudio.publicacoes_devidas() to service_role;

-- O robô confere o segredo do agendador sem que ele saia do banco.
create or replace function estudio.cron_segredo_confere(p_segredo text)
returns boolean
language plpgsql stable security definer set search_path = estudio as $$
declare v_segredo text;
begin
  if to_regclass('vault.decrypted_secrets') is null then return false; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v_segredo using 'estudio_cron_segredo';
  return v_segredo is not null and length(p_segredo) > 20 and p_segredo = v_segredo;
end $$;
revoke all on function estudio.cron_segredo_confere(text) from public, anon, authenticated;
grant execute on function estudio.cron_segredo_confere(text) to service_role;

-- ---------- Storage: arquivos para publicar ----------
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'Schema storage ausente: pulando bucket de mídias';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('estudio-midias', 'estudio-midias', true, 52428800, array['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'])
  on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];

  execute 'drop policy if exists estudio_midias_select on storage.objects';
  execute 'drop policy if exists estudio_midias_insert on storage.objects';
  execute 'drop policy if exists estudio_midias_update on storage.objects';
  execute 'drop policy if exists estudio_midias_delete on storage.objects';
  execute $p$create policy estudio_midias_select on storage.objects for select to authenticated
    using (bucket_id = 'estudio-midias')$p$;
  execute $p$create policy estudio_midias_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'estudio-midias' and estudio.pode_editar_pasta(name))$p$;
  execute $p$create policy estudio_midias_update on storage.objects for update to authenticated
    using (bucket_id = 'estudio-midias' and estudio.pode_editar_pasta(name))
    with check (bucket_id = 'estudio-midias' and estudio.pode_editar_pasta(name))$p$;
  execute $p$create policy estudio_midias_delete on storage.objects for delete to authenticated
    using (bucket_id = 'estudio-midias' and estudio.pode_editar_pasta(name))$p$;
end $$;

-- ---------- Agendador: chama o robô a cada 5 minutos ----------
-- O segredo fica no Vault ("estudio_cron_segredo"), criado à parte (não vai para o repositório).
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net')
     or to_regclass('vault.decrypted_secrets') is null then
    raise notice 'pg_cron, pg_net ou vault ausentes: pulando o agendador';
    return;
  end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.unschedule(jobid) from cron.job where jobname = 'estudio-publicar';
  perform cron.schedule(
    'estudio-publicar',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := 'https://oxenvlnvyrfjfvbbdgbm.supabase.co/functions/v1/estudio-publicar',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-estudio-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'estudio_cron_segredo' limit 1)
        ),
        body := '{"acao":"rodar"}'::jsonb,
        timeout_milliseconds := 120000
      );
    $job$
  );
end $$;

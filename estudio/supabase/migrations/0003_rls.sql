-- =====================================================================
-- Estúdio · Migration 0003 · Papéis, RLS e políticas
--
-- Papéis por empresa:
--   dono        → tudo (excluir empresa, membros, integrações)
--   editor      → edita marca, calendário, tarefas, métricas, gera sugestões
--   colaborador → vê tudo, muda status, conclui as próprias tarefas, comenta
--   leitor      → só vê
-- =====================================================================

-- ---------- Funções auxiliares (SECURITY DEFINER evita recursão em membros) ----
create or replace function estudio.papel_em(p_empresa uuid)
returns estudio.papel_membro
language sql stable security definer set search_path = estudio, extensions as $$
  select m.papel from estudio.membros m
  where m.empresa_id = p_empresa and m.user_id = auth.uid()
  limit 1
$$;

create or replace function estudio.e_membro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = estudio, extensions as $$
  select exists (select 1 from estudio.membros m where m.empresa_id = p_empresa and m.user_id = auth.uid())
$$;

create or replace function estudio.e_dono(p_empresa uuid)
returns boolean language sql stable security definer set search_path = estudio, extensions as $$
  select estudio.papel_em(p_empresa) = 'dono'
$$;

create or replace function estudio.pode_editar(p_empresa uuid)
returns boolean language sql stable security definer set search_path = estudio, extensions as $$
  select estudio.papel_em(p_empresa) in ('dono', 'editor')
$$;

create or replace function estudio.pode_colaborar(p_empresa uuid)
returns boolean language sql stable security definer set search_path = estudio, extensions as $$
  select estudio.papel_em(p_empresa) in ('dono', 'editor', 'colaborador')
$$;

revoke all on function estudio.papel_em(uuid), estudio.e_membro(uuid), estudio.e_dono(uuid),
  estudio.pode_editar(uuid), estudio.pode_colaborar(uuid) from public, anon;
grant execute on function estudio.papel_em(uuid), estudio.e_membro(uuid), estudio.e_dono(uuid),
  estudio.pode_editar(uuid), estudio.pode_colaborar(uuid) to authenticated, service_role;

-- ---------- Restrições por coluna (o que cada papel pode mudar) ----------------
-- Editor não arquiva/desarquiva empresa (só o Dono).
create or replace function estudio.tg_empresas_restricoes()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;        -- service_role / migrações
  if new.arquivada is distinct from old.arquivada and not estudio.e_dono(old.id) then
    raise exception 'Somente o dono pode arquivar ou reativar a empresa' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger empresas_restricoes before update on estudio.empresas
  for each row execute function estudio.tg_empresas_restricoes();

-- Colaborador só pode mudar o status de conteúdos e stories.
create or replace function estudio.tg_somente_status()
returns trigger language plpgsql as $$
declare v_papel estudio.papel_membro;
begin
  if auth.uid() is null then return new; end if;
  v_papel := estudio.papel_em(old.empresa_id);
  if v_papel in ('dono', 'editor') then return new; end if;
  if v_papel = 'colaborador' then
    if to_jsonb(new) - 'status' - 'atualizado_em' <> to_jsonb(old) - 'status' - 'atualizado_em' then
      raise exception 'Colaborador só pode alterar o status' using errcode = '42501';
    end if;
    return new;
  end if;
  raise exception 'Sem permissão para editar' using errcode = '42501';
end $$;
create trigger conteudos_somente_status before update on estudio.conteudos
  for each row execute function estudio.tg_somente_status();
create trigger stories_somente_status before update on estudio.stories
  for each row execute function estudio.tg_somente_status();

-- Colaborador só muda status das PRÓPRIAS tarefas.
create or replace function estudio.tg_tarefas_restricoes()
returns trigger language plpgsql as $$
declare v_papel estudio.papel_membro;
begin
  if auth.uid() is null then return new; end if;
  v_papel := estudio.papel_em(old.empresa_id);
  if v_papel in ('dono', 'editor') then return new; end if;
  if v_papel = 'colaborador' then
    if old.responsavel_id is distinct from auth.uid() then
      raise exception 'Colaborador só pode alterar as próprias tarefas' using errcode = '42501';
    end if;
    if to_jsonb(new) - 'status' - 'concluido_em' - 'atualizado_em'
       <> to_jsonb(old) - 'status' - 'concluido_em' - 'atualizado_em' then
      raise exception 'Colaborador só pode alterar o status da tarefa' using errcode = '42501';
    end if;
    return new;
  end if;
  raise exception 'Sem permissão para editar' using errcode = '42501';
end $$;
create trigger tarefas_restricoes before update on estudio.tarefas
  for each row execute function estudio.tg_tarefas_restricoes();

-- Nunca trocar a empresa de um registro (evita "mover" dados entre empresas).
create or replace function estudio.tg_empresa_imutavel()
returns trigger language plpgsql as $$
begin
  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'empresa_id não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['campanhas','conteudos','stories','tarefas','comentarios','metricas_semanais','resultados_posts','sugestoes','convites','membros']
  loop
    execute format('create trigger %I_empresa_imutavel before update on estudio.%I for each row execute function estudio.tg_empresa_imutavel()', t, t);
  end loop;
end $$;

-- Dono não pode ser rebaixado/removido se for o único dono.
create or replace function estudio.tg_ultimo_dono()
returns trigger language plpgsql as $$
begin
  if old.papel = 'dono' and (tg_op = 'DELETE' or new.papel <> 'dono') then
    if (select count(*) from estudio.membros where empresa_id = old.empresa_id and papel = 'dono') <= 1 then
      raise exception 'A empresa precisa ter pelo menos um dono' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger membros_ultimo_dono before update or delete on estudio.membros
  for each row execute function estudio.tg_ultimo_dono();

-- ---------- Grants: nada para anônimos; autenticados passam pelo RLS ----------
-- Lembrete: o schema "estudio" precisa estar em "Exposed schemas" (Project Settings →
-- Data API) para a API/cliente Supabase enxergá-lo.
revoke all on all tables in schema estudio from anon, public;
revoke usage on schema estudio from anon, public;
grant usage on schema estudio to authenticated, service_role;
grant select, insert, update, delete on all tables in schema estudio to authenticated;
grant all on all tables in schema estudio to service_role;
grant usage on all sequences in schema estudio to authenticated, service_role;
alter default privileges in schema estudio grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema estudio grant all on tables to service_role;

-- ---------- RLS ----------------------------------------------------------------
alter table estudio.perfis               enable row level security;
alter table estudio.empresas             enable row level security;
alter table estudio.empresas_integracoes enable row level security;
alter table estudio.membros              enable row level security;
alter table estudio.convites             enable row level security;
alter table estudio.campanhas            enable row level security;
alter table estudio.conteudos            enable row level security;
alter table estudio.stories              enable row level security;
alter table estudio.tarefas              enable row level security;
alter table estudio.comentarios          enable row level security;
alter table estudio.metricas_semanais    enable row level security;
alter table estudio.resultados_posts     enable row level security;
alter table estudio.sugestoes            enable row level security;

-- perfis: só o próprio usuário. Empresa ativa precisa ser uma em que é membro.
-- Insert existe porque usuários criados ANTES do Estúdio (o projeto é compartilhado)
-- não passaram pelo trigger de auth.users: o app garante o perfil no primeiro acesso.
create policy perfis_select on estudio.perfis for select to authenticated using (id = auth.uid());
create policy perfis_insert on estudio.perfis for insert to authenticated
  with check (id = auth.uid() and (empresa_ativa_id is null or estudio.e_membro(empresa_ativa_id)));
create policy perfis_update on estudio.perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (empresa_ativa_id is null or estudio.e_membro(empresa_ativa_id)));

-- empresas
create policy empresas_select on estudio.empresas for select to authenticated using (estudio.e_membro(id));
create policy empresas_insert on estudio.empresas for insert to authenticated with check (auth.uid() is not null);
create policy empresas_update on estudio.empresas for update to authenticated
  using (estudio.pode_editar(id)) with check (estudio.pode_editar(id));
create policy empresas_delete on estudio.empresas for delete to authenticated using (estudio.e_dono(id));

-- integrações: só o dono
create policy integracoes_select on estudio.empresas_integracoes for select to authenticated using (estudio.e_dono(empresa_id));
create policy integracoes_insert on estudio.empresas_integracoes for insert to authenticated with check (estudio.e_dono(empresa_id));
create policy integracoes_update on estudio.empresas_integracoes for update to authenticated
  using (estudio.e_dono(empresa_id)) with check (estudio.e_dono(empresa_id));
create policy integracoes_delete on estudio.empresas_integracoes for delete to authenticated using (estudio.e_dono(empresa_id));

-- membros: todos os membros veem; só o dono gerencia; qualquer um pode sair (exceto último dono).
create policy membros_select on estudio.membros for select to authenticated using (estudio.e_membro(empresa_id));
create policy membros_insert on estudio.membros for insert to authenticated with check (estudio.e_dono(empresa_id));
create policy membros_update on estudio.membros for update to authenticated
  using (estudio.e_dono(empresa_id)) with check (estudio.e_dono(empresa_id));
create policy membros_delete on estudio.membros for delete to authenticated
  using (estudio.e_dono(empresa_id) or user_id = auth.uid());

-- convites: só o dono
create policy convites_select on estudio.convites for select to authenticated using (estudio.e_dono(empresa_id));
create policy convites_insert on estudio.convites for insert to authenticated with check (estudio.e_dono(empresa_id));
create policy convites_update on estudio.convites for update to authenticated
  using (estudio.e_dono(empresa_id)) with check (estudio.e_dono(empresa_id));
create policy convites_delete on estudio.convites for delete to authenticated using (estudio.e_dono(empresa_id));

-- Tabelas de conteúdo: membros leem; dono/editor escrevem.
do $$
declare t text;
begin
  foreach t in array array['campanhas','conteudos','stories','tarefas','metricas_semanais','resultados_posts','sugestoes']
  loop
    execute format('create policy %I_select on estudio.%I for select to authenticated using (estudio.e_membro(empresa_id))', t, t);
    execute format('create policy %I_insert on estudio.%I for insert to authenticated with check (estudio.pode_editar(empresa_id))', t, t);
    execute format('create policy %I_delete on estudio.%I for delete to authenticated using (estudio.pode_editar(empresa_id))', t, t);
  end loop;
  -- update: editor/dono em tudo; colaborador também (coluna restrita por trigger)
  foreach t in array array['campanhas','metricas_semanais','resultados_posts','sugestoes']
  loop
    execute format('create policy %I_update on estudio.%I for update to authenticated using (estudio.pode_editar(empresa_id)) with check (estudio.pode_editar(empresa_id))', t, t);
  end loop;
  foreach t in array array['conteudos','stories']
  loop
    execute format('create policy %I_update on estudio.%I for update to authenticated using (estudio.pode_colaborar(empresa_id)) with check (estudio.pode_colaborar(empresa_id))', t, t);
  end loop;
end $$;

create policy tarefas_update on estudio.tarefas for update to authenticated
  using (estudio.pode_editar(empresa_id) or (estudio.papel_em(empresa_id) = 'colaborador' and responsavel_id = auth.uid()))
  with check (estudio.pode_editar(empresa_id) or (estudio.papel_em(empresa_id) = 'colaborador' and responsavel_id = auth.uid()));

-- comentários: membros leem; dono/editor/colaborador comentam; só o autor edita/apaga (dono também apaga).
create policy comentarios_select on estudio.comentarios for select to authenticated using (estudio.e_membro(empresa_id));
create policy comentarios_insert on estudio.comentarios for insert to authenticated
  with check (estudio.pode_colaborar(empresa_id) and autor_id = auth.uid());
create policy comentarios_update on estudio.comentarios for update to authenticated
  using (autor_id = auth.uid()) with check (autor_id = auth.uid());
create policy comentarios_delete on estudio.comentarios for delete to authenticated
  using (autor_id = auth.uid() or estudio.e_dono(empresa_id));

-- ---------- RPC: criar empresa ------------------------------------------------
-- Cria a empresa e já registra quem criou como Dono (o trigger faz isso), devolvendo
-- o id. Um INSERT direto com RETURNING falharia na política de SELECT porque a
-- associação como membro só existe depois do trigger AFTER INSERT.
create or replace function estudio.criar_empresa(p_dados jsonb)
returns uuid
language plpgsql security definer set search_path = estudio, extensions as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado' using errcode = '42501';
  end if;
  if coalesce(trim(p_dados ->> 'nome'), '') = '' then
    raise exception 'Informe o nome da empresa' using errcode = '22023';
  end if;
  insert into estudio.empresas (
    nome, perfil_instagram, sobre, publico, objetivos, tom_de_voz, regras_de_linguagem, regras_de_imagem,
    pilares, melhores_horarios, cor_primaria, cor_secundaria, fuso_horario, metas, ritmo_semanal, criado_por
  ) values (
    trim(p_dados ->> 'nome'),
    p_dados ->> 'perfil_instagram',
    p_dados ->> 'sobre',
    p_dados ->> 'publico',
    p_dados ->> 'objetivos',
    p_dados ->> 'tom_de_voz',
    p_dados ->> 'regras_de_linguagem',
    p_dados ->> 'regras_de_imagem',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_dados -> 'pilares', '[]'::jsonb)) x), '{}'),
    p_dados ->> 'melhores_horarios',
    coalesce(p_dados ->> 'cor_primaria', '#7C3AED'),
    coalesce(p_dados ->> 'cor_secundaria', '#F59E0B'),
    coalesce(p_dados ->> 'fuso_horario', 'America/Sao_Paulo'),
    coalesce(p_dados -> 'metas', estudio.metas_padrao()),
    coalesce(p_dados -> 'ritmo_semanal', estudio.ritmo_semanal_padrao()),
    auth.uid()
  ) returning id into v_id;
  update estudio.perfis set empresa_ativa_id = v_id where id = auth.uid();
  return v_id;
end $$;
revoke all on function estudio.criar_empresa(jsonb) from public, anon;
grant execute on function estudio.criar_empresa(jsonb) to authenticated;

-- ---------- RPCs de convite ----------------------------------------------------
-- Mostra o convite para quem recebeu o link (sem expor a empresa toda).
create or replace function estudio.ver_convite(p_token text)
returns table (empresa_nome text, papel estudio.papel_membro, email text, expirado boolean, aceito boolean)
language sql stable security definer set search_path = estudio, extensions as $$
  select e.nome, c.papel, c.email, c.expira_em < now(), c.aceito_em is not null
  from estudio.convites c join estudio.empresas e on e.id = c.empresa_id
  where c.token = p_token
$$;

-- Aceita o convite: o e-mail do usuário logado precisa bater com o do convite.
create or replace function estudio.aceitar_convite(p_token text)
returns uuid
language plpgsql security definer set search_path = estudio, extensions as $$
declare c estudio.convites%rowtype; v_nome text;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado' using errcode = '42501';
  end if;
  select * into c from estudio.convites where token = p_token for update;
  if not found then raise exception 'Convite não encontrado' using errcode = 'P0002'; end if;
  if c.aceito_em is not null then raise exception 'Este convite já foi usado' using errcode = '22023'; end if;
  if c.expira_em < now() then raise exception 'Este convite expirou' using errcode = '22023'; end if;
  if lower(c.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Este convite foi enviado para outro e-mail' using errcode = '42501';
  end if;
  select nome into v_nome from estudio.perfis where id = auth.uid();
  insert into estudio.membros (empresa_id, user_id, papel, nome_exibicao)
  values (c.empresa_id, auth.uid(), c.papel, v_nome)
  on conflict (empresa_id, user_id) do update set papel = excluded.papel;
  update estudio.convites set aceito_em = now() where id = c.id;
  update estudio.perfis set empresa_ativa_id = c.empresa_id where id = auth.uid();
  return c.empresa_id;
end $$;

revoke all on function estudio.ver_convite(text), estudio.aceitar_convite(text) from public, anon;
grant execute on function estudio.ver_convite(text), estudio.aceitar_convite(text) to authenticated;

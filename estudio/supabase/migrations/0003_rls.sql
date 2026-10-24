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
create or replace function public.papel_em(p_empresa uuid)
returns public.papel_membro
language sql stable security definer set search_path = public as $$
  select m.papel from public.membros m
  where m.empresa_id = p_empresa and m.user_id = auth.uid()
  limit 1
$$;

create or replace function public.e_membro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membros m where m.empresa_id = p_empresa and m.user_id = auth.uid())
$$;

create or replace function public.e_dono(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.papel_em(p_empresa) = 'dono'
$$;

create or replace function public.pode_editar(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.papel_em(p_empresa) in ('dono', 'editor')
$$;

create or replace function public.pode_colaborar(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.papel_em(p_empresa) in ('dono', 'editor', 'colaborador')
$$;

revoke all on function public.papel_em(uuid), public.e_membro(uuid), public.e_dono(uuid),
  public.pode_editar(uuid), public.pode_colaborar(uuid) from public, anon;
grant execute on function public.papel_em(uuid), public.e_membro(uuid), public.e_dono(uuid),
  public.pode_editar(uuid), public.pode_colaborar(uuid) to authenticated, service_role;

-- ---------- Restrições por coluna (o que cada papel pode mudar) ----------------
-- Editor não arquiva/desarquiva empresa (só o Dono).
create or replace function public.tg_empresas_restricoes()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;        -- service_role / migrações
  if new.arquivada is distinct from old.arquivada and not public.e_dono(old.id) then
    raise exception 'Somente o dono pode arquivar ou reativar a empresa' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger empresas_restricoes before update on public.empresas
  for each row execute function public.tg_empresas_restricoes();

-- Colaborador só pode mudar o status de conteúdos e stories.
create or replace function public.tg_somente_status()
returns trigger language plpgsql as $$
declare v_papel public.papel_membro;
begin
  if auth.uid() is null then return new; end if;
  v_papel := public.papel_em(old.empresa_id);
  if v_papel in ('dono', 'editor') then return new; end if;
  if v_papel = 'colaborador' then
    if to_jsonb(new) - 'status' - 'atualizado_em' <> to_jsonb(old) - 'status' - 'atualizado_em' then
      raise exception 'Colaborador só pode alterar o status' using errcode = '42501';
    end if;
    return new;
  end if;
  raise exception 'Sem permissão para editar' using errcode = '42501';
end $$;
create trigger conteudos_somente_status before update on public.conteudos
  for each row execute function public.tg_somente_status();
create trigger stories_somente_status before update on public.stories
  for each row execute function public.tg_somente_status();

-- Colaborador só muda status das PRÓPRIAS tarefas.
create or replace function public.tg_tarefas_restricoes()
returns trigger language plpgsql as $$
declare v_papel public.papel_membro;
begin
  if auth.uid() is null then return new; end if;
  v_papel := public.papel_em(old.empresa_id);
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
create trigger tarefas_restricoes before update on public.tarefas
  for each row execute function public.tg_tarefas_restricoes();

-- Nunca trocar a empresa de um registro (evita "mover" dados entre empresas).
create or replace function public.tg_empresa_imutavel()
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
    execute format('create trigger %I_empresa_imutavel before update on public.%I for each row execute function public.tg_empresa_imutavel()', t, t);
  end loop;
end $$;

-- Dono não pode ser rebaixado/removido se for o único dono.
create or replace function public.tg_ultimo_dono()
returns trigger language plpgsql as $$
begin
  if old.papel = 'dono' and (tg_op = 'DELETE' or new.papel <> 'dono') then
    if (select count(*) from public.membros where empresa_id = old.empresa_id and papel = 'dono') <= 1 then
      raise exception 'A empresa precisa ter pelo menos um dono' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger membros_ultimo_dono before update or delete on public.membros
  for each row execute function public.tg_ultimo_dono();

-- ---------- Grants: nada para anônimos; autenticados passam pelo RLS ----------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------- RLS ----------------------------------------------------------------
alter table public.perfis               enable row level security;
alter table public.empresas             enable row level security;
alter table public.empresas_integracoes enable row level security;
alter table public.membros              enable row level security;
alter table public.convites             enable row level security;
alter table public.campanhas            enable row level security;
alter table public.conteudos            enable row level security;
alter table public.stories              enable row level security;
alter table public.tarefas              enable row level security;
alter table public.comentarios          enable row level security;
alter table public.metricas_semanais    enable row level security;
alter table public.resultados_posts     enable row level security;
alter table public.sugestoes            enable row level security;

-- perfis: só o próprio usuário. Empresa ativa precisa ser uma em que é membro.
create policy perfis_select on public.perfis for select to authenticated using (id = auth.uid());
create policy perfis_update on public.perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (empresa_ativa_id is null or public.e_membro(empresa_ativa_id)));

-- empresas
create policy empresas_select on public.empresas for select to authenticated using (public.e_membro(id));
create policy empresas_insert on public.empresas for insert to authenticated with check (auth.uid() is not null);
create policy empresas_update on public.empresas for update to authenticated
  using (public.pode_editar(id)) with check (public.pode_editar(id));
create policy empresas_delete on public.empresas for delete to authenticated using (public.e_dono(id));

-- integrações: só o dono
create policy integracoes_select on public.empresas_integracoes for select to authenticated using (public.e_dono(empresa_id));
create policy integracoes_insert on public.empresas_integracoes for insert to authenticated with check (public.e_dono(empresa_id));
create policy integracoes_update on public.empresas_integracoes for update to authenticated
  using (public.e_dono(empresa_id)) with check (public.e_dono(empresa_id));
create policy integracoes_delete on public.empresas_integracoes for delete to authenticated using (public.e_dono(empresa_id));

-- membros: todos os membros veem; só o dono gerencia; qualquer um pode sair (exceto último dono).
create policy membros_select on public.membros for select to authenticated using (public.e_membro(empresa_id));
create policy membros_insert on public.membros for insert to authenticated with check (public.e_dono(empresa_id));
create policy membros_update on public.membros for update to authenticated
  using (public.e_dono(empresa_id)) with check (public.e_dono(empresa_id));
create policy membros_delete on public.membros for delete to authenticated
  using (public.e_dono(empresa_id) or user_id = auth.uid());

-- convites: só o dono
create policy convites_select on public.convites for select to authenticated using (public.e_dono(empresa_id));
create policy convites_insert on public.convites for insert to authenticated with check (public.e_dono(empresa_id));
create policy convites_update on public.convites for update to authenticated
  using (public.e_dono(empresa_id)) with check (public.e_dono(empresa_id));
create policy convites_delete on public.convites for delete to authenticated using (public.e_dono(empresa_id));

-- Tabelas de conteúdo: membros leem; dono/editor escrevem.
do $$
declare t text;
begin
  foreach t in array array['campanhas','conteudos','stories','tarefas','metricas_semanais','resultados_posts','sugestoes']
  loop
    execute format('create policy %I_select on public.%I for select to authenticated using (public.e_membro(empresa_id))', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.pode_editar(empresa_id))', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.pode_editar(empresa_id))', t, t);
  end loop;
  -- update: editor/dono em tudo; colaborador também (coluna restrita por trigger)
  foreach t in array array['campanhas','metricas_semanais','resultados_posts','sugestoes']
  loop
    execute format('create policy %I_update on public.%I for update to authenticated using (public.pode_editar(empresa_id)) with check (public.pode_editar(empresa_id))', t, t);
  end loop;
  foreach t in array array['conteudos','stories']
  loop
    execute format('create policy %I_update on public.%I for update to authenticated using (public.pode_colaborar(empresa_id)) with check (public.pode_colaborar(empresa_id))', t, t);
  end loop;
end $$;

create policy tarefas_update on public.tarefas for update to authenticated
  using (public.pode_editar(empresa_id) or (public.papel_em(empresa_id) = 'colaborador' and responsavel_id = auth.uid()))
  with check (public.pode_editar(empresa_id) or (public.papel_em(empresa_id) = 'colaborador' and responsavel_id = auth.uid()));

-- comentários: membros leem; dono/editor/colaborador comentam; só o autor edita/apaga (dono também apaga).
create policy comentarios_select on public.comentarios for select to authenticated using (public.e_membro(empresa_id));
create policy comentarios_insert on public.comentarios for insert to authenticated
  with check (public.pode_colaborar(empresa_id) and autor_id = auth.uid());
create policy comentarios_update on public.comentarios for update to authenticated
  using (autor_id = auth.uid()) with check (autor_id = auth.uid());
create policy comentarios_delete on public.comentarios for delete to authenticated
  using (autor_id = auth.uid() or public.e_dono(empresa_id));

-- ---------- RPC: criar empresa ------------------------------------------------
-- Cria a empresa e já registra quem criou como Dono (o trigger faz isso), devolvendo
-- o id. Um INSERT direto com RETURNING falharia na política de SELECT porque a
-- associação como membro só existe depois do trigger AFTER INSERT.
create or replace function public.criar_empresa(p_dados jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado' using errcode = '42501';
  end if;
  if coalesce(trim(p_dados ->> 'nome'), '') = '' then
    raise exception 'Informe o nome da empresa' using errcode = '22023';
  end if;
  insert into public.empresas (
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
    coalesce(p_dados -> 'metas', public.metas_padrao()),
    coalesce(p_dados -> 'ritmo_semanal', public.ritmo_semanal_padrao()),
    auth.uid()
  ) returning id into v_id;
  update public.perfis set empresa_ativa_id = v_id where id = auth.uid();
  return v_id;
end $$;
revoke all on function public.criar_empresa(jsonb) from public, anon;
grant execute on function public.criar_empresa(jsonb) to authenticated;

-- ---------- RPCs de convite ----------------------------------------------------
-- Mostra o convite para quem recebeu o link (sem expor a empresa toda).
create or replace function public.ver_convite(p_token text)
returns table (empresa_nome text, papel public.papel_membro, email text, expirado boolean, aceito boolean)
language sql stable security definer set search_path = public as $$
  select e.nome, c.papel, c.email, c.expira_em < now(), c.aceito_em is not null
  from public.convites c join public.empresas e on e.id = c.empresa_id
  where c.token = p_token
$$;

-- Aceita o convite: o e-mail do usuário logado precisa bater com o do convite.
create or replace function public.aceitar_convite(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.convites%rowtype; v_nome text;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado' using errcode = '42501';
  end if;
  select * into c from public.convites where token = p_token for update;
  if not found then raise exception 'Convite não encontrado' using errcode = 'P0002'; end if;
  if c.aceito_em is not null then raise exception 'Este convite já foi usado' using errcode = '22023'; end if;
  if c.expira_em < now() then raise exception 'Este convite expirou' using errcode = '22023'; end if;
  if lower(c.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Este convite foi enviado para outro e-mail' using errcode = '42501';
  end if;
  select nome into v_nome from public.perfis where id = auth.uid();
  insert into public.membros (empresa_id, user_id, papel, nome_exibicao)
  values (c.empresa_id, auth.uid(), c.papel, v_nome)
  on conflict (empresa_id, user_id) do update set papel = excluded.papel;
  update public.convites set aceito_em = now() where id = c.id;
  update public.perfis set empresa_ativa_id = c.empresa_id where id = auth.uid();
  return c.empresa_id;
end $$;

revoke all on function public.ver_convite(text), public.aceitar_convite(text) from public, anon;
grant execute on function public.ver_convite(text), public.aceitar_convite(text) to authenticated;

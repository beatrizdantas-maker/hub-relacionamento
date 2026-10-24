-- =====================================================================
-- Estúdio · Migration 0004 · E-mail do membro (para a lista de equipe)
-- Outros membros não enxergam auth.users nem perfis alheios; guardamos o
-- e-mail e o nome em membros no momento em que a pessoa entra na empresa.
-- =====================================================================
alter table estudio.membros add column if not exists email text;

create or replace function estudio.tg_empresa_criada()
returns trigger language plpgsql security definer set search_path = estudio, extensions as $$
declare v_nome text; v_email text;
begin
  if new.criado_por is null then
    return new;
  end if;
  select nome, email into v_nome, v_email from estudio.perfis where id = new.criado_por;
  insert into estudio.membros (empresa_id, user_id, papel, nome_exibicao, email)
  values (new.id, new.criado_por, 'dono', coalesce(v_nome, split_part(coalesce(v_email, auth.jwt() ->> 'email', ''), '@', 1)), coalesce(v_email, auth.jwt() ->> 'email'))
  on conflict do nothing;
  insert into estudio.empresas_integracoes (empresa_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create or replace function estudio.aceitar_convite(p_token text)
returns uuid
language plpgsql security definer set search_path = estudio, extensions as $$
declare c estudio.convites%rowtype; v_nome text; v_email text;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado' using errcode = '42501';
  end if;
  select * into c from estudio.convites where token = p_token for update;
  if not found then raise exception 'Convite não encontrado' using errcode = 'P0002'; end if;
  if c.aceito_em is not null then raise exception 'Este convite já foi usado' using errcode = '22023'; end if;
  if c.expira_em < now() then raise exception 'Este convite expirou' using errcode = '22023'; end if;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if lower(c.email) <> v_email then
    raise exception 'Este convite foi enviado para outro e-mail' using errcode = '42501';
  end if;
  select nome into v_nome from estudio.perfis where id = auth.uid();
  insert into estudio.membros (empresa_id, user_id, papel, nome_exibicao, email)
  values (c.empresa_id, auth.uid(), c.papel, coalesce(v_nome, split_part(v_email, '@', 1)), v_email)
  on conflict (empresa_id, user_id) do update set papel = excluded.papel, email = excluded.email;
  update estudio.convites set aceito_em = now() where id = c.id;
  update estudio.perfis set empresa_ativa_id = c.empresa_id where id = auth.uid();
  return c.empresa_id;
end $$;

-- Membro pode editar o próprio nome de exibição (e nada mais).
drop policy if exists membros_update on estudio.membros;
create policy membros_update on estudio.membros for update to authenticated
  using (estudio.e_dono(empresa_id) or user_id = auth.uid())
  with check (estudio.e_dono(empresa_id) or user_id = auth.uid());

create or replace function estudio.tg_membros_restricoes()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;
  if estudio.e_dono(old.empresa_id) then return new; end if;
  if to_jsonb(new) - 'nome_exibicao' <> to_jsonb(old) - 'nome_exibicao' then
    raise exception 'Só o dono altera papéis' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists membros_restricoes on estudio.membros;
create trigger membros_restricoes before update on estudio.membros
  for each row execute function estudio.tg_membros_restricoes();

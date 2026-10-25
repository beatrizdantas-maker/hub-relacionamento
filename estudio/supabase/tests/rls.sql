-- =====================================================================
-- Teste de RLS do Estúdio
-- Rode no SQL Editor do Supabase (ou psql como postgres). Tudo roda numa
-- transação e é desfeito no fim (ROLLBACK). Se algum critério falhar, o
-- script para com "FALHOU: ...". Se passar, imprime "RLS OK".
--
-- Critérios cobertos:
--  1. Usuário de duas empresas nunca vê dados de uma na outra.
--  2. Leitor não consegue editar nada (nem pela API: as políticas valem
--     para qualquer cliente que use a chave anon + JWT do usuário).
--  3. Colaborador só muda status, e só das próprias tarefas.
--  4. Editor edita conteúdo mas não lê/escreve a integração do Metricool.
--  5. Sugestões da IA e stories: só Dono/Editor gravam; Leitor e
--     Colaborador só leem (Colaborador muda status de stories).
--  6. Métricas: Leitor e Colaborador não registram; Editor registra.
-- =====================================================================
begin;

create or replace function pg_temp.entrar(p_user uuid, p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.sair() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Espera que o bloco falhe com erro de permissão/RLS.
create or replace function pg_temp.espera_erro(p_sql text, p_motivo text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;  -- esperado
  end;
  raise exception 'FALHOU: % (comando passou mas deveria ter sido bloqueado)', p_motivo;
end $$;

do $$
declare
  ana   uuid := gen_random_uuid();   -- dona da Empresa A, leitora na B
  bia   uuid := gen_random_uuid();   -- dona da Empresa B
  caio  uuid := gen_random_uuid();   -- colaborador na A
  davi  uuid := gen_random_uuid();   -- editor na A
  emp_a uuid; emp_b uuid;
  conv  text; n int; v_id uuid; t_caio uuid; t_outra uuid;
begin
  -- Usuários de teste (o trigger cria os perfis)
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values
    (ana,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@teste.local',  now(), '{"name":"Ana"}',  now(), now()),
    (bia,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bia@teste.local',  now(), '{"name":"Bia"}',  now(), now()),
    (caio, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'caio@teste.local', now(), '{"name":"Caio"}', now(), now()),
    (davi, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'davi@teste.local', now(), '{"name":"Davi"}', now(), now());

  -- Ana cria a Empresa A
  perform pg_temp.entrar(ana, 'ana@teste.local');
  emp_a := estudio.criar_empresa('{"nome":"Empresa A"}');
  if estudio.papel_em(emp_a) <> 'dono' then raise exception 'FALHOU: criadora deveria ser dona'; end if;
  insert into estudio.conteudos (empresa_id, data, formato, tema) values (emp_a, current_date, 'Reels', 'Conteúdo da A');
  perform pg_temp.sair();

  -- Bia cria a Empresa B e convida Ana como leitora
  perform pg_temp.entrar(bia, 'bia@teste.local');
  emp_b := estudio.criar_empresa('{"nome":"Empresa B"}');
  insert into estudio.conteudos (empresa_id, data, formato, tema) values (emp_b, current_date, 'Carrossel', 'Conteúdo da B');
  insert into estudio.convites (empresa_id, email, papel) values (emp_b, 'ana@teste.local', 'leitor') returning token into conv;
  perform pg_temp.sair();

  -- Ana aceita o convite
  perform pg_temp.entrar(ana, 'ana@teste.local');
  perform estudio.aceitar_convite(conv);
  if estudio.papel_em(emp_b) <> 'leitor' then raise exception 'FALHOU: Ana deveria ser leitora na B'; end if;

  -- 1) Isolamento: Ana vê as duas empresas, mas filtrando por empresa nunca mistura
  select count(*) into n from estudio.empresas; if n <> 2 then raise exception 'FALHOU: Ana deveria ver 2 empresas, viu %', n; end if;
  select count(*) into n from estudio.conteudos where empresa_id = emp_a; if n <> 1 then raise exception 'FALHOU: conteúdos da A'; end if;
  select count(*) into n from estudio.conteudos where empresa_id = emp_b; if n <> 1 then raise exception 'FALHOU: conteúdos da B'; end if;

  -- 2) Leitora na B: não edita nada
  update estudio.empresas set nome = 'x' where id = emp_b; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: leitor conseguiu atualizar empresa B'; end if;
  perform pg_temp.espera_erro(format('insert into estudio.conteudos (empresa_id, data, formato, tema) values (%L, current_date, ''Reels'', ''hack'')', emp_b), 'leitor criou conteúdo');
  perform pg_temp.espera_erro(format('insert into estudio.tarefas (empresa_id, titulo) values (%L, ''hack'')', emp_b), 'leitor criou tarefa');
  perform pg_temp.espera_erro(format('insert into estudio.metricas_semanais (empresa_id, semana) values (%L, date_trunc(''week'', current_date)::date)', emp_b), 'leitor registrou métrica');
  update estudio.conteudos set status = 'aprovado' where empresa_id = emp_b; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: leitor mudou status de conteúdo'; end if;
  delete from estudio.conteudos where empresa_id = emp_b; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: leitor apagou conteúdo'; end if;
  -- Não pode mover um conteúdo da A para a B
  perform pg_temp.espera_erro(format('update estudio.conteudos set empresa_id = %L where empresa_id = %L', emp_b, emp_a), 'moveu conteúdo entre empresas');

  -- Dona da A convida Caio (colaborador) e Davi (editor)
  insert into estudio.membros (empresa_id, user_id, papel, nome_exibicao) values (emp_a, caio, 'colaborador', 'Caio'), (emp_a, davi, 'editor', 'Davi');
  insert into estudio.tarefas (empresa_id, titulo, responsavel_id) values (emp_a, 'Tarefa do Caio', caio) returning id into t_caio;
  insert into estudio.tarefas (empresa_id, titulo, responsavel_id) values (emp_a, 'Tarefa da Ana', ana) returning id into t_outra;
  perform pg_temp.sair();

  -- Bia não vê nada da A
  perform pg_temp.entrar(bia, 'bia@teste.local');
  select count(*) into n from estudio.conteudos where empresa_id = emp_a; if n <> 0 then raise exception 'FALHOU: Bia viu conteúdo da A'; end if;
  select count(*) into n from estudio.membros where empresa_id = emp_a; if n <> 0 then raise exception 'FALHOU: Bia viu membros da A'; end if;
  select count(*) into n from estudio.tarefas; if n <> 0 then raise exception 'FALHOU: Bia viu tarefas da A'; end if;
  perform pg_temp.sair();

  -- 3) Colaborador: conclui a própria tarefa, não a dos outros, não edita título
  perform pg_temp.entrar(caio, 'caio@teste.local');
  update estudio.tarefas set status = 'concluido' where id = t_caio; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: colaborador não conseguiu concluir a própria tarefa'; end if;
  if (select concluido_em from estudio.tarefas where id = t_caio) is null then raise exception 'FALHOU: concluido_em não gravado'; end if;
  update estudio.tarefas set status = 'concluido' where id = t_outra; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: colaborador concluiu tarefa de outra pessoa'; end if;
  perform pg_temp.espera_erro(format('update estudio.tarefas set titulo = ''novo'' where id = %L', t_caio), 'colaborador editou título');
  perform pg_temp.espera_erro(format('update estudio.conteudos set tema = ''novo'' where empresa_id = %L', emp_a), 'colaborador editou tema');
  update estudio.conteudos set status = 'producao' where empresa_id = emp_a; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: colaborador não conseguiu mudar status do conteúdo'; end if;
  insert into estudio.comentarios (empresa_id, tarefa_id, autor_id, texto) values (emp_a, t_caio, caio, 'Feito!');
  perform pg_temp.espera_erro(format('insert into estudio.conteudos (empresa_id, data, formato, tema) values (%L, current_date, ''Reels'', ''x'')', emp_a), 'colaborador criou conteúdo');
  perform pg_temp.sair();

  -- 4) Editor: edita conteúdo e marca; não vê integração; não arquiva
  perform pg_temp.entrar(davi, 'davi@teste.local');
  update estudio.conteudos set tema = 'Editado pelo Davi' where empresa_id = emp_a; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: editor não conseguiu editar conteúdo'; end if;
  update estudio.empresas set sobre = 'Sobre' where id = emp_a; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: editor não conseguiu editar a marca'; end if;
  select count(*) into n from estudio.empresas_integracoes where empresa_id = emp_a; if n <> 0 then raise exception 'FALHOU: editor leu integração'; end if;
  perform pg_temp.espera_erro(format('update estudio.empresas set arquivada = true where id = %L', emp_a), 'editor arquivou empresa');
  delete from estudio.empresas where id = emp_a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: editor excluiu a empresa'; end if;
  perform pg_temp.sair();

  -- 5) Sugestões e stories por papel
  perform pg_temp.entrar(davi, 'davi@teste.local');
  insert into estudio.sugestoes (empresa_id, semana, resumo, dados_reais_usados) values (emp_a, date_trunc('week', current_date)::date, 'Resumo', array['dado 1']) returning id into v_id;
  insert into estudio.stories (empresa_id, data, telas, status, origem) values (emp_a, current_date, '[{"tipo":"Texto","texto":"oi"}]', 'sugestao', 'ia');
  -- 6) Editor registra métrica da semana
  insert into estudio.metricas_semanais (empresa_id, semana, fonte, visualizacoes) values (emp_a, date_trunc('week', current_date)::date, 'manual', 100);
  perform pg_temp.sair();

  perform pg_temp.entrar(caio, 'caio@teste.local');
  select count(*) into n from estudio.sugestoes where empresa_id = emp_a; if n <> 1 then raise exception 'FALHOU: colaborador não leu a sugestão'; end if;
  perform pg_temp.espera_erro(format('insert into estudio.sugestoes (empresa_id, semana, resumo) values (%L, date_trunc(''week'', current_date)::date, ''hack'')', emp_a), 'colaborador gravou sugestão');
  update estudio.sugestoes set resumo = 'hack' where id = v_id; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: colaborador editou sugestão'; end if;
  perform pg_temp.espera_erro(format('insert into estudio.stories (empresa_id, data, telas) values (%L, current_date, ''[]'')', emp_a), 'colaborador criou stories');
  update estudio.stories set status = 'aprovado' where empresa_id = emp_a; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: colaborador não conseguiu aprovar stories'; end if;
  perform pg_temp.espera_erro(format('update estudio.stories set objetivo = ''x'' where empresa_id = %L', emp_a), 'colaborador editou stories');
  perform pg_temp.espera_erro(format('insert into estudio.metricas_semanais (empresa_id, semana) values (%L, date_trunc(''week'', current_date - 7)::date)', emp_a), 'colaborador registrou métrica');
  perform pg_temp.sair();

  -- Leitora na B não grava sugestão nem stories; Bia não vê a sugestão da A
  perform pg_temp.entrar(ana, 'ana@teste.local');
  perform pg_temp.espera_erro(format('insert into estudio.sugestoes (empresa_id, semana, resumo) values (%L, date_trunc(''week'', current_date)::date, ''hack'')', emp_b), 'leitor gravou sugestão');
  perform pg_temp.espera_erro(format('insert into estudio.stories (empresa_id, data, telas) values (%L, current_date, ''[]'')', emp_b), 'leitor criou stories');
  perform pg_temp.sair();
  perform pg_temp.entrar(bia, 'bia@teste.local');
  select count(*) into n from estudio.sugestoes; if n <> 0 then raise exception 'FALHOU: Bia viu sugestão da A'; end if;
  select count(*) into n from estudio.metricas_semanais; if n <> 0 then raise exception 'FALHOU: Bia viu métricas da A'; end if;
  perform pg_temp.sair();

  -- Dona lê a integração e não pode ser removida sendo a única dona
  perform pg_temp.entrar(ana, 'ana@teste.local');
  select count(*) into n from estudio.empresas_integracoes where empresa_id = emp_a; if n <> 1 then raise exception 'FALHOU: dona não leu integração'; end if;
  perform pg_temp.espera_erro(format('delete from estudio.membros where empresa_id = %L and user_id = %L', emp_a, ana), 'última dona removida');
  perform pg_temp.sair();

  raise notice 'RLS OK';
end $$;

rollback;

-- =====================================================================
-- Estúdio · Migration 0001 · Esquema de dados
-- Todas as tabelas de negócio têm empresa_id. Datas no fuso da empresa.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------------------------------------------------
create type public.papel_membro      as enum ('dono', 'editor', 'colaborador', 'leitor');
create type public.formato_conteudo  as enum ('Reels', 'Carrossel', 'Estático');
create type public.status_conteudo   as enum ('sugestao', 'aprovado', 'producao', 'publicado');
create type public.origem_item       as enum ('ia', 'equipe');
create type public.tipo_tarefa       as enum ('Gravar', 'Fotografar', 'Criar arte', 'Editar', 'Revisar', 'Publicar', 'Planejamento', 'Outro');
create type public.prioridade_tarefa as enum ('Alta', 'Média', 'Baixa');
create type public.status_tarefa     as enum ('pendente', 'em_producao', 'aguardando', 'concluido');
create type public.fonte_metrica     as enum ('metricool', 'manual');
create type public.tipo_tela_story   as enum (
  'Foto ou vídeo', 'Texto', 'Compartilhar post', 'Enquete', 'Caixa de pergunta',
  'Quiz', 'Slider de emoji', 'Slider', 'Contagem regressiva', 'Link'
);

-- ---------- Perfis (1:1 com auth.users) ------------------------------
create table public.perfis (
  id               uuid primary key references auth.users (id) on delete cascade,
  nome             text,
  email            text,
  empresa_ativa_id uuid,                       -- última empresa usada (FK adicionada abaixo)
  tema             text not null default 'sistema' check (tema in ('claro', 'escuro', 'sistema')),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ---------- Empresas -------------------------------------------------
create table public.empresas (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null check (char_length(nome) between 1 and 120),
  perfil_instagram    text,
  sobre               text,
  publico             text,
  objetivos           text,
  tom_de_voz          text,
  regras_de_linguagem text,
  regras_de_imagem    text,
  pilares             text[] not null default '{}',
  melhores_horarios   text,
  cor_primaria        text not null default '#7C3AED' check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria      text not null default '#F59E0B' check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  fuso_horario        text not null default 'America/Sao_Paulo',
  metas               jsonb not null default '{}'::jsonb,
  ritmo_semanal       jsonb not null default '[]'::jsonb,
  arquivada           boolean not null default false,
  criado_por          uuid references auth.users (id) on delete set null,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

alter table public.perfis
  add constraint perfis_empresa_ativa_fk
  foreign key (empresa_ativa_id) references public.empresas (id) on delete set null;

-- Integração Metricool: tabela separada para que o token nunca saia em um
-- "select *" de empresas. Só o Dono lê e escreve (ver RLS).
create table public.empresas_integracoes (
  empresa_id              uuid primary key references public.empresas (id) on delete cascade,
  metricool_brand_id      text,
  metricool_token_cifrado text,                -- AES-256-GCM, cifrado no servidor
  ultima_importacao_em    timestamptz,
  atualizado_em           timestamptz not null default now()
);

-- ---------- Membros e convites ---------------------------------------
create table public.membros (
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  papel         public.papel_membro not null default 'leitor',
  nome_exibicao text,
  convidado_em  timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index membros_user_idx on public.membros (user_id);

create table public.convites (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  email      text not null,
  papel      public.papel_membro not null default 'leitor',
  token      text not null unique default encode(gen_random_bytes(24), 'hex'),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null default now() + interval '7 days',
  aceito_em  timestamptz
);
create index convites_empresa_idx on public.convites (empresa_id);
create unique index convites_email_pendente_uq
  on public.convites (empresa_id, lower(email)) where aceito_em is null;

-- ---------- Campanhas ------------------------------------------------
create table public.campanhas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome       text not null,
  inicio     date,
  fim        date,
  descricao  text,
  criado_em  timestamptz not null default now(),
  check (fim is null or inicio is null or fim >= inicio)
);
create index campanhas_empresa_idx on public.campanhas (empresa_id);

-- ---------- Conteúdos (posts, carrosséis, Reels) ---------------------
create table public.conteudos (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  data            date not null,
  hora            time,
  formato         public.formato_conteudo not null,
  tipo            text,
  pilar           text,
  tema            text not null default '',
  objetivo        text,
  roteiro         text,
  legenda         text,
  cta             text,
  orientacao_arte text,
  ganchos         jsonb not null default '[]'::jsonb,   -- Reels: 3 ganchos alternativos
  notas           text,
  status          public.status_conteudo not null default 'sugestao',
  origem          public.origem_item not null default 'equipe',
  campanha_id     uuid references public.campanhas (id) on delete set null,
  criado_por      uuid references auth.users (id) on delete set null,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index conteudos_empresa_data_idx on public.conteudos (empresa_id, data);
create index conteudos_campanha_idx on public.conteudos (campanha_id);

-- ---------- Stories --------------------------------------------------
create table public.stories (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  data        date not null,
  objetivo    text,
  telas       jsonb not null default '[]'::jsonb,       -- [{tipo, texto, interacao}]
  status      public.status_conteudo not null default 'sugestao',
  origem      public.origem_item not null default 'equipe',
  conteudo_id uuid references public.conteudos (id) on delete set null,
  criado_por  uuid references auth.users (id) on delete set null,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index stories_empresa_data_idx on public.stories (empresa_id, data);

-- ---------- Tarefas --------------------------------------------------
create table public.tarefas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  titulo         text not null check (char_length(titulo) between 1 and 200),
  conteudo_id    uuid references public.conteudos (id) on delete cascade,
  tipo           public.tipo_tarefa not null default 'Outro',
  responsavel_id uuid references auth.users (id) on delete set null,
  prazo          date,
  prioridade     public.prioridade_tarefa not null default 'Média',
  status         public.status_tarefa not null default 'pendente',
  concluido_em   timestamptz,
  origem         public.origem_item not null default 'equipe',
  criado_por     uuid references auth.users (id) on delete set null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index tarefas_empresa_prazo_idx on public.tarefas (empresa_id, prazo);
create index tarefas_conteudo_idx on public.tarefas (conteudo_id);
create index tarefas_responsavel_idx on public.tarefas (responsavel_id);

-- ---------- Comentários (Colaborador pode comentar) ------------------
create table public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tarefa_id   uuid references public.tarefas (id) on delete cascade,
  conteudo_id uuid references public.conteudos (id) on delete cascade,
  autor_id    uuid not null references auth.users (id) on delete cascade,
  texto       text not null check (char_length(texto) between 1 and 4000),
  criado_em   timestamptz not null default now(),
  check (tarefa_id is not null or conteudo_id is not null)
);
create index comentarios_tarefa_idx on public.comentarios (tarefa_id);
create index comentarios_conteudo_idx on public.comentarios (conteudo_id);

-- ---------- Métricas semanais (segunda a domingo) --------------------
create table public.metricas_semanais (
  empresa_id           uuid not null references public.empresas (id) on delete cascade,
  semana               date not null,                   -- sempre uma segunda-feira
  fim                  date generated always as (semana + 6) stored,
  fonte                public.fonte_metrica not null default 'manual',
  seguidores           integer,
  seguidores_ganhos    integer,
  seguidores_perdidos  integer,
  visualizacoes        integer,
  alcance              integer,
  interacoes           integer,
  alcance_posts        integer,
  compartilhamentos    integer,
  salvamentos          integer,
  posts                integer,
  reels                integer,
  stories              integer,
  respostas_stories    integer,
  cliques_link         integer,                         -- manual, nunca sobrescrito pelo Metricool
  mensagens_direct     integer,                         -- manual, nunca sobrescrito pelo Metricool
  dias_com_dados       smallint not null default 0 check (dias_com_dados between 0 and 7),
  ultimo_dia           date,
  editado_manual       boolean not null default false,
  notas                text,
  atualizado_em        timestamptz not null default now(),
  primary key (empresa_id, semana),
  check (extract(isodow from semana) = 1)              -- segunda-feira
);

-- ---------- Resultados por post ---------------------------------------
create table public.resultados_posts (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas (id) on delete cascade,
  id_externo        text,                               -- id do post no Metricool/Instagram
  publicado_em      timestamptz not null,
  formato           public.formato_conteudo,
  titulo            text,
  url               text,
  alcance           integer,
  visualizacoes     integer,
  curtidas          integer,
  comentarios       integer,
  salvamentos       integer,
  compartilhamentos integer,
  interacoes        integer,
  seguidores_ganhos integer,
  tempo_medio       numeric(10,2),                      -- segundos (Reels)
  taxa_visualizacao numeric(6,2),                       -- % (Reels)
  fonte             public.fonte_metrica not null default 'manual',
  conteudo_id       uuid references public.conteudos (id) on delete set null,
  atualizado_em     timestamptz not null default now()
);
create index resultados_posts_empresa_data_idx on public.resultados_posts (empresa_id, publicado_em desc);
create unique index resultados_posts_externo_uq
  on public.resultados_posts (empresa_id, id_externo) where id_externo is not null;

-- ---------- Sugestões da IA --------------------------------------------
create table public.sugestoes (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresas (id) on delete cascade,
  semana             date not null,                     -- segunda-feira da semana sugerida
  gerado_em          timestamptz not null default now(),
  gerado_por         uuid references auth.users (id) on delete set null,
  resumo             text not null default '',
  dados_reais_usados text[] not null default '{}',      -- preenchido pelo sistema, nunca pela IA
  manter             text[] not null default '{}',
  melhorar           text[] not null default '{}',
  testar             text[] not null default '{}',
  ideias             jsonb not null default '[]'::jsonb, -- [{titulo, formato, dia, motivo, legenda, cta}]
  check (extract(isodow from semana) = 1)
);
create index sugestoes_empresa_idx on public.sugestoes (empresa_id, gerado_em desc);

-- ---------- Triggers utilitários ---------------------------------------
create or replace function public.tg_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfis','empresas','empresas_integracoes','conteudos','stories','tarefas','metricas_semanais','resultados_posts']
  loop
    execute format('create trigger %I_atualizado_em before update on public.%I for each row execute function public.tg_atualizado_em()', t, t);
  end loop;
end $$;

-- Concluir tarefa grava concluido_em; reabrir limpa.
create or replace function public.tg_tarefa_concluida()
returns trigger language plpgsql as $$
begin
  if new.status = 'concluido' and (tg_op = 'INSERT' or old.status is distinct from 'concluido') then
    new.concluido_em := coalesce(new.concluido_em, now());
  elsif new.status <> 'concluido' then
    new.concluido_em := null;
  end if;
  return new;
end $$;
create trigger tarefas_concluida before insert or update on public.tarefas
  for each row execute function public.tg_tarefa_concluida();

-- Perfil criado automaticamente para cada usuário novo.
create or replace function public.tg_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_novo_usuario();

-- Quem cria a empresa vira Dono.
create or replace function public.tg_empresa_criada()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if new.criado_por is null then
    return new;
  end if;
  select nome into v_nome from public.perfis where id = new.criado_por;
  insert into public.membros (empresa_id, user_id, papel, nome_exibicao)
  values (new.id, new.criado_por, 'dono', v_nome)
  on conflict do nothing;
  insert into public.empresas_integracoes (empresa_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger empresas_criada after insert on public.empresas
  for each row execute function public.tg_empresa_criada();

-- criado_por sempre é o usuário autenticado (nunca confiar no cliente).
create or replace function public.tg_define_criado_por()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new.criado_por := auth.uid();
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['empresas','convites','conteudos','stories','tarefas']
  loop
    execute format('create trigger %I_criado_por before insert on public.%I for each row execute function public.tg_define_criado_por()', t, t);
  end loop;
end $$;

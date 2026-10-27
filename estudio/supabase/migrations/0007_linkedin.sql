-- =====================================================================
-- Estúdio · Migration 0007 · LinkedIn
-- Cada conteúdo pertence a uma rede (Instagram ou LinkedIn). A empresa
-- escolhe as redes em que atua e tem um ritmo semanal próprio no LinkedIn.
-- Formatos novos (só usados no LinkedIn): Texto, Enquete e Artigo. No
-- LinkedIn, "Reels" aparece como Vídeo, "Estático" como Imagem e
-- "Carrossel" como Carrossel (PDF).
-- =====================================================================
alter type estudio.formato_conteudo add value if not exists 'Texto';
alter type estudio.formato_conteudo add value if not exists 'Enquete';
alter type estudio.formato_conteudo add value if not exists 'Artigo';

alter table estudio.conteudos add column if not exists rede text not null default 'instagram';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'conteudos_rede_valida') then
    alter table estudio.conteudos add constraint conteudos_rede_valida check (rede in ('instagram', 'linkedin'));
  end if;
end $$;
create index if not exists conteudos_empresa_rede_data_idx on estudio.conteudos (empresa_id, rede, data);

alter table estudio.empresas add column if not exists redes text[] not null default '{instagram}';
alter table estudio.empresas add column if not exists ritmo_linkedin jsonb not null default '[
  {"dia":1,"hora":"08:00","formato":"Texto","tipo":"Texto de opinião sobre educação","pilar":"","objetivo":"engajamento"},
  {"dia":2,"hora":"12:00","formato":"Carrossel","tipo":"Carrossel em PDF com método ou passo a passo","pilar":"","objetivo":"salvamentos"},
  {"dia":3,"hora":"08:00","formato":"Reels","tipo":"Vídeo curto com especialista falando","pilar":"","objetivo":"alcance"},
  {"dia":4,"hora":"12:00","formato":"Texto","tipo":"Caso de escola atendida (prova social)","pilar":"","objetivo":"direct"},
  {"dia":5,"hora":"09:00","formato":"Estático","tipo":"Imagem de bastidores da equipe","pilar":"","objetivo":"engajamento"},
  {"dia":6,"hora":"10:00","formato":"Enquete","tipo":"Enquete sobre desafio da gestão escolar","pilar":"","objetivo":"comentarios"},
  {"dia":7,"hora":"18:00","formato":"Texto","tipo":"Reflexão da semana","pilar":"","objetivo":"alcance"}
]'::jsonb;

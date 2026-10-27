-- =====================================================================
-- Estúdio · Migration 0008 · LinkedIn sem carrossel
-- Novo ritmo padrão do LinkedIn (um post por dia, sem carrossel/PDF):
-- seg texto · ter vídeo · qua caso de escola · qui imagem com dado ·
-- sex vídeo de bastidores · sáb enquete · dom reflexão.
-- Empresas que ainda usam o ritmo padrão antigo passam para o novo;
-- quem já personalizou o ritmo fica como está.
-- =====================================================================
do $$
declare
  v_antigo jsonb := '[
    {"dia":1,"hora":"08:00","formato":"Texto","tipo":"Texto de opinião sobre educação","pilar":"","objetivo":"engajamento"},
    {"dia":2,"hora":"12:00","formato":"Carrossel","tipo":"Carrossel em PDF com método ou passo a passo","pilar":"","objetivo":"salvamentos"},
    {"dia":3,"hora":"08:00","formato":"Reels","tipo":"Vídeo curto com especialista falando","pilar":"","objetivo":"alcance"},
    {"dia":4,"hora":"12:00","formato":"Texto","tipo":"Caso de escola atendida (prova social)","pilar":"","objetivo":"direct"},
    {"dia":5,"hora":"09:00","formato":"Estático","tipo":"Imagem de bastidores da equipe","pilar":"","objetivo":"engajamento"},
    {"dia":6,"hora":"10:00","formato":"Enquete","tipo":"Enquete sobre desafio da gestão escolar","pilar":"","objetivo":"comentarios"},
    {"dia":7,"hora":"18:00","formato":"Texto","tipo":"Reflexão da semana","pilar":"","objetivo":"alcance"}
  ]';
  v_novo jsonb := '[
    {"dia":1,"hora":"08:00","formato":"Texto","tipo":"Texto de opinião sobre educação","pilar":"","objetivo":"engajamento"},
    {"dia":2,"hora":"12:00","formato":"Reels","tipo":"Vídeo curto com especialista falando","pilar":"","objetivo":"alcance"},
    {"dia":3,"hora":"08:00","formato":"Texto","tipo":"Caso de escola atendida (prova social), com foto real","pilar":"","objetivo":"direct"},
    {"dia":4,"hora":"12:00","formato":"Estático","tipo":"Imagem com um dado ou aprendizado da gestão escolar","pilar":"","objetivo":"engajamento"},
    {"dia":5,"hora":"09:00","formato":"Reels","tipo":"Vídeo de bastidores ou depoimento de escola","pilar":"","objetivo":"alcance"},
    {"dia":6,"hora":"10:00","formato":"Enquete","tipo":"Enquete sobre desafio da gestão escolar","pilar":"","objetivo":"comentarios"},
    {"dia":7,"hora":"18:00","formato":"Texto","tipo":"Reflexão da semana","pilar":"","objetivo":"alcance"}
  ]';
begin
  execute format('alter table estudio.empresas alter column ritmo_linkedin set default %L::jsonb', v_novo);
  update estudio.empresas set ritmo_linkedin = v_novo where ritmo_linkedin = v_antigo;
end $$;

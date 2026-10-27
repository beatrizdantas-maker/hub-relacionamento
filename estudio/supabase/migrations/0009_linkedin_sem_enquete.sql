-- =====================================================================
-- Estúdio · Migration 0009 · LinkedIn só com texto, vídeo, foto e artigo
-- São os formatos do botão de publicar da página da empresa. Sábado deixa
-- de ser enquete e vira texto com pergunta para os comentários; quinta
-- passa a se chamar foto. Só troca o ritmo de quem ainda usa o padrão.
-- =====================================================================
do $$
declare
  v_antigo jsonb := '[
    {"dia":1,"hora":"08:00","formato":"Texto","tipo":"Texto de opinião sobre educação","pilar":"","objetivo":"engajamento"},
    {"dia":2,"hora":"12:00","formato":"Reels","tipo":"Vídeo curto com especialista falando","pilar":"","objetivo":"alcance"},
    {"dia":3,"hora":"08:00","formato":"Texto","tipo":"Caso de escola atendida (prova social), com foto real","pilar":"","objetivo":"direct"},
    {"dia":4,"hora":"12:00","formato":"Estático","tipo":"Imagem com um dado ou aprendizado da gestão escolar","pilar":"","objetivo":"engajamento"},
    {"dia":5,"hora":"09:00","formato":"Reels","tipo":"Vídeo de bastidores ou depoimento de escola","pilar":"","objetivo":"alcance"},
    {"dia":6,"hora":"10:00","formato":"Enquete","tipo":"Enquete sobre desafio da gestão escolar","pilar":"","objetivo":"comentarios"},
    {"dia":7,"hora":"18:00","formato":"Texto","tipo":"Reflexão da semana","pilar":"","objetivo":"alcance"}
  ]';
  v_novo jsonb := '[
    {"dia":1,"hora":"08:00","formato":"Texto","tipo":"Texto de opinião sobre educação","pilar":"","objetivo":"engajamento"},
    {"dia":2,"hora":"12:00","formato":"Reels","tipo":"Vídeo curto com especialista falando","pilar":"","objetivo":"alcance"},
    {"dia":3,"hora":"08:00","formato":"Texto","tipo":"Caso de escola atendida (prova social), com foto real","pilar":"","objetivo":"direct"},
    {"dia":4,"hora":"12:00","formato":"Estático","tipo":"Foto com um dado ou aprendizado da gestão escolar","pilar":"","objetivo":"engajamento"},
    {"dia":5,"hora":"09:00","formato":"Reels","tipo":"Vídeo de bastidores ou depoimento de escola","pilar":"","objetivo":"alcance"},
    {"dia":6,"hora":"10:00","formato":"Texto","tipo":"Pergunta para os gestores responderem nos comentários","pilar":"","objetivo":"comentarios"},
    {"dia":7,"hora":"18:00","formato":"Texto","tipo":"Reflexão da semana","pilar":"","objetivo":"alcance"}
  ]';
begin
  execute format('alter table estudio.empresas alter column ritmo_linkedin set default %L::jsonb', v_novo);
  update estudio.empresas set ritmo_linkedin = v_novo where ritmo_linkedin = v_antigo;
end $$;

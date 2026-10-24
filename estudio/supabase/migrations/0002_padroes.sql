-- =====================================================================
-- Estúdio · Migration 0002 · Valores padrão de ritmo semanal e metas
-- =====================================================================

-- Ritmo semanal padrão (seção 6 da especificação). dia: 1 = segunda … 7 = domingo.
create or replace function public.ritmo_semanal_padrao()
returns jsonb language sql immutable as $$
  select '[
    {"dia":1,"hora":"12:00","formato":"Carrossel","tipo":"Carrossel salvável","pilar":"","objetivo":"salvamentos"},
    {"dia":2,"hora":"20:00","formato":"Reels","tipo":"Reels com a pessoa da marca falando","pilar":"","objetivo":"alcance"},
    {"dia":3,"hora":"20:00","formato":"Reels","tipo":"Reels de prova social","pilar":"","objetivo":"direct"},
    {"dia":4,"hora":"12:00","formato":"Carrossel","tipo":"Campanha ativa","pilar":"","objetivo":"engajamento"},
    {"dia":5,"hora":"19:00","formato":"Carrossel","tipo":"Carrossel de dor do cliente","pilar":"","objetivo":"direct"},
    {"dia":6,"hora":"20:00","formato":"Estático","tipo":"Estático de identificação","pilar":"","objetivo":"comentarios"},
    {"dia":7,"hora":"20:00","formato":"Reels","tipo":"Reels com texto na tela","pilar":"","objetivo":"compartilhamentos"}
  ]'::jsonb
$$;

create or replace function public.metas_padrao()
returns jsonb language sql immutable as $$
  select '{
    "visualizacoes_dia": null,
    "seguidores_liquidos_mes": null,
    "mensagens_mes": null,
    "salvamentos_carrossel": null,
    "alcance_reels": null,
    "engajamento_pct": null
  }'::jsonb
$$;

alter table public.empresas
  alter column ritmo_semanal set default public.ritmo_semanal_padrao(),
  alter column metas set default public.metas_padrao();

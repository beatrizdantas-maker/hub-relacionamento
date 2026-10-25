-- =====================================================================
-- Estúdio · Migration 0005 · User ID do Metricool
-- A API do Metricool exige userId + blogId em toda chamada (além do token).
-- =====================================================================
alter table estudio.empresas_integracoes add column if not exists metricool_user_id text;
alter table estudio.empresas_integracoes add column if not exists ultima_semana_importada date;

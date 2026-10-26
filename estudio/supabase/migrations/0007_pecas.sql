-- =====================================================================
-- Estúdio · Migration 0007 · Peças prontas do conteúdo
-- Texto estruturado que o sistema transforma em imagens (carrossel,
-- estático), vídeo (Reels de texto) ou roteiro falado (Reels com pessoa).
-- =====================================================================
alter table estudio.conteudos add column if not exists pecas jsonb;

/**
 * URL e chave publicável do Supabase (projeto GAME).
 * São valores PÚBLICOS por natureza (vão para o navegador) e a segurança
 * fica no RLS, por isso podem ter um padrão aqui. Variáveis de ambiente,
 * quando definidas, têm prioridade (ex.: outro projeto em desenvolvimento).
 * Chaves secretas (service role, Anthropic, cifra) NUNCA entram aqui.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oxenvlnvyrfjfvbbdgbm.supabase.co";
export const SUPABASE_CHAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Q61AU4ktT29A6-29bGJQQg_J7XmXvEn";

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Base da API pública (/api/v1) usada por integrações externas.
//
// Decisões que valem explicação:
//
// 1. A chave é guardada só como hash. O valor em claro aparece uma única vez,
//    na criação. Se o banco vazar, as chaves não vão junto.
// 2. Toda consulta é fechada por escola_id vindo DA CHAVE, nunca do corpo da
//    requisição. Assim uma integração não consegue pedir dados de outra escola
//    nem gravar registro no lugar errado, mesmo mandando escola_id no payload.
// 3. Usamos a chave de serviço do Supabase, que ignora o RLS — por isso o
//    filtro por escola aqui é obrigatório e não opcional.
// ============================================================================

export const PREFIXO_CHAVE = "hub_live_";

/** Gera uma chave nova. O valor em claro só existe neste retorno. */
export function gerarChave() {
  const corpo = crypto.randomBytes(24).toString("hex");
  const chave = PREFIXO_CHAVE + corpo;
  return { chave, prefixo: chave.slice(0, 17), hash: hashDaChave(chave) };
}

export function hashDaChave(chave) {
  return crypto.createHash("sha256").update(String(chave).trim()).digest("hex");
}

/** Cliente com permissão total. Só use depois de autenticar e sempre filtrando por escola. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    const falta = !url ? "NEXT_PUBLIC_SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY";
    throw new Error("CONFIG_AUSENTE:" + falta);
  }
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const json = (dados, status = 200) =>
  Response.json(dados, { status, headers: { "Cache-Control": "no-store" } });

export const erro = (mensagem, status = 400, extra) =>
  json({ erro: mensagem, ...(extra || {}) }, status);

/**
 * Valida a chave do cabeçalho Authorization: Bearer <chave>.
 * Devolve { escola, chave } ou { resposta } com o erro pronto.
 */
export async function autenticar(request, { precisaEscrita = false } = {}) {
  const header = request.headers.get("authorization") || "";
  const valor = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!valor)
    return { resposta: erro("Informe a chave em 'Authorization: Bearer SUA_CHAVE'.", 401) };
  if (!valor.startsWith(PREFIXO_CHAVE))
    return { resposta: erro("Formato de chave inválido.", 401) };

  let db;
  try { db = supabaseAdmin(); }
  catch (e) {
    if (String(e.message).startsWith("CONFIG_AUSENTE"))
      return { resposta: erro("API não configurada no servidor. Avise o responsável técnico.", 503) };
    throw e;
  }

  const { data: chave, error } = await db
    .from("api_keys")
    .select("id, escola_id, nome, escopo, ativo, total_usos")
    .eq("chave_hash", hashDaChave(valor))
    .maybeSingle();

  if (error) return { resposta: erro("Falha ao validar a chave.", 500) };
  if (!chave || !chave.ativo) return { resposta: erro("Chave inválida ou revogada.", 401) };

  if (precisaEscrita && chave.escopo !== "escrita")
    return { resposta: erro("Esta chave é somente de leitura.", 403) };

  const { data: escola } = await db
    .from("escolas")
    .select("id, nome, suspensa")
    .eq("id", chave.escola_id)
    .maybeSingle();

  if (!escola) return { resposta: erro("Escola da chave não encontrada.", 403) };
  if (escola.suspensa) return { resposta: erro("Escola suspensa. Acesso bloqueado.", 403) };

  return { db, chave, escola };
}

/** Registra o uso sem travar a resposta: falha de log nunca derruba a chamada. */
export function registrarUso({ db, chave, escola, request, status, inicio }) {
  if (!db || !chave) return;
  const url = new URL(request.url);
  Promise.all([
    db.from("api_keys")
      .update({ ultimo_uso: new Date().toISOString(), total_usos: (chave.total_usos || 0) + 1 })
      .eq("id", chave.id),
    db.from("api_logs").insert([{
      api_key_id: chave.id,
      escola_id: escola ? escola.id : null,
      metodo: request.method,
      rota: url.pathname,
      status,
      ms: Date.now() - inicio,
      ip: request.headers.get("x-forwarded-for") || null,
    }]),
  ]).catch(() => {});
}

/**
 * Envolve o handler: autentica, mede o tempo, registra o uso e padroniza o erro.
 * O handler recebe { db, chave, escola, request, params, query }.
 */
export function rota(handler, { precisaEscrita = false } = {}) {
  return async (request, contexto) => {
    const inicio = Date.now();
    const auth = await autenticar(request, { precisaEscrita });
    if (auth.resposta) return auth.resposta;

    const { db, chave, escola } = auth;
    let resposta;
    try {
      const params = contexto && contexto.params ? await contexto.params : {};
      const query = Object.fromEntries(new URL(request.url).searchParams);
      resposta = await handler({ db, chave, escola, request, params, query });
    } catch (e) {
      console.error("[api/v1]", e);
      resposta = erro("Erro interno ao processar a requisição.", 500);
    }
    registrarUso({ db, chave, escola, request, status: resposta.status, inicio });
    return resposta;
  };
}

// ── auxiliares de consulta ─────────────────────────────────────────────────

/** Paginação por página/por_pagina, com teto para não derrubar o banco. */
export function paginacao(query) {
  const pagina = Math.max(1, parseInt(query.pagina || "1", 10) || 1);
  const porPagina = Math.min(200, Math.max(1, parseInt(query.por_pagina || "50", 10) || 50));
  return { pagina, porPagina, de: (pagina - 1) * porPagina, ate: pagina * porPagina - 1 };
}

export const envelope = (dados, { pagina, porPagina, total }) => ({
  dados,
  paginacao: {
    pagina, por_pagina: porPagina, total,
    total_paginas: total === null ? null : Math.ceil(total / porPagina),
  },
});

/** Lê o corpo JSON, devolvendo erro legível em vez de estourar. */
export async function corpo(request) {
  try {
    const dados = await request.json();
    if (!dados || typeof dados !== "object") return { erroMsg: "Corpo deve ser um objeto JSON." };
    return { dados };
  } catch {
    return { erroMsg: "Corpo inválido: envie JSON válido." };
  }
}

/** Mantém só os campos permitidos. Impede que a integração grave coluna que não deve. */
export function apenasCampos(objeto, permitidos) {
  const saida = {};
  for (const campo of permitidos)
    if (objeto[campo] !== undefined) saida[campo] = objeto[campo];
  return saida;
}

export function faltando(objeto, obrigatorios) {
  const faltam = obrigatorios.filter(c => objeto[c] === undefined || objeto[c] === null || objeto[c] === "");
  return faltam.length ? faltam : null;
}

// ── normalização de valores vindos de fora ─────────────────────────────────
// Integração externa raramente manda o texto exato com acento e caixa certa.
// Exigir "CONCLUÍDO" literal faz a API recusar pedido correto por detalhe de
// digitação. Aceitamos as variações e gravamos sempre o valor canônico.
const semAcento = (v) =>
  String(v || "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const STATUS = {
  pendente: "PENDENTE", aberto: "PENDENTE", novo: "PENDENTE",
  resolvendo: "RESOLVENDO", "em andamento": "RESOLVENDO", andamento: "RESOLVENDO",
  concluido: "CONCLUÍDO", resolvido: "CONCLUÍDO", finalizado: "CONCLUÍDO",
  fechado: "CONCLUÍDO", encerrado: "CONCLUÍDO",
};

const URGENCIA = {
  baixa: "BAIXA", baixo: "BAIXA",
  media: "MEDIA", medio: "MEDIA", moderada: "MEDIA", normal: "MEDIA",
  alta: "ALTA", alto: "ALTA", critica: "ALTA", urgente: "ALTA",
};

export const normalizarStatus = (v) => STATUS[semAcento(v)] || null;
export const normalizarUrgencia = (v) => URGENCIA[semAcento(v)] || null;

export const VALORES_STATUS = "PENDENTE, RESOLVENDO, CONCLUIDO (acento e maiúscula são opcionais)";
export const VALORES_URGENCIA = "BAIXA, MEDIA, ALTA (acento e maiúscula são opcionais)";

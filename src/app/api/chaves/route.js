import { usuarioAutenticado, naoAutorizado } from "../../../lib/api-auth";
import { gerarChave, supabaseAdmin, json, erro } from "../../../lib/api-v1";

// Rota interna do painel: cria e lista as chaves de integração.
// Quem chama é a Direção logada no sistema, não uma integração.
async function direcaoLogada(request) {
  const user = await usuarioAutenticado(request);
  if (!user) return { resposta: naoAutorizado() };

  let db;
  try { db = supabaseAdmin(); }
  catch { return { resposta: erro("API não configurada no servidor. Falta a chave de serviço do Supabase.", 503) }; }

  const { data: perfil } = await db.from("profiles")
    .select("id, nome, perfil, escola_id").eq("id", user.id).maybeSingle();

  if (!perfil) return { resposta: erro("Perfil não encontrado.", 403) };
  if (!["DIRECAO", "SUPER_ADMIN"].includes(perfil.perfil))
    return { resposta: erro("Somente a direção pode gerenciar chaves de integração.", 403) };

  return { db, perfil };
}

// GET /api/chaves — lista as chaves da escola (sem o valor, que não é recuperável)
export async function GET(request) {
  const ctx = await direcaoLogada(request);
  if (ctx.resposta) return ctx.resposta;
  const { db, perfil } = ctx;

  const escolaId = new URL(request.url).searchParams.get("escola_id") || perfil.escola_id;
  if (perfil.perfil !== "SUPER_ADMIN" && escolaId !== perfil.escola_id)
    return erro("Sem acesso às chaves desta escola.", 403);

  const { data, error } = await db.from("api_keys")
    .select("id, nome, prefixo, escopo, ativo, created_at, ultimo_uso, total_usos, revogada_em")
    .eq("escola_id", escolaId).order("created_at", { ascending: false });

  if (error) return erro("Falha ao listar chaves: " + error.message, 500);
  return json({ dados: data || [] });
}

// POST /api/chaves — cria uma chave. O valor aparece UMA vez e não fica salvo.
export async function POST(request) {
  const ctx = await direcaoLogada(request);
  if (ctx.resposta) return ctx.resposta;
  const { db, perfil } = ctx;

  let body;
  try { body = await request.json(); } catch { return erro("Corpo inválido.", 400); }

  const nome = String(body.nome || "").trim();
  if (nome.length < 3) return erro("Dê um nome à chave (ex.: 'Bot WhatsApp').", 422);

  const escopo = body.escopo === "escrita" ? "escrita" : "leitura";
  const escolaId = body.escola_id || perfil.escola_id;
  if (perfil.perfil !== "SUPER_ADMIN" && escolaId !== perfil.escola_id)
    return erro("Sem acesso a esta escola.", 403);
  if (!escolaId) return erro("Chave precisa estar vinculada a uma escola.", 422);

  const { chave, prefixo, hash } = gerarChave();

  const { data, error } = await db.from("api_keys").insert([{
    escola_id: escolaId, nome, prefixo, chave_hash: hash, escopo, criado_por: perfil.id,
  }]).select("id, nome, prefixo, escopo, ativo, created_at").single();

  if (error) return erro("Falha ao criar chave: " + error.message, 500);

  // única vez que o valor em claro sai do servidor
  return json({ ...data, chave, aviso: "Guarde esta chave agora. Ela não poderá ser vista de novo." }, 201);
}

// PATCH /api/chaves — revoga (ou reativa) uma chave
export async function PATCH(request) {
  const ctx = await direcaoLogada(request);
  if (ctx.resposta) return ctx.resposta;
  const { db, perfil } = ctx;

  let body;
  try { body = await request.json(); } catch { return erro("Corpo inválido.", 400); }
  if (!body.id) return erro("Informe o id da chave.", 422);

  const { data: alvo } = await db.from("api_keys").select("id, escola_id").eq("id", body.id).maybeSingle();
  if (!alvo) return erro("Chave não encontrada.", 404);
  if (perfil.perfil !== "SUPER_ADMIN" && alvo.escola_id !== perfil.escola_id)
    return erro("Sem acesso a esta chave.", 403);

  const ativo = body.ativo === true;
  const { data, error } = await db.from("api_keys")
    .update({ ativo, revogada_em: ativo ? null : new Date().toISOString() })
    .eq("id", body.id)
    .select("id, nome, prefixo, escopo, ativo, revogada_em").single();

  if (error) return erro("Falha ao atualizar chave: " + error.message, 500);
  return json(data);
}

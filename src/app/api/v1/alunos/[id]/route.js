import { rota, json, erro, corpo, apenasCampos } from "../../../../../lib/api-v1";

const CAMPOS = "id, nome, turma, rm, risco, responsavel, telefone, segmento, created_at";
const GRAVAVEIS = ["nome", "turma", "rm", "responsavel", "telefone", "segmento"];

// GET /api/v1/alunos/{id} — ficha do aluno, com o histórico recente
export const GET = rota(async ({ db, escola, params, query }) => {
  const { data: aluno, error } = await db.from("alunos")
    .select(CAMPOS).eq("escola_id", escola.id).eq("id", params.id).maybeSingle();

  if (error) return erro("Falha ao consultar aluno: " + error.message, 500);
  if (!aluno) return erro("Aluno não encontrado nesta escola.", 404);

  if (query.incluir_historico === "false") return json(aluno);

  const limite = Math.min(100, parseInt(query.limite_historico || "20", 10) || 20);
  const { data: comunicacoes } = await db.from("comunicacoes")
    .select("id, data_registro, titulo, detalhes, motivo_nome, motivo_pontos, urgencia, status, autor_nome, encaminhamento, enc_destino, enc_status, resolucao, created_at")
    .eq("escola_id", escola.id).eq("aluno_id", params.id)
    .order("created_at", { ascending: false }).limit(limite);

  return json({ ...aluno, comunicacoes: comunicacoes || [] });
});

// PATCH /api/v1/alunos/{id} — atualiza dados cadastrais
export const PATCH = rota(async ({ db, escola, params, request }) => {
  const { dados, erroMsg } = await corpo(request);
  if (erroMsg) return erro(erroMsg, 400);

  const mudancas = apenasCampos(dados, GRAVAVEIS);
  if (!Object.keys(mudancas).length)
    return erro("Nenhum campo editável enviado. Aceitos: " + GRAVAVEIS.join(", "), 422);

  const { data, error } = await db.from("alunos")
    .update(mudancas).eq("escola_id", escola.id).eq("id", params.id).select(CAMPOS).maybeSingle();

  if (error) return erro("Falha ao atualizar aluno: " + error.message, 500);
  if (!data) return erro("Aluno não encontrado nesta escola.", 404);
  return json(data);
}, { precisaEscrita: true });

import { rota, json, erro, corpo, apenasCampos } from "../../../../../lib/api-v1";

const CAMPOS = `id, aluno_id, data_registro, titulo, detalhes, urgencia, autor_nome,
  motivo_nome, motivo_pontos, encaminhamento, enc_destino, enc_responsavel, enc_status,
  status, resolucao, created_at`;

// GET /api/v1/comunicacoes/{id}
export const GET = rota(async ({ db, escola, params }) => {
  const { data, error } = await db.from("comunicacoes")
    .select(CAMPOS).eq("escola_id", escola.id).eq("id", params.id).maybeSingle();
  if (error) return erro("Falha ao consultar: " + error.message, 500);
  if (!data) return erro("Comunicação não encontrada nesta escola.", 404);
  return json(data);
});

// PATCH /api/v1/comunicacoes/{id} — resolver, redirecionar ou complementar
export const PATCH = rota(async ({ db, escola, chave, params, request }) => {
  const { dados, erroMsg } = await corpo(request);
  if (erroMsg) return erro(erroMsg, 400);

  const { data: atual } = await db.from("comunicacoes")
    .select("id, resolucao, enc_status").eq("escola_id", escola.id).eq("id", params.id).maybeSingle();
  if (!atual) return erro("Comunicação não encontrada nesta escola.", 404);

  const mudancas = apenasCampos(dados, ["urgencia", "enc_destino", "enc_responsavel", "enc_responsavel_id", "enc_obs"]);

  // A resolução é um histórico: cada entrada é anexada com data, nunca sobrescreve
  // o que já estava lá — senão a integração apagaria o registro de outra pessoa.
  if (dados.resolucao) {
    const anterior = atual.resolucao ? atual.resolucao + "\n\n" : "";
    const hoje = new Date().toLocaleDateString("pt-BR");
    const autor = dados.autor_nome || ("Integração: " + chave.nome);
    mudancas.resolucao = `${anterior}[${hoje}] ${dados.resolucao} · Por: ${autor}`;
  }

  if (dados.status) {
    const validos = ["PENDENTE", "RESOLVENDO", "CONCLUÍDO"];
    if (!validos.includes(dados.status))
      return erro("status inválido. Use: " + validos.join(", "), 422);
    mudancas.status = dados.status;
    mudancas.enc_status = dados.status === "CONCLUÍDO" ? "RESOLVIDO" : dados.status;
  }

  if (!Object.keys(mudancas).length)
    return erro("Nenhum campo editável enviado. Aceitos: status, resolucao, urgencia, enc_destino, enc_responsavel, enc_responsavel_id, enc_obs", 422);

  const { data, error } = await db.from("comunicacoes")
    .update(mudancas).eq("escola_id", escola.id).eq("id", params.id).select(CAMPOS).maybeSingle();

  if (error) return erro("Falha ao atualizar: " + error.message, 500);
  return json(data);
}, { precisaEscrita: true });

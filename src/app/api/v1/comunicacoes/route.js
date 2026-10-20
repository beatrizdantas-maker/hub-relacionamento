import { rota, json, erro, paginacao, envelope, corpo, apenasCampos, faltando,
         normalizarStatus, normalizarUrgencia, VALORES_STATUS, VALORES_URGENCIA } from "../../../../lib/api-v1";

const CAMPOS = `id, aluno_id, data_registro, data_ocorrencia, titulo, detalhes, urgencia,
  autor_id, autor_nome, com_quem, via_comunicacao, turno,
  motivo_id, motivo_nome, motivo_pontos,
  encaminhamento, enc_destino, enc_responsavel, enc_responsavel_id, enc_obs, enc_status,
  status, resolucao, arquivo_url, arquivo_nome, created_at`;

const GRAVAVEIS = [
  "aluno_id", "titulo", "detalhes", "urgencia", "com_quem", "via_comunicacao", "turno",
  "data_ocorrencia", "motivo_id", "motivo_nome", "motivo_pontos",
  "encaminhamento", "enc_destino", "enc_responsavel", "enc_responsavel_id", "enc_obs",
];

// GET /api/v1/comunicacoes
export const GET = rota(async ({ db, escola, query }) => {
  const { pagina, porPagina, de, ate } = paginacao(query);

  let q = db.from("comunicacoes").select(CAMPOS, { count: "exact" }).eq("escola_id", escola.id);

  if (query.aluno_id) q = q.eq("aluno_id", query.aluno_id);
  if (query.status) q = q.eq("status", query.status);
  if (query.urgencia) q = q.eq("urgencia", query.urgencia);
  if (query.enc_status) q = q.eq("enc_status", query.enc_status);
  if (query.enc_destino) q = q.eq("enc_destino", query.enc_destino);
  if (query.autor_id) q = q.eq("autor_id", query.autor_id);
  if (query.desde) q = q.gte("created_at", query.desde);
  if (query.ate) q = q.lte("created_at", query.ate);
  if (query.busca) q = q.ilike("detalhes", `%${query.busca}%`);

  // tipo=atencao (pontuação positiva) ou tipo=positivo (pontuação negativa)
  if (query.tipo === "atencao") q = q.gt("motivo_pontos", 0);
  if (query.tipo === "positivo") q = q.lt("motivo_pontos", 0);
  if (query.encaminhamento === "true") q = q.eq("encaminhamento", true);
  if (query.encaminhamento === "false") q = q.eq("encaminhamento", false);

  q = q.order("created_at", { ascending: query.ordem === "asc" }).range(de, ate);

  const { data, error, count } = await q;
  if (error) return erro("Falha ao consultar comunicações: " + error.message, 500);
  return json(envelope(data, { pagina, porPagina, total: count }));
});

// POST /api/v1/comunicacoes — registra uma ocorrência
export const POST = rota(async ({ db, escola, chave, request }) => {
  const { dados, erroMsg } = await corpo(request);
  if (erroMsg) return erro(erroMsg, 400);

  const faltam = faltando(dados, ["aluno_id", "detalhes"]);
  if (faltam) return erro("Campos obrigatórios ausentes: " + faltam.join(", "), 422);

  // o aluno precisa ser desta escola; sem isso a integração gravaria em outra
  const { data: aluno } = await db.from("alunos")
    .select("id, nome").eq("escola_id", escola.id).eq("id", dados.aluno_id).maybeSingle();
  if (!aluno) return erro("Aluno não encontrado nesta escola.", 404);

  const campos = apenasCampos(dados, GRAVAVEIS);

  // Se veio motivo_id, buscamos nome e pontos no banco em vez de confiar no corpo:
  // a pontuação alimenta os indicadores e não pode ser definida de fora.
  if (campos.motivo_id) {
    const { data: motivo } = await db.from("motivos")
      .select("id, nome, pontos").eq("id", campos.motivo_id)
      .or(`escola_id.eq.${escola.id},escola_id.is.null`).maybeSingle();
    if (!motivo) return erro("Motivo não encontrado para esta escola.", 404);
    campos.motivo_nome = motivo.nome;
    campos.motivo_pontos = motivo.pontos;
  }

  if (campos.urgencia !== undefined) {
    const u = normalizarUrgencia(campos.urgencia);
    if (!u) return erro("urgencia inválida. Use: " + VALORES_URGENCIA, 422);
    campos.urgencia = u;
  }
  if (dados.status !== undefined && !normalizarStatus(dados.status))
    return erro("status inválido. Use: " + VALORES_STATUS, 422);

  const encaminhou = campos.encaminhamento === true;
  const registro = {
    ...campos,
    escola_id: escola.id,
    data_registro: new Date().toLocaleDateString("pt-BR"),
    titulo: campos.titulo || campos.motivo_nome || "Registro via integração",
    autor_nome: dados.autor_nome || ("Integração: " + chave.nome),
    enc_status: encaminhou ? "PENDENTE" : null,
    status: encaminhou ? "PENDENTE" : (normalizarStatus(dados.status) || "CONCLUÍDO"),
  };

  const { data, error } = await db.from("comunicacoes").insert([registro]).select(CAMPOS).single();
  if (error) return erro("Falha ao registrar comunicação: " + error.message, 500);
  return json(data, 201);
}, { precisaEscrita: true });

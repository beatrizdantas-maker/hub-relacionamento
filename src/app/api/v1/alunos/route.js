import { rota, json, erro, paginacao, envelope, corpo, apenasCampos, faltando } from "../../../../lib/api-v1";

const CAMPOS = "id, nome, turma, rm, risco, responsavel, telefone, segmento, created_at";
const GRAVAVEIS = ["nome", "turma", "rm", "responsavel", "telefone", "segmento"];

// GET /api/v1/alunos — lista alunos da escola da chave
export const GET = rota(async ({ db, escola, query }) => {
  const { pagina, porPagina, de, ate } = paginacao(query);

  let q = db.from("alunos").select(CAMPOS, { count: "exact" }).eq("escola_id", escola.id);

  if (query.turma) q = q.eq("turma", query.turma);
  if (query.segmento) q = q.eq("segmento", query.segmento);
  if (query.rm) q = q.eq("rm", query.rm);
  if (query.busca) q = q.ilike("nome", `%${query.busca}%`);
  if (query.risco_minimo) q = q.gte("risco", Number(query.risco_minimo) || 0);
  if (query.risco_maximo) q = q.lte("risco", Number(query.risco_maximo) || 100);

  const ordem = ["nome", "risco", "turma", "created_at"].includes(query.ordenar_por) ? query.ordenar_por : "nome";
  q = q.order(ordem, { ascending: query.ordem !== "desc" }).range(de, ate);

  const { data, error, count } = await q;
  if (error) return erro("Falha ao consultar alunos: " + error.message, 500);
  return json(envelope(data, { pagina, porPagina, total: count }));
});

// POST /api/v1/alunos — cadastra um aluno
export const POST = rota(async ({ db, escola, request }) => {
  const { dados, erroMsg } = await corpo(request);
  if (erroMsg) return erro(erroMsg, 400);

  const faltam = faltando(dados, ["nome"]);
  if (faltam) return erro("Campos obrigatórios ausentes: " + faltam.join(", "), 422);

  // escola_id vem da chave, nunca do corpo
  const novo = { ...apenasCampos(dados, GRAVAVEIS), escola_id: escola.id, risco: 0 };

  if (novo.rm) {
    const { data: existe } = await db.from("alunos")
      .select("id, nome").eq("escola_id", escola.id).eq("rm", novo.rm).maybeSingle();
    if (existe)
      return erro("Já existe aluno com este RM nesta escola.", 409, { aluno_existente: existe });
  }

  const { data, error } = await db.from("alunos").insert([novo]).select(CAMPOS).single();
  if (error) return erro("Falha ao cadastrar aluno: " + error.message, 500);
  return json(data, 201);
}, { precisaEscrita: true });

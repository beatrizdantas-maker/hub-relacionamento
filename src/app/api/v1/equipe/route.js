import { rota, json, erro } from "../../../../lib/api-v1";
import { PERFIL_LABEL } from "../../../../lib/inteligencia";

// GET /api/v1/equipe — quem pode receber encaminhamento.
// Devolve só o necessário para a integração escolher um responsável.
// Telefone, e-mail, IP e histórico de acesso ficam de fora de propósito:
// a API serve para encaminhar casos, não para extrair a lista de pessoal.
export const GET = rota(async ({ db, escola, query }) => {
  let q = db.from("profiles")
    .select("id, nome, perfil, cargo, setor, ativo, turma_vinculada")
    .eq("escola_id", escola.id);

  if (query.perfil) q = q.eq("perfil", query.perfil);
  if (query.ativo !== "false") q = q.or("ativo.is.null,ativo.eq.true");

  const { data, error } = await q.order("nome");
  if (error) return erro("Falha ao consultar equipe: " + error.message, 500);

  return json({
    dados: (data || []).map(p => ({
      id: p.id,
      nome: p.nome,
      perfil: p.perfil,
      perfil_label: PERFIL_LABEL[p.perfil] || p.perfil,
      cargo: p.cargo || null,
      setor: p.setor || null,
      turmas: p.turma_vinculada ? p.turma_vinculada.split(",").map(t => t.trim()) : [],
    })),
  });
});

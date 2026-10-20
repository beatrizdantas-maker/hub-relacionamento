import { rota, json, erro } from "../../../../lib/api-v1";

// GET /api/v1/motivos — motivos da escola e os globais do sistema
export const GET = rota(async ({ db, escola }) => {
  const { data, error } = await db.from("motivos")
    .select("id, nome, pontos, escola_id")
    .or(`escola_id.eq.${escola.id},escola_id.is.null`)
    .order("nome");

  if (error) return erro("Falha ao consultar motivos: " + error.message, 500);

  return json({
    dados: (data || []).map(m => ({
      id: m.id,
      nome: m.nome,
      pontos: m.pontos,
      tipo: m.pontos > 0 ? "atencao" : m.pontos < 0 ? "positivo" : "neutro",
      global: m.escola_id === null,
    })),
  });
});

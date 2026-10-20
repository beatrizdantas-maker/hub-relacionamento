import { rota, json, erro } from "../../../../lib/api-v1";
import {
  fatiarPeriodo, calcularSaude, calcularAtencaoAlunos, calcularTurmas,
  calcularPontosPositivos, calcularRecortes, calcularSerie, calcularContexto,
  calcularPorPerfil, calcularSetores,
} from "../../../../lib/inteligencia";

// GET /api/v1/indicadores?dias=30
// Os mesmos números do Painel de Inteligência, prontos para dashboard externo.
// Reaproveita exatamente as funções que a tela usa, para não existirem duas
// contas diferentes para o mesmo indicador.
export const GET = rota(async ({ db, escola, query }) => {
  const dias = query.dias === "tudo" ? null : Math.min(730, Math.max(1, parseInt(query.dias || "30", 10) || 30));

  const [{ data: coms, error: e1 }, { data: alunos, error: e2 }, { data: equipe }] = await Promise.all([
    db.from("comunicacoes").select("*").eq("escola_id", escola.id).order("created_at", { ascending: false }),
    db.from("alunos").select("id, nome, turma, segmento, risco").eq("escola_id", escola.id),
    db.from("profiles").select("id, nome, perfil").eq("escola_id", escola.id),
  ]);

  if (e1 || e2) return erro("Falha ao carregar dados: " + ((e1 || e2).message), 500);

  const base = coms || [];
  const listaAlunos = alunos || [];
  const { atual, anterior } = fatiarPeriodo(base, dias);

  const saude = calcularSaude(atual, anterior);
  const atencao = calcularAtencaoAlunos(atual, anterior, listaAlunos);
  const turmas = calcularTurmas(atual, listaAlunos);
  const positivos = calcularPontosPositivos(atual, anterior, listaAlunos);
  const recortes = calcularRecortes(atual, anterior, listaAlunos);
  const contexto = calcularContexto(base, dias);

  const resposta = {
    escola: { id: escola.id, nome: escola.nome },
    periodo: { dias: dias, label: dias ? `Últimos ${dias} dias` : "Todo o histórico" },
    saude,
    // a variação só significa algo se a base for típica; por isso vai junto
    contexto_da_comparacao: contexto,
    alunos_em_atencao: atencao.map(a => ({
      id: a.id, nome: a.nome, turma: a.turma, nivel: a.nivel,
      registros: a.registros, criticos: a.criticos, motivos: a.porques,
    })),
    turmas: turmas.map(t => ({
      turma: t.turma, segmento: t.segmento, alunos: t.alunos,
      registros_atencao: t.negativos, registros_positivos: t.positivos,
      por_aluno: Math.round(t.porAluno * 100) / 100,
      desvio_do_segmento_pct: t.desvio,
    })),
    pontos_positivos: positivos,
    principais_motivos: recortes.queixas,
    temas_emergentes: recortes.emergentes,
    segmentos: recortes.segmentos,
    casos_parados: { total: recortes.totalParados, exemplos: recortes.parados },
  };

  if (query.incluir_serie !== "false") resposta.serie = calcularSerie(atual, dias);
  if (query.incluir_perfis !== "false") resposta.por_perfil = calcularPorPerfil(atual, anterior, equipe || []);
  if (query.incluir_setores !== "false") resposta.por_setor = calcularSetores(atual, anterior);

  return json(resposta);
});

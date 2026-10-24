import { describe, expect, it } from "vitest";
import { agruparPorMes, compararUltimos, progressoMetas, semanaParaPeriodo, variacao } from "@/lib/metricas";
import type { MetricaSemanal } from "@/lib/tipos/database";

const semana = (s: Partial<MetricaSemanal> & { semana: string }): MetricaSemanal => ({
  empresa_id: "a", fim: null as unknown as string, fonte: "manual", seguidores: null, seguidores_ganhos: null, seguidores_perdidos: null, visualizacoes: null, alcance: null,
  interacoes: null, alcance_posts: null, compartilhamentos: null, salvamentos: null, posts: null, reels: null, stories: null, respostas_stories: null, cliques_link: null,
  mensagens_direct: null, dias_com_dados: 7, ultimo_dia: null, editado_manual: false, notas: null, atualizado_em: "", ...s,
});

const hoje = "2026-10-24"; // sábado

describe("métricas", () => {
  it("semana parcial não entra na comparação", () => {
    const ps = [
      semanaParaPeriodo(semana({ semana: "2026-10-05", visualizacoes: 100 }), hoje),
      semanaParaPeriodo(semana({ semana: "2026-10-12", visualizacoes: 150 }), hoje),
      semanaParaPeriodo(semana({ semana: "2026-10-19", visualizacoes: 50 }), hoje), // parcial
    ];
    expect(ps[2].completo).toBe(false);
    const { atual, anterior } = compararUltimos(ps);
    expect(atual?.chave).toBe("2026-10-12");
    expect(anterior?.chave).toBe("2026-10-05");
    expect(variacao("visualizacoes", atual, anterior)).toEqual({ valor: 150, anterior: 100, diferenca: 50, percentual: 50 });
  });

  it("nulo vira 'sem dado', nunca zero", () => {
    const p = semanaParaPeriodo(semana({ semana: "2026-10-05" }), hoje);
    expect(p.visualizacoes).toBeNull();
    expect(p.seguidores_liquidos).toBeNull();
    expect(p.engajamento).toBeNull();
    expect(variacao("visualizacoes", p, null).diferenca).toBeNull();
  });

  it("engajamento = interações ÷ alcance dos posts, diferença em p.p.", () => {
    const a = semanaParaPeriodo(semana({ semana: "2026-10-05", interacoes: 50, alcance_posts: 1000 }), hoje);
    const b = semanaParaPeriodo(semana({ semana: "2026-10-12", interacoes: 90, alcance_posts: 1000 }), hoje);
    expect(a.engajamento).toBe(5);
    expect(b.engajamento).toBe(9);
    expect(variacao("engajamento", b, a)).toEqual({ valor: 9, anterior: 5, diferenca: 4, percentual: null });
  });

  it("mês soma as semanas que começam nele; seguidores = última semana", () => {
    const meses = agruparPorMes([
      semana({ semana: "2026-09-28", visualizacoes: 10, seguidores: 900, fonte: "metricool" }), // começa em setembro
      semana({ semana: "2026-10-05", visualizacoes: 100, seguidores: 1000, seguidores_ganhos: 20, seguidores_perdidos: 5 }),
      semana({ semana: "2026-10-12", visualizacoes: 150, seguidores: 1050, seguidores_ganhos: 60, seguidores_perdidos: 10 }),
    ], "2026-11-15");
    expect(meses.map((m) => m.chave)).toEqual(["2026-09", "2026-10"]);
    const out = meses[1];
    expect(out.visualizacoes).toBe(250);
    expect(out.seguidores).toBe(1050);
    expect(out.seguidores_liquidos).toBe(65);
    expect(out.semanas).toBe(2);
    expect(out.completo).toBe(true);
    expect(meses[0].fonte).toBe("metricool");
  });

  it("metas do mês usam semanas do mês e posts publicados nele", () => {
    const r = progressoMetas(
      { visualizacoes_dia: 100, seguidores_liquidos_mes: 100, mensagens_mes: null, salvamentos_carrossel: 20, alcance_reels: null, engajamento_pct: null },
      [semana({ semana: "2026-10-05", visualizacoes: 700, seguidores_ganhos: 30, seguidores_perdidos: 5 }), semana({ semana: "2026-10-12", visualizacoes: 1400, seguidores_ganhos: 40, seguidores_perdidos: 15 })],
      [{ formato: "Carrossel", salvamentos: 10 }, { formato: "Carrossel", salvamentos: 30 }, { formato: "Reels", salvamentos: 99 }] as never,
    );
    expect(r.map((x) => [x.chave, x.valor, x.progresso])).toEqual([
      ["visualizacoes_dia", 150, 1.5],
      ["seguidores_liquidos_mes", 50, 0.5],
      ["salvamentos_carrossel", 20, 1],
    ]);
  });
});

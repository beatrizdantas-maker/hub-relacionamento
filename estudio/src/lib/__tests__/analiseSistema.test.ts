import { describe, expect, it } from "vitest";
import { analisarMetas, analisarRitmo, aplicarHorarios, arredondarMeta } from "@/lib/analiseSistema";
import type { MetricaSemanal, ResultadoPost, RitmoDia } from "@/lib/tipos/database";

const semana = (s: Partial<MetricaSemanal> & { semana: string; fim: string }): MetricaSemanal => ({
  empresa_id: "e", fonte: "metricool", seguidores: null, seguidores_ganhos: null, seguidores_perdidos: null, visualizacoes: null, alcance: null,
  interacoes: null, alcance_posts: null, compartilhamentos: null, salvamentos: null, posts: null, reels: null, stories: null, respostas_stories: null,
  cliques_link: null, mensagens_direct: null, dias_com_dados: 7, ultimo_dia: null, editado_manual: false, notas: null, atualizado_em: "", ...s,
});
const post = (p: Partial<ResultadoPost> & { publicado_em: string }): ResultadoPost => ({
  id: p.publicado_em, empresa_id: "e", id_externo: null, formato: "Reels", titulo: null, url: null, alcance: null, visualizacoes: null, curtidas: null, comentarios: null,
  salvamentos: null, compartilhamentos: null, interacoes: null, seguidores_ganhos: null, tempo_medio: null, taxa_visualizacao: null, fonte: "metricool", conteudo_id: null, atualizado_em: "", ...p,
});
const HOJE = "2026-10-28";

describe("arredondar meta", () => {
  it("usa passos conforme a grandeza", () => {
    expect(arredondarMeta(3014)).toBe(3000);
    expect(arredondarMeta(48.4)).toBe(48);
    expect(arredondarMeta(237)).toBe(235);
    expect(arredondarMeta(46200)).toBe(46000);
  });
});

describe("análise de metas", () => {
  it("sem dados: nada sugerido, nada inventado", () => {
    const a = analisarMetas({ hoje: HOJE, semanas: [], posts: [] });
    expect(a.temSugestao).toBe(false);
    expect(a.periodo).toBeNull();
    expect(a.itens.every((i) => i.real === null && i.sugerida === null)).toBe(true);
  });

  it("usa as 4 últimas semanas completas e sugere real + 10%", () => {
    const semanas = [
      semana({ semana: "2026-09-21", fim: "2026-09-27", visualizacoes: 100 }), // fora (só as 4 últimas)
      semana({ semana: "2026-09-28", fim: "2026-10-04", visualizacoes: 14000, seguidores_ganhos: 30, seguidores_perdidos: 10, interacoes: 500, alcance_posts: 10000 }),
      semana({ semana: "2026-10-05", fim: "2026-10-11", visualizacoes: 14000, seguidores_ganhos: 30, seguidores_perdidos: 10, interacoes: 500, alcance_posts: 10000 }),
      semana({ semana: "2026-10-12", fim: "2026-10-18", visualizacoes: 14000, seguidores_ganhos: 30, seguidores_perdidos: 10, interacoes: 500, alcance_posts: 10000 }),
      semana({ semana: "2026-10-19", fim: "2026-10-25", visualizacoes: 14000, seguidores_ganhos: 30, seguidores_perdidos: 10, interacoes: 500, alcance_posts: 10000 }),
      semana({ semana: "2026-10-26", fim: "2026-11-01", visualizacoes: 99999 }), // parcial: fora
    ];
    const a = analisarMetas({ hoje: HOJE, semanas, posts: [] });
    expect(a.periodo).toEqual({ de: "2026-09-28", ate: "2026-10-25", semanas: 4 });
    const por = Object.fromEntries(a.itens.map((i) => [i.chave, i]));
    expect(por.visualizacoes_dia.real).toBe(2000);
    expect(por.visualizacoes_dia.sugerida).toBe(2200);
    expect(por.seguidores_liquidos_mes.real).toBe(86); // 20/semana × 30/7
    expect(por.seguidores_liquidos_mes.sugerida).toBe(94);
    expect(por.engajamento_pct.real).toBe(5);
    expect(por.engajamento_pct.sugerida).toBe(5.5);
    expect(por.mensagens_mes.sugerida).toBeNull(); // sem registro manual
  });

  it("seguidores em queda: a meta é parar de perder (0)", () => {
    const a = analisarMetas({ hoje: HOJE, semanas: [semana({ semana: "2026-10-19", fim: "2026-10-25", seguidores_ganhos: 5, seguidores_perdidos: 20 })], posts: [] });
    expect(a.itens.find((i) => i.chave === "seguidores_liquidos_mes")!.sugerida).toBe(0);
  });

  it("carrossel e Reels precisam de pelo menos 2 posts nas últimas 8 semanas", () => {
    const a = analisarMetas({
      hoje: HOJE, semanas: [],
      posts: [
        post({ publicado_em: "2026-10-10T12:00:00Z", formato: "Carrossel", salvamentos: 40 }),
        post({ publicado_em: "2026-10-17T12:00:00Z", formato: "Carrossel", salvamentos: 60 }),
        post({ publicado_em: "2026-10-18T20:00:00Z", formato: "Reels", alcance: 5000 }),
        post({ publicado_em: "2026-06-01T20:00:00Z", formato: "Reels", alcance: 9000 }), // antigo: fora
      ],
    });
    const por = Object.fromEntries(a.itens.map((i) => [i.chave, i]));
    expect(por.salvamentos_carrossel.real).toBe(50);
    expect(por.salvamentos_carrossel.sugerida).toBe(55);
    expect(por.alcance_reels.sugerida).toBeNull();
  });
});

describe("análise de horários", () => {
  const ritmo: RitmoDia[] = [
    { dia: 1, hora: "12:00", formato: "Carrossel", tipo: "Carrossel salvável", pilar: "", objetivo: "salvamentos" },
    { dia: 2, hora: "20:00", formato: "Reels", tipo: "Reels", pilar: "", objetivo: "alcance" },
  ];
  // 21h em São Paulo = 00h UTC do dia seguinte; 12h SP = 15h UTC
  const posts = [
    post({ publicado_em: "2026-10-06T00:00:00Z", formato: "Reels", interacoes: 900 }),
    post({ publicado_em: "2026-10-13T00:00:00Z", formato: "Reels", interacoes: 1100 }),
    post({ publicado_em: "2026-10-14T23:00:00Z", formato: "Reels", interacoes: 300 }),
    post({ publicado_em: "2026-10-21T23:00:00Z", formato: "Reels", interacoes: 500 }),
    post({ publicado_em: "2026-10-12T15:00:00Z", formato: "Carrossel", interacoes: 200 }),
  ];

  it("acha a melhor hora por formato no fuso da empresa (mínimo 2 posts por hora)", () => {
    const a = analisarRitmo({ hoje: HOJE, posts, ritmo, fuso: "America/Sao_Paulo" });
    expect(a.porFormato.find((f) => f.formato === "Reels")).toMatchObject({ melhorHora: "21:00", mediaInteracoes: 1000, posts: 2, totalPosts: 4 });
    expect(a.porFormato.find((f) => f.formato === "Carrossel")!.melhorHora).toBeNull();
    expect(a.mudancas).toEqual([expect.objectContaining({ dia: 2, horaAtual: "20:00", horaSugerida: "21:00" })]);
  });

  it("aplicar muda só a hora dos dias sugeridos", () => {
    const a = analisarRitmo({ hoje: HOJE, posts, ritmo, fuso: "America/Sao_Paulo" });
    const novo = aplicarHorarios(ritmo, a.mudancas);
    expect(novo[0]).toEqual(ritmo[0]);
    expect(novo[1]).toEqual({ ...ritmo[1], hora: "21:00" });
  });
});

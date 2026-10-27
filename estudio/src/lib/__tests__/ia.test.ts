import { describe, expect, it } from "vitest";
import { calcularDadosReais } from "@/lib/ia/dadosReais";
import { mesesDisponiveis, planejarMes, ultimoDiaDoMes } from "@/lib/ia/planoMes";
import { SaidaSemanaCalendario, SaidaSugestao, validarSemana, validarSugestao, type DiaGerado } from "@/lib/ia/esquemas";
import { datasComemorativasEntre } from "@/lib/ia/datasComemorativas";
import type { MetricaSemanal, ResultadoPost, RitmoDia } from "@/lib/tipos/database";

const semana = (s: Partial<MetricaSemanal> & { semana: string }): MetricaSemanal => ({
  empresa_id: "e", fim: null as unknown as string, fonte: "manual", seguidores: null, seguidores_ganhos: null, seguidores_perdidos: null, visualizacoes: null, alcance: null,
  interacoes: null, alcance_posts: null, compartilhamentos: null, salvamentos: null, posts: null, reels: null, stories: null, respostas_stories: null,
  cliques_link: null, mensagens_direct: null, dias_com_dados: 7, ultimo_dia: null, editado_manual: false, notas: null, atualizado_em: "", ...s,
});
const post = (p: Partial<ResultadoPost> & { publicado_em: string }): ResultadoPost => ({
  id: p.publicado_em, empresa_id: "e", id_externo: null, formato: "Reels", titulo: "Post", url: null, alcance: null, visualizacoes: null, curtidas: null, comentarios: null,
  salvamentos: null, compartilhamentos: null, interacoes: null, seguidores_ganhos: null, tempo_medio: null, taxa_visualizacao: null, fonte: "manual", conteudo_id: null, atualizado_em: "", ...p,
});

describe("dados reais", () => {
  it("sem registro: uma linha avisando, nunca zero inventado", () => {
    const d = calcularDadosReais({ hoje: "2026-10-25", semanas: [], posts: [], metas: null });
    expect(d.vazio).toBe(true);
    expect(d.linhas).toHaveLength(1);
    expect(d.linhas[0]).toMatch(/Nenhuma métrica/);
  });

  it("usa só semanas completas (até 8) e mostra 'sem dado' no que falta", () => {
    const semanas = Array.from({ length: 10 }, (_, i) => semana({ semana: `2026-0${i < 2 ? 8 : 9}-${String(i < 2 ? 3 + i * 7 : (i - 2) * 7 + 7).padStart(2, "0")}` }));
    // semanas: 03/08, 10/08, 07/09, 14/09, ... construídas só para contagem
    const d = calcularDadosReais({
      hoje: "2026-10-25",
      semanas: [
        ...semanas.slice(0, 1),
        semana({ semana: "2026-10-12", fim: "2026-10-18", visualizacoes: 1000, salvamentos: 10, fonte: "metricool" }),
        semana({ semana: "2026-10-19", fim: "2026-10-25", visualizacoes: 2000 }), // ainda não terminou (hoje = domingo 25): fica de fora
      ],
      posts: [],
      metas: null,
    });
    expect(d.vazio).toBe(false);
    expect(d.semanas.map((s) => s.semana)).not.toContain("2026-10-19");
    expect(d.linhas.join("\n")).toContain("Visualizações: média de");
    expect(d.linhas.join("\n")).toContain("compartilhamentos sem dado");
    expect(d.linhas.join("\n")).not.toMatch(/Seguidores:/); // nenhuma semana tem seguidores → nada inventado
  });

  it("aponta o melhor post por interações e a média por formato", () => {
    const d = calcularDadosReais({
      hoje: "2026-10-25",
      semanas: [],
      posts: [
        post({ publicado_em: "2026-10-01T12:00:00", titulo: "Reels bom", formato: "Reels", interacoes: 300, alcance: 5000 }),
        post({ publicado_em: "2026-10-03T12:00:00", titulo: "Carrossel", formato: "Carrossel", interacoes: 120, salvamentos: 40 }),
        post({ publicado_em: "2026-10-05T12:00:00", titulo: "Sem números", formato: "Estático" }),
      ],
      metas: null,
    });
    const texto = d.linhas.join("\n");
    expect(texto).toContain('Melhor conteúdo por interações: "Reels bom"');
    expect(texto).toContain("Reels 300 (1 post)");
    expect(texto).toContain('Mais salvo: "Carrossel"');
  });

  it("compara metas com o real só quando há dado", () => {
    const d = calcularDadosReais({
      hoje: "2026-10-25",
      semanas: [semana({ semana: "2026-10-12", fim: "2026-10-18", visualizacoes: 700, dias_com_dados: 7, interacoes: 50, alcance_posts: 1000 })],
      posts: [],
      metas: { visualizacoes_dia: 200, seguidores_liquidos_mes: 100, mensagens_mes: null, salvamentos_carrossel: null, alcance_reels: null, engajamento_pct: 4 },
    });
    const metas = d.linhas.find((l) => l.startsWith("Metas × real"))!;
    expect(metas).toContain("visualizações/dia: meta 200, real 100");
    expect(metas).toContain("engajamento: meta 4%, real 5%");
    expect(metas).not.toContain("seguidores líquidos"); // sem ganhos/perdidos registrados
  });
});

const RITMO: RitmoDia[] = [
  { dia: 1, hora: "12:00", formato: "Carrossel", tipo: "Carrossel salvável", pilar: "Educação", objetivo: "Salvamentos" },
  { dia: 3, hora: "20:00", formato: "Reels", tipo: "Reels prova social", pilar: "Prova", objetivo: "Confiança" },
  { dia: 7, hora: "20:00", formato: "Reels", tipo: "Reels texto na tela", pilar: "Identificação", objetivo: "Alcance" },
];

describe("plano do mês", () => {
  it("calcula o último dia do mês", () => {
    expect(ultimoDiaDoMes("2026-02")).toBe("2026-02-28");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
    expect(ultimoDiaDoMes("2026-12")).toBe("2026-12-31");
  });

  it("oferece o mês atual e o seguinte, virando o ano", () => {
    expect(mesesDisponiveis("2026-12-20").map((m) => m.valor)).toEqual(["2026-12", "2027-01"]);
  });

  it("só dias do ritmo, de hoje em diante, agrupados por semana e sem os ocupados", () => {
    const plano = planejarMes("2026-10", "2026-10-25", RITMO, new Set(["2026-10-26"]));
    // 25/10 é domingo (dia 7), 26 segunda (ocupada), 28 quarta
    expect(plano).toEqual([
      { segunda: "2026-10-19", dias: ["2026-10-25"] },
      { segunda: "2026-10-26", dias: ["2026-10-28"] },
    ]);
  });

  it("mês futuro inteiro", () => {
    const plano = planejarMes("2026-11", "2026-10-25", RITMO);
    expect(plano.reduce((a, s) => a + s.dias.length, 0)).toBe(14); // nov/2026: seg 2,9,16,23,30 · qua 4,11,18,25 · dom 1,8,15,22,29
    expect(plano.every((s) => s.dias.every((d) => d.startsWith("2026-11")))).toBe(true);
  });
});

describe("validação do que a IA devolve", () => {
  it("esquemas de saída aceitam o formato esperado", () => {
    expect(SaidaSugestao.safeParse({ resumo: "x", manter: [], melhorar: [], testar: [], ideias: [] }).success).toBe(true);
    expect(SaidaSemanaCalendario.safeParse({ dias: [] }).success).toBe(true);
  });

  it("sugestão: ideias fora da semana, sem CTA ou sem data válida são problemas", () => {
    const problemas = validarSugestao(
      {
        resumo: "ok", manter: ["a"], melhorar: [], testar: [],
        ideias: [
          { titulo: "Boa", formato: "Reels", dia: "2026-11-03", motivo: "(sem dado: hipótese)", legenda: "Legenda. Comenta EU QUERO", cta: "Comenta EU QUERO", hashtags: [] },
          { titulo: "Fora", formato: "Reels", dia: "2026-11-10", motivo: "", legenda: "x", cta: "y", hashtags: [] },
          { titulo: "Sem CTA", formato: "Carrossel", dia: "2026-11-04", motivo: "", legenda: "x", cta: " ", hashtags: [] },
          { titulo: "Data ruim", formato: "Carrossel", dia: "03/11", motivo: "", legenda: "x", cta: "y", hashtags: [] },
        ],
      },
      "2026-11-02", "2026-11-08",
    );
    expect(problemas.map((p) => p.campo)).toEqual(["ideias[1].dia", "ideias[2].cta", "ideias[3].dia"]);
  });

  const dia = (data: string, extra: Partial<DiaGerado> = {}): DiaGerado => ({
    data, formato: "Reels", tipo: "Reels prova social", pilar: "Prova", tema: "Tema", objetivo: "Obj", legenda: "L. Me chama no direct", cta: "Me chama no direct",
    ganchos: ["g1", "g2", "g3"], hashtags: ["#educacao"],
    conceito_visual: { estilo: "e", paleta: "p", tipografia: "t", fotografia: "f", elementos: "el" },
    slides: [], arte_estatico: null, enquete: null, artigo: null, musica: "lo-fi", dicas_producao: ["luz natural"],
    cenas: [
      { inicio_s: 0, fim_s: 3, imagem: "close", fala: "Oi", texto_na_tela: null, audio: null },
      { inicio_s: 3, fim_s: 10, imagem: "médio", fala: "Meio", texto_na_tela: null, audio: null },
      { inicio_s: 10, fim_s: 15, imagem: "close", fala: "Chama no direct", texto_na_tela: "Direct", audio: null },
    ],
    stories: { objetivo: "s", telas: [
      { tipo: "Texto", texto: "abre", pergunta: null, opcoes: null, emoji: null },
      { tipo: "Compartilhar post", texto: "vê o post", pergunta: null, opcoes: null, emoji: null },
      { tipo: "Enquete", texto: "", pergunta: "Qual?", opcoes: ["A", "B"], emoji: null },
      { tipo: "Texto", texto: "fecha", pergunta: null, opcoes: null, emoji: null },
    ] },
    ...extra,
  });

  it("semana: descarta datas não pedidas, exige 3 ganchos em Reels e 4 telas com interação", () => {
    const { validos, problemas } = validarSemana(
      { dias: [
        dia("2026-11-02"),
        dia("2026-11-09"),                               // não pedida
        dia("2026-11-04", { ganchos: ["só um"] }),       // Reels com 1 gancho
        dia("2026-11-08", { formato: "Carrossel", ganchos: [], cenas: [], musica: null, slides: Array.from({ length: 5 }, (_, i) => ({ titulo_na_arte: `S${i + 1}`, texto_na_arte: "", imagem: "foto" })) }),
      ] },
      ["2026-11-02", "2026-11-04", "2026-11-08", "2026-11-06"],
    );
    expect(validos.map((d) => d.data)).toEqual(["2026-11-02", "2026-11-08"]);
    expect(problemas.map((p) => `${p.campo}: ${p.mensagem}`)).toEqual([
      "dia 2026-11-09: Data não pedida",
      "dia 2026-11-04: Reels precisa de 3 ganchos",
      "dia 2026-11-06: Não veio da IA",
    ]);
  });

  it("LinkedIn: dia sem stories é válido quando stories não são exigidos", () => {
    const { stories: _sem, ...semStories } = dia("2026-11-02");
    void _sem;
    expect(validarSemana({ dias: [semStories] }, ["2026-11-02"], false).validos).toHaveLength(1);
    expect(validarSemana({ dias: [semStories] }, ["2026-11-02"]).validos).toHaveLength(0);
  });

  it("semana: stories sem tela de interação invalidam o dia", () => {
    const d = dia("2026-11-02");
    d.stories.telas[2] = { tipo: "Texto", texto: "x", pergunta: null, opcoes: null, emoji: null };
    const { validos, problemas } = validarSemana({ dias: [d] }, ["2026-11-02"]);
    expect(validos).toHaveLength(0);
    expect(problemas[0].mensagem).toContain("sem tela de interação");
  });
});

describe("datas comemorativas", () => {
  it("filtra pelo intervalo, inclusive virando o ano", () => {
    const datas = datasComemorativasEntre("2026-12-20", "2027-01-10");
    expect(datas.map((d) => d.nome)).toEqual(["Natal", "Réveillon", "Ano Novo", "Dia do Leitor"]);
  });
});

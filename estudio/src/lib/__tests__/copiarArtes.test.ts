import { describe, expect, it } from "vitest";
import { postagensComArte, textoDasArtes, type ConteudoArte } from "@/lib/copiarArtes";
import { gradeDoMes, somarMeses, ultimoDiaDoMes, ehMes } from "@/lib/datas";

const c = (p: Partial<ConteudoArte> & { data: string; formato: ConteudoArte["formato"] }): ConteudoArte => ({ hora: null, tema: "Tema", status: "aprovado", roteiro: null, orientacao_arte: null, ...p });

describe("copiar artes", () => {
  it("só carrossel e estático, sem publicados, em ordem de data e hora", () => {
    const lista = postagensComArte([
      c({ data: "2026-11-03", formato: "Estático", tema: "B" }),
      c({ data: "2026-11-02", formato: "Reels", tema: "vídeo" }),
      c({ data: "2026-11-02", formato: "Carrossel", tema: "A2", hora: "19:00:00" }),
      c({ data: "2026-11-02", formato: "Carrossel", tema: "A1", hora: "12:00:00" }),
      c({ data: "2026-11-01", formato: "Carrossel", tema: "já foi", status: "publicado" }),
    ]);
    expect(lista.map((x) => x.tema)).toEqual(["A1", "A2", "B"]);
  });

  it("monta o texto com cabeçalho, slides e orientação de arte de cada postagem", () => {
    const { texto, total } = textoDasArtes(
      [
        c({ data: "2026-11-02", formato: "Carrossel", hora: "12:00:00", tema: "5 sinais", status: "sugestao", roteiro: "SLIDE 1 — CAPA\nTÍTULO NA ARTE: 5 sinais\nIMAGEM: fundo roxo", orientacao_arte: "ESTILO: limpo" }),
        c({ data: "2026-11-04", formato: "Estático", tema: "Você também?" }),
      ],
      { empresa: "NARAEDU", periodo: "Semana de 2 a 8 de novembro" },
    );
    expect(total).toBe(2);
    expect(texto.startsWith("ARTES PARA PRODUZIR · NARAEDU\nSemana de 2 a 8 de novembro · 2 postagens\n\n━━━━")).toBe(true);
    expect(texto).toContain("SEGUNDA, 02/11 · 12:00 · CARROSSEL\nTema: 5 sinais\nStatus: Sugestão da IA (ainda não aprovada)\n\nSLIDES (TEXTO E IMAGEM DE CADA UM)\nSLIDE 1 — CAPA\nTÍTULO NA ARTE: 5 sinais\nIMAGEM: fundo roxo\n\nORIENTAÇÃO DE ARTE\nESTILO: limpo");
    expect(texto).toContain("QUARTA, 04/11 · ESTÁTICO\nTema: Você também?\nStatus: Aprovado\n\nARTE (TEXTO E IMAGEM)\n(ainda sem texto");
    expect(texto).toContain("ORIENTAÇÃO DE ARTE\n(sem orientação de arte)");
  });

  it("sem postagens com arte, total zero", () => {
    expect(textoDasArtes([c({ data: "2026-11-02", formato: "Reels" })], { empresa: "X", periodo: "P" }).total).toBe(0);
  });
});

describe("mês", () => {
  it("valida, soma meses e acha o último dia", () => {
    expect(ehMes("2026-11")).toBe(true);
    expect(ehMes("2026-13")).toBe(false);
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
  });

  it("a grade cobre o mês em semanas de segunda a domingo", () => {
    const g = gradeDoMes("2026-11"); // 1/11/2026 é domingo
    expect(g[0][0]).toBe("2026-10-26");
    expect(g[0][6]).toBe("2026-11-01");
    expect(g[g.length - 1][6]).toBe("2026-12-06");
    expect(g).toHaveLength(6);
  });
});

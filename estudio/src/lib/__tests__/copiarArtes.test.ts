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

import { falasDoRoteiro, textoDasFalas, videosComFala } from "@/lib/copiarArtes";

describe("copiar falas", () => {
  const roteiro = 'DURAÇÃO: cerca de 30 segundos\n\nCENA 1 · 0s–3s\nIMAGEM: close\nFALA: "Seu filho esqueceu tudo?"\nTEXTO NA TELA: Esqueceu?\n\nCENA 2 · 3s–12s\nIMAGEM: caderno\nTEXTO NA TELA: Revisar\n\nCENA 3 · 12s–20s\nIMAGEM: médio\nFALA: "Comenta REVISÃO."\nÁUDIO: música';

  it("só as falas, com o tempo da cena, sem imagem, texto na tela ou áudio", () => {
    expect(falasDoRoteiro(roteiro)).toBe("[0s–3s] Seu filho esqueceu tudo?\n[12s–20s] Comenta REVISÃO.");
  });

  it("avisa quando não há o que falar", () => {
    expect(falasDoRoteiro("CENA 1 · 0s–3s\nIMAGEM: x\nTEXTO NA TELA: y")).toBe("(sem falas: vídeo só com texto na tela)");
    expect(falasDoRoteiro("")).toContain("ainda sem roteiro");
    expect(falasDoRoteiro("gancho e depois o produto")).toContain("não tem falas marcadas");
  });

  it("junta só os Reels do período, sem publicados, em ordem", () => {
    const lista = [
      c({ data: "2026-11-04", formato: "Reels", tema: "B", roteiro }),
      c({ data: "2026-11-02", formato: "Reels", tema: "A", hora: "20:00:00", status: "sugestao", roteiro }),
      c({ data: "2026-11-03", formato: "Carrossel", tema: "arte" }),
      c({ data: "2026-11-01", formato: "Reels", tema: "já foi", status: "publicado" }),
    ];
    expect(videosComFala(lista).map((x) => x.tema)).toEqual(["A", "B"]);
    const { texto, total } = textoDasFalas(lista, { empresa: "NARAEDU", periodo: "Novembro de 2026" });
    expect(total).toBe(2);
    expect(texto.startsWith("FALAS PARA GRAVAR · NARAEDU\nNovembro de 2026 · 2 vídeos")).toBe(true);
    expect(texto).toContain("SEGUNDA, 02/11 · 20:00 · A\n\n[0s–3s] Seu filho esqueceu tudo?\n[12s–20s] Comenta REVISÃO.");
    expect(texto).not.toContain("IMAGEM");
  });
});

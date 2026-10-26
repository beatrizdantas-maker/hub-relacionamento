import { describe, expect, it } from "vitest";
import { duracaoVideo, modoPadrao, modosPossiveis, normalizarPeca } from "@/lib/pecas/esquemas";
import { caber, quebrarLinhas } from "@/lib/pecas/desenho";

// Contexto falso: cada caractere mede 10 px × (tamanho/10).
function ctxFalso() {
  let tam = 10;
  return {
    set font(f: string) { tam = Number(/(\d+)px/.exec(f)?.[1] ?? 10); },
    get font() { return `${tam}px x`; },
    measureText: (t: string) => ({ width: t.length * tam }),
  } as unknown as CanvasRenderingContext2D;
}

describe("modo da peça", () => {
  it("escolhe pelo formato e, nos Reels, pelo tipo", () => {
    expect(modoPadrao("Carrossel", null)).toBe("carrossel");
    expect(modoPadrao("Estático", null)).toBe("estatico");
    expect(modoPadrao("Reels", "Reels com a pessoa da marca falando")).toBe("roteiro_falado");
    expect(modoPadrao("Reels", "Reels de prova social")).toBe("roteiro_falado");
    expect(modoPadrao("Reels", "Reels com texto na tela")).toBe("video");
    expect(modosPossiveis("Reels")).toEqual(["video", "roteiro_falado"]);
  });
});

describe("normalização da saída da IA", () => {
  it("carrossel: força capa e fechamento e corta textos longos", () => {
    const r = normalizarPeca("carrossel", { slides: [
      { papel: "conteudo", titulo: "Capa", texto: "", destaque: null },
      { papel: "conteudo", titulo: "Meio", texto: "x".repeat(500), destaque: "  " },
      { papel: "conteudo", titulo: "Fim", texto: "Salva", destaque: "Comenta EU" },
    ] }, "agora");
    expect(r.problemas).toEqual([]);
    expect(r.peca).toMatchObject({ tipo: "carrossel", gerado_em: "agora" });
    const slides = (r.peca as Extract<typeof r.peca, { tipo: "carrossel" }>).slides;
    expect(slides.map((s) => s.papel)).toEqual(["capa", "conteudo", "fechamento"]);
    expect(slides[1].texto.length).toBe(320);
    expect(slides[1].destaque).toBeNull();
  });

  it("vídeo: limita a duração de cada cena e rejeita vídeo com uma cena só", () => {
    const ok = normalizarPeca("video", { cenas: [{ texto: "A", destaque: null, segundos: 20 }, { texto: "B", destaque: null, segundos: 0.2 }] });
    expect(ok.peca && ok.peca.tipo === "video" && ok.peca.cenas.map((c) => c.segundos)).toEqual([8, 1.5]);
    expect(duracaoVideo([{ segundos: 3 }, { segundos: 4.5 }])).toBe(7.5);
    expect(normalizarPeca("video", { cenas: [{ texto: "A", destaque: null, segundos: 3 }] }).peca).toBeNull();
  });

  it("roteiro falado: duração é pelo menos o fim da última cena", () => {
    const r = normalizarPeca("roteiro_falado", { duracao_s: 10, dicas: ["Luz", ""], cenas: [
      { inicio_s: 0, fim_s: 3, fala: "Oi", enquadramento: "Fechado", texto_na_tela: null },
      { inicio_s: 3, fim_s: 25, fala: "Tchau", enquadramento: "Médio", texto_na_tela: "CTA" },
    ] });
    expect(r.peca).toMatchObject({ tipo: "roteiro_falado", duracao_s: 25, dicas: ["Luz"] });
  });

  it("formato inválido vira problema, não exceção", () => {
    expect(normalizarPeca("estatico", { nada: true }).problemas).toEqual(["Formato inválido"]);
  });
});

describe("texto no canvas", () => {
  it("quebra linhas pela largura e respeita quebras manuais", () => {
    const ctx = ctxFalso();
    ctx.font = "700 10px x";
    expect(quebrarLinhas(ctx, "aa bb cc\ndd", 50)).toEqual(["aa bb", "cc", "dd"]);
    expect(quebrarLinhas(ctx, "abcdefghij", 40)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("reduz a fonte até caber na caixa e corta com reticências no mínimo", () => {
    const ctx = ctxFalso();
    const r = caber(ctx, "um texto qualquer de teste", { familia: "x", peso: 700, max: 40, min: 10, largura: 200, altura: 60, entrelinha: 1 });
    expect(r.linhas.length * r.tam).toBeLessThanOrEqual(60);
    const corte = caber(ctx, "a ".repeat(200), { familia: "x", peso: 700, max: 20, min: 20, largura: 100, altura: 40, entrelinha: 1 });
    expect(corte.linhas.length).toBe(2);
    expect(corte.linhas[1].endsWith("…")).toBe(true);
  });
});

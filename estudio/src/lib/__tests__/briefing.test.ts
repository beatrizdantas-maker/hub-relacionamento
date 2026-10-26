import { describe, expect, it } from "vitest";
import { extrairFalas, formatarOrientacao, formatarRoteiro, modoReelsPadrao, problemasBriefing, type Briefing } from "@/lib/ia/briefing";

const base: Briefing = {
  conceito_visual: { estilo: "Editorial limpo", paleta: "Roxo da marca e fundo claro", tipografia: "Título serifado grande", fotografia: "Fotos reais da equipe", elementos: "Logo no canto" },
  slides: [], arte_estatico: null, cenas: [], musica: null, dicas_producao: ["Use luz natural", " "],
};

describe("briefing de produção", () => {
  it("Reels: decide com ou sem pessoa pelo tipo", () => {
    expect(modoReelsPadrao("Reels com a pessoa da marca falando")).toBe("com_pessoa");
    expect(modoReelsPadrao("Reels de prova social")).toBe("com_pessoa");
    expect(modoReelsPadrao("Reels com texto na tela")).toBe("sem_pessoa");
  });

  it("carrossel vira roteiro slide a slide com a imagem de cada um", () => {
    const b = { ...base, slides: [
      { titulo_na_arte: "5 sinais", texto_na_arte: "", imagem: "Fundo roxo, título centralizado" },
      { titulo_na_arte: "Esquece tudo", texto_na_arte: "Sem revisão…", imagem: "Foto de caderno" },
      { titulo_na_arte: "Salva", texto_na_arte: "Comenta ROTINA", imagem: "Seta para o botão salvar" },
    ] };
    expect(formatarRoteiro("Carrossel", b)).toBe(
      "SLIDE 1 — CAPA\nTÍTULO NA ARTE: 5 sinais\nIMAGEM: Fundo roxo, título centralizado\n\n" +
      "SLIDE 2\nTÍTULO NA ARTE: Esquece tudo\nTEXTO NA ARTE: Sem revisão…\nIMAGEM: Foto de caderno\n\n" +
      "SLIDE 3 — FECHAMENTO\nTÍTULO NA ARTE: Salva\nTEXTO NA ARTE: Comenta ROTINA\nIMAGEM: Seta para o botão salvar",
    );
    expect(problemasBriefing("Carrossel", b)).toEqual(["carrossel precisa de pelo menos 4 slides"]);
  });

  it("Reels vira roteiro cena a cena e o teleprompter lê só as falas", () => {
    const b = { ...base, musica: "Áudio em alta, batida leve", cenas: [
      { inicio_s: 0, fim_s: 3, imagem: "Close no rosto", fala: "Seu filho esquece tudo?", texto_na_tela: "Esqueceu?", audio: null },
      { inicio_s: 3, fim_s: 12.4, imagem: "B-roll de caderno", fala: null, texto_na_tela: "Revisar > reler", audio: "Música sobe" },
      { inicio_s: 12, fim_s: 18, imagem: "Plano médio", fala: "Comenta REVISÃO.", texto_na_tela: null, audio: null },
    ] };
    const roteiro = formatarRoteiro("Reels", b);
    expect(roteiro.startsWith("DURAÇÃO: cerca de 18 segundos\nMÚSICA: Áudio em alta, batida leve\n\nCENA 1 · 0s–3s\nIMAGEM: Close no rosto\nFALA: \"Seu filho esquece tudo?\"\nTEXTO NA TELA: Esqueceu?")).toBe(true);
    expect(roteiro).toContain("CENA 2 · 3s–12s\nIMAGEM: B-roll de caderno\nTEXTO NA TELA: Revisar > reler\nÁUDIO: Música sobe");
    expect(extrairFalas(roteiro)).toEqual([
      { rotulo: "CENA 1 · 0s–3s", fala: "Seu filho esquece tudo?" },
      { rotulo: "CENA 3 · 12s–18s", fala: "Comenta REVISÃO." },
    ]);
    expect(problemasBriefing("Reels", b)).toEqual([]);
    expect(problemasBriefing("Reels", { ...b, cenas: b.cenas.slice(0, 2) })).toEqual(["Reels precisa de pelo menos 3 cenas"]);
  });

  it("estático e orientação de arte", () => {
    const b = { ...base, arte_estatico: { titulo_na_arte: "Você também?", texto_na_arte: "", imagem: "Foto de mãe com o filho", composicao: "Título no topo, logo embaixo" } };
    expect(formatarRoteiro("Estático", b)).toBe("TÍTULO NA ARTE: Você também?\nIMAGEM: Foto de mãe com o filho\nCOMPOSIÇÃO: Título no topo, logo embaixo");
    expect(problemasBriefing("Estático", base)).toEqual(["estático sem texto da arte"]);
    expect(formatarOrientacao(b)).toBe(
      "ESTILO: Editorial limpo\nCORES: Roxo da marca e fundo claro\nTIPOGRAFIA: Título serifado grande\nFOTOGRAFIA E VÍDEO: Fotos reais da equipe\nELEMENTOS: Logo no canto\n\nDICAS DE PRODUÇÃO:\n- Use luz natural",
    );
  });

  it("roteiro escrito à mão sem falas não quebra o teleprompter", () => {
    expect(extrairFalas("0-3s gancho\nmostrar o produto")).toEqual([]);
    expect(extrairFalas(null)).toEqual([]);
  });
});

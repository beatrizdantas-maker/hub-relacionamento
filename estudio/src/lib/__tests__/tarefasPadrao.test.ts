import { describe, expect, it } from "vitest";
import { gerarTarefasPadrao, modeloPara } from "@/lib/tarefasPadrao";

describe("tarefas padrão", () => {
  it("Reels comum: gravar 4 dias antes, editar 2, revisar 1", () => {
    const t = gerarTarefasPadrao({ formato: "Reels", tipo: "Reels com a pessoa da marca falando", data: "2026-11-10", hoje: "2026-10-24" });
    expect(t.map((x) => [x.titulo, x.prazo, x.prioridade])).toEqual([
      ["Gravar", "2026-11-06", "Alta"],
      ["Editar e legendar", "2026-11-08", "Alta"],
      ["Revisar e agendar", "2026-11-09", "Média"],
    ]);
  });

  it("prova social e texto na tela têm os próprios modelos", () => {
    expect(modeloPara("Reels", "Reels de prova social")).toBe("provaSocial");
    expect(modeloPara("Reels", "Reels com TEXTO na tela")).toBe("textoNaTela");
    expect(modeloPara("Carrossel", "qualquer")).toBe("arte");
    expect(gerarTarefasPadrao({ formato: "Reels", tipo: "Reels de prova social", data: "2026-11-10", hoje: "2026-10-24" })).toHaveLength(4);
  });

  it("carrossel e estático: criar arte 3, revisar 2, agendar 1", () => {
    const t = gerarTarefasPadrao({ formato: "Estático", data: "2026-11-10", hoje: "2026-10-24", tema: "Identificação" });
    expect(t.map((x) => [x.titulo, x.prazo])).toEqual([
      ["Criar arte · Identificação", "2026-11-07"],
      ["Revisar texto e arte · Identificação", "2026-11-08"],
      ["Agendar · Identificação", "2026-11-09"],
    ]);
  });

  it("prazo nunca fica antes de hoje", () => {
    const t = gerarTarefasPadrao({ formato: "Reels", data: "2026-10-25", hoje: "2026-10-24" });
    expect(t.every((x) => x.prazo >= "2026-10-24")).toBe(true);
    expect(t[0].prazo).toBe("2026-10-24");
  });
});

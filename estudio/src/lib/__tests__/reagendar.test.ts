import { describe, expect, it } from "vitest";
import { deslocarPrazos } from "@/lib/reagendar";

describe("reagendar conteúdo", () => {
  const tarefas = [
    { id: "gravar", prazo: "2026-11-01", status: "pendente" },
    { id: "editar", prazo: "2026-11-03", status: "em_producao" },
    { id: "feita", prazo: "2026-11-04", status: "concluido" },
    { id: "sem-prazo", prazo: null, status: "pendente" },
  ];

  it("adiar 5 dias desloca só as abertas com prazo", () => {
    expect(deslocarPrazos(tarefas, "2026-11-05", "2026-11-10", "2026-10-28")).toEqual([
      { id: "gravar", prazo: "2026-11-06" },
      { id: "editar", prazo: "2026-11-08" },
    ]);
  });

  it("antecipar nunca leva o prazo para antes de hoje", () => {
    expect(deslocarPrazos(tarefas, "2026-11-05", "2026-10-29", "2026-10-28")).toEqual([
      { id: "gravar", prazo: "2026-10-28" },
      { id: "editar", prazo: "2026-10-28" },
    ]);
  });

  it("mesma data: nada muda", () => {
    expect(deslocarPrazos(tarefas, "2026-11-05", "2026-11-05", "2026-10-28")).toEqual([]);
  });
});

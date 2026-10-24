import { describe, expect, it } from "vitest";
import { diaDaSemana, diasEntre, inicioDaSemana, rotuloSemana, somarDias } from "@/lib/datas";

describe("datas", () => {
  it("semana começa na segunda", () => {
    expect(inicioDaSemana("2026-10-24")).toBe("2026-10-19"); // sábado → segunda
    expect(inicioDaSemana("2026-10-25")).toBe("2026-10-19"); // domingo → mesma segunda
    expect(inicioDaSemana("2026-10-26")).toBe("2026-10-26"); // segunda
  });
  it("dia da semana com domingo = 7", () => {
    expect(diaDaSemana("2026-10-26")).toBe(1);
    expect(diaDaSemana("2026-10-25")).toBe(7);
  });
  it("soma e diferença de dias", () => {
    expect(somarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(diasEntre("2026-10-24", "2026-11-10")).toBe(17);
  });
  it("rótulo da semana", () => {
    expect(rotuloSemana("2026-10-19")).toBe("19 a 25 de outubro");
    expect(rotuloSemana("2026-10-26")).toMatch(/26 de out\.? a 1 de nov/);
  });
});

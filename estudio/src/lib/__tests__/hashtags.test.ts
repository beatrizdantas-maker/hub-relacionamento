import { describe, expect, it } from "vitest";
import { juntarLegenda, normalizarHashtags } from "@/lib/ia/hashtags";

describe("hashtags", () => {
  it("limpa, tira repetidas e limita a 10", () => {
    expect(normalizarHashtags(["#Rotina de Estudos!", "rotinadeestudos", "##educação", "", "#", "2026", "#mães_atípicas"])).toEqual(["#RotinadeEstudos", "#educação", "#mães_atípicas"]);
    expect(normalizarHashtags(Array.from({ length: 15 }, (_, i) => `tag${i}`))).toHaveLength(10);
  });

  it("coloca as hashtags numa linha separada depois da chamada para ação", () => {
    expect(juntarLegenda("Texto.\n\nComenta EU QUERO", ["educacao", "#estudos"])).toBe("Texto.\n\nComenta EU QUERO\n\n#educacao #estudos");
  });

  it("aproveita hashtags que a IA já pôs no fim, sem repetir", () => {
    expect(juntarLegenda("Texto. Salva!\n#estudos #Escola\n\n", ["escola", "familia"])).toBe("Texto. Salva!\n\n#estudos #Escola #familia");
  });

  it("sem hashtags, a legenda fica como está", () => {
    expect(juntarLegenda("Só texto. Comenta SIM ", [])).toBe("Só texto. Comenta SIM");
  });
});

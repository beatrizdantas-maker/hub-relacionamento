import { describe, expect, it } from "vitest";
import { clarearParaEscuro, contraste, corSobre, estiloEmpresa, hexParaRgb } from "@/lib/cores";

describe("cores da empresa", () => {
  it("texto sobre a cor: branco em cores escuras, escuro em cores claras", () => {
    expect(corSobre("#7c3aed")).toBe("255 255 255");
    expect(corSobre("#fde047")).toBe("28 25 23");
  });

  it("no tema escuro a cor é clareada até 4,5:1 sobre o fundo, sem mexer nas que já passam", () => {
    const fundo: [number, number, number] = [20, 18, 17];
    const roxo = hexParaRgb("#7c3aed")!;
    expect(contraste(roxo, fundo)).toBeLessThan(4.5);
    expect(contraste(clarearParaEscuro(roxo), fundo)).toBeGreaterThanOrEqual(4.5);
    const amarelo = hexParaRgb("#fde047")!;
    expect(clarearParaEscuro(amarelo)).toEqual(amarelo);
    const azulMarinho = hexParaRgb("#1e1b4b")!;
    expect(contraste(clarearParaEscuro(azulMarinho), fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it("estiloEmpresa expõe as variantes do escuro", () => {
    const st = estiloEmpresa("#7c3aed", "#f59e0b") as Record<string, string>;
    expect(st["--cor-primaria"]).toBe("124 58 237");
    expect(st["--cor-primaria-escuro"]).not.toBe(st["--cor-primaria"]);
    expect(st["--sobre-primaria-escuro"]).toBe("28 25 23"); // clareado o bastante para pedir texto escuro
  });
});

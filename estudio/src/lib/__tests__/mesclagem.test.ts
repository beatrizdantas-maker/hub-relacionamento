import { describe, expect, it } from "vitest";
import { calcularMesclagem } from "@/lib/mesclagem";

const original = { nome: "NARAEDU", sobre: "Escola", pilares: ["A"], cor: "#000000" };

describe("calcularMesclagem", () => {
  it("campos que só a outra pessoa mudou entram sozinhos", () => {
    const meus = { ...original, sobre: "Escola de inglês" };
    const deles = { ...original, cor: "#FF0000" };
    const r = calcularMesclagem(original, meus, deles);
    expect(r.conflitos).toEqual([]);
    expect(r.mesclado).toEqual({ nome: "NARAEDU", sobre: "Escola de inglês", pilares: ["A"], cor: "#FF0000" });
  });

  it("campos que os dois mudaram para valores diferentes viram conflito e mantêm o meu até a escolha", () => {
    const meus = { ...original, sobre: "Minha versão" };
    const deles = { ...original, sobre: "Versão deles", nome: "NARA" };
    const r = calcularMesclagem(original, meus, deles);
    expect(r.conflitos).toEqual(["sobre"]);
    expect(r.mesclado.sobre).toBe("Minha versão");
    expect(r.mesclado.nome).toBe("NARA");
  });

  it("mesma alteração dos dois lados não é conflito", () => {
    const meus = { ...original, pilares: ["A", "B"] };
    const deles = { ...original, pilares: ["A", "B"] };
    const r = calcularMesclagem(original, meus, deles);
    expect(r.conflitos).toEqual([]);
    expect(r.mesclado.pilares).toEqual(["A", "B"]);
  });

  it("sem mudanças do outro lado, mantém tudo que eu digitei", () => {
    const meus = { ...original, nome: "Novo", sobre: "Outro" };
    const r = calcularMesclagem(original, meus, { ...original });
    expect(r.conflitos).toEqual([]);
    expect(r.mesclado).toEqual(meus);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("robô de publicação", () => {
  it("regras.ts da função é cópia exata de src/lib/publicacao.ts", () => {
    const raiz = path.resolve(__dirname, "../../..");
    const original = readFileSync(path.join(raiz, "src/lib/publicacao.ts"), "utf8");
    const copia = readFileSync(path.join(raiz, "supabase/functions/estudio-publicar/regras.ts"), "utf8");
    expect(copia).toBe(original);
  });
});

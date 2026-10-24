import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

describe("cripto", () => {
  beforeAll(() => {
    process.env.ESTUDIO_CRYPTO_KEY = randomBytes(32).toString("base64");
  });

  it("cifra e decifra o mesmo texto", async () => {
    const { cifrar, decifrar } = await import("@/lib/cripto");
    const original = "token-metricool-123";
    const cifrado = cifrar(original);
    expect(cifrado).not.toContain(original);
    expect(cifrado.startsWith("v1.")).toBe(true);
    expect(decifrar(cifrado)).toBe(original);
  });

  it("gera cifrados diferentes a cada vez (IV aleatório)", async () => {
    const { cifrar } = await import("@/lib/cripto");
    expect(cifrar("abc")).not.toBe(cifrar("abc"));
  });

  it("rejeita texto adulterado", async () => {
    const { cifrar, decifrar } = await import("@/lib/cripto");
    const c = cifrar("abc");
    const adulterado = c.slice(0, -2) + (c.endsWith("AA") ? "BB" : "AA");
    expect(() => decifrar(adulterado)).toThrow();
  });
});

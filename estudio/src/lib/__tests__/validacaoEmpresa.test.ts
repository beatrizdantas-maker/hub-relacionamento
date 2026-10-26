import { describe, expect, it } from "vitest";
import { LIMITE_TEXTO_MARCA, esquemaEmpresa } from "@/lib/validacao/empresa";
import { esquemaConteudo } from "@/lib/validacao/conteudo";
import { RITMO_PADRAO } from "@/lib/padroes";

const base = {
  nome: "NARAEDU", cor_primaria: "#7C3AED", cor_secundaria: "#F59E0B",
  metas: { visualizacoes_dia: null, seguidores_liquidos_mes: null, mensagens_mes: null, salvamentos_carrossel: null, alcance_reels: null, engajamento_pct: null },
  ritmo_semanal: RITMO_PADRAO,
};

describe("validação da empresa", () => {
  it("aceita textos longos de marca (ex.: 5.000 caracteres colados)", () => {
    expect(esquemaEmpresa.safeParse({ ...base, sobre: "a".repeat(5000) }).success).toBe(true);
  });

  it("acima do limite, a mensagem é em português e diz qual campo", () => {
    const r = esquemaEmpresa.safeParse({ ...base, publico: "a".repeat(LIMITE_TEXTO_MARCA + 1) });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe('"Público" está longo demais: no máximo 20.000 caracteres. Resuma o texto.');
  });

  it("outros esquemas também respondem em português", () => {
    const r = esquemaConteudo.safeParse({ data: "2026-11-02", formato: "Reels", status: "sugestao", cta: "x".repeat(301) });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("Texto longo demais: no máximo 300 caracteres.");
  });
});

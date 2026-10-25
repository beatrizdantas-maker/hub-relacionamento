import { describe, expect, it } from "vitest";
import { agruparTarefasInicio, alertasInicio } from "@/lib/inicio";
import type { Tarefa } from "@/lib/tipos/database";

const base = { hoje: "2026-10-28", papel: "editor" as const, atrasadas: 0, sugestoesPendentes: 0, semanasRegistradas: ["2026-10-19"], ritmoDefinido: true, metricoolConfigurado: null, proximos7DiasVazios: false };

describe("alertas do Início", () => {
  it("tudo em dia: nenhum alerta", () => {
    expect(alertasInicio(base)).toEqual([]);
  });

  it("atrasadas e sugestões pendentes, na ordem de urgência", () => {
    const a = alertasInicio({ ...base, atrasadas: 3, sugestoesPendentes: 1 });
    expect(a.map((x) => x.chave)).toEqual(["atrasadas", "sugestoes"]);
    expect(a[0].texto).toBe("3 tarefas atrasadas");
    expect(a[1].texto).toBe("1 sugestão da IA aguardando aprovação");
  });

  it("semana passada sem métrica: Registrar sem Metricool, Atualizar com Metricool", () => {
    expect(alertasInicio({ ...base, semanasRegistradas: [] })[0]).toMatchObject({ chave: "metrica", acao: "Registrar", href: "/painel?abrir=registrar" });
    expect(alertasInicio({ ...base, semanasRegistradas: [], metricoolConfigurado: true })[0]).toMatchObject({ chave: "metrica", acao: "Atualizar do Metricool" });
  });

  it("leitor e colaborador não recebem alertas de edição, só os de tarefas", () => {
    const a = alertasInicio({ ...base, papel: "leitor", atrasadas: 1, sugestoesPendentes: 4, semanasRegistradas: [], ritmoDefinido: false, proximos7DiasVazios: true });
    expect(a.map((x) => x.chave)).toEqual(["atrasadas"]);
  });

  it("Dono sem Metricool vê o convite para conectar; 7 dias vazios sugere gerar o mês", () => {
    const a = alertasInicio({ ...base, papel: "dono", metricoolConfigurado: false, proximos7DiasVazios: true });
    expect(a.map((x) => x.chave)).toEqual(["metricool", "vazio"]);
  });
});

const t = (p: Partial<Tarefa> & { id: string }): Tarefa => ({
  empresa_id: "e", titulo: p.id, conteudo_id: null, tipo: "Outro", responsavel_id: null, prazo: null, prioridade: "Média", status: "pendente",
  concluido_em: null, origem: "equipe", criado_por: null, criado_em: "", atualizado_em: "", ...p,
});

describe("tarefas do Início", () => {
  it("agrupa em atrasadas, hoje e próximos 7 dias, ignorando concluídas e sem prazo", () => {
    const g = agruparTarefasInicio(
      [
        t({ id: "ontem", prazo: "2026-10-27" }),
        t({ id: "hoje-baixa", prazo: "2026-10-28", prioridade: "Baixa" }),
        t({ id: "hoje-alta", prazo: "2026-10-28", prioridade: "Alta" }),
        t({ id: "amanha", prazo: "2026-10-29" }),
        t({ id: "em-7", prazo: "2026-11-04" }),
        t({ id: "em-8", prazo: "2026-11-05" }),
        t({ id: "feita", prazo: "2026-10-27", status: "concluido" }),
        t({ id: "sem-prazo" }),
      ],
      "2026-10-28",
    );
    expect(g.atrasadas.map((x) => x.id)).toEqual(["ontem"]);
    expect(g.hoje.map((x) => x.id)).toEqual(["hoje-alta", "hoje-baixa"]);
    expect(g.proximas.map((x) => x.id)).toEqual(["amanha", "em-7"]);
  });
});

import type { Prioridade, StatusTarefa } from "@/lib/tipos/database";

export const STATUS_TAREFA_ROTULO: Record<StatusTarefa, string> = {
  pendente: "Pendente",
  em_producao: "Em produção",
  aguardando: "Aguardando",
  concluido: "Concluída",
};

export const PRIORIDADE_TOM: Record<Prioridade, "atrasado" | "manual" | "neutro"> = {
  Alta: "atrasado",
  Média: "manual",
  Baixa: "neutro",
};

export const FILTROS_TAREFA = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "atrasadas", rotulo: "Atrasadas" },
  { chave: "semana", rotulo: "Esta semana" },
  { chave: "abertas", rotulo: "Todas abertas" },
  { chave: "entregues", rotulo: "Entregues" },
] as const;
export type FiltroTarefa = (typeof FILTROS_TAREFA)[number]["chave"];

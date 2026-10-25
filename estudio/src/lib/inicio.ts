/**
 * Lógica pura da tela Início: alertas do que precisa de atenção e
 * agrupamento das tarefas (atrasadas, hoje, próximos dias).
 */
import { inicioDaSemana, somarDias, type DataISO } from "./datas";
import type { Papel, Tarefa } from "./tipos/database";

export interface Alerta {
  chave: string;
  tom: "atrasado" | "ia" | "manual" | "neutro";
  texto: string;
  href: string;
  acao: string;
}

export interface EntradaAlertas {
  hoje: DataISO;
  papel: Papel;
  atrasadas: number;
  sugestoesPendentes: number;        // conteúdos + stories com status "sugestao" de hoje em diante
  semanasRegistradas: DataISO[];     // segundas-feiras com linha em metricas_semanais
  ritmoDefinido: boolean;
  metricoolConfigurado: boolean | null; // null = não é Dono (não sabe)
  proximos7DiasVazios: boolean;
}

export function alertasInicio(e: EntradaAlertas): Alerta[] {
  const alertas: Alerta[] = [];
  const podeEditar = e.papel === "dono" || e.papel === "editor";
  if (e.atrasadas > 0) {
    alertas.push({ chave: "atrasadas", tom: "atrasado", texto: `${e.atrasadas} ${e.atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`, href: "/tarefas?filtro=atrasadas", acao: "Ver tarefas" });
  }
  if (e.sugestoesPendentes > 0 && podeEditar) {
    alertas.push({ chave: "sugestoes", tom: "ia", texto: `${e.sugestoesPendentes} ${e.sugestoesPendentes === 1 ? "sugestão da IA aguardando aprovação" : "sugestões da IA aguardando aprovação"}`, href: "/calendario", acao: "Revisar no calendário" });
  }
  const semanaPassada = somarDias(inicioDaSemana(e.hoje), -7);
  if (podeEditar && !e.semanasRegistradas.includes(semanaPassada)) {
    alertas.push({ chave: "metrica", tom: "manual", texto: "A semana passada ainda não tem métricas registradas", href: e.metricoolConfigurado ? "/painel" : "/painel?abrir=registrar", acao: e.metricoolConfigurado ? "Atualizar do Metricool" : "Registrar" });
  }
  if (podeEditar && !e.ritmoDefinido) {
    alertas.push({ chave: "ritmo", tom: "neutro", texto: "O ritmo semanal ainda não foi definido", href: "/marca", acao: "Definir em Marca" });
  }
  if (e.metricoolConfigurado === false) {
    alertas.push({ chave: "metricool", tom: "neutro", texto: "O Metricool não está conectado: os dados entram só por registro manual", href: "/marca", acao: "Conectar" });
  }
  if (podeEditar && e.proximos7DiasVazios && e.ritmoDefinido) {
    alertas.push({ chave: "vazio", tom: "ia", texto: "Nada programado para os próximos 7 dias", href: "/calendario?abrir=gerar-mes", acao: "Gerar mês com IA" });
  }
  return alertas;
}

export interface GruposTarefas {
  atrasadas: Tarefa[];
  hoje: Tarefa[];
  proximas: Tarefa[];   // prazo entre amanhã e hoje + 7
}

/** Só tarefas abertas; cada grupo ordenado por prazo e prioridade. */
export function agruparTarefasInicio(tarefas: Tarefa[], hoje: DataISO): GruposTarefas {
  const limite = somarDias(hoje, 7);
  const peso = { Alta: 0, Média: 1, Baixa: 2 } as const;
  const ordenar = (a: Tarefa, b: Tarefa) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || peso[a.prioridade] - peso[b.prioridade] || a.titulo.localeCompare(b.titulo, "pt-BR");
  const abertas = tarefas.filter((t) => t.status !== "concluido");
  return {
    atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).sort(ordenar),
    hoje: abertas.filter((t) => t.prazo === hoje).sort(ordenar),
    proximas: abertas.filter((t) => t.prazo && t.prazo > hoje && t.prazo <= limite).sort(ordenar),
  };
}

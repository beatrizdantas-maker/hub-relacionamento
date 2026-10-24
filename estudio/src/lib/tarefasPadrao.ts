import { somarDias, type DataISO } from "./datas";
import type { FormatoConteudo, Prioridade, TipoTarefa } from "./tipos/database";

export interface TarefaPadrao {
  titulo: string;
  tipo: TipoTarefa;
  prazo: DataISO;
  prioridade: Prioridade;
}

type Modelo = { titulo: string; tipo: TipoTarefa; diasAntes: number; prioridade: Prioridade };

const MODELOS = {
  reels: [
    { titulo: "Gravar", tipo: "Gravar", diasAntes: 4, prioridade: "Alta" },
    { titulo: "Editar e legendar", tipo: "Editar", diasAntes: 2, prioridade: "Alta" },
    { titulo: "Revisar e agendar", tipo: "Revisar", diasAntes: 1, prioridade: "Média" },
  ],
  provaSocial: [
    { titulo: "Marcar gravação", tipo: "Planejamento", diasAntes: 7, prioridade: "Alta" },
    { titulo: "Gravar depoimento", tipo: "Gravar", diasAntes: 2, prioridade: "Alta" },
    { titulo: "Editar", tipo: "Editar", diasAntes: 1, prioridade: "Alta" },
    { titulo: "Revisar e agendar", tipo: "Revisar", diasAntes: 1, prioridade: "Média" },
  ],
  textoNaTela: [
    { titulo: "Captar imagens", tipo: "Fotografar", diasAntes: 3, prioridade: "Alta" },
    { titulo: "Montar", tipo: "Editar", diasAntes: 1, prioridade: "Alta" },
    { titulo: "Agendar", tipo: "Publicar", diasAntes: 1, prioridade: "Média" },
  ],
  arte: [
    { titulo: "Criar arte", tipo: "Criar arte", diasAntes: 3, prioridade: "Alta" },
    { titulo: "Revisar texto e arte", tipo: "Revisar", diasAntes: 2, prioridade: "Média" },
    { titulo: "Agendar", tipo: "Publicar", diasAntes: 1, prioridade: "Média" },
  ],
} satisfies Record<string, Modelo[]>;

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Qual conjunto de tarefas padrão vale para um conteúdo. */
export function modeloPara(formato: FormatoConteudo, tipo: string | null | undefined): keyof typeof MODELOS {
  const t = normalizar(tipo ?? "");
  if (formato === "Reels") {
    if (t.includes("prova social") || t.includes("depoimento")) return "provaSocial";
    if (t.includes("texto na tela")) return "textoNaTela";
    return "reels";
  }
  return "arte";
}

/**
 * Tarefas padrão ao criar um conteúdo (seção 6). O prazo nunca fica antes de hoje.
 * Títulos incluem o tema para a tarefa fazer sentido no quadro.
 */
export function gerarTarefasPadrao(opcoes: { formato: FormatoConteudo; tipo?: string | null; data: DataISO; hoje: DataISO; tema?: string | null }): TarefaPadrao[] {
  const modelo = MODELOS[modeloPara(opcoes.formato, opcoes.tipo)];
  const sufixo = opcoes.tema?.trim() ? ` · ${opcoes.tema.trim().slice(0, 60)}` : "";
  return modelo.map((m) => {
    const prazoCalculado = somarDias(opcoes.data, -m.diasAntes);
    return {
      titulo: `${m.titulo}${sufixo}`,
      tipo: m.tipo,
      prazo: prazoCalculado < opcoes.hoje ? opcoes.hoje : prazoCalculado,
      prioridade: m.prioridade,
    };
  });
}

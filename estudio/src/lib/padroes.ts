/** Valores padrão (usados no servidor e no navegador). */
import type { Metas, RitmoDia } from "./tipos/database";

export const RITMO_PADRAO: RitmoDia[] = [
  { dia: 1, hora: "12:00", formato: "Carrossel", tipo: "Carrossel salvável", pilar: "", objetivo: "salvamentos" },
  { dia: 2, hora: "20:00", formato: "Reels", tipo: "Reels com a pessoa da marca falando", pilar: "", objetivo: "alcance" },
  { dia: 3, hora: "20:00", formato: "Reels", tipo: "Reels de prova social", pilar: "", objetivo: "direct" },
  { dia: 4, hora: "12:00", formato: "Carrossel", tipo: "Campanha ativa", pilar: "", objetivo: "engajamento" },
  { dia: 5, hora: "19:00", formato: "Carrossel", tipo: "Carrossel de dor do cliente", pilar: "", objetivo: "direct" },
  { dia: 6, hora: "20:00", formato: "Estático", tipo: "Estático de identificação", pilar: "", objetivo: "comentarios" },
  { dia: 7, hora: "20:00", formato: "Reels", tipo: "Reels com texto na tela", pilar: "", objetivo: "compartilhamentos" },
];

export const METAS_PADRAO: Metas = {
  visualizacoes_dia: null,
  seguidores_liquidos_mes: null,
  mensagens_mes: null,
  salvamentos_carrossel: null,
  alcance_reels: null,
  engajamento_pct: null,
};

export function ritmoOuPadrao(r?: RitmoDia[] | null): RitmoDia[] {
  return Array.isArray(r) && r.length === 7 ? r.map((x) => ({ ...x })) : RITMO_PADRAO.map((x) => ({ ...x }));
}

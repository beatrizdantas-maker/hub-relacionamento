import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarCurta, somarDias, type DataISO } from "./datas";
import type { FonteMetrica, MetricaSemanal, Metas, ResultadoPost } from "./tipos/database";

/** Um período (semana ou mês) com os mesmos campos numéricos de metricas_semanais. */
export interface Periodo {
  chave: string;              // "2026-10-19" (segunda) ou "2026-10" (mês)
  inicio: DataISO;
  fim: DataISO;
  rotulo: string;             // "19/10" ou "out/26"
  rotuloLongo: string;        // "19 a 25/10" ou "outubro de 2026"
  completo: boolean;          // já passou inteiro
  fonte: FonteMetrica | "misto" | null;
  editadoManual: boolean;
  semanas: number;            // quantas semanas com registro compõem o período
  seguidores: number | null;
  seguidores_liquidos: number | null;
  visualizacoes: number | null;
  alcance: number | null;
  interacoes: number | null;
  alcance_posts: number | null;
  engajamento: number | null; // % = interacoes / alcance_posts × 100
  compartilhamentos: number | null;
  salvamentos: number | null;
  respostas_stories: number | null;
  cliques_link: number | null;
  mensagens_direct: number | null;
  posts: number | null;
  reels: number | null;
  stories: number | null;
  dias_com_dados: number;
}

export const INDICADORES: { chave: keyof Periodo; rotulo: string; tipo: "numero" | "pct"; descricao: string }[] = [
  { chave: "seguidores", rotulo: "Seguidores", tipo: "numero", descricao: "Total ao fim do período" },
  { chave: "seguidores_liquidos", rotulo: "Seguidores líquidos", tipo: "numero", descricao: "Ganhos menos perdidos" },
  { chave: "visualizacoes", rotulo: "Visualizações", tipo: "numero", descricao: "Soma do período" },
  { chave: "alcance", rotulo: "Alcance", tipo: "numero", descricao: "Contas alcançadas" },
  { chave: "engajamento", rotulo: "Engajamento", tipo: "pct", descricao: "Interações ÷ alcance dos posts" },
  { chave: "compartilhamentos", rotulo: "Compartilhamentos", tipo: "numero", descricao: "Dos posts publicados" },
  { chave: "salvamentos", rotulo: "Salvamentos", tipo: "numero", descricao: "Dos posts publicados" },
  { chave: "respostas_stories", rotulo: "Respostas aos stories", tipo: "numero", descricao: "Soma do período" },
  { chave: "cliques_link", rotulo: "Cliques no link", tipo: "numero", descricao: "Registro manual" },
  { chave: "mensagens_direct", rotulo: "Mensagens no direct", tipo: "numero", descricao: "Registro manual" },
];

const soma = (valores: (number | null | undefined)[]): number | null => {
  const v = valores.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};

export function engajamentoDe(interacoes: number | null, alcancePosts: number | null): number | null {
  if (interacoes == null || !alcancePosts) return null;
  return Math.round((interacoes / alcancePosts) * 10000) / 100;
}

function liquidos(m: Pick<MetricaSemanal, "seguidores_ganhos" | "seguidores_perdidos">): number | null {
  if (m.seguidores_ganhos == null && m.seguidores_perdidos == null) return null;
  return (m.seguidores_ganhos ?? 0) - (m.seguidores_perdidos ?? 0);
}

/** Converte uma linha de metricas_semanais num período-semana. */
export function semanaParaPeriodo(m: MetricaSemanal, hoje: DataISO): Periodo {
  const fim = m.fim ?? somarDias(m.semana, 6);
  return {
    chave: m.semana,
    inicio: m.semana,
    fim,
    rotulo: formatarCurta(m.semana),
    rotuloLongo: `${formatarCurta(m.semana)} a ${formatarCurta(fim)}`,
    completo: fim < hoje,
    fonte: m.fonte,
    editadoManual: m.editado_manual,
    semanas: 1,
    seguidores: m.seguidores,
    seguidores_liquidos: liquidos(m),
    visualizacoes: m.visualizacoes,
    alcance: m.alcance,
    interacoes: m.interacoes,
    alcance_posts: m.alcance_posts,
    engajamento: engajamentoDe(m.interacoes, m.alcance_posts),
    compartilhamentos: m.compartilhamentos,
    salvamentos: m.salvamentos,
    respostas_stories: m.respostas_stories,
    cliques_link: m.cliques_link,
    mensagens_direct: m.mensagens_direct,
    posts: m.posts,
    reels: m.reels,
    stories: m.stories,
    dias_com_dados: m.dias_com_dados,
  };
}

export const mesDe = (data: DataISO) => data.slice(0, 7);
const ultimoDiaDoMes = (mes: string) => format(new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0), "yyyy-MM-dd");

/** Agrupa semanas em meses: entra no mês a semana que COMEÇA nele. */
export function agruparPorMes(semanas: MetricaSemanal[], hoje: DataISO): Periodo[] {
  const grupos = new Map<string, MetricaSemanal[]>();
  for (const s of [...semanas].sort((a, b) => a.semana.localeCompare(b.semana))) {
    const mes = mesDe(s.semana);
    grupos.set(mes, [...(grupos.get(mes) ?? []), s]);
  }
  return [...grupos.entries()].map(([mes, lista]) => {
    const inicio = `${mes}-01`;
    const fim = ultimoDiaDoMes(mes);
    const fontes = new Set(lista.map((l) => l.fonte));
    const ultima = lista[lista.length - 1];
    const interacoes = soma(lista.map((l) => l.interacoes));
    const alcancePosts = soma(lista.map((l) => l.alcance_posts));
    const liq = lista.map(liquidos);
    const d = parseISO(inicio);
    return {
      chave: mes,
      inicio,
      fim,
      rotulo: format(d, "MMM/yy", { locale: ptBR }).replace(".", ""),
      rotuloLongo: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
      completo: fim < hoje && lista.every((l) => (l.fim ?? somarDias(l.semana, 6)) < hoje),
      fonte: fontes.size === 1 ? lista[0].fonte : "misto",
      editadoManual: lista.some((l) => l.editado_manual),
      semanas: lista.length,
      seguidores: [...lista].reverse().find((l) => l.seguidores != null)?.seguidores ?? null,
      seguidores_liquidos: soma(liq),
      visualizacoes: soma(lista.map((l) => l.visualizacoes)),
      alcance: soma(lista.map((l) => l.alcance)),
      interacoes,
      alcance_posts: alcancePosts,
      engajamento: engajamentoDe(interacoes, alcancePosts),
      compartilhamentos: soma(lista.map((l) => l.compartilhamentos)),
      salvamentos: soma(lista.map((l) => l.salvamentos)),
      respostas_stories: soma(lista.map((l) => l.respostas_stories)),
      cliques_link: soma(lista.map((l) => l.cliques_link)),
      mensagens_direct: soma(lista.map((l) => l.mensagens_direct)),
      posts: soma(lista.map((l) => l.posts)),
      reels: soma(lista.map((l) => l.reels)),
      stories: soma(lista.map((l) => l.stories)),
      dias_com_dados: lista.reduce((a, l) => a + (l.dias_com_dados ?? 0), 0),
      ...(ultima ? {} : {}),
    };
  });
}

export interface Comparacao {
  atual: Periodo | null;
  anterior: Periodo | null;
}

/** Último período completo e o anterior a ele (parciais ficam de fora). */
export function compararUltimos(periodos: Periodo[]): Comparacao {
  const completos = periodos.filter((p) => p.completo).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const atual = completos[completos.length - 1] ?? null;
  const anterior = completos[completos.length - 2] ?? null;
  return { atual, anterior };
}

export interface Variacao {
  valor: number | null;
  anterior: number | null;
  diferenca: number | null;   // absoluta (ou pontos percentuais no engajamento)
  percentual: number | null;  // null para engajamento e quando anterior é 0/nulo
}

export function variacao(chave: keyof Periodo, atual: Periodo | null, anterior: Periodo | null): Variacao {
  const v = (atual?.[chave] as number | null | undefined) ?? null;
  const a = (anterior?.[chave] as number | null | undefined) ?? null;
  if (v == null || a == null) return { valor: v, anterior: a, diferenca: null, percentual: null };
  const diferenca = Math.round((v - a) * 100) / 100;
  const percentual = chave === "engajamento" || a === 0 ? null : Math.round(((v - a) / Math.abs(a)) * 1000) / 10;
  return { valor: v, anterior: a, diferenca, percentual };
}

// ---------- Metas do mês ----------

export interface ProgressoMeta {
  chave: keyof Metas;
  rotulo: string;
  meta: number;
  valor: number | null;
  progresso: number | null; // 0–1 (pode passar de 1)
  tipo: "numero" | "pct";
  base: string;             // explicação de como foi calculado
}

/**
 * Metas do mês: usa as semanas que começam no mês e os posts publicados nele.
 * Nada é inventado: sem registro, o valor fica nulo.
 */
export function progressoMetas(metas: Metas | null | undefined, semanasDoMes: MetricaSemanal[], postsDoMes: ResultadoPost[]): ProgressoMeta[] {
  if (!metas) return [];
  const media = (v: (number | null)[]) => { const x = v.filter((n): n is number => n != null); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };
  const dias = semanasDoMes.reduce((a, s) => a + (s.dias_com_dados || 0), 0);
  const visualizacoes = soma(semanasDoMes.map((s) => s.visualizacoes));
  const liq = soma(semanasDoMes.map(liquidos));
  const mensagens = soma(semanasDoMes.map((s) => s.mensagens_direct));
  const interacoes = soma(semanasDoMes.map((s) => s.interacoes));
  const alcancePosts = soma(semanasDoMes.map((s) => s.alcance_posts));
  const carrosseis = postsDoMes.filter((p) => p.formato === "Carrossel");
  const reels = postsDoMes.filter((p) => p.formato === "Reels");

  const itens: (ProgressoMeta | null)[] = [
    metas.visualizacoes_dia != null ? { chave: "visualizacoes_dia", rotulo: "Visualizações por dia", meta: metas.visualizacoes_dia, valor: visualizacoes != null && dias > 0 ? Math.round(visualizacoes / dias) : null, progresso: null, tipo: "numero", base: `${semanasDoMes.length} semanas · ${dias} dias com dado` } : null,
    metas.seguidores_liquidos_mes != null ? { chave: "seguidores_liquidos_mes", rotulo: "Seguidores líquidos no mês", meta: metas.seguidores_liquidos_mes, valor: liq, progresso: null, tipo: "numero", base: `${semanasDoMes.length} semanas do mês` } : null,
    metas.mensagens_mes != null ? { chave: "mensagens_mes", rotulo: "Mensagens no direct", meta: metas.mensagens_mes, valor: mensagens, progresso: null, tipo: "numero", base: "registro manual das semanas" } : null,
    metas.salvamentos_carrossel != null ? { chave: "salvamentos_carrossel", rotulo: "Salvamentos por carrossel", meta: metas.salvamentos_carrossel, valor: media(carrosseis.map((p) => p.salvamentos)), progresso: null, tipo: "numero", base: `${carrosseis.length} carrosséis publicados` } : null,
    metas.alcance_reels != null ? { chave: "alcance_reels", rotulo: "Alcance por Reels", meta: metas.alcance_reels, valor: media(reels.map((p) => p.alcance)), progresso: null, tipo: "numero", base: `${reels.length} Reels publicados` } : null,
    metas.engajamento_pct != null ? { chave: "engajamento_pct", rotulo: "Engajamento", meta: metas.engajamento_pct, valor: engajamentoDe(interacoes, alcancePosts), progresso: null, tipo: "pct", base: "interações ÷ alcance dos posts" } : null,
  ];
  return itens
    .filter((i): i is ProgressoMeta => i != null)
    .map((i) => ({ ...i, valor: i.valor != null ? Math.round(i.valor * 100) / 100 : null, progresso: i.valor != null && i.meta > 0 ? i.valor / i.meta : null }));
}

// ---------- Formatação ----------

const fmtNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const fmtDecimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatarNumero(v: number | null | undefined, tipo: "numero" | "pct" = "numero"): string {
  if (v == null) return "sem dado";
  if (tipo === "pct") return `${fmtDecimal.format(v)}%`;
  return fmtNumero.format(v);
}

export function formatarDiferenca(v: Variacao, tipo: "numero" | "pct"): string | null {
  if (v.diferenca == null) return null;
  const sinal = v.diferenca > 0 ? "+" : "";
  if (tipo === "pct") return `${sinal}${fmtDecimal.format(v.diferenca)} p.p.`;
  const abs = `${sinal}${fmtNumero.format(v.diferenca)}`;
  return v.percentual == null ? abs : `${abs} (${sinal}${fmtDecimal.format(v.percentual)}%)`;
}

export function rotuloFonte(f: FonteMetrica | "misto" | null, editadoManual = false): { texto: string; tom: "real" | "manual" | "neutro" } {
  if (f === "metricool") return editadoManual ? { texto: "Dado real · Metricool, ajustado à mão", tom: "real" } : { texto: "Dado real · Metricool", tom: "real" };
  if (f === "manual") return { texto: "Dado real · registro manual", tom: "manual" };
  if (f === "misto") return { texto: "Dado real · Metricool e manual", tom: "real" };
  return { texto: "Sem registro", tom: "neutro" };
}

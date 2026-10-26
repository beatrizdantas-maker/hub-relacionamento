/**
 * Análise do sistema (sem IA): olha os dados reais registrados e sugere
 * metas do mês e horários do ritmo semanal. Cada sugestão traz o valor real
 * em que se baseia; sem dado suficiente, não sugere nada.
 */
import { formatInTimeZone } from "date-fns-tz";
import { somarDias, type DataISO } from "./datas";
import { engajamentoDe, formatarNumero } from "./metricas";
import type { FormatoConteudo, Metas, MetricaSemanal, ResultadoPost, RitmoDia } from "./tipos/database";

export const CRESCIMENTO_PADRAO = 0.1; // metas = real + 10%
const SEMANAS_ANALISADAS = 4;
const DIAS_POSTS = 56; // 8 semanas
const MINIMO_POSTS = 2;

export interface SugestaoMeta {
  chave: keyof Metas;
  rotulo: string;
  tipo: "numero" | "pct";
  real: number | null;      // valor real atual (na mesma unidade da meta)
  sugerida: number | null;  // null = sem dado suficiente
  base: string;             // de onde veio o número real
}

export interface AnaliseMetas {
  periodo: { de: DataISO; ate: DataISO; semanas: number } | null;
  itens: SugestaoMeta[];
  temSugestao: boolean;
}

/** Arredonda para um número "redondo" conforme a grandeza (ex.: 3.014 → 3.000; 48,4 → 48). */
export function arredondarMeta(n: number): number {
  const a = Math.abs(n);
  const passo = a >= 10000 ? 500 : a >= 1000 ? 50 : a >= 100 ? 5 : 1;
  return Math.round(n / passo) * passo;
}

const media = (v: (number | null | undefined)[]): number | null => {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
};
const soma = (v: (number | null | undefined)[]): number | null => {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) : null;
};

export function analisarMetas(entrada: { hoje: DataISO; semanas: MetricaSemanal[]; posts: ResultadoPost[]; crescimento?: number }): AnaliseMetas {
  const g = 1 + (entrada.crescimento ?? CRESCIMENTO_PADRAO);
  const completas = entrada.semanas
    .filter((s) => (s.fim ?? somarDias(s.semana, 6)) < entrada.hoje)
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .slice(-SEMANAS_ANALISADAS);
  const limitePosts = somarDias(entrada.hoje, -DIAS_POSTS);
  const posts = entrada.posts.filter((p) => p.publicado_em.slice(0, 10) >= limitePosts);
  const n = completas.length;
  const periodo = n ? { de: completas[0].semana, ate: completas[n - 1].fim ?? somarDias(completas[n - 1].semana, 6), semanas: n } : null;
  const semanasTxt = `${n} ${n === 1 ? "semana completa" : "semanas completas"}`;

  // Visualizações por dia
  const dias = completas.reduce((a, s) => a + (s.visualizacoes != null ? s.dias_com_dados || 7 : 0), 0);
  const vis = soma(completas.map((s) => s.visualizacoes));
  const visDia = vis != null && dias > 0 ? vis / dias : null;

  // Seguidores líquidos por mês (média semanal × 30/7)
  const liqSemanas = completas.map((s) => (s.seguidores_ganhos == null && s.seguidores_perdidos == null ? null : (s.seguidores_ganhos ?? 0) - (s.seguidores_perdidos ?? 0)));
  const liqSemana = media(liqSemanas);
  const liqMes = liqSemana != null ? (liqSemana * 30) / 7 : null;

  // Mensagens no direct por mês (registro manual)
  const msgSemana = media(completas.map((s) => s.mensagens_direct));
  const msgMes = msgSemana != null ? (msgSemana * 30) / 7 : null;

  // Salvamentos por carrossel e alcance por Reels (posts das últimas 8 semanas)
  const carrosseis = posts.filter((p) => p.formato === "Carrossel" && p.salvamentos != null);
  const reels = posts.filter((p) => p.formato === "Reels" && p.alcance != null);
  const salvCarrossel = carrosseis.length >= MINIMO_POSTS ? media(carrosseis.map((p) => p.salvamentos)) : null;
  const alcanceReels = reels.length >= MINIMO_POSTS ? media(reels.map((p) => p.alcance)) : null;

  // Engajamento (interações ÷ alcance dos posts, no período)
  const eng = engajamentoDe(soma(completas.map((s) => s.interacoes)), soma(completas.map((s) => s.alcance_posts)));

  const item = (chave: keyof Metas, rotulo: string, real: number | null, base: string, tipo: "numero" | "pct" = "numero"): SugestaoMeta => {
    if (real == null) return { chave, rotulo, tipo, real: null, sugerida: null, base: "sem dado suficiente" };
    let sugerida: number;
    if (tipo === "pct") sugerida = Math.round(real * g * 10) / 10;
    else if (chave === "seguidores_liquidos_mes" && real <= 0) sugerida = 0; // primeiro passo: parar de perder
    else sugerida = Math.max(1, arredondarMeta(real * g));
    return { chave, rotulo, tipo, real: tipo === "pct" ? Math.round(real * 10) / 10 : Math.round(real), sugerida, base };
  };

  const itens: SugestaoMeta[] = [
    item("visualizacoes_dia", "Visualizações por dia", visDia, `${semanasTxt}, ${dias} dias com dado`),
    item("seguidores_liquidos_mes", "Seguidores líquidos no mês", liqMes, `média de ${liqSemana != null ? formatarNumero(Math.round(liqSemana)) : "—"} por semana em ${semanasTxt}`),
    item("mensagens_mes", "Mensagens no direct por mês", msgMes, `registro manual de ${semanasTxt}`),
    item("salvamentos_carrossel", "Salvamentos por carrossel", salvCarrossel, `${carrosseis.length} carrosséis das últimas 8 semanas`),
    item("alcance_reels", "Alcance por Reels", alcanceReels, `${reels.length} Reels das últimas 8 semanas`),
    item("engajamento_pct", "Engajamento (%)", eng, `interações ÷ alcance dos posts em ${semanasTxt}`, "pct"),
  ];
  return { periodo, itens, temSugestao: itens.some((i) => i.sugerida != null) };
}

// ---------- Horários do ritmo ----------

export interface HorarioPorFormato {
  formato: FormatoConteudo;
  melhorHora: string | null;      // "HH:00"
  mediaInteracoes: number | null; // na melhor hora
  posts: number;                  // posts usados na melhor hora
  totalPosts: number;
}

export interface SugestaoRitmo {
  dia: RitmoDia["dia"];
  formato: FormatoConteudo;
  horaAtual: string;
  horaSugerida: string;
  motivo: string;
}

export interface AnaliseRitmo {
  porFormato: HorarioPorFormato[];
  mudancas: SugestaoRitmo[];
  totalPosts: number;
}

export function analisarRitmo(entrada: { hoje: DataISO; posts: ResultadoPost[]; ritmo: RitmoDia[]; fuso: string }): AnaliseRitmo {
  const limite = somarDias(entrada.hoje, -DIAS_POSTS);
  const posts = entrada.posts.filter((p) => p.formato && p.interacoes != null && p.publicado_em.slice(0, 10) >= limite);
  const hora = (p: ResultadoPost) => {
    try { return formatInTimeZone(new Date(p.publicado_em), entrada.fuso, "HH"); } catch { return p.publicado_em.slice(11, 13); }
  };

  const porFormato: HorarioPorFormato[] = (["Reels", "Carrossel", "Estático"] as FormatoConteudo[]).map((formato) => {
    const doFormato = posts.filter((p) => p.formato === formato);
    const grupos = new Map<string, number[]>();
    for (const p of doFormato) grupos.set(hora(p), [...(grupos.get(hora(p)) ?? []), p.interacoes!]);
    const candidatos = [...grupos.entries()]
      .filter(([, v]) => v.length >= MINIMO_POSTS)
      .map(([h, v]) => ({ h, media: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }))
      .sort((a, b) => b.media - a.media);
    const melhor = candidatos[0];
    return { formato, melhorHora: melhor ? `${melhor.h}:00` : null, mediaInteracoes: melhor ? Math.round(melhor.media) : null, posts: melhor?.n ?? 0, totalPosts: doFormato.length };
  });

  const mudancas: SugestaoRitmo[] = [];
  for (const r of entrada.ritmo) {
    const f = porFormato.find((x) => x.formato === r.formato);
    if (!f?.melhorHora || f.melhorHora === r.hora) continue;
    mudancas.push({
      dia: r.dia,
      formato: r.formato,
      horaAtual: r.hora,
      horaSugerida: f.melhorHora,
      motivo: `${r.formato} às ${f.melhorHora.slice(0, 2)}h teve média de ${formatarNumero(f.mediaInteracoes)} interações (${f.posts} posts)`,
    });
  }
  return { porFormato, mudancas, totalPosts: posts.length };
}

/** Aplica as horas sugeridas ao ritmo (só a hora muda; formato, tipo e objetivo ficam). */
export function aplicarHorarios(ritmo: RitmoDia[], mudancas: SugestaoRitmo[]): RitmoDia[] {
  return ritmo.map((r) => {
    const m = mudancas.find((x) => x.dia === r.dia);
    return m ? { ...r, hora: m.horaSugerida } : r;
  });
}

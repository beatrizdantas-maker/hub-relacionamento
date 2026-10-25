/**
 * "Dados reais de agora": calculados pelo sistema a partir das métricas
 * registradas (Metricool ou manual). A IA nunca escreve estas linhas; elas vão
 * para a caixa verde da tela e para `sugestoes.dados_reais_usados`.
 * Sem registro, o valor fica "sem dado" — nunca um zero inventado.
 */
import { formatarCurta, somarDias, type DataISO } from "@/lib/datas";
import { engajamentoDe, formatarNumero, semanaParaPeriodo, variacao, type Periodo } from "@/lib/metricas";
import type { Metas, MetricaSemanal, ResultadoPost } from "@/lib/tipos/database";

export interface EntradaDadosReais {
  hoje: DataISO;
  semanas: MetricaSemanal[];   // qualquer ordem; só as completas entram
  posts: ResultadoPost[];      // qualquer ordem; os 15 mais recentes entram
  metas: Metas | null;
}

export interface DadosReais {
  vazio: boolean;              // nenhuma métrica registrada
  linhas: string[];            // frases prontas (caixa verde e dados_reais_usados)
  periodo: { de: DataISO; ate: DataISO; semanas: number } | null;
  semanas: MetricaSemanal[];   // as até 8 semanas completas usadas (mais antiga → mais recente)
  posts: ResultadoPost[];      // os até 15 posts usados (mais recente → mais antigo)
}

const MAX_SEMANAS = 8;
const MAX_POSTS = 15;

const soma = (v: (number | null | undefined)[]): number | null => {
  const n = v.filter((x): x is number => typeof x === "number");
  return n.length ? n.reduce((a, b) => a + b, 0) : null;
};
const media = (v: (number | null | undefined)[]): number | null => {
  const s = soma(v);
  const n = v.filter((x) => typeof x === "number").length;
  return s == null ? null : s / n;
};

function textoVariacao(chave: keyof Periodo, atual: Periodo, anterior: Periodo | null, tipo: "numero" | "pct"): string {
  const v = variacao(chave, atual, anterior);
  if (v.diferenca == null) return "";
  const sinal = v.diferenca > 0 ? "+" : "";
  if (tipo === "pct") return ` (${sinal}${formatarNumero(v.diferenca).replace("sem dado", "0")} p.p. vs semana anterior)`;
  return v.percentual == null ? ` (${sinal}${formatarNumero(v.diferenca)} vs semana anterior)` : ` (${sinal}${formatarNumero(v.percentual, "pct")} vs semana anterior)`;
}

export function calcularDadosReais(entrada: EntradaDadosReais): DadosReais {
  const completas = entrada.semanas
    .filter((s) => (s.fim ?? somarDias(s.semana, 6)) < entrada.hoje)
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .slice(-MAX_SEMANAS);
  const posts = [...entrada.posts].sort((a, b) => b.publicado_em.localeCompare(a.publicado_em)).slice(0, MAX_POSTS);

  if (completas.length === 0 && posts.length === 0) {
    return {
      vazio: true,
      linhas: ["Nenhuma métrica registrada ainda. Registre no Painel ou importe do Metricool; até lá, as sugestões serão hipóteses."],
      periodo: null, semanas: [], posts: [],
    };
  }

  const linhas: string[] = [];
  const periodos = completas.map((s) => semanaParaPeriodo(s, entrada.hoje));
  const ultima = periodos[periodos.length - 1] ?? null;
  const penultima = periodos[periodos.length - 2] ?? null;
  const periodo = completas.length
    ? { de: completas[0].semana, ate: periodos[periodos.length - 1].fim, semanas: completas.length }
    : null;

  if (periodo) {
    const fontes = new Set(completas.map((s) => s.fonte));
    const fonte = fontes.size > 1 ? "Metricool e registro manual" : fontes.has("metricool") ? "Metricool" : "registro manual";
    linhas.push(`Período analisado: ${periodo.semanas} ${periodo.semanas === 1 ? "semana completa" : "semanas completas"} (${formatarCurta(periodo.de)} a ${formatarCurta(periodo.ate)}), fonte: ${fonte}.`);

    const vis = media(completas.map((s) => s.visualizacoes));
    if (vis != null && ultima) {
      linhas.push(`Visualizações: média de ${formatarNumero(Math.round(vis))} por semana; última semana ${formatarNumero(ultima.visualizacoes)}${textoVariacao("visualizacoes", ultima, penultima, "numero")}.`);
    }
    const seguidores = [...completas].reverse().find((s) => s.seguidores != null)?.seguidores ?? null;
    const liquidos = soma(periodos.map((p) => p.seguidores_liquidos));
    if (seguidores != null || liquidos != null) {
      const partes = [];
      if (seguidores != null) partes.push(`${formatarNumero(seguidores)} seguidores ao fim do período`);
      if (liquidos != null) partes.push(`${liquidos > 0 ? "+" : ""}${formatarNumero(liquidos)} líquidos no período`);
      linhas.push(`Seguidores: ${partes.join("; ")}.`);
    }
    if (ultima?.engajamento != null) {
      linhas.push(`Engajamento da última semana: ${formatarNumero(ultima.engajamento, "pct")} (interações ÷ alcance dos posts)${textoVariacao("engajamento", ultima, penultima, "pct")}.`);
    }
    const alcance = media(completas.map((s) => s.alcance));
    if (alcance != null) linhas.push(`Alcance: média de ${formatarNumero(Math.round(alcance))} contas por semana.`);
    const salv = soma(completas.map((s) => s.salvamentos));
    const comp = soma(completas.map((s) => s.compartilhamentos));
    if (salv != null || comp != null) linhas.push(`No período: ${salv != null ? `${formatarNumero(salv)} salvamentos` : "salvamentos sem dado"}, ${comp != null ? `${formatarNumero(comp)} compartilhamentos` : "compartilhamentos sem dado"}.`);
    const resp = soma(completas.map((s) => s.respostas_stories));
    if (resp != null) linhas.push(`Respostas aos stories no período: ${formatarNumero(resp)}.`);
    const msgs = soma(completas.map((s) => s.mensagens_direct));
    const cliques = soma(completas.map((s) => s.cliques_link));
    if (msgs != null || cliques != null) linhas.push(`Registro manual no período: ${msgs != null ? `${formatarNumero(msgs)} mensagens no direct` : "mensagens sem dado"}, ${cliques != null ? `${formatarNumero(cliques)} cliques no link` : "cliques sem dado"}.`);
  }

  if (posts.length) {
    linhas.push(`Posts com resultado analisados: ${posts.length} (${formatarCurta(posts[posts.length - 1].publicado_em.slice(0, 10))} a ${formatarCurta(posts[0].publicado_em.slice(0, 10))}).`);
    const comInteracoes = posts.filter((p) => p.interacoes != null);
    if (comInteracoes.length) {
      const melhor = comInteracoes.reduce((a, b) => ((b.interacoes ?? 0) > (a.interacoes ?? 0) ? b : a));
      linhas.push(`Melhor conteúdo por interações: "${(melhor.titulo ?? "sem título").slice(0, 80)}" (${melhor.formato ?? "formato não informado"}, ${formatarCurta(melhor.publicado_em.slice(0, 10))}) com ${formatarNumero(melhor.interacoes)} interações${melhor.alcance != null ? ` e ${formatarNumero(melhor.alcance)} de alcance` : ""}.`);
      const porFormato = new Map<string, number[]>();
      for (const p of comInteracoes) {
        const f = p.formato ?? "Sem formato";
        porFormato.set(f, [...(porFormato.get(f) ?? []), p.interacoes!]);
      }
      const ranking = [...porFormato.entries()]
        .map(([f, v]) => ({ formato: f, media: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }))
        .sort((a, b) => b.media - a.media);
      if (ranking.length > 1) {
        linhas.push(`Interações médias por formato: ${ranking.map((r) => `${r.formato} ${formatarNumero(Math.round(r.media))} (${r.n} ${r.n === 1 ? "post" : "posts"})`).join(", ")}.`);
      }
    }
    const comSalv = posts.filter((p) => p.salvamentos != null);
    if (comSalv.length) {
      const melhor = comSalv.reduce((a, b) => ((b.salvamentos ?? 0) > (a.salvamentos ?? 0) ? b : a));
      linhas.push(`Mais salvo: "${(melhor.titulo ?? "sem título").slice(0, 80)}" com ${formatarNumero(melhor.salvamentos)} salvamentos.`);
    }
  }

  if (entrada.metas && completas.length) {
    const metas = entrada.metas;
    const partes: string[] = [];
    const dias = completas.reduce((a, s) => a + (s.dias_com_dados || 0), 0);
    const vis = soma(completas.map((s) => s.visualizacoes));
    if (metas.visualizacoes_dia != null && vis != null && dias > 0) partes.push(`visualizações/dia: meta ${formatarNumero(metas.visualizacoes_dia)}, real ${formatarNumero(Math.round(vis / dias))}`);
    if (metas.engajamento_pct != null) {
      const eng = engajamentoDe(soma(completas.map((s) => s.interacoes)), soma(completas.map((s) => s.alcance_posts)));
      if (eng != null) partes.push(`engajamento: meta ${formatarNumero(metas.engajamento_pct, "pct")}, real ${formatarNumero(eng, "pct")}`);
    }
    if (metas.seguidores_liquidos_mes != null) {
      const liq = soma(periodos.map((p) => p.seguidores_liquidos));
      if (liq != null) partes.push(`seguidores líquidos: meta ${formatarNumero(metas.seguidores_liquidos_mes)}/mês, real ${formatarNumero(liq)} em ${completas.length} semanas`);
    }
    if (partes.length) linhas.push(`Metas × real: ${partes.join("; ")}.`);
  }

  return { vazio: false, linhas, periodo, semanas: completas, posts };
}

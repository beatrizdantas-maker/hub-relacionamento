/**
 * Prompts enviados ao Claude. Tudo em pt-BR. O contexto numérico vai como
 * JSON compacto e a IA é obrigada a usar só o que está ali.
 */
import { formatarCurta, formatarLonga, capitalizar, rotuloSemana, somarDias, type DataISO } from "@/lib/datas";
import type { Campanha, Conteudo, Empresa, MetricaSemanal, ResultadoPost, RitmoDia } from "@/lib/tipos/database";
import type { DadosReais } from "./dadosReais";
import { datasComemorativasEntre } from "./datasComemorativas";

export interface ContextoIA {
  empresa: Empresa;
  hoje: DataISO;
  campanhas: Campanha[];
  dadosReais: DadosReais;
  agendados: Pick<Conteudo, "data" | "hora" | "formato" | "tipo" | "tema" | "status" | "origem">[];
}

const DIAS = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

function perfilDaMarca(e: Empresa): string {
  const linhas = [
    `Nome: ${e.nome}`,
    e.perfil_instagram ? `Instagram: ${e.perfil_instagram}` : null,
    e.sobre ? `Sobre: ${e.sobre}` : null,
    e.publico ? `Público: ${e.publico}` : null,
    e.objetivos ? `Objetivos: ${e.objetivos}` : null,
    e.tom_de_voz ? `Tom de voz: ${e.tom_de_voz}` : null,
    e.pilares?.length ? `Pilares de conteúdo: ${e.pilares.join("; ")}` : null,
    e.melhores_horarios ? `Melhores horários: ${e.melhores_horarios}` : null,
    e.regras_de_imagem ? `Regras de imagem: ${e.regras_de_imagem}` : null,
  ];
  return linhas.filter(Boolean).join("\n");
}

function regrasDeLinguagem(e: Empresa): string {
  if (!e.regras_de_linguagem?.trim()) return "Nenhuma regra extra além do tom de voz.";
  return e.regras_de_linguagem.trim();
}

function campanhasTexto(campanhas: Campanha[], hoje: DataISO): string {
  const ativas = campanhas.filter((c) => !c.fim || c.fim >= hoje);
  if (!ativas.length) return "Nenhuma campanha ativa ou futura.";
  return ativas.map((c) => `- ${c.nome}${c.inicio || c.fim ? ` (${c.inicio ? formatarCurta(c.inicio) : "…"} a ${c.fim ? formatarCurta(c.fim) : "…"})` : ""}${c.descricao ? `: ${c.descricao}` : ""}`).join("\n");
}

function metasTexto(e: Empresa): string {
  const m = e.metas;
  if (!m) return "Sem metas definidas.";
  const itens = [
    m.visualizacoes_dia != null ? `visualizações por dia: ${m.visualizacoes_dia}` : null,
    m.seguidores_liquidos_mes != null ? `seguidores líquidos no mês: ${m.seguidores_liquidos_mes}` : null,
    m.mensagens_mes != null ? `mensagens no direct por mês: ${m.mensagens_mes}` : null,
    m.salvamentos_carrossel != null ? `salvamentos por carrossel: ${m.salvamentos_carrossel}` : null,
    m.alcance_reels != null ? `alcance por Reels: ${m.alcance_reels}` : null,
    m.engajamento_pct != null ? `engajamento: ${m.engajamento_pct}%` : null,
  ].filter(Boolean);
  return itens.length ? itens.join("; ") : "Sem metas definidas.";
}

function semanasJson(semanas: MetricaSemanal[]) {
  return semanas.map((s) => ({
    semana: s.semana, fonte: s.fonte, seguidores: s.seguidores, seguidores_ganhos: s.seguidores_ganhos, seguidores_perdidos: s.seguidores_perdidos,
    visualizacoes: s.visualizacoes, alcance: s.alcance, interacoes: s.interacoes, alcance_posts: s.alcance_posts,
    compartilhamentos: s.compartilhamentos, salvamentos: s.salvamentos, respostas_stories: s.respostas_stories,
    cliques_link: s.cliques_link, mensagens_direct: s.mensagens_direct, posts: s.posts, reels: s.reels, stories: s.stories,
  }));
}

function postsJson(posts: ResultadoPost[]) {
  return posts.map((p) => ({
    publicado_em: p.publicado_em.slice(0, 10), formato: p.formato, titulo: p.titulo?.slice(0, 120) ?? null, alcance: p.alcance, visualizacoes: p.visualizacoes,
    curtidas: p.curtidas, comentarios: p.comentarios, salvamentos: p.salvamentos, compartilhamentos: p.compartilhamentos, interacoes: p.interacoes,
    seguidores_ganhos: p.seguidores_ganhos, fonte: p.fonte,
  }));
}

function agendadosTexto(itens: ContextoIA["agendados"]): string {
  if (!itens.length) return "Nada programado.";
  return itens.map((c) => `- ${formatarCurta(c.data)}${c.hora ? ` ${c.hora.slice(0, 5)}` : ""} · ${c.formato}${c.tipo ? ` (${c.tipo})` : ""} · ${c.tema || "sem tema"} · ${c.status}${c.origem === "ia" ? " · sugestão da IA" : ""}`).join("\n");
}

const REGRAS_GERAIS = `Regras obrigatórias:
1. Use SOMENTE os números e fatos que estão neste pedido. Não invente dados, percentuais, nomes de posts ou resultados.
2. Escreva em português do Brasil, no tom de voz da marca, e siga à risca as regras de linguagem da marca (palavras proibidas, modos de se referir a produtos etc.). Elas valem para tudo: temas, roteiros, legendas, stories e justificativas.
3. Toda legenda termina com uma chamada para ação concreta (ex.: "Comenta EU QUERO", "Salva pra ver depois", "Me chama no direct", "Clica no link da bio"). Nunca termine uma legenda sem CTA.
4. Nunca use emojis no lugar de palavras; emojis só como apoio, no máximo dois por legenda.`;

// ---------- Sugestões da semana ----------

export function montarPromptSugestoes(ctx: ContextoIA, semana: DataISO): { system: string; usuario: string } {
  const fim = somarDias(semana, 6);
  const system = `Você é estrategista de conteúdo para Instagram da marca "${ctx.empresa.nome}". Sua tarefa é propor o plano da semana de ${rotuloSemana(semana)} com base em dados reais e, onde não houver dado, dizer claramente que é hipótese.

${REGRAS_GERAIS}
5. Cada item de "manter", "melhorar" e "testar" e cada "motivo" de ideia cita, entre parênteses, o dado em que se baseia (ex.: "(Reels de 14/10: 3.200 interações, o maior do período)") ou escreve "(sem dado: hipótese)".
6. Não repita temas que já estão programados no calendário; complemente-os.
7. Proponha de 3 a 6 ideias, todas com data dentro de ${semana} a ${fim}, distribuídas em dias diferentes e respeitando o ritmo semanal (formato de cada dia).
8. O resumo tem no máximo 3 frases e começa pelo diagnóstico mais importante.`;

  const ritmo = ctx.empresa.ritmo_semanal ?? [];
  const usuario = `## Marca
${perfilDaMarca(ctx.empresa)}

## Regras de linguagem (obrigatórias)
${regrasDeLinguagem(ctx.empresa)}

## Metas do mês
${metasTexto(ctx.empresa)}

## Campanhas
${campanhasTexto(ctx.campanhas, ctx.hoje)}

## Ritmo semanal
${ritmo.length ? ritmo.map((r) => `- ${DIAS[r.dia]} ${r.hora}: ${r.formato} · ${r.tipo} · pilar ${r.pilar} · objetivo ${r.objetivo}`).join("\n") : "Não definido."}

## Dados reais (calculados pelo sistema)
${ctx.dadosReais.linhas.map((l) => `- ${l}`).join("\n")}

## Métricas semanais completas (JSON, mais antiga → mais recente; null = sem dado)
${JSON.stringify(semanasJson(ctx.dadosReais.semanas))}

## Posts recentes com resultado (JSON, mais recente → mais antigo; null = sem dado)
${JSON.stringify(postsJson(ctx.dadosReais.posts))}

## Já programado no calendário (não repetir temas)
${agendadosTexto(ctx.agendados)}

## Datas comemorativas na semana
${datasComemorativasEntre(semana, fim).map((d) => `- ${formatarCurta(d.data)}: ${d.nome}`).join("\n") || "Nenhuma."}

Hoje é ${capitalizar(formatarLonga(ctx.hoje))} (${ctx.hoje}). Semana sugerida: ${semana} (segunda) a ${fim} (domingo).
Gere o JSON pedido.`;

  return { system, usuario };
}

// ---------- Semana do calendário do mês ----------

export function montarPromptSemanaCalendario(ctx: ContextoIA, dias: { data: DataISO; ritmo: RitmoDia }[]): { system: string; usuario: string } {
  const primeiro = dias[0].data, ultimo = dias[dias.length - 1].data;
  const system = `Você é roteirista e redator de Instagram da marca "${ctx.empresa.nome}". Sua tarefa é escrever o conteúdo completo de cada dia pedido, pronto para a equipe gravar ou desenhar, seguindo o ritmo semanal da marca.

${REGRAS_GERAIS}
5. Gere exatamente um item por data pedida, com a data exata e o formato/tipo/pilar do ritmo daquele dia.
6. Reels: roteiro falado com marcação de tempo (0–3 s gancho, …), e exatamente 3 ganchos alternativos nesta ordem: curiosidade, identificação, provocação. Carrossel: roteiro slide a slide ("Slide 1: …") com 5 a 8 slides. Estático: texto da arte e ideia visual. Para Carrossel e Estático, "ganchos" é uma lista vazia.
7. Stories do dia: exatamente 4 telas, nesta ordem: (1) abertura que puxa o assunto do post, (2) "Compartilhar post" chamando para ver o post, (3) uma tela de interação — Enquete (2 a 4 opções), Caixa de pergunta, Quiz (2 a 4 opções) ou Slider — com pergunta e opções preenchidas, (4) fechamento com chamada para ação. Em telas sem interação, "pergunta", "opcoes" e "emoji" são null.
8. Use as campanhas ativas nos dias marcados como "campanha" no ritmo e as datas comemorativas só quando fizerem sentido para a marca.
9. Varie os temas entre os dias e não repita o que já está programado.
10. Baseie as escolhas nos dados reais quando houver; sem dado, use o perfil da marca.`;

  const usuario = `## Marca
${perfilDaMarca(ctx.empresa)}

## Regras de linguagem (obrigatórias)
${regrasDeLinguagem(ctx.empresa)}

## Metas do mês
${metasTexto(ctx.empresa)}

## Campanhas
${campanhasTexto(ctx.campanhas, ctx.hoje)}

## Dados reais (calculados pelo sistema)
${ctx.dadosReais.linhas.map((l) => `- ${l}`).join("\n")}

## Posts recentes com resultado (JSON; null = sem dado)
${JSON.stringify(postsJson(ctx.dadosReais.posts))}

## Já programado no calendário (não repetir temas)
${agendadosTexto(ctx.agendados)}

## Datas comemorativas no período
${datasComemorativasEntre(primeiro, ultimo).map((d) => `- ${formatarCurta(d.data)}: ${d.nome}`).join("\n") || "Nenhuma."}

## Dias a gerar (um item por linha, com o slot do ritmo)
${dias.map((d) => `- ${d.data} (${DIAS[d.ritmo.dia]} ${d.ritmo.hora}): formato ${d.ritmo.formato} · tipo "${d.ritmo.tipo}" · pilar "${d.ritmo.pilar}" · objetivo "${d.ritmo.objetivo}"`).join("\n")}

Hoje é ${ctx.hoje}. Gere o JSON pedido com ${dias.length} ${dias.length === 1 ? "dia" : "dias"}.`;

  return { system, usuario };
}

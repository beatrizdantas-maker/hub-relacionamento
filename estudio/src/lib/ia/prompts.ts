/**
 * Prompts enviados ao Claude. Tudo em pt-BR. O contexto numérico vai como
 * JSON compacto e a IA é obrigada a usar só o que está ali.
 */
import { formatarCurta, formatarLonga, capitalizar, rotuloSemana, somarDias, type DataISO } from "@/lib/datas";
import type { Campanha, Conteudo, Empresa, MetricaSemanal, Rede, ResultadoPost, RitmoDia } from "@/lib/tipos/database";
import { rotuloFormato } from "@/lib/redes";
import type { DadosReais } from "./dadosReais";
import { datasComemorativasEntre } from "./datasComemorativas";

export interface ContextoIA {
  empresa: Empresa;
  hoje: DataISO;
  campanhas: Campanha[];
  dadosReais: DadosReais;
  agendados: (Pick<Conteudo, "data" | "hora" | "formato" | "tipo" | "tema" | "status" | "origem"> & { rede?: string | null })[];
}

const DIAS = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

export function perfilDaMarca(e: Empresa): string {
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

export function regrasDeLinguagem(e: Empresa): string {
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
  return itens.map((c) => `- ${formatarCurta(c.data)}${c.hora ? ` ${c.hora.slice(0, 5)}` : ""} · ${c.rede === "linkedin" ? `LinkedIn · ${rotuloFormato(c.formato, "linkedin")}` : c.formato}${c.tipo ? ` (${c.tipo})` : ""} · ${c.tema || "sem tema"} · ${c.status}${c.origem === "ia" ? " · sugestão da IA" : ""}`).join("\n");
}

/** Regras que valem para tudo que a IA escreve; hashtags e chamada para ação mudam por rede. */
export function regrasGerais(rede: Rede = "instagram"): string {
  const cta = rede === "linkedin"
    ? '(ex.: "Conta nos comentários como é na sua escola", "Manda uma mensagem para a gente", "Compartilha com a sua equipe", "Conheça no nosso site"). Nunca use "link na bio", "arrasta pro lado" nem outras expressões de Instagram'
    : '(ex.: "Comenta EU QUERO", "Salva pra ver depois", "Me chama no direct", "Clica no link da bio")';
  const tags = rede === "linkedin" ? "de 3 a 5" : "de 5 a 10";
  return `Regras obrigatórias:
1. Use SOMENTE os números e fatos que estão neste pedido. Não invente dados, percentuais, nomes de posts ou resultados.
2. Escreva em português do Brasil, no tom de voz da marca, e siga à risca as regras de linguagem da marca (palavras proibidas, modos de se referir a produtos etc.). Elas valem para tudo: temas, roteiros, legendas, stories e justificativas.
3. Toda legenda termina com uma chamada para ação concreta ${cta}. Nunca termine uma legenda sem CTA.
   Não escreva hashtags dentro da legenda: coloque ${tags} em "hashtags" (sem espaços, em português, específicas do tema e do público da marca, misturando amplas e de nicho, e respeitando as regras de linguagem). O sistema acrescenta as hashtags no fim da legenda.
4. Nunca use emojis no lugar de palavras; emojis só como apoio, no máximo dois por legenda${rede === "linkedin" ? " (no LinkedIn, prefira nenhum)" : ""}.`;
}
export const REGRAS_GERAIS = regrasGerais("instagram");

/** Como escrever para a página da empresa no LinkedIn. */
export const REGRAS_LINKEDIN = `Esta peça é para a PÁGINA DA EMPRESA no LinkedIn: a marca fala como "nós". Público: gestores, diretores, coordenadores, mantenedores e educadores que decidem.
- As 2 primeiras linhas são o gancho: é o que aparece antes do "ver mais". Comece com uma afirmação forte, um número real ou uma pergunta do dia a dia da escola.
- Parágrafos curtos (1 a 3 linhas), frases diretas, tom profissional e humano. Nada de linguagem de vendedor.
- Traga aprendizado prático, bastidor ou caso real; a marca aparece como quem entende do assunto, não como anúncio.`;

/** Instruções por formato para o briefing de produção, em cada rede. */
export function instrucoesFormatos(rede: Rede): string {
  if (rede === "linkedin") {
    return `   - Texto: "legenda" é o post completo (de 900 a 1.800 caracteres), com gancho nas 2 primeiras linhas. "arte_estatico" só se uma imagem de apoio ajudar (senão null). "slides" e "cenas" vazias, "enquete" e "artigo" null.
   - Carrossel (documento em PDF): em "slides", de 6 a 10 páginas com o título e o texto de cada uma e, em "imagem", como deve ser cada página (o que mostrar, composição). Primeira página: título que faz abrir; última: chamada para ação. A "legenda" apresenta o documento.
   - Reels (vídeo no LinkedIn): em "cenas", o roteiro completo de 30 a 90 segundos com tempo, como filmar ("imagem"), a fala palavra por palavra e o texto na tela (muita gente assiste sem som: legende as falas importantes). Exatamente 3 ganchos alternativos: curiosidade, identificação, provocação.
   - Estático (imagem): em "arte_estatico", o texto da imagem, a imagem e a composição. A "legenda" é o post que acompanha a imagem.
   - Enquete: em "enquete", a pergunta (até 140 caracteres) e de 2 a 4 opções (até 30 caracteres cada). A "legenda" é o texto que acompanha a enquete e convida a votar e comentar.
   - Artigo: em "artigo", título, subtítulo e de 3 a 6 seções com intertítulo e texto completo. A "legenda" é o post curto que divulga o artigo.
   Em todos: preencha só o campo do formato; os outros ficam vazios ou null. Para formatos que não são Reels, "ganchos" é uma lista vazia e "musica" é null.`;
  }
  return `   - Carrossel: em "slides", de 5 a 8 slides com o título e o texto que vão escritos na arte e, em "imagem", exatamente como deve ser a imagem de cada slide (o que mostrar, composição, onde fica o texto). "cenas" vazia, "arte_estatico" null.
   - Estático: em "arte_estatico", o texto da arte, a imagem e a composição. "slides" e "cenas" vazias.
   - Reels: em "cenas", o roteiro completo com tempo de início e fim, o que aparece e como filmar ("imagem"), a fala palavra por palavra ("fala"), o texto na tela e o áudio; sugira a música em "musica". Se o tipo do dia envolve uma pessoa da empresa falando (pessoa falando, prova social, depoimento, bastidores), escreva a fala para essa pessoa gravar olhando para a câmera; nos outros Reels, use imagens de apoio, texto na tela e, se fizer sentido, narração em off. Exatamente 3 ganchos alternativos nesta ordem: curiosidade, identificação, provocação. "slides" vazia, "arte_estatico" null.
   Em todos: "enquete" e "artigo" são null. Para Carrossel e Estático, "ganchos" é uma lista vazia.`;
}

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

export function montarPromptSemanaCalendario(ctx: ContextoIA, dias: { data: DataISO; ritmo: RitmoDia }[], rede: Rede = "instagram"): { system: string; usuario: string } {
  const primeiro = dias[0].data, ultimo = dias[dias.length - 1].data;
  const linkedin = rede === "linkedin";
  const system = `Você é roteirista e redator de ${linkedin ? "LinkedIn" : "Instagram"} da marca "${ctx.empresa.nome}". Sua tarefa é escrever o conteúdo completo de cada dia pedido, pronto para a equipe gravar ou desenhar, seguindo o ritmo semanal da marca ${linkedin ? "no LinkedIn" : "no Instagram"}.

${regrasGerais(rede)}${linkedin ? `\n\n${REGRAS_LINKEDIN}` : ""}
5. Gere exatamente um item por data pedida, com a data exata e o formato/tipo/pilar do ritmo daquele dia.
6. A equipe vai produzir as artes e gravar os vídeos a partir do que você escrever, então descreva tudo com precisão:
   - "conceito_visual": estilo, cores (a partir das cores e regras de imagem da marca), tipografia, tipo de foto ou vídeo e elementos gráficos.
${instrucoesFormatos(rede)}
   - "dicas_producao": 2 a 4 dicas práticas para produzir a peça.
${linkedin ? "7. Não há stories no LinkedIn." : `7. Stories do dia: exatamente 4 telas, nesta ordem: (1) abertura que puxa o assunto do post, (2) "Compartilhar post" chamando para ver o post, (3) uma tela de interação — Enquete (2 a 4 opções), Caixa de pergunta, Quiz (2 a 4 opções) ou Slider — com pergunta e opções preenchidas, (4) fechamento com chamada para ação. Em telas sem interação, "pergunta", "opcoes" e "emoji" são null.`}
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
${dias.map((d) => `- ${d.data} (${DIAS[d.ritmo.dia]} ${d.ritmo.hora}): formato ${rotuloFormato(d.ritmo.formato, rede)} (valor no JSON: "${d.ritmo.formato}") · tipo "${d.ritmo.tipo}" · pilar "${d.ritmo.pilar}" · objetivo "${d.ritmo.objetivo}"`).join("\n")}

Hoje é ${ctx.hoje}. Gere o JSON pedido com ${dias.length} ${dias.length === 1 ? "dia" : "dias"}.`;

  return { system, usuario };
}

// ---------- Briefing de produção de um conteúdo ----------

/**
 * "Adaptar para o LinkedIn": reescreve um conteúdo do Instagram para a página
 * da empresa no LinkedIn. A IA escolhe o formato (o do ritmo do dia é sugerido).
 */
export function montarPromptAdaptar(
  empresa: Empresa,
  origem: Pick<Conteudo, "data" | "formato" | "tipo" | "pilar" | "tema" | "objetivo" | "roteiro" | "legenda" | "cta" | "orientacao_arte">,
  sugerido: RitmoDia | null,
): { system: string; usuario: string } {
  const system = `Você é estrategista e redator de LinkedIn da marca "${empresa.nome}". Vai transformar um conteúdo que a marca fez para o Instagram num post para a página da empresa no LinkedIn. A equipe produz as artes e grava os vídeos a partir do seu briefing.

${regrasGerais("linkedin")}

${REGRAS_LINKEDIN}

Como adaptar:
- Não traduza o post do Instagram ao pé da letra. Mantenha a ideia central e reescreva para gestores, coordenadores e decisores: mais contexto, dado ou exemplo concreto, menos gíria e menos emoji.
- Escolha o formato do LinkedIn que melhor serve a ideia: "Texto", "Carrossel" (documento PDF), "Reels" (vídeo), "Estático" (imagem), "Enquete" ou "Artigo".${sugerido ? ` O ritmo da marca pede ${rotuloFormato(sugerido.formato, "linkedin")} (${sugerido.tipo || "sem tipo"}) neste dia: prefira esse formato, a menos que a ideia claramente não caiba nele.` : ""}
- Um Reels com pessoa falando costuma virar Vídeo (mesma fala, mais contexto) ou Texto. Um carrossel costuma virar Carrossel em PDF.

Preencha assim:
${instrucoesFormatos("linkedin")}
- "conceito_visual": estilo, cores (a partir das cores e regras de imagem da marca), tipografia, fotografia/vídeo e elementos gráficos.
- "dicas_producao": 2 a 4 dicas práticas para produzir esta peça.
- "legenda": o texto do post, pronto, terminando com a chamada para ação; "cta": a chamada.
- "tema", "tipo" e "objetivo" do novo post.`;

  const usuario = `## Marca
${perfilDaMarca(empresa)}
Cores da marca: primária ${empresa.cor_primaria}, secundária ${empresa.cor_secundaria}.

## Regras de linguagem (obrigatórias)
${regrasDeLinguagem(empresa)}

## Conteúdo do Instagram para adaptar
- Data: ${origem.data}
- Formato no Instagram: ${origem.formato}${origem.tipo ? ` · ${origem.tipo}` : ""}
- Pilar: ${origem.pilar || "—"}
- Tema: ${origem.tema || "—"}
- Objetivo: ${origem.objetivo || "—"}
- Chamada para ação: ${origem.cta || "—"}

### Roteiro / slides
${origem.roteiro || "—"}

### Legenda
${origem.legenda || "—"}

### Orientação de arte
${origem.orientacao_arte || "—"}

Gere o JSON pedido.`;
  return { system, usuario };
}

export function montarPromptBriefing(
  empresa: Empresa,
  modoReels: "com_pessoa" | "sem_pessoa",
  rede: Rede,
  conteudo: Pick<Conteudo, "data" | "formato" | "tipo" | "pilar" | "tema" | "objetivo" | "roteiro" | "legenda" | "cta" | "orientacao_arte" | "ganchos">,
): { system: string; usuario: string } {
  const linkedin = rede === "linkedin";
  const formato = rotuloFormato(conteudo.formato, rede).toUpperCase();
  const reelsPessoa = conteudo.formato === "Reels" && modoReels === "com_pessoa";
  const reelsSemPessoa = conteudo.formato === "Reels" && modoReels === "sem_pessoa";
  const instrucoes = `Formato: ${formato}${linkedin ? " NO LINKEDIN" : ""}.${reelsPessoa ? " Vídeo gravado por uma pessoa da empresa falando para a câmera: escreva a fala palavra por palavra, pronta para teleprompter." : ""}${reelsSemPessoa ? " Vídeo sem pessoa falando: imagens de apoio, texto na tela e, se fizer sentido, narração em off em \"fala\"." : ""}
Preencha assim:
${instrucoesFormatos(rede)}`;

  const system = `Você é diretor de criação e roteirista de ${linkedin ? "LinkedIn" : "Instagram"} da marca "${empresa.nome}". A equipe vai produzir as artes e gravar os vídeos a partir do seu briefing, então seja preciso e prático: descreva o que fazer, não o que pensar.

${regrasGerais(rede)}${linkedin ? `\n\n${REGRAS_LINKEDIN}` : ""}

${instrucoes}
- "conceito_visual": estilo, cores (a partir das cores e regras de imagem da marca), tipografia, fotografia/vídeo e elementos gráficos.
- "dicas_producao": 2 a 4 dicas práticas para produzir esta peça.
- "legenda": pronta, terminando com a chamada para ação; "cta": a chamada.`;

  const ganchos = Array.isArray(conteudo.ganchos) && conteudo.ganchos.length ? conteudo.ganchos.map((g) => `- ${g}`).join("\n") : "Nenhum.";
  const usuario = `## Marca
${perfilDaMarca(empresa)}
Cores da marca: primária ${empresa.cor_primaria}, secundária ${empresa.cor_secundaria}.

## Regras de linguagem (obrigatórias)
${regrasDeLinguagem(empresa)}

## Conteúdo planejado
- Data: ${conteudo.data}
- Rede: ${linkedin ? "LinkedIn (página da empresa)" : "Instagram"}
- Formato: ${rotuloFormato(conteudo.formato, rede)}${conteudo.tipo ? ` · ${conteudo.tipo}` : ""}
- Pilar: ${conteudo.pilar || "—"}
- Tema: ${conteudo.tema || "—"}
- Objetivo: ${conteudo.objetivo || "—"}
- Chamada para ação: ${conteudo.cta || "—"}

### Roteiro já escrito (use como base e complete)
${conteudo.roteiro || "—"}

### Legenda já escrita
${conteudo.legenda || "—"}

### Orientação de arte já escrita
${conteudo.orientacao_arte || "—"}

### Ganchos
${ganchos}

Gere o JSON pedido.`;
  return { system, usuario };
}

/**
 * Briefing de produção: a IA descreve como devem ser as imagens (carrossel e
 * estático) e o roteiro completo dos vídeos (Reels). O sistema transforma a
 * resposta estruturada em texto para os campos "Roteiro" e "Orientação de
 * arte" do conteúdo — quem produz as artes e grava os vídeos é a equipe.
 */
import * as z from "zod/v4";
import type { FormatoConteudo } from "@/lib/tipos/database";

export type ModoReels = "com_pessoa" | "sem_pessoa";

const COM_PESSOA = /pessoa|falando|fala|prova social|depoimento|bastidor|entrevista|rosto|apresent/i;
/** Reels gravado por alguém da equipe (fala na câmera) ou feito só com imagens e edição. */
export const modoReelsPadrao = (tipo: string | null | undefined): ModoReels => (COM_PESSOA.test(tipo ?? "") ? "com_pessoa" : "sem_pessoa");

// ---------- Schemas (saída estruturada da IA) ----------

export const ConceitoVisual = z.object({
  estilo: z.string().describe("Estilo geral da peça (ex.: editorial limpo, colagem, foto real com texto grande)"),
  paleta: z.string().describe("Cores a usar, com base nas cores e regras da marca"),
  tipografia: z.string().describe("Como usar as fontes: peso, tamanho relativo, hierarquia"),
  fotografia: z.string().describe("Tipo de foto ou vídeo: quem aparece, luz, ângulo, cenário; ou ilustração/ícones"),
  elementos: z.string().describe("Elementos gráficos, logo, setas, selos, espaço para texto"),
});

export const SlideBriefing = z.object({
  titulo_na_arte: z.string().describe("Título que vai escrito no slide"),
  texto_na_arte: z.string().describe("Texto de apoio escrito no slide (pode ser vazio)"),
  imagem: z.string().describe("Como deve ser a imagem deste slide: o que mostrar, composição, posição do texto"),
});

export const ArteEstatico = z.object({
  titulo_na_arte: z.string(),
  texto_na_arte: z.string(),
  imagem: z.string().describe("O que a imagem mostra e como (foto, ilustração, enquadramento)"),
  composicao: z.string().describe("Onde fica cada elemento: título, imagem, logo, chamada"),
});

export const EnqueteBriefing = z.object({
  pergunta: z.string().describe("Pergunta da enquete, até 140 caracteres"),
  opcoes: z.array(z.string()).describe("De 2 a 4 opções, até 30 caracteres cada"),
});

export const ArtigoBriefing = z.object({
  titulo: z.string(),
  subtitulo: z.string(),
  secoes: z.array(z.object({ intertitulo: z.string(), texto: z.string() })).describe("De 3 a 6 seções com o texto completo"),
});

export const CenaBriefing = z.object({
  inicio_s: z.number(),
  fim_s: z.number(),
  imagem: z.string().describe("O que aparece na tela e como filmar: plano, ângulo, movimento, cenário, ou qual imagem de apoio usar"),
  fala: z.string().nullable().describe("O que a pessoa fala, palavra por palavra (ou a narração em off); null se a cena não tem fala"),
  texto_na_tela: z.string().nullable().describe("Texto que entra na edição, ou null"),
  audio: z.string().nullable().describe("Som da cena: música, efeito, silêncio, transição; ou null"),
});

/** Campos visuais comuns ao calendário do mês e ao briefing de um conteúdo. */
export const camposBriefing = {
  conceito_visual: ConceitoVisual,
  slides: z.array(SlideBriefing).describe("Carrossel: de 5 a 8 slides (o primeiro é a capa e o último a chamada para ação). Outros formatos: lista vazia"),
  arte_estatico: ArteEstatico.nullable().describe("Estático (Imagem): preenchido. Texto: imagem de apoio opcional ou null. Outros formatos: null"),
  enquete: EnqueteBriefing.nullable().describe("Enquete: preenchido. Outros formatos: null"),
  artigo: ArtigoBriefing.nullable().describe("Artigo: preenchido. Outros formatos: null"),
  cenas: z.array(CenaBriefing).describe("Reels: de 3 a 10 cenas em ordem, a primeira é o gancho e a última a chamada para ação. Outros formatos: lista vazia"),
  musica: z.string().nullable().describe("Reels: estilo de música ou áudio em alta sugerido. Outros formatos: null"),
  dicas_producao: z.array(z.string()).describe("2 a 4 dicas práticas para produzir esta peça"),
};

export const SaidaBriefing = z.object({
  ...camposBriefing,
  legenda: z.string().describe("Legenda pronta, terminando com a chamada para ação, sem hashtags"),
  cta: z.string(),
  hashtags: z.array(z.string()).describe("De 5 a 10 hashtags em português para esta legenda"),
  ganchos: z.array(z.string()).describe("Reels: exatamente 3 ganchos alternativos (curiosidade, identificação, provocação). Outros: lista vazia"),
});

/** "Adaptar para o LinkedIn": o briefing completo mais o formato e os dados do post. */
export const SaidaAdaptacao = SaidaBriefing.extend({
  formato: z.enum(["Texto", "Reels", "Estático", "Artigo"]).describe("Formato no LinkedIn (Reels = vídeo, Estático = foto)"),
  tema: z.string().describe("Tema do post no LinkedIn, até 120 caracteres"),
  tipo: z.string().describe("Tipo do post, curto. Ex.: Texto de opinião, Caso de escola"),
  objetivo: z.string().describe("Um destes: salvamentos, alcance, direct, engajamento, comentarios, compartilhamentos, seguidores, cliques"),
});

export type Briefing = {
  conceito_visual: z.infer<typeof ConceitoVisual>;
  slides: z.infer<typeof SlideBriefing>[];
  arte_estatico: z.infer<typeof ArteEstatico> | null;
  enquete?: z.infer<typeof EnqueteBriefing> | null;
  artigo?: z.infer<typeof ArtigoBriefing> | null;
  cenas: z.infer<typeof CenaBriefing>[];
  musica: string | null;
  dicas_producao: string[];
};

// ---------- Validação ----------

export function problemasBriefing(formato: FormatoConteudo, b: Briefing): string[] {
  const p: string[] = [];
  if (formato === "Carrossel" && b.slides.filter((s) => s.titulo_na_arte.trim() || s.texto_na_arte.trim()).length < 4) p.push("carrossel precisa de pelo menos 4 slides");
  if (formato === "Estático" && (!b.arte_estatico || !b.arte_estatico.titulo_na_arte.trim())) p.push("estático sem texto da arte");
  if (formato === "Enquete" && (!b.enquete?.pergunta.trim() || b.enquete.opcoes.filter((o) => o.trim()).length < 2)) p.push("enquete precisa de pergunta e pelo menos 2 opções");
  if (formato === "Artigo" && (!b.artigo?.titulo.trim() || b.artigo.secoes.filter((s) => s.texto.trim()).length < 2)) p.push("artigo precisa de título e pelo menos 2 seções");
  if (formato === "Reels") {
    const cenas = b.cenas.filter((c) => c.imagem.trim());
    if (cenas.length < 3) p.push("Reels precisa de pelo menos 3 cenas");
    if (!cenas.some((c) => (c.fala ?? "").trim() || (c.texto_na_tela ?? "").trim())) p.push("Reels sem fala nem texto na tela");
  }
  return p;
}

// ---------- Texto para os campos do conteúdo ----------

const limpo = (s: string | null | undefined) => (s ?? "").trim();

/** Texto do campo "Roteiro": slide a slide, arte do estático ou cena a cena. */
export function formatarRoteiro(formato: FormatoConteudo, b: Briefing): string {
  if (formato === "Carrossel") {
    return b.slides
      .map((s, i, todos) => {
        const papel = i === 0 ? " — CAPA" : i === todos.length - 1 ? " — FECHAMENTO" : "";
        return [`SLIDE ${i + 1}${papel}`, `TÍTULO NA ARTE: ${limpo(s.titulo_na_arte)}`, limpo(s.texto_na_arte) ? `TEXTO NA ARTE: ${limpo(s.texto_na_arte)}` : null, `IMAGEM: ${limpo(s.imagem)}`]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
  }
  if (formato === "Enquete") {
    const e = b.enquete;
    if (!e) return "";
    return [`PERGUNTA: ${limpo(e.pergunta)}`, "OPÇÕES:", ...e.opcoes.map(limpo).filter(Boolean).map((o, i) => `${i + 1}. ${o}`)].join("\n");
  }
  if (formato === "Artigo") {
    const a = b.artigo;
    if (!a) return "";
    return [`TÍTULO: ${limpo(a.titulo)}`, limpo(a.subtitulo) ? `SUBTÍTULO: ${limpo(a.subtitulo)}` : null, ...a.secoes.map((s) => `\n## ${limpo(s.intertitulo)}\n${limpo(s.texto)}`)]
      .filter((x) => x !== null)
      .join("\n");
  }
  if (formato === "Texto") {
    const a = b.arte_estatico;
    if (!a || !limpo(a.imagem)) return "(post só com texto: o texto completo está no campo do post)";
    return [`IMAGEM DE APOIO: ${limpo(a.imagem)}`, limpo(a.titulo_na_arte) ? `TEXTO NA IMAGEM: ${limpo(a.titulo_na_arte)}` : null, limpo(a.composicao) ? `COMPOSIÇÃO: ${limpo(a.composicao)}` : null].filter(Boolean).join("\n");
  }
  if (formato === "Estático") {
    const a = b.arte_estatico;
    if (!a) return "";
    return [`TÍTULO NA ARTE: ${limpo(a.titulo_na_arte)}`, limpo(a.texto_na_arte) ? `TEXTO NA ARTE: ${limpo(a.texto_na_arte)}` : null, `IMAGEM: ${limpo(a.imagem)}`, `COMPOSIÇÃO: ${limpo(a.composicao)}`]
      .filter(Boolean)
      .join("\n");
  }
  const duracao = b.cenas.length ? Math.max(...b.cenas.map((c) => c.fim_s)) : 0;
  const cabecalho = [`DURAÇÃO: cerca de ${Math.round(duracao)} segundos`, limpo(b.musica) ? `MÚSICA: ${limpo(b.musica)}` : null].filter(Boolean).join("\n");
  const cenas = b.cenas.map((c, i) =>
    [
      `CENA ${i + 1} · ${Math.round(c.inicio_s)}s–${Math.round(c.fim_s)}s`,
      `IMAGEM: ${limpo(c.imagem)}`,
      limpo(c.fala) ? `FALA: "${limpo(c.fala)}"` : null,
      limpo(c.texto_na_tela) ? `TEXTO NA TELA: ${limpo(c.texto_na_tela)}` : null,
      limpo(c.audio) ? `ÁUDIO: ${limpo(c.audio)}` : null,
    ].filter(Boolean).join("\n"),
  );
  return [cabecalho, ...cenas].join("\n\n");
}

/** Texto do campo "Orientação de arte": conceito visual + dicas de produção. */
export function formatarOrientacao(b: Briefing): string {
  const c = b.conceito_visual;
  const linhas = [
    `ESTILO: ${limpo(c.estilo)}`,
    `CORES: ${limpo(c.paleta)}`,
    `TIPOGRAFIA: ${limpo(c.tipografia)}`,
    `FOTOGRAFIA E VÍDEO: ${limpo(c.fotografia)}`,
    `ELEMENTOS: ${limpo(c.elementos)}`,
  ];
  const dicas = b.dicas_producao.map(limpo).filter(Boolean);
  if (dicas.length) linhas.push("", "DICAS DE PRODUÇÃO:", ...dicas.map((d) => `- ${d}`));
  return linhas.join("\n");
}

/** Falas do roteiro (linhas "FALA:"), com a cena de cada uma, para o teleprompter. */
export function extrairFalas(roteiro: string | null | undefined): { rotulo: string; fala: string }[] {
  if (!roteiro) return [];
  const saida: { rotulo: string; fala: string }[] = [];
  let rotulo = "";
  for (const linha of roteiro.split("\n")) {
    const cena = /^\s*CENA\s+\d+.*$/i.exec(linha);
    if (cena) { rotulo = cena[0].trim(); continue; }
    const fala = /^\s*FALA:\s*"?(.*?)"?\s*$/i.exec(linha);
    if (fala && fala[1].trim()) saida.push({ rotulo: rotulo || `Fala ${saida.length + 1}`, fala: fala[1].trim() });
  }
  return saida;
}

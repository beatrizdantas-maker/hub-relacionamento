/**
 * Peças prontas: o que a IA devolve para cada formato, as regras que o
 * schema não garante e a escolha do modo (imagens, vídeo ou roteiro falado).
 */
import * as z from "zod/v4";
import type { FormatoConteudo, Pecas } from "@/lib/tipos/database";

export type ModoPeca = Pecas["tipo"];

export const ROTULO_MODO: Record<ModoPeca, string> = {
  carrossel: "Carrossel pronto (imagens)",
  estatico: "Post estático pronto (imagem)",
  video: "Vídeo gerado pelo sistema (MP4)",
  roteiro_falado: "Roteiro para gravar com pessoa",
};

const COM_PESSOA = /pessoa|falando|fala|prova social|depoimento|bastidor|entrevista|rosto|apresent/i;

/** Modo padrão para o conteúdo; Reels podem alternar entre vídeo e roteiro falado. */
export function modoPadrao(formato: FormatoConteudo, tipo: string | null | undefined): ModoPeca {
  if (formato === "Carrossel") return "carrossel";
  if (formato === "Estático") return "estatico";
  return COM_PESSOA.test(tipo ?? "") ? "roteiro_falado" : "video";
}

export function modosPossiveis(formato: FormatoConteudo): ModoPeca[] {
  if (formato === "Carrossel") return ["carrossel"];
  if (formato === "Estático") return ["estatico"];
  return ["video", "roteiro_falado"];
}

// ---------- Schemas de saída (vão para a API como saída estruturada) ----------

export const SaidaCarrossel = z.object({
  slides: z.array(z.object({
    papel: z.enum(["capa", "conteudo", "fechamento"]),
    titulo: z.string().describe("Curto: até 60 caracteres na capa, até 50 nos outros"),
    texto: z.string().describe("Até 220 caracteres. Na capa pode ser vazio"),
    destaque: z.string().nullable().describe("Frase curta em destaque (até 60 caracteres) ou null"),
  })).describe("De 5 a 8 slides: 1 capa, os de conteúdo e 1 fechamento com a chamada para ação"),
});

export const SaidaEstatico = z.object({
  titulo: z.string().describe("Frase principal da arte, até 70 caracteres"),
  texto: z.string().describe("Apoio, até 160 caracteres; pode ser vazio"),
  destaque: z.string().nullable().describe("Palavra ou frase curta para destacar (até 40 caracteres) ou null"),
  rodape: z.string().nullable().describe("Chamada curta no rodapé (até 50 caracteres) ou null"),
});

export const SaidaVideo = z.object({
  cenas: z.array(z.object({
    texto: z.string().describe("Texto que aparece na tela nesta cena, até 90 caracteres"),
    destaque: z.string().nullable().describe("Trecho do texto (palavras exatas) para destacar ou null"),
    segundos: z.number().describe("Duração da cena, de 2 a 6 segundos"),
  })).describe("De 4 a 10 cenas; a primeira é o gancho e a última traz a chamada para ação. Total de 15 a 45 segundos"),
});

export const SaidaRoteiroFalado = z.object({
  duracao_s: z.number().describe("Duração total estimada em segundos (15 a 90)"),
  cenas: z.array(z.object({
    inicio_s: z.number(),
    fim_s: z.number(),
    fala: z.string().describe("Exatamente o que a pessoa fala, palavra por palavra, em linguagem falada"),
    enquadramento: z.string().describe("Como gravar: plano, posição, gesto ou corte"),
    texto_na_tela: z.string().nullable().describe("Texto curto que entra na edição, ou null"),
  })).describe("De 3 a 8 cenas em ordem; a primeira é o gancho e a última traz a chamada para ação"),
  dicas: z.array(z.string()).describe("2 a 4 dicas práticas de gravação (luz, som, onde gravar)"),
});

export const SAIDAS = { carrossel: SaidaCarrossel, estatico: SaidaEstatico, video: SaidaVideo, roteiro_falado: SaidaRoteiroFalado } as const;

const corta = (s: string | null | undefined, n: number) => (s ?? "").trim().slice(0, n);
const cortaOuNulo = (s: string | null | undefined, n: number) => { const v = corta(s, n); return v ? v : null; };
const limita = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n * 10) / 10));

/**
 * Normaliza a saída da IA para o formato salvo (limites de tamanho, durações)
 * e devolve os problemas que impedem usar a peça.
 */
export function normalizarPeca(modo: ModoPeca, bruto: unknown, agora = new Date().toISOString()): { peca: Pecas | null; problemas: string[] } {
  const problemas: string[] = [];
  if (modo === "carrossel") {
    const r = SaidaCarrossel.safeParse(bruto);
    if (!r.success) return { peca: null, problemas: ["Formato inválido"] };
    const slides = r.data.slides
      .map((s) => ({ papel: s.papel, titulo: corta(s.titulo, 90), texto: corta(s.texto, 320), destaque: cortaOuNulo(s.destaque, 80) }))
      .filter((s) => s.titulo || s.texto)
      .slice(0, 10);
    if (slides.length < 3) problemas.push("Poucos slides");
    if (slides[0] && slides[0].papel !== "capa") slides[0] = { ...slides[0], papel: "capa" };
    if (slides.length > 1 && slides[slides.length - 1].papel !== "fechamento") slides[slides.length - 1] = { ...slides[slides.length - 1], papel: "fechamento" };
    return { peca: problemas.length ? null : { tipo: "carrossel", gerado_em: agora, slides }, problemas };
  }
  if (modo === "estatico") {
    const r = SaidaEstatico.safeParse(bruto);
    if (!r.success) return { peca: null, problemas: ["Formato inválido"] };
    const titulo = corta(r.data.titulo, 110);
    if (!titulo) problemas.push("Sem título");
    return { peca: problemas.length ? null : { tipo: "estatico", gerado_em: agora, titulo, texto: corta(r.data.texto, 240), destaque: cortaOuNulo(r.data.destaque, 60), rodape: cortaOuNulo(r.data.rodape, 70) }, problemas };
  }
  if (modo === "video") {
    const r = SaidaVideo.safeParse(bruto);
    if (!r.success) return { peca: null, problemas: ["Formato inválido"] };
    const cenas = r.data.cenas
      .map((c) => ({ texto: corta(c.texto, 140), destaque: cortaOuNulo(c.destaque, 80), segundos: limita(c.segundos || 3, 1.5, 8) }))
      .filter((c) => c.texto)
      .slice(0, 12);
    if (cenas.length < 2) problemas.push("Poucas cenas");
    return { peca: problemas.length ? null : { tipo: "video", gerado_em: agora, cenas }, problemas };
  }
  const r = SaidaRoteiroFalado.safeParse(bruto);
  if (!r.success) return { peca: null, problemas: ["Formato inválido"] };
  const cenas = r.data.cenas
    .map((c) => ({ inicio_s: Math.max(0, Math.round(c.inicio_s)), fim_s: Math.max(0, Math.round(c.fim_s)), fala: corta(c.fala, 1200), enquadramento: corta(c.enquadramento, 300), texto_na_tela: cortaOuNulo(c.texto_na_tela, 120) }))
    .filter((c) => c.fala);
  if (cenas.length < 2) problemas.push("Poucas cenas");
  const dicas = r.data.dicas.map((d) => corta(d, 200)).filter(Boolean).slice(0, 5);
  const duracao = cenas.length ? Math.max(cenas[cenas.length - 1].fim_s, Math.round(r.data.duracao_s)) : 0;
  return { peca: problemas.length ? null : { tipo: "roteiro_falado", gerado_em: agora, duracao_s: duracao, cenas, dicas }, problemas };
}

/** Duração total de um vídeo, em segundos. */
export const duracaoVideo = (cenas: { segundos: number }[]) => cenas.reduce((a, c) => a + c.segundos, 0);

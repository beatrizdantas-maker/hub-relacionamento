/**
 * Regras da publicação automática no Instagram e no LinkedIn.
 * Sem dependências de propósito: este mesmo arquivo é enviado como
 * "regras.ts" para a função do Supabase que publica (supabase/functions/estudio-publicar).
 */

export type RedePublicacao = "instagram" | "linkedin";
export type FormatoPublicacao = "Reels" | "Carrossel" | "Estático" | "Texto" | "Enquete" | "Artigo";
export type TipoArquivo = "imagem" | "video";
export type StatusPublicacao = "agendado" | "processando" | "publicado" | "erro";

/** Arquivo pronto para publicar, guardado no Storage (bucket público "estudio-midias"). */
export interface ArquivoPublicacao {
  caminho: string;   // "<empresa>/<conteudo>/<nome>" dentro do bucket
  url: string;       // URL pública (o Instagram baixa por ela)
  tipo: TipoArquivo;
  nome?: string;     // nome original, só para mostrar
  tamanho?: number;  // bytes
}

export const BUCKET_MIDIAS = "estudio-midias";
export const LIMITE_ARQUIVO = 50 * 1024 * 1024;
export const MAX_LEGENDA_INSTAGRAM = 2200;
export const MAX_HASHTAGS_INSTAGRAM = 30;
export const MAX_TEXTO_LINKEDIN = 3000;
export const MAX_CARROSSEL = 10;

export const ROTULO_STATUS_PUBLICACAO: Record<StatusPublicacao, string> = {
  agendado: "Agendado",
  processando: "Publicando…",
  publicado: "Publicado",
  erro: "Erro ao publicar",
};

const NOME_LINKEDIN: Partial<Record<FormatoPublicacao, string>> = { Reels: "Vídeo", Estático: "Foto" };
const nomeFormato = (rede: RedePublicacao, f: FormatoPublicacao) => (rede === "linkedin" ? NOME_LINKEDIN[f] ?? f : f);

export function contarHashtags(texto: string): number {
  return (texto.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

/** O que cada formato precisa de arquivo, em cada rede (para a tela mostrar). */
export function arquivosEsperados(rede: RedePublicacao, formato: FormatoPublicacao): { aceita: TipoArquivo[]; min: number; max: number; ajuda: string } | null {
  if (rede === "instagram") {
    if (formato === "Reels") return { aceita: ["video"], min: 1, max: 1, ajuda: "1 vídeo vertical (MP4), até 50 MB." };
    if (formato === "Carrossel") return { aceita: ["imagem"], min: 2, max: MAX_CARROSSEL, ajuda: "De 2 a 10 imagens, na ordem dos slides." };
    if (formato === "Estático") return { aceita: ["imagem"], min: 1, max: 1, ajuda: "1 imagem." };
    return null;
  }
  if (formato === "Texto") return { aceita: ["imagem"], min: 0, max: 1, ajuda: "Opcional: 1 foto para acompanhar o texto." };
  if (formato === "Estático") return { aceita: ["imagem"], min: 1, max: 1, ajuda: "1 foto." };
  if (formato === "Reels") return { aceita: ["video"], min: 1, max: 1, ajuda: "1 vídeo (MP4), até 50 MB." };
  return null;
}

/**
 * Problemas que impedem publicar. Lista vazia = pode publicar.
 * As mensagens são para a pessoa ler na tela.
 */
export function problemasPublicacao(rede: RedePublicacao, formato: FormatoPublicacao, arquivos: ArquivoPublicacao[], legenda: string): string[] {
  const p: string[] = [];
  const nome = nomeFormato(rede, formato);
  const esperado = arquivosEsperados(rede, formato);
  if (!esperado) {
    if (rede === "linkedin" && formato === "Artigo") p.push("Artigo não é publicado automaticamente: publique pelo botão “Escrever artigo” do LinkedIn.");
    else p.push(`${nome} não é publicado automaticamente no ${rede === "instagram" ? "Instagram" : "LinkedIn"}.`);
    return p;
  }
  const imagens = arquivos.filter((a) => a.tipo === "imagem").length;
  const videos = arquivos.filter((a) => a.tipo === "video").length;
  const errados = arquivos.filter((a) => !esperado.aceita.includes(a.tipo)).length;
  if (errados) p.push(esperado.aceita.includes("video") ? `${nome} usa só vídeo: tire as imagens.` : `${nome} usa só imagem: tire o vídeo.`);
  const certos = esperado.aceita.includes("video") ? videos : imagens;
  if (certos < esperado.min) p.push(esperado.min === 1 ? `Falta enviar ${esperado.aceita.includes("video") ? "o vídeo" : "a imagem"}.` : `Envie pelo menos ${esperado.min} imagens.`);
  if (certos > esperado.max) p.push(esperado.max === 1 ? `Deixe só ${esperado.aceita.includes("video") ? "1 vídeo" : "1 imagem"}.` : `No máximo ${esperado.max} imagens.`);
  if (arquivos.some((a) => (a.tamanho ?? 0) > LIMITE_ARQUIVO)) p.push("Há arquivo com mais de 50 MB.");

  const texto = legenda.trim();
  if (rede === "instagram") {
    if (!texto) p.push("Escreva a legenda.");
    if (texto.length > MAX_LEGENDA_INSTAGRAM) p.push(`A legenda passa de ${MAX_LEGENDA_INSTAGRAM} caracteres.`);
    if (contarHashtags(texto) > MAX_HASHTAGS_INSTAGRAM) p.push(`O Instagram aceita no máximo ${MAX_HASHTAGS_INSTAGRAM} hashtags.`);
  } else {
    if (!texto) p.push("Escreva o texto do post.");
    if (texto.length > MAX_TEXTO_LINKEDIN) p.push(`O texto passa de ${MAX_TEXTO_LINKEDIN} caracteres.`);
  }
  return p;
}

/**
 * Texto para a API de posts do LinkedIn ("little text format"): os caracteres
 * reservados levam barra invertida e cada #hashtag vira o modelo de hashtag,
 * para continuar clicável.
 */
export function textoLinkedin(texto: string): string {
  const reservados = /[\\|{}@[\]()<>#*_~]/g;
  const escapar = (s: string) => s.replace(reservados, (c) => `\\${c}`);
  let saida = "";
  let ultimo = 0;
  for (const m of texto.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
    const inicio = (m.index ?? 0) + m[1].length;
    saida += escapar(texto.slice(ultimo, inicio)) + `{hashtag|\\#|${m[2]}}`;
    ultimo = inicio + 1 + m[2].length;
  }
  return saida + escapar(texto.slice(ultimo));
}

/** Número da página do LinkedIn a partir do que a pessoa colou (número ou link da página). */
export function idPaginaLinkedin(entrada: string): string | null {
  const s = entrada.trim();
  if (/^\d{3,}$/.test(s)) return s;
  const m = /linkedin\.com\/company\/(\d{3,})/i.exec(s) ?? /organization:(\d{3,})/i.exec(s);
  return m ? m[1] : null;
}

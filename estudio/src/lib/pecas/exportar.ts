"use client";

/**
 * Exportação das peças no navegador: PNG por slide/tela, ZIP com todas e
 * vídeo MP4 (H.264) do Reels de texto, sem servidor e sem custo.
 */
import { zipSync } from "fflate";
import type { CenaVideo, Pecas, SlidePeca, TelaStory } from "@/lib/tipos/database";
import { FEED, VERTICAL, desenharEstatico, desenharQuadroVideo, desenharSlide, desenharTelaStory, type Marca } from "./desenho";
import { duracaoVideo } from "./esquemas";

export type DadosMarca = { nome: string; perfil: string | null; primaria: string; secundaria: string; logoUrl: string | null };

/** Fontes da interface (next/font) e logo, prontas para desenhar no canvas. */
export async function prepararMarca(d: DadosMarca): Promise<Marca> {
  const estilo = getComputedStyle(document.documentElement);
  const fonteTitulo = estilo.getPropertyValue("--fonte-titulo").trim() || "Georgia, serif";
  const fonteTexto = estilo.getPropertyValue("--fonte-texto").trim() || "system-ui, sans-serif";
  await Promise.all([
    document.fonts.load(`700 80px ${fonteTitulo}`, "Áá"),
    document.fonts.load(`500 40px ${fonteTexto}`, "Áá"),
    document.fonts.load(`700 40px ${fonteTexto}`, "Áá"),
  ]).catch(() => undefined);
  let logo: HTMLImageElement | null = null;
  if (d.logoUrl) {
    logo = await new Promise<HTMLImageElement | null>((ok) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = d.logoUrl!;
    });
  }
  return { nome: d.nome, perfil: d.perfil, primaria: d.primaria, secundaria: d.secundaria, logo, fonteTitulo, fonteTexto };
}

function novoCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu desenhar a peça.");
  return { c, ctx };
}

const paraBlob = (c: HTMLCanvasElement, tipo = "image/png", q?: number) =>
  new Promise<Blob>((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao gerar a imagem."))), tipo, q));

export interface Imagem { nome: string; blob: Blob; previa: string }

/** Imagens (PNG) de um carrossel ou estático. */
export async function imagensDaPeca(peca: Extract<Pecas, { tipo: "carrossel" | "estatico" }>, m: Marca, base: string): Promise<Imagem[]> {
  const saida: Imagem[] = [];
  if (peca.tipo === "carrossel") {
    const slides: SlidePeca[] = peca.slides;
    for (let i = 0; i < slides.length; i++) {
      const { c, ctx } = novoCanvas(FEED.w, FEED.h);
      desenharSlide(ctx, slides[i], i, slides.length, m);
      saida.push({ nome: `${base}-${String(i + 1).padStart(2, "0")}.png`, blob: await paraBlob(c), previa: c.toDataURL("image/jpeg", 0.75) });
    }
  } else {
    const { c, ctx } = novoCanvas(FEED.w, FEED.h);
    desenharEstatico(ctx, peca, m);
    saida.push({ nome: `${base}.png`, blob: await paraBlob(c), previa: c.toDataURL("image/jpeg", 0.75) });
  }
  return saida;
}

/** Imagens (PNG 1080×1920) das telas de stories. */
export async function imagensDosStories(telas: TelaStory[], m: Marca, base: string, temaDoPost?: string | null): Promise<Imagem[]> {
  const saida: Imagem[] = [];
  for (let i = 0; i < telas.length; i++) {
    const { c, ctx } = novoCanvas(VERTICAL.w, VERTICAL.h);
    desenharTelaStory(ctx, telas[i], i, telas.length, m, temaDoPost);
    saida.push({ nome: `${base}-tela-${i + 1}.png`, blob: await paraBlob(c), previa: c.toDataURL("image/jpeg", 0.7) });
  }
  return saida;
}

/** Prévia (JPEG) de cada cena do vídeo, no meio da animação. */
export function previasDoVideo(cenas: CenaVideo[], m: Marca): string[] {
  const duracao = duracaoVideo(cenas);
  let inicio = 0;
  return cenas.map((cena, i) => {
    const { c, ctx } = novoCanvas(VERTICAL.w, VERTICAL.h);
    desenharQuadroVideo(ctx, cena, i, cenas.length, Math.min(cena.segundos * 0.5, 1), inicio + 1, duracao, m);
    inicio += cena.segundos;
    return c.toDataURL("image/jpeg", 0.6);
  });
}

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function baixarZip(imagens: Imagem[], nome: string) {
  const arquivos: Record<string, Uint8Array> = {};
  for (const i of imagens) arquivos[i.nome] = new Uint8Array(await i.blob.arrayBuffer());
  const zip = zipSync(arquivos, { level: 0 });
  baixar(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }), nome);
}

/** Nome de arquivo seguro a partir do tema e da data. */
export function nomeBase(data: string, tema: string) {
  const limpo = tema.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${data}-${limpo || "conteudo"}`;
}

/**
 * Gera o MP4 (H.264, 1080×1920, 30 fps) do Reels de texto. Usa o codificador
 * de vídeo do próprio navegador (WebCodecs).
 */
export async function gerarVideo(cenas: CenaVideo[], m: Marca, aoProgredir: (fracao: number) => void, sinal?: AbortSignal): Promise<Blob> {
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH, canEncodeVideo } = await import("mediabunny");
  const fps = 30;
  if (typeof VideoEncoder === "undefined" || !(await canEncodeVideo("avc", { width: VERTICAL.w, height: VERTICAL.h, quality: QUALITY_HIGH }))) {
    throw new Error("Este navegador não consegue gerar MP4. Use o Chrome, o Edge ou o Safari atualizados no computador.");
  }
  const { c, ctx } = novoCanvas(VERTICAL.w, VERTICAL.h);
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const fonte = new CanvasSource(c, { codec: "avc", quality: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(fonte, { frameRate: fps });
  await output.start();

  const duracao = duracaoVideo(cenas);
  const totalQuadros = Math.round(duracao * fps);
  let quadro = 0;
  let inicioCena = 0;
  try {
    for (let i = 0; i < cenas.length; i++) {
      const quadrosCena = Math.round(cenas[i].segundos * fps);
      for (let q = 0; q < quadrosCena; q++) {
        if (sinal?.aborted) throw new DOMException("Cancelado", "AbortError");
        const t = quadro / fps;
        desenharQuadroVideo(ctx, cenas[i], i, cenas.length, t - inicioCena, t, duracao, m);
        await fonte.add(t, 1 / fps);
        quadro++;
        if (quadro % 10 === 0) aoProgredir(quadro / totalQuadros);
      }
      inicioCena += quadrosCena / fps;
    }
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => undefined);
    throw e;
  }
  aoProgredir(1);
  const buffer = (output.target as InstanceType<typeof BufferTarget>).buffer;
  if (!buffer) throw new Error("O vídeo não foi gerado.");
  return new Blob([buffer], { type: "video/mp4" });
}

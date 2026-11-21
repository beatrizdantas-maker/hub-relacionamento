"use client";

import { criarClienteNavegador } from "@/lib/supabase/client";
import { BUCKET_MIDIAS, LIMITE_ARQUIVO, type ArquivoPublicacao } from "@/lib/publicacao";

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_VIDEO = ["video/mp4", "video/quicktime"];
export const ACEITA_IMAGEM = TIPOS_IMAGEM.join(",");
export const ACEITA_VIDEO = TIPOS_VIDEO.join(",");
const LADO_MAXIMO = 2160;

/** O Instagram só aceita JPEG: PNG e WebP viram JPEG (e fotos enormes são reduzidas). */
async function paraJpeg(arquivo: File): Promise<Blob> {
  if (arquivo.type === "image/jpeg" && arquivo.size <= 8 * 1024 * 1024) return arquivo;
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
    ctx.fillStyle = "#ffffff"; // PNG transparente vira fundo branco
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.92));
    if (!blob) throw new Error("Seu navegador não conseguiu processar a imagem.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Mensagem de erro do arquivo escolhido, ou null se pode enviar. */
export function validarMidia(arquivo: File): string | null {
  if (TIPOS_VIDEO.includes(arquivo.type)) return arquivo.size > LIMITE_ARQUIVO ? "O vídeo passa de 50 MB. Exporte em 1080p e tente de novo." : null;
  if (TIPOS_IMAGEM.includes(arquivo.type)) return null;
  return "Use imagem JPG ou PNG, ou vídeo MP4.";
}

/** Envia o arquivo para a pasta do post no Storage e devolve o registro para guardar no post. */
export async function enviarMidia(empresaId: string, conteudoId: string, arquivo: File): Promise<ArquivoPublicacao> {
  const video = TIPOS_VIDEO.includes(arquivo.type);
  const corpo: Blob = video ? arquivo : await paraJpeg(arquivo);
  const extensao = video ? (arquivo.type === "video/quicktime" ? "mov" : "mp4") : "jpg";
  const caminho = `${empresaId}/${conteudoId}/${crypto.randomUUID()}.${extensao}`;
  const supabase = criarClienteNavegador();
  const { error } = await supabase.storage.from(BUCKET_MIDIAS).upload(caminho, corpo, { contentType: video ? arquivo.type : "image/jpeg", cacheControl: "31536000", upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error("O espaço de arquivos ainda não foi criado no banco. Avise quem administra o sistema.");
    if (/row-level security|unauthorized|403/i.test(error.message)) throw new Error("Só Dono e Editor podem enviar arquivos.");
    if (/maximum allowed size|too large|413/i.test(error.message)) throw new Error("O arquivo passa de 50 MB.");
    throw new Error(`Não foi possível enviar ${arquivo.name}. Tente de novo.`);
  }
  const url = supabase.storage.from(BUCKET_MIDIAS).getPublicUrl(caminho).data.publicUrl;
  return { caminho, url, tipo: video ? "video" : "imagem", nome: arquivo.name, tamanho: corpo.size };
}

/** Apaga arquivos do Storage (melhor esforço: o post continua mesmo se falhar). */
export async function apagarMidias(caminhos: string[]): Promise<void> {
  if (!caminhos.length) return;
  await criarClienteNavegador().storage.from(BUCKET_MIDIAS).remove(caminhos).catch(() => undefined);
}

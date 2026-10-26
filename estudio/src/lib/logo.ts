"use client";

import { criarClienteNavegador } from "@/lib/supabase/client";

export const BUCKET_LOGOS = "estudio-logos";
export const TIPOS_LOGO = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const LADO_MAXIMO = 512;

/** Lê a imagem, reduz para no máximo 512 px no maior lado e converte para WebP (ou PNG). */
async function prepararImagem(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const largura = img.naturalWidth || LADO_MAXIMO;
    const altura = img.naturalHeight || LADO_MAXIMO;
    const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.max(1, Math.round(altura * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.9));
    if (blob && blob.type === "image/webp") return blob;
    const png = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
    if (!png) throw new Error("Seu navegador não conseguiu processar a imagem.");
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Valida o arquivo escolhido. Devolve a mensagem de erro ou null. */
export function validarArquivoLogo(arquivo: File): string | null {
  if (!TIPOS_LOGO.includes(arquivo.type)) return "Use uma imagem PNG, JPG, WebP ou SVG.";
  if (arquivo.size > 5 * 1024 * 1024) return "A imagem passa de 5 MB. Use uma menor.";
  return null;
}

/** Envia a logo para a pasta da empresa no Storage e devolve a URL pública. */
export async function enviarLogo(empresaId: string, arquivo: File): Promise<string> {
  const blob = await prepararImagem(arquivo);
  const extensao = blob.type === "image/webp" ? "webp" : "png";
  const caminho = `${empresaId}/logo-${Date.now()}.${extensao}`;
  const supabase = criarClienteNavegador();
  const { error } = await supabase.storage.from(BUCKET_LOGOS).upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error("O espaço para logos ainda não foi criado no banco. Avise quem administra o sistema.");
    if (/row-level security|unauthorized|403/i.test(error.message)) throw new Error("Só Dono e Editor podem trocar a logo.");
    throw new Error("Não foi possível enviar a logo. Tente de novo.");
  }
  return supabase.storage.from(BUCKET_LOGOS).getPublicUrl(caminho).data.publicUrl;
}

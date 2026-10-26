/**
 * Texto para copiar de uma vez as postagens que precisam de imagem
 * (carrossel e estático) de um período: data, tema, slides/arte e
 * orientação de arte. Reels (vídeo), stories e posts já publicados ficam de fora.
 */
import { formatarCurta, formatarDiaSemanaCurto, horaCurta } from "./datas";
import type { Conteudo, StatusConteudo } from "./tipos/database";
import { extrairFalas } from "./ia/briefing";

const STATUS_TEXTO: Record<StatusConteudo, string> = {
  sugestao: "Sugestão da IA (ainda não aprovada)",
  aprovado: "Aprovado",
  producao: "Em produção",
  publicado: "Publicado",
};

const LINHA = "━━━━━━━━━━━━━━━━━━━━";

export type ConteudoArte = Pick<Conteudo, "data" | "hora" | "formato" | "tema" | "status" | "roteiro" | "orientacao_arte">;

/** Só carrossel e estático, sem os já publicados, em ordem de data e hora. */
export function postagensComArte<T extends ConteudoArte>(conteudos: T[]): T[] {
  return conteudos
    .filter((c) => (c.formato === "Carrossel" || c.formato === "Estático") && c.status !== "publicado")
    .sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? "99").localeCompare(b.hora ?? "99"));
}

export function textoDasArtes(conteudos: ConteudoArte[], o: { empresa: string; periodo: string }): { texto: string; total: number } {
  const lista = postagensComArte(conteudos);
  const cabecalho = `ARTES PARA PRODUZIR · ${o.empresa}\n${o.periodo} · ${lista.length} ${lista.length === 1 ? "postagem" : "postagens"}`;
  const blocos = lista.map((c) => {
    const quando = [`${formatarDiaSemanaCurto(c.data).toUpperCase()}, ${formatarCurta(c.data)}`, c.hora ? horaCurta(c.hora) : null, c.formato.toUpperCase()].filter(Boolean).join(" · ");
    const tituloArte = c.formato === "Carrossel" ? "SLIDES (TEXTO E IMAGEM DE CADA UM)" : "ARTE (TEXTO E IMAGEM)";
    return [
      LINHA,
      quando,
      `Tema: ${c.tema || "sem tema"}`,
      `Status: ${STATUS_TEXTO[c.status]}`,
      "",
      tituloArte,
      c.roteiro?.trim() || "(ainda sem texto: abra o conteúdo e use “Gerar briefing com IA”)",
      "",
      "ORIENTAÇÃO DE ARTE",
      c.orientacao_arte?.trim() || "(sem orientação de arte)",
    ].join("\n");
  });
  return { texto: [cabecalho, ...blocos].join("\n\n"), total: lista.length };
}

/** Copia para a área de transferência (com plano B para navegadores antigos). */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

// ---------- Falas dos vídeos ----------


/** Reels do período (sem os publicados), em ordem de data e hora. */
export function videosComFala<T extends ConteudoArte>(conteudos: T[]): T[] {
  return conteudos
    .filter((c) => c.formato === "Reels" && c.status !== "publicado")
    .sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? "99").localeCompare(b.hora ?? "99"));
}

/** Só as falas de um roteiro, uma por linha, com o tempo da cena: "[0s–3s] Texto". */
export function falasDoRoteiro(roteiro: string | null | undefined): string {
  const falas = extrairFalas(roteiro);
  if (falas.length) {
    return falas.map((f) => {
      const tempo = /(\d+\s*s\s*[–-]\s*\d+\s*s)/.exec(f.rotulo)?.[1].replace(/\s+/g, "");
      return `${tempo ? `[${tempo}] ` : ""}${f.fala}`;
    }).join("\n");
  }
  if (!roteiro?.trim()) return "(ainda sem roteiro: abra o conteúdo e use “Gerar briefing com IA”)";
  if (/^\s*CENA\s+\d+/im.test(roteiro)) return "(sem falas: vídeo só com texto na tela)";
  return "(o roteiro não tem falas marcadas com “FALA:”)";
}

export function textoDasFalas(conteudos: ConteudoArte[], o: { empresa: string; periodo: string }): { texto: string; total: number } {
  const lista = videosComFala(conteudos);
  const cabecalho = `FALAS PARA GRAVAR · ${o.empresa}\n${o.periodo} · ${lista.length} ${lista.length === 1 ? "vídeo" : "vídeos"}`;
  const blocos = lista.map((c) => {
    const quando = [`${formatarDiaSemanaCurto(c.data).toUpperCase()}, ${formatarCurta(c.data)}`, c.hora ? horaCurta(c.hora) : null, c.tema || "sem tema"].filter(Boolean).join(" · ");
    return [LINHA, quando, "", falasDoRoteiro(c.roteiro)].join("\n");
  });
  return { texto: [cabecalho, ...blocos].join("\n\n"), total: lista.length };
}

import { AlignLeft, CircleDashed, Clapperboard, GalleryHorizontalEnd, Image as ImagemIcone, Newspaper, Vote, type LucideIcon } from "lucide-react";
import type { FormatoConteudo, Origem, Rede, StatusConteudo } from "@/lib/tipos/database";
import { FORMATOS_POR_REDE } from "@/lib/redes";

export const STATUS: Record<StatusConteudo, { rotulo: string; tom: "ia" | "primaria" | "manual" | "real" }> = {
  sugestao: { rotulo: "Sugestão", tom: "ia" },
  aprovado: { rotulo: "Aprovado", tom: "primaria" },
  producao: { rotulo: "Em produção", tom: "manual" },
  publicado: { rotulo: "Publicado", tom: "real" },
};

export const ORIGEM: Record<Origem, { rotulo: string; tom: "ia" | "neutro" }> = {
  ia: { rotulo: "Sugestão da IA", tom: "ia" },
  equipe: { rotulo: "Criado pela equipe", tom: "neutro" },
};

export const ICONE_FORMATO: Record<FormatoConteudo | "Stories", LucideIcon> = {
  Reels: Clapperboard,
  Carrossel: GalleryHorizontalEnd,
  Estático: ImagemIcone,
  Texto: AlignLeft,
  Enquete: Vote,
  Artigo: Newspaper,
  Stories: CircleDashed,
};

export const FILTROS = ["todos", "Reels", "Carrossel", "Estático", "Texto", "Enquete", "Artigo", "Stories"] as const;
export type Filtro = (typeof FILTROS)[number];
export const rotuloFiltro = (f: Filtro) => (f === "todos" ? "Todos" : f);

/** Filtros de formato que fazem sentido para as redes que estão na tela. */
export function filtrosPara(redes: Rede[]): Filtro[] {
  const formatos = new Set<string>(redes.flatMap((r) => FORMATOS_POR_REDE[r]));
  return FILTROS.filter((f) => f === "todos" || (f === "Stories" ? redes.includes("instagram") : formatos.has(f)));
}

export const REDE_FILTROS = ["todas", "instagram", "linkedin"] as const;
export type RedeFiltro = (typeof REDE_FILTROS)[number];

import { AlignLeft, CircleDashed, Clapperboard, GalleryHorizontalEnd, Image as ImagemIcone, Newspaper, Vote, type LucideIcon } from "lucide-react";
import type { FormatoConteudo, Origem, Rede, StatusConteudo } from "@/lib/tipos/database";

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

const SO_LINKEDIN = new Set<Filtro>(["Texto", "Enquete", "Artigo"]);
/** Filtros de formato que fazem sentido para as redes que estão na tela. */
export function filtrosPara(redes: Rede[]): Filtro[] {
  return FILTROS.filter((f) => (SO_LINKEDIN.has(f) ? redes.includes("linkedin") : f === "Stories" ? redes.includes("instagram") : true));
}

export const REDE_FILTROS = ["todas", "instagram", "linkedin"] as const;
export type RedeFiltro = (typeof REDE_FILTROS)[number];

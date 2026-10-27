/**
 * Redes sociais da empresa: Instagram e LinkedIn. O mesmo valor de formato
 * guardado no banco ganha nome próprio em cada rede (no LinkedIn, "Reels" é
 * Vídeo e "Estático" é Imagem). Carrossel não é usado no LinkedIn: o alcance
 * de documentos/carrosséis na página da empresa não compensa o trabalho.
 */
import type { FormatoConteudo, Rede, RitmoDia } from "./tipos/database";

export const REDES: { valor: Rede; rotulo: string }[] = [
  { valor: "instagram", rotulo: "Instagram" },
  { valor: "linkedin", rotulo: "LinkedIn" },
];
export const rotuloRede = (r: Rede) => (r === "linkedin" ? "LinkedIn" : "Instagram");

export const FORMATOS_POR_REDE: Record<Rede, FormatoConteudo[]> = {
  instagram: ["Reels", "Carrossel", "Estático"],
  linkedin: ["Texto", "Reels", "Estático", "Enquete", "Artigo"],
};

const NOMES_LINKEDIN: Partial<Record<FormatoConteudo, string>> = { Reels: "Vídeo", Estático: "Imagem" };
export function rotuloFormato(formato: FormatoConteudo, rede: Rede = "instagram"): string {
  return rede === "linkedin" ? NOMES_LINKEDIN[formato] ?? formato : formato;
}

/** Rede de um conteúdo (sem a coluna no banco, tudo é Instagram). */
export const redeDe = (c: { rede?: string | null }): Rede => (c.rede === "linkedin" ? "linkedin" : "instagram");

/** Redes em que a empresa atua. Instagram sempre vem primeiro, se marcado. */
export function redesDaEmpresa(e: { redes?: string[] | null }): Rede[] {
  const r = Array.isArray(e.redes) && e.redes.length ? e.redes : ["instagram"];
  return REDES.map((x) => x.valor).filter((v) => r.includes(v));
}

/** Formatos que precisam de imagem/arte (para "Copiar artes"). */
export const precisaDeArte = (f: FormatoConteudo) => f === "Carrossel" || f === "Estático";

export const RITMO_LINKEDIN_PADRAO: RitmoDia[] = [
  { dia: 1, hora: "08:00", formato: "Texto", tipo: "Texto de opinião sobre educação", pilar: "", objetivo: "engajamento" },
  { dia: 2, hora: "12:00", formato: "Reels", tipo: "Vídeo curto com especialista falando", pilar: "", objetivo: "alcance" },
  { dia: 3, hora: "08:00", formato: "Texto", tipo: "Caso de escola atendida (prova social), com foto real", pilar: "", objetivo: "direct" },
  { dia: 4, hora: "12:00", formato: "Estático", tipo: "Imagem com um dado ou aprendizado da gestão escolar", pilar: "", objetivo: "engajamento" },
  { dia: 5, hora: "09:00", formato: "Reels", tipo: "Vídeo de bastidores ou depoimento de escola", pilar: "", objetivo: "alcance" },
  { dia: 6, hora: "10:00", formato: "Enquete", tipo: "Enquete sobre desafio da gestão escolar", pilar: "", objetivo: "comentarios" },
  { dia: 7, hora: "18:00", formato: "Texto", tipo: "Reflexão da semana", pilar: "", objetivo: "alcance" },
];

/** Erro do banco por falta da migração 0007 (coluna rede/redes/ritmo_linkedin ou formatos novos). */
export function faltaMigracaoLinkedin(e: { message?: string; code?: string } | null | undefined): boolean {
  const m = e?.message ?? "";
  return /\b(rede|redes|ritmo_linkedin)\b/.test(m) && /column|coluna|schema cache/i.test(m)
    || /formato_conteudo/.test(m) && /(Texto|Enquete|Artigo)/.test(m);
}
export const MENSAGEM_MIGRACAO_LINKEDIN = "O LinkedIn ainda não está ativado no banco de dados. Peça para rodar a migração 0007 no Supabase (SQL Editor) e tente de novo.";

export function ritmoLinkedinOuPadrao(r?: RitmoDia[] | null): RitmoDia[] {
  return Array.isArray(r) && r.length === 7 ? r.map((x) => ({ ...x })) : RITMO_LINKEDIN_PADRAO.map((x) => ({ ...x }));
}

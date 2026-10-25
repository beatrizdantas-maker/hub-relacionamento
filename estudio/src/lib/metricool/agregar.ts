import { inicioDaSemana, somarDias, type DataISO } from "@/lib/datas";
import type { FormatoConteudo } from "@/lib/tipos/database";

/** Um dia de dados da conta (qualquer campo pode faltar). */
export interface DiaConta {
  dia: DataISO;
  seguidores?: number | null;
  ganhos?: number | null;
  perdidos?: number | null;
  visualizacoes?: number | null;
  alcance?: number | null;
  stories?: number | null;
}

/** Um post, Reels ou story já normalizado. */
export interface PublicacaoNormalizada {
  id_externo: string;
  publicado_em: string;     // ISO
  dia: DataISO;             // no fuso da marca
  formato: FormatoConteudo;
  titulo: string | null;
  url: string | null;
  alcance: number | null;
  visualizacoes: number | null;
  curtidas: number | null;
  comentarios: number | null;
  salvamentos: number | null;
  compartilhamentos: number | null;
  interacoes: number | null;
  tempo_medio: number | null;
  taxa_visualizacao: number | null;
}

export interface StoryNormalizado { id_externo: string; dia: DataISO; respostas: number | null }

export interface SemanaAgregada {
  semana: DataISO;
  seguidores: number | null;
  seguidores_ganhos: number | null;
  seguidores_perdidos: number | null;
  visualizacoes: number | null;
  alcance: number | null;          // só quando os 7 dias têm dado
  stories: number | null;
  posts: number | null;
  reels: number | null;
  interacoes: number | null;
  alcance_posts: number | null;
  salvamentos: number | null;
  compartilhamentos: number | null;
  respostas_stories: number | null;
  dias_com_dados: number;
  ultimo_dia: DataISO | null;
}

const soma = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return n.length ? n.reduce((a, b) => a + b, 0) : null;
};

/**
 * Agrega dias e publicações por semana (segunda a domingo), como manda a seção 8:
 * somas; seguidores = último valor da semana; alcance só com os 7 dias;
 * interações/salvamentos/compartilhamentos a partir dos posts publicados na semana.
 */
export function agregarPorSemana(dias: DiaConta[], publicacoes: PublicacaoNormalizada[], stories: StoryNormalizado[], hoje: DataISO): SemanaAgregada[] {
  const semanas = new Set<string>();
  for (const d of dias) semanas.add(inicioDaSemana(d.dia));
  for (const p of publicacoes) semanas.add(inicioDaSemana(p.dia));
  for (const s of stories) semanas.add(inicioDaSemana(s.dia));

  return [...semanas].sort().map((semana) => {
    const fim = somarDias(semana, 6);
    const ds = dias.filter((d) => d.dia >= semana && d.dia <= fim).sort((a, b) => a.dia.localeCompare(b.dia));
    const comDado = ds.filter((d) => d.seguidores != null || d.visualizacoes != null || d.alcance != null || d.ganhos != null);
    const pubs = publicacoes.filter((p) => p.dia >= semana && p.dia <= fim);
    const sts = stories.filter((s) => s.dia >= semana && s.dia <= fim);
    const diasPossiveis = Math.min(7, Math.max(0, Math.floor((Date.parse(hoje) - Date.parse(semana)) / 86_400_000) + 1));
    const alcanceDias = ds.filter((d) => d.alcance != null);
    const ultimoComSeguidores = [...ds].reverse().find((d) => d.seguidores != null);

    return {
      semana,
      seguidores: ultimoComSeguidores?.seguidores ?? null,
      seguidores_ganhos: soma(ds.map((d) => d.ganhos)),
      seguidores_perdidos: soma(ds.map((d) => d.perdidos)),
      visualizacoes: soma(ds.map((d) => d.visualizacoes)),
      alcance: alcanceDias.length === 7 ? soma(alcanceDias.map((d) => d.alcance)) : null,
      stories: soma(ds.map((d) => d.stories)) ?? (sts.length ? sts.length : null),
      posts: pubs.length ? pubs.filter((p) => p.formato !== "Reels").length : null,
      reels: pubs.length ? pubs.filter((p) => p.formato === "Reels").length : null,
      interacoes: pubs.length ? soma(pubs.map((p) => p.interacoes)) : null,
      alcance_posts: pubs.length ? soma(pubs.map((p) => p.alcance)) : null,
      salvamentos: pubs.length ? soma(pubs.map((p) => p.salvamentos)) : null,
      compartilhamentos: pubs.length ? soma(pubs.map((p) => p.compartilhamentos)) : null,
      respostas_stories: sts.length ? soma(sts.map((s) => s.respostas)) : null,
      dias_com_dados: Math.min(comDado.length, diasPossiveis),
      ultimo_dia: comDado.length ? comDado[comDado.length - 1].dia : null,
    };
  });
}

// ---------- Normalização tolerante das publicações ----------

type Json = Record<string, unknown>;

const num = (o: Json, ...chaves: string[]): number | null => {
  for (const k of chaves) {
    const v = o[k];
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};
const str = (o: Json, ...chaves: string[]): string | null => {
  for (const k of chaves) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
};

/** Lê a data de publicação em vários formatos possíveis (ISO, epoch ms, {dateTime, timezone}). */
export function lerDataPublicacao(o: Json): string | null {
  for (const k of ["timestamp", "publishedAt", "publicationDate", "published", "date", "created", "createdAt"]) {
    const v = o[k];
    if (v == null) continue;
    if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString();
    if (typeof v === "string" && v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    if (typeof v === "object" && v && "dateTime" in (v as Json)) {
      const dt = (v as Json).dateTime;
      if (typeof dt === "string") {
        const d = new Date(dt);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
    }
  }
  return null;
}

export function normalizarPublicacao(o: Json, formatoBase: "post" | "reel", diaNoFuso: (iso: string) => string): PublicacaoNormalizada | null {
  const publicado = lerDataPublicacao(o);
  const id = str(o, "postId", "reelId", "id", "mediaId", "businessId") ?? str(o, "url", "permalink");
  if (!publicado || !id) return null;
  const tipo = (str(o, "type", "mediaType", "contentType") ?? "").toUpperCase();
  const formato: FormatoConteudo = formatoBase === "reel" || tipo.includes("REEL") || tipo.includes("VIDEO") ? "Reels" : tipo.includes("CAROUSEL") || tipo.includes("ALBUM") ? "Carrossel" : "Estático";
  const curtidas = num(o, "likes", "likeCount");
  const comentarios = num(o, "comments", "commentsCount");
  const salvamentos = num(o, "saved", "saves", "savedCount");
  const compartilhamentos = num(o, "shares", "sharesCount");
  const conteudo = str(o, "content", "caption", "text", "message");
  return {
    id_externo: id,
    publicado_em: publicado,
    dia: diaNoFuso(publicado),
    formato,
    titulo: conteudo ? conteudo.replace(/\s+/g, " ").trim().slice(0, 120) : null,
    url: str(o, "url", "permalink", "link"),
    alcance: num(o, "reach", "reachOrganic"),
    visualizacoes: num(o, "views", "videoViews", "impressions", "plays"),
    curtidas,
    comentarios,
    salvamentos,
    compartilhamentos,
    interacoes: num(o, "interactions", "interactionsTotal", "engagementCount") ?? ((curtidas ?? comentarios ?? salvamentos ?? compartilhamentos) != null ? (curtidas ?? 0) + (comentarios ?? 0) + (salvamentos ?? 0) + (compartilhamentos ?? 0) : null),
    tempo_medio: formatoBase === "reel" ? num(o, "averageWatchTime", "avgWatchTime", "averageTime") : null,
    taxa_visualizacao: formatoBase === "reel" ? num(o, "reelsViewRate", "viewRate", "retention") : null,
  };
}

export function normalizarStory(o: Json, diaNoFuso: (iso: string) => string): StoryNormalizado | null {
  const publicado = lerDataPublicacao(o);
  const id = str(o, "postId", "storyId", "id") ?? str(o, "permalink", "url");
  if (!publicado || !id) return null;
  return { id_externo: id, dia: diaNoFuso(publicado), respostas: num(o, "replies", "repliesCount") };
}

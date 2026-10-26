import { z } from "./ptBR";

const inteiroOuNulo = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : null;
  });
const decimalOuNulo = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

export const esquemaMetricaSemanal = z.object({
  semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  seguidores: inteiroOuNulo,
  seguidores_ganhos: inteiroOuNulo,
  seguidores_perdidos: inteiroOuNulo,
  visualizacoes: inteiroOuNulo,
  alcance: inteiroOuNulo,
  interacoes: inteiroOuNulo,
  alcance_posts: inteiroOuNulo,
  compartilhamentos: inteiroOuNulo,
  salvamentos: inteiroOuNulo,
  posts: inteiroOuNulo,
  reels: inteiroOuNulo,
  stories: inteiroOuNulo,
  respostas_stories: inteiroOuNulo,
  cliques_link: inteiroOuNulo,
  mensagens_direct: inteiroOuNulo,
  notas: z.string().trim().max(2000).optional().nullable().transform((v) => (v ? v : null)),
});
export type EntradaMetricaSemanal = z.input<typeof esquemaMetricaSemanal>;

export const CAMPOS_METRICA: { chave: keyof Omit<EntradaMetricaSemanal, "semana" | "notas">; rotulo: string; grupo: string; ajuda?: string }[] = [
  { chave: "seguidores", rotulo: "Seguidores no fim da semana", grupo: "Seguidores" },
  { chave: "seguidores_ganhos", rotulo: "Seguidores ganhos", grupo: "Seguidores" },
  { chave: "seguidores_perdidos", rotulo: "Seguidores perdidos", grupo: "Seguidores" },
  { chave: "visualizacoes", rotulo: "Visualizações", grupo: "Alcance" },
  { chave: "alcance", rotulo: "Alcance (contas)", grupo: "Alcance" },
  { chave: "alcance_posts", rotulo: "Alcance dos posts", grupo: "Alcance", ajuda: "Base do engajamento" },
  { chave: "interacoes", rotulo: "Interações nos posts", grupo: "Engajamento", ajuda: "Curtidas + comentários + salvamentos + compartilhamentos" },
  { chave: "salvamentos", rotulo: "Salvamentos", grupo: "Engajamento" },
  { chave: "compartilhamentos", rotulo: "Compartilhamentos", grupo: "Engajamento" },
  { chave: "posts", rotulo: "Posts publicados", grupo: "Publicações" },
  { chave: "reels", rotulo: "Reels publicados", grupo: "Publicações" },
  { chave: "stories", rotulo: "Stories publicados", grupo: "Publicações" },
  { chave: "respostas_stories", rotulo: "Respostas aos stories", grupo: "Conversas" },
  { chave: "cliques_link", rotulo: "Cliques no link", grupo: "Conversas", ajuda: "Sempre manual" },
  { chave: "mensagens_direct", rotulo: "Mensagens no direct", grupo: "Conversas", ajuda: "Sempre manual" },
];

export const esquemaResultadoPost = z.object({
  id: z.string().uuid().optional(),
  publicado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "Data inválida"),
  formato: z.enum(["Reels", "Carrossel", "Estático"]),
  titulo: z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null)),
  url: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
  alcance: inteiroOuNulo,
  visualizacoes: inteiroOuNulo,
  curtidas: inteiroOuNulo,
  comentarios: inteiroOuNulo,
  salvamentos: inteiroOuNulo,
  compartilhamentos: inteiroOuNulo,
  interacoes: inteiroOuNulo,
  seguidores_ganhos: inteiroOuNulo,
  tempo_medio: decimalOuNulo,
  taxa_visualizacao: decimalOuNulo,
  conteudo_id: z.string().uuid().optional().nullable().transform((v) => (v ? v : null)),
});
export type EntradaResultadoPost = z.input<typeof esquemaResultadoPost>;

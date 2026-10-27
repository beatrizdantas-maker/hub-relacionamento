import { z } from "./ptBR";

const texto = (max = 8000) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const FORMATOS = ["Reels", "Carrossel", "Estático", "Texto", "Enquete", "Artigo"] as const;
export const REDES_VALIDAS = ["instagram", "linkedin"] as const;
export const STATUS_CONTEUDO = ["sugestao", "aprovado", "producao", "publicado"] as const;
export const TIPOS_TELA = ["Foto ou vídeo", "Texto", "Compartilhar post", "Enquete", "Caixa de pergunta", "Quiz", "Slider de emoji", "Slider", "Contagem regressiva", "Link"] as const;

export const esquemaConteudo = z.object({
  id: z.string().uuid().optional(),
  data: dataISO,
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().transform((v) => (v ? v : null)),
  formato: z.enum(FORMATOS),
  rede: z.enum(REDES_VALIDAS).optional(),
  status: z.enum(STATUS_CONTEUDO),
  tipo: texto(120),
  pilar: texto(80),
  tema: z.string().trim().max(200).default(""),
  objetivo: texto(120),
  cta: texto(300),
  roteiro: texto(20000),
  legenda: texto(),
  orientacao_arte: texto(8000),
  notas: texto(4000),
  campanha_id: z.string().uuid().optional().nullable().transform((v) => (v ? v : null)),
  ganchos: z.array(z.string().trim().max(300)).max(3).optional().default([]),
});
export type EntradaConteudo = z.input<typeof esquemaConteudo>;

export const esquemaTela = z.object({
  tipo: z.enum(TIPOS_TELA),
  texto: z.string().trim().max(1000).default(""),
  interacao: z
    .object({
      pergunta: z.string().trim().max(300).optional(),
      opcoes: z.array(z.string().trim().max(60)).max(4).optional(),
      emoji: z.string().trim().max(8).optional(),
      url: z.string().trim().max(500).optional(),
      data: z.string().trim().max(20).optional(),
    })
    .optional()
    .nullable()
    .transform((v) => (v && Object.values(v).some((x) => (Array.isArray(x) ? x.length : x)) ? v : null)),
});

export const esquemaStory = z.object({
  id: z.string().uuid().optional(),
  data: dataISO,
  objetivo: texto(200),
  status: z.enum(STATUS_CONTEUDO),
  conteudo_id: z.string().uuid().optional().nullable().transform((v) => (v ? v : null)),
  telas: z.array(esquemaTela).max(20),
});
export type EntradaStory = z.input<typeof esquemaStory>;

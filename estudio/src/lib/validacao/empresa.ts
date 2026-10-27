import { z } from "./ptBR";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor no formato #RRGGBB");
export const LIMITE_TEXTO_MARCA = 20000;
/** Texto livre opcional da marca; a mensagem de erro diz qual campo passou do limite. */
const textoOpcional = (rotulo: string) =>
  z
    .string()
    .trim()
    .max(LIMITE_TEXTO_MARCA, `"${rotulo}" está longo demais: no máximo ${LIMITE_TEXTO_MARCA.toLocaleString("pt-BR")} caracteres. Resuma o texto.`)
    .optional()
    .transform((v) => (v ? v : null));
const numeroOuNulo = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

export const OBJETIVOS_RITMO = [
  { valor: "salvamentos", rotulo: "Salvamentos" },
  { valor: "alcance", rotulo: "Alcance" },
  { valor: "direct", rotulo: "Mensagens no direct" },
  { valor: "engajamento", rotulo: "Engajamento" },
  { valor: "comentarios", rotulo: "Comentários" },
  { valor: "compartilhamentos", rotulo: "Compartilhamentos" },
  { valor: "seguidores", rotulo: "Seguidores" },
  { valor: "cliques", rotulo: "Cliques no link" },
] as const;

export const esquemaRitmoDia = z.object({
  dia: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora no formato HH:MM"),
  formato: z.enum(["Reels", "Carrossel", "Estático", "Texto", "Enquete", "Artigo"]),
  tipo: z.string().trim().max(120),
  pilar: z.string().trim().max(80),
  objetivo: z.string().trim().max(40),
});

export const esquemaMetas = z.object({
  visualizacoes_dia: numeroOuNulo,
  seguidores_liquidos_mes: numeroOuNulo,
  mensagens_mes: numeroOuNulo,
  salvamentos_carrossel: numeroOuNulo,
  alcance_reels: numeroOuNulo,
  engajamento_pct: numeroOuNulo,
});

export const esquemaEmpresa = z.object({
  nome: z.string().trim().min(1, "Informe o nome da empresa").max(120, "Nome muito longo"),
  perfil_instagram: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : null)),
  sobre: textoOpcional("Sobre a marca"),
  publico: textoOpcional("Público"),
  objetivos: textoOpcional("Objetivos"),
  tom_de_voz: textoOpcional("Tom de voz"),
  regras_de_linguagem: textoOpcional("Regras de linguagem"),
  regras_de_imagem: textoOpcional("Regras de imagem"),
  melhores_horarios: textoOpcional("Melhores horários"),
  pilares: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  cor_primaria: hex,
  cor_secundaria: hex,
  metas: esquemaMetas,
  ritmo_semanal: z.array(esquemaRitmoDia).length(7, "O ritmo semanal precisa dos 7 dias"),
});

export type DadosEmpresa = z.infer<typeof esquemaEmpresa>;
export type EntradaEmpresa = z.input<typeof esquemaEmpresa>;

export const esquemaConvite = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  papel: z.enum(["dono", "editor", "colaborador", "leitor"]),
});

// ---------- Seções da tela Marca (cada uma salva só os próprios campos) ----------
export const esquemaSecaoIdentidade = esquemaEmpresa
  .pick({ nome: true, perfil_instagram: true, sobre: true, tom_de_voz: true, regras_de_linguagem: true, regras_de_imagem: true, cor_primaria: true, cor_secundaria: true })
  .extend({ fuso_horario: z.string().regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, "Fuso horário inválido") });
export const esquemaSecaoPublico = esquemaEmpresa.pick({ publico: true, objetivos: true, pilares: true, melhores_horarios: true });
export const esquemaSecaoMetas = esquemaEmpresa.pick({ metas: true });
export const esquemaSecaoRitmo = esquemaEmpresa.pick({ ritmo_semanal: true });
export const esquemaSecaoLinkedin = z.object({
  redes: z.array(z.enum(["instagram", "linkedin"])).min(1, "Escolha pelo menos uma rede"),
  ritmo_linkedin: z.array(esquemaRitmoDia).length(7, "O ritmo semanal precisa dos 7 dias"),
});

export const ESQUEMAS_SECOES = {
  identidade: esquemaSecaoIdentidade,
  publico: esquemaSecaoPublico,
  metas: esquemaSecaoMetas,
  ritmo: esquemaSecaoRitmo,
  linkedin: esquemaSecaoLinkedin,
} as const;
export type SecaoMarca = keyof typeof ESQUEMAS_SECOES;

const dataOuNula = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data no formato AAAA-MM-DD");

export const esquemaCampanha = z
  .object({
    id: z.string().uuid().optional(),
    nome: z.string().trim().min(1, "Informe o nome da campanha").max(120),
    inicio: dataOuNula,
    fim: dataOuNula,
    descricao: textoOpcional("Descrição da campanha"),
  })
  .refine((c) => !c.inicio || !c.fim || c.fim >= c.inicio, { message: "O fim precisa ser depois do início", path: ["fim"] });
export type EntradaCampanha = z.input<typeof esquemaCampanha>;

export const esquemaIntegracao = z.object({
  metricool_user_id: z.string().trim().max(60).optional().transform((v) => (v ? v : null)),
  metricool_brand_id: z.string().trim().max(60).optional().transform((v) => (v ? v : null)),
  metricool_token: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
});

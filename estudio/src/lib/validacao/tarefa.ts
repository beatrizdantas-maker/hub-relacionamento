import { z } from "./ptBR";

export const TIPOS_TAREFA = ["Gravar", "Fotografar", "Criar arte", "Editar", "Revisar", "Publicar", "Planejamento", "Outro"] as const;
export const PRIORIDADES = ["Alta", "Média", "Baixa"] as const;
export const STATUS_TAREFA = ["pendente", "em_producao", "aguardando", "concluido"] as const;

export const esquemaTarefa = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(1, "Informe o título da tarefa").max(200, "Título muito longo"),
  tipo: z.enum(TIPOS_TAREFA),
  responsavel_id: z.string().uuid().optional().nullable().transform((v) => (v ? v : null)),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional().nullable().transform((v) => (v ? v : null)),
  prioridade: z.enum(PRIORIDADES),
  status: z.enum(STATUS_TAREFA),
  conteudo_id: z.string().uuid().optional().nullable().transform((v) => (v ? v : null)),
});
export type EntradaTarefa = z.input<typeof esquemaTarefa>;

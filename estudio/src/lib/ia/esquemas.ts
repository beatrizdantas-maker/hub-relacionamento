/**
 * Esquemas do que a IA devolve. Os esquemas "Saida*" vão para a API como
 * formato de saída estruturada (JSON Schema simples: objetos, listas, textos,
 * enums e nulos). Depois, `validar*` aplica as regras de negócio que o schema
 * não cobre (datas válidas, CTA presente, 3 ganchos para Reels, 4 telas, etc.).
 */
import * as z from "zod/v4";
import { FORMATOS, TIPOS_TELA } from "@/lib/validacao/conteudo";
import { ehDataISO } from "@/lib/datas";
import { camposBriefing, problemasBriefing } from "./briefing";

// ---------- Sugestões da semana ----------

export const SaidaSugestao = z.object({
  resumo: z.string(),
  manter: z.array(z.string()),
  melhorar: z.array(z.string()),
  testar: z.array(z.string()),
  ideias: z.array(
    z.object({
      titulo: z.string(),
      formato: z.enum(FORMATOS),
      dia: z.string().describe("Data no formato AAAA-MM-DD, dentro da semana sugerida"),
      motivo: z.string().describe("Por que esta ideia, citando entre parênteses o dado usado ou '(sem dado: hipótese)'"),
      legenda: z.string().describe("Legenda pronta para publicar, terminando com a chamada para ação"),
      cta: z.string().describe("A chamada para ação concreta, igual à que fecha a legenda"),
    }),
  ),
});
export type SugestaoGerada = z.infer<typeof SaidaSugestao>;

export interface ProblemaValidacao { campo: string; mensagem: string }

/** Regras que o schema não garante. Devolve a lista de problemas (vazia = válido). */
export function validarSugestao(s: SugestaoGerada, semana: string, fimSemana: string): ProblemaValidacao[] {
  const problemas: ProblemaValidacao[] = [];
  if (!s.resumo.trim()) problemas.push({ campo: "resumo", mensagem: "Resumo vazio" });
  if (s.manter.length + s.melhorar.length + s.testar.length === 0) problemas.push({ campo: "colunas", mensagem: "Nenhum item em manter/melhorar/testar" });
  if (s.ideias.length === 0) problemas.push({ campo: "ideias", mensagem: "Nenhuma ideia" });
  s.ideias.forEach((i, n) => {
    if (!ehDataISO(i.dia)) problemas.push({ campo: `ideias[${n}].dia`, mensagem: `Data inválida: ${i.dia}` });
    else if (i.dia < semana || i.dia > fimSemana) problemas.push({ campo: `ideias[${n}].dia`, mensagem: `Fora da semana: ${i.dia}` });
    if (!i.titulo.trim()) problemas.push({ campo: `ideias[${n}].titulo`, mensagem: "Título vazio" });
    if (!i.cta.trim()) problemas.push({ campo: `ideias[${n}].cta`, mensagem: "Sem chamada para ação" });
    if (!i.legenda.trim()) problemas.push({ campo: `ideias[${n}].legenda`, mensagem: "Legenda vazia" });
  });
  return problemas;
}

// ---------- Semana do calendário ----------

const SaidaTela = z.object({
  tipo: z.enum(TIPOS_TELA),
  texto: z.string(),
  pergunta: z.string().nullable().describe("Só para Enquete, Caixa de pergunta, Quiz e Slider"),
  opcoes: z.array(z.string()).nullable().describe("Opções da enquete ou do quiz (2 a 4); null nos outros tipos"),
  emoji: z.string().nullable().describe("Só para Slider de emoji"),
});

export const SaidaDiaCalendario = z.object({
  data: z.string().describe("AAAA-MM-DD, exatamente uma das datas pedidas"),
  formato: z.enum(FORMATOS),
  tipo: z.string().describe("Tipo do ritmo semanal daquele dia (ex.: Reels pessoa falando)"),
  pilar: z.string(),
  tema: z.string().describe("Título curto do conteúdo"),
  objetivo: z.string(),
  legenda: z.string().describe("Legenda pronta, terminando com a chamada para ação"),
  cta: z.string(),
  ...camposBriefing,
  ganchos: z.array(z.string()).describe("Reels: exatamente 3 ganchos alternativos na ordem curiosidade, identificação, provocação. Outros formatos: lista vazia"),
  stories: z.object({
    objetivo: z.string(),
    telas: z.array(SaidaTela).describe("Exatamente 4 telas: abertura, compartilhar o post, interação (enquete, caixa de pergunta, quiz ou slider), fechamento"),
  }),
});

export const SaidaSemanaCalendario = z.object({
  dias: z.array(SaidaDiaCalendario),
});
export type DiaGerado = z.infer<typeof SaidaDiaCalendario>;
export type SemanaGerada = z.infer<typeof SaidaSemanaCalendario>;

const INTERATIVAS = new Set(["Enquete", "Caixa de pergunta", "Quiz", "Slider de emoji", "Slider"]);

/**
 * Valida os dias gerados contra as datas pedidas. Dias com data fora do pedido
 * são descartados; problemas de conteúdo invalidam o dia (não a semana toda).
 */
export function validarSemana(s: SemanaGerada, datasPedidas: string[]): { validos: DiaGerado[]; problemas: ProblemaValidacao[] } {
  const validos: DiaGerado[] = [];
  const problemas: ProblemaValidacao[] = [];
  const vistas = new Set<string>();     // datas válidas já aceitas
  const recebidas = new Set<string>();  // datas pedidas que a IA devolveu (válidas ou não)
  for (const d of s.dias) {
    const campo = `dia ${d.data}`;
    if (!datasPedidas.includes(d.data)) { problemas.push({ campo, mensagem: "Data não pedida" }); continue; }
    if (recebidas.has(d.data)) { problemas.push({ campo, mensagem: "Data repetida" }); continue; }
    recebidas.add(d.data);
    const erros: string[] = [];
    if (!d.tema.trim()) erros.push("tema vazio");
    if (!d.legenda.trim()) erros.push("legenda vazia");
    if (!d.cta.trim()) erros.push("sem chamada para ação");
    if (d.formato === "Reels" && d.ganchos.filter((g) => g.trim()).length !== 3) erros.push("Reels precisa de 3 ganchos");
    erros.push(...problemasBriefing(d.formato, d));
    if (d.stories.telas.length !== 4) erros.push("stories precisam de 4 telas");
    if (!d.stories.telas.some((t) => INTERATIVAS.has(t.tipo))) erros.push("stories sem tela de interação");
    if (!d.stories.telas.some((t) => t.tipo === "Compartilhar post")) erros.push("stories sem tela de compartilhar o post");
    if (erros.length) { problemas.push({ campo, mensagem: erros.join("; ") }); continue; }
    vistas.add(d.data);
    validos.push(d);
  }
  for (const data of datasPedidas) if (!recebidas.has(data)) problemas.push({ campo: `dia ${data}`, mensagem: "Não veio da IA" });
  return { validos, problemas };
}

import { z } from "zod";

/**
 * Mensagens de validação em português para tudo que usa zod no app.
 * Os esquemas podem trazer mensagens próprias (com o nome do campo); esta é a
 * reserva para os casos sem mensagem.
 */
const mil = new Intl.NumberFormat("pt-BR");

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `Texto longo demais: no máximo ${mil.format(Number(issue.maximum))} caracteres.` };
      if (issue.type === "array") return { message: `No máximo ${mil.format(Number(issue.maximum))} itens.` };
      return { message: `Valor acima do permitido (${issue.maximum}).` };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: issue.minimum === 1 ? "Campo obrigatório." : `No mínimo ${issue.minimum} caracteres.` };
      return { message: `Valor abaixo do permitido (${issue.minimum}).` };
    case z.ZodIssueCode.invalid_type:
      return { message: issue.received === "undefined" ? "Campo obrigatório." : "Valor inválido." };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Opção inválida." };
    case z.ZodIssueCode.invalid_string:
      return { message: "Formato inválido." };
    default:
      return { message: ctx.defaultError };
  }
});

export { z };

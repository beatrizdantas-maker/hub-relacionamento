import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODELO_IA = "claude-opus-5-5";

export function chaveIAConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function obterClienteIA(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });
}

/** Erro já traduzido para a pessoa, com status HTTP sugerido. */
export class ErroIA extends Error {
  constructor(mensagem: string, public status = 500, public detalhes?: string[]) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

export const ERRO_SEM_CHAVE = new ErroIA("A IA não está configurada neste servidor: falta a variável ANTHROPIC_API_KEY.", 503);

export function traduzirErroIA(e: unknown): ErroIA {
  if (e instanceof ErroIA) return e;
  if (e instanceof Anthropic.APIUserAbortError || (e instanceof Error && e.name === "AbortError")) return new ErroIA("Geração cancelada.", 499);
  if (e instanceof Anthropic.AuthenticationError) return new ErroIA("A chave da IA foi recusada. Confira a ANTHROPIC_API_KEY no servidor.", 503);
  if (e instanceof Anthropic.PermissionDeniedError) return new ErroIA("A chave da IA não tem permissão para usar este modelo.", 503);
  if (e instanceof Anthropic.RateLimitError) return new ErroIA("A IA está com muitas solicitações agora. Espere um minuto e tente de novo.", 429);
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new ErroIA("A IA demorou demais para responder. Tente de novo.", 504);
  if (e instanceof Anthropic.APIConnectionError) return new ErroIA("Não foi possível conectar à IA. Confira a conexão do servidor.", 502);
  if (e instanceof Anthropic.APIError && /credit balance|billing/i.test(e.message)) {
    return new ErroIA("A conta da Anthropic está sem créditos. Compre créditos em console.anthropic.com → Billing e tente de novo em alguns minutos.", 402);
  }
  if (e instanceof Anthropic.BadRequestError) return new ErroIA("A IA recusou o pedido (dados demais ou formato inválido).", 500, [e.message]);
  if (e instanceof Anthropic.APIError) return new ErroIA(`A IA respondeu com erro ${e.status ?? ""}.`.trim(), 502, [e.message]);
  return new ErroIA(e instanceof Error && e.message ? e.message : "Algo deu errado ao falar com a IA.", 500);
}

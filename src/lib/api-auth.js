import { createClient } from "@supabase/supabase-js";

/**
 * Valida o token de login enviado pelo navegador.
 * Retorna o usuário se o token for válido, ou null se não for.
 * Serve para impedir que estranhos chamem as rotas de IA e gastem créditos.
 */
export async function usuarioAutenticado(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export function naoAutorizado() {
  return Response.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
}

/**
 * Traduz falhas da API de IA para uma frase que a escola entende.
 * Evita despejar erro tecnico em ingles (e o request_id) na tela do usuario.
 */
export function erroAmigavel(err) {
  const txt = String((err && err.message) || err || "");
  const status = err && err.status;

  if (/credit balance|billing|insufficient.quota|payment/i.test(txt))
    return { msg: "A IA está sem créditos. Avise a coordenação para recarregar o saldo da conta Anthropic.", status: 402 };
  if (status === 429 || /rate.?limit|overloaded/i.test(txt))
    return { msg: "A IA está sobrecarregada no momento. Tente de novo em alguns minutos.", status: 429 };
  if (status === 401 || /api.?key|authentication/i.test(txt))
    return { msg: "A chave de acesso à IA está inválida. Avise o responsável técnico.", status: 500 };
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(txt))
    return { msg: "A IA demorou demais para responder. Tente novamente.", status: 504 };
  if (err instanceof SyntaxError || /JSON/i.test(txt))
    return { msg: "A IA devolveu uma resposta fora do formato esperado. Tente novamente.", status: 502 };

  return { msg: "Não foi possível gerar a análise agora. Tente novamente em instantes.", status: 500 };
}

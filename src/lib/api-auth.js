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

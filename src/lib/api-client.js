import { supabase } from "./supabase";

/**
 * Chama uma rota /api enviando junto o token de login do usuário.
 * Use sempre esta função no lugar de fetch() direto para rotas de IA.
 */
export async function apiPost(caminho, corpo) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(caminho, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(corpo),
  });
}

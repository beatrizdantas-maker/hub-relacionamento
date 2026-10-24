import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/tipos/database";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "./config";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa os cookies da sessão do usuário: todo acesso passa pelo RLS.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database, "estudio">(
    SUPABASE_URL,
    SUPABASE_CHAVE_PUBLICA,
    {
      db: { schema: "estudio" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o middleware renova a sessão.
          }
        },
      },
    },
  );
}

/**
 * Cliente administrativo (service role). NUNCA exportar para o navegador.
 * Use só em rotas de servidor que precisam contornar o RLS de propósito
 * (ex.: enviar e-mail de convite). Cada uso deve checar o papel antes.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient<Database, "estudio">(SUPABASE_URL, chave, {
    db: { schema: "estudio" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

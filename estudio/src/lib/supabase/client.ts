"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/tipos/database";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from "./config";

/** Cliente Supabase para componentes de cliente (navegador). */
export function criarClienteNavegador() {
  return createBrowserClient<Database, "estudio">(
    SUPABASE_URL,
    SUPABASE_CHAVE_PUBLICA,
    { db: { schema: "estudio" } },
  );
}

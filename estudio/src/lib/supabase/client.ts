"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/tipos/database";

/** Cliente Supabase para componentes de cliente (navegador). */
export function criarClienteNavegador() {
  return createBrowserClient<Database, "estudio">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "estudio" } },
  );
}

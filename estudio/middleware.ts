import { type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Tudo, exceto arquivos estáticos e imagens.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icones/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
